# Nouri

A mobile food diary for Android and iOS. You log what you eat, Nouri works out calories, protein, carbs and fat from a food catalog, and shows how the day compares with the targets you set. The catalog is built to include Filipino dishes and the serving sizes people in the Philippines actually use (a cup of rice, a piece of pandesal, a bowl of sinigang).

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 02 | Supabase schema, RLS, food logging functions, reference seed | Done, live on Supabase |
| 04 (backend) | Filipino catalog: 24 dishes as recipe estimates, search, recents, favorites | Done, live on Supabase |
| 00 | Next.js static export, Capacitor with Android, Tailwind, env validation, Supabase client | Done |
| 01 | All five screens and the food sheet designed and interactive, on labelled sample data (see `docs/design.md`) | Done |
| 03 | Email and password sign-in, onboarding (name and daily targets), Profile reads and edits real targets | Done, see [Sign-in](#sign-in) for what waits on an email sender |
| 05 | Home, Diary, Discover and the food sheet on real data: catalog search, adding, editing and removing entries with optimistic updates | Done |
| 06 | Progress on real data: 7-day calories against target, 30-day grid of days within target, today's macro split | Done |
| 07 | Offline: persisted write queue that replays in order, device cache of reads, offline states on every screen | Done, checked in the browser with simulated offline; not yet on a phone |
| 08 | Google Play prep: final app id, release signing, in-app account deletion, backups off, release checklist and listing draft (`docs/release.md`) | In progress. Blocked on icon, privacy policy URL, email sender, first build on a phone |

The backend was built first so the screens can be wired to real data from day one instead of mock numbers.

## Getting started

Needs Node 22 or newer.

```bash
npm install
cp .env.example .env.local     # fill in the Supabase URL and publishable key
npm run dev                    # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Static export into `out/` (what Capacitor ships) |
| `npm run lint` | ESLint with the Next.js rules |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm test` | Vitest unit tests (`tests/unit`) |
| `npm run test:catalog` | Tests for the recipe calculator |
| `npm run cap:sync` | Build, then copy `out/` into the native projects |

To run on Android: `npm run cap:sync`, then `npx cap open android` and run from Android Studio (needs Android Studio with JDK 21). iOS needs a Mac with Xcode; the `ios/` project has not been added yet. Release builds for Google Play: [`docs/release.md`](docs/release.md).

## How it fits together

```text
Next.js (static export) inside Capacitor
        |
   repositories (TypeScript)        device storage (query cache + write queue)
        |
   Supabase
     ├─ Auth
     ├─ PostgREST  ->  tables protected by RLS (reads)
     └─ RPC        ->  Postgres functions (all diary writes)
```

There is no Next.js server. The app is a static bundle, so anything that must be trusted runs in Postgres.

### Decisions worth knowing before you change anything

- **Diary writes only go through Postgres functions.** `authenticated` has no insert, update or delete grant on `food_logs` or `food_log_items`. `log_food_item`, `update_food_log_item` and `delete_food_log_item` look up the food and serving themselves and calculate the nutrients on the server. A client cannot send its own calorie totals.
- **The client picks the entry id.** `log_food_item` takes the new row's UUID from the caller and returns the existing row if that id was already written. This makes the call safe to retry, lets the offline queue replay operations without creating duplicates, and lets the UI show the entry right away (optimistic update) with the id it will keep.
- **Logged entries keep a snapshot.** Each item stores the food name, serving and the per 100 g nutrient values it was logged with. Editing the catalog later never changes yesterday's totals, and editing an entry's quantity rescales from that snapshot.
- **Postgres functions instead of Edge Functions for now.** A function runs inside one transaction, sees RLS, needs no service-role key in any client and has no cold start. Edge Functions are kept for work Postgres cannot do, such as calling an external food API during imports.
- **Catalog values are per 100 g.** Servings are stored as gram weights. Nutrient consumed = per 100 g value × grams eaten / 100.
- **Sources are recorded per food.** `source_name`, `source_ref` and `verification_status` say where each number came from. Values that have not been checked against a source are never marked `verified`.

## Logging food and working offline

Discover searches the catalog with `search_foods` (English and Tagalog names, small typos) and lists recent foods and the Filipino dishes. Picking a food opens the food sheet; Add closes it at once.

Every diary write (add, edit, remove) goes through a write queue (`src/features/food-diary/sync-queue.ts`), online or not:

- The change is saved to device storage first, then sent. Closing the app or losing signal never loses it.
- Changes go to the server one at a time, in the order they were made. Adds carry an id made on the device and the RPCs are idempotent on it, so a change sent twice does no harm.
- No connection or an expired token: the queue waits and resumes when the device is back online, when the app returns to the foreground, and every 15 seconds while something waits.
- The server refuses an add: it stays on screen as "Not saved" with Retry and Remove, and is left out of totals. The server refuses an edit or delete: it is undone and a message says so.
- Removing an entry whose add hasn't been sent yet just drops it from the queue.

Screens show the saved diary with queued changes applied on top (`queue-model.ts`, unit-tested), marked "Saving…" or "Waiting for connection". Signing out with changes still queued asks first, because it deletes them from the device.

Reads are cached on the device too (TanStack Query persister, 7 days): profile, targets, diary days, recent foods, the browse lists and Progress history open offline. Catalog search needs a connection; Discover says so and points to the lists that work offline.

Storage is Capacitor Preferences behind `src/infrastructure/storage/device-store.ts`, not SQLite. The queue and cache are small, Preferences is already installed and runs the same in the browser, and a native SQLite plugin could not be run on a device in this setup. Move to SQLite behind the same module if the cache grows (for example, the whole catalog for offline search).

## Progress

Progress reads the last 30 days with `daily_nutrition_totals` in one request; today comes from the diary cache so it matches Home and includes entries still saving. The rules for a finished day live in `src/domain/goals/day-status.ts`: within target means within 10% either side, and days with nothing logged are left out of averages and counts (an empty day means not tracked, not 0 kcal). Today is drawn but not counted.

Every day is compared with the current calorie target; there is no target history yet.

## Sign-in

Email and password through Supabase Auth. There is no server, so the app decides on the device which screen to show (`src/features/auth/auth-gate.tsx`): no session goes to `/sign-in/`, a profile without `onboarding_completed_at` goes to `/onboarding/`. That only picks a screen; RLS is what keeps one person's data from another.

- The session is stored with Capacitor Preferences (SharedPreferences on Android, UserDefaults on iOS), not WebView localStorage, which iOS can clear when storage runs low.
- Signing out ends the session on this device only and clears every cached query.
- Onboarding saves the goals first, then marks the profile done, so a failure halfway leaves the user on onboarding with nothing lost.

**Waiting on an email sender.** Supabase's built-in email only delivers to members of the Supabase team and, on the free plan, its templates cannot be changed. Until a custom SMTP sender (for example Resend) is configured:

- Email confirmation is off (`enable_confirmations = false` in `supabase/config.toml`), so anyone can sign up with an address they don't own.
- There is no password reset.

With SMTP in place: turn confirmation back on, add password reset, and consider switching to a 6-digit email code so the native app needs no deep links. Auth settings live in `supabase/config.toml`; preview with `npx supabase config diff` and apply with `npx supabase config push`.

## Database

| Table | Owner | Purpose |
| --- | --- | --- |
| `profiles` | user | Display name and optional body and activity details |
| `nutrition_goals` | user | Daily calorie and macro targets, one row per user |
| `foods` | catalog | Nutrients per 100 g, source and verification status |
| `food_servings` | catalog | Named portions and their gram weight |
| `food_aliases` | catalog | Other names a food is searched by |
| `food_logs` | user | One diary per user per local calendar date |
| `food_log_items` | user | Logged entries with nutrient snapshots |
| `food_favorites` | user | Saved foods |

Functions exposed over RPC:

| Function | Use |
| --- | --- |
| `log_food_item` | Add an entry (idempotent on the entry id) |
| `update_food_log_item` | Change serving, grams, quantity or meal |
| `delete_food_log_item` | Remove an entry (no error if already gone) |
| `search_foods` | Name and alias search with trigram matching |
| `recent_foods` | Foods the user logged most recently |
| `daily_nutrition_totals` | Per-day totals for a date range, for the dashboard and charts |
| `delete_my_account` | Deletes the caller's account and, by cascade, all their data |

The catalog is readable by signed-in users and writable only through migrations or the service role.

## Repository layout

```text
src/
  app/               routes: (main)/ holds Home (/), diary, discover, progress, profile; (auth)/ holds sign-in and onboarding
  components/        ui/ primitives, navigation/, shared/ screen parts
  features/          auth, dashboard, food-diary, food-search, nutrition-history, profile
  services/repositories/  the only code that calls Supabase
  hooks/ utils/      device date, number and date formatting
  domain/            nutrition formula (client copy of the server's), macro split for goals
  infrastructure/    Supabase client and env validation
  types/             generated database types
tests/unit/          Vitest tests
android/             Capacitor Android project
docs/design.md       colours, type, spacing and the reasons for them
docs/release.md      Google Play: signing, build, forms, what still blocks a release
catalog/
  recipes.json       Filipino dish recipes behind the estimated values
  usda-ingredients.json  USDA values for every recipe ingredient
  *.mjs              extractor, calculator (writes migrations) and its tests
supabase/
  config.toml
  migrations/        schema, RLS, functions, catalog data
  tests/             SQL checks for RLS, the nutrition maths and the catalog
AGENTS.md            rules for anyone (human or agent) writing code here
```


## Working on the backend

You need Node 20 or newer and access to the Supabase project. The CLI runs through `npx`, so there is nothing to install globally.

```bash
npx supabase login
npx supabase link <project-ref>

# apply migrations to the linked project
npx supabase db push --remote

# run the database checks (each is one transaction, rolled back)
npx supabase db query --remote --yes -f supabase/tests/diary_checks.sql
npx supabase db query --remote --yes -f supabase/tests/catalog_checks.sql
npx supabase db query --remote --yes -f supabase/tests/profile_checks.sql
npx supabase db query --remote --yes -f supabase/tests/account_checks.sql

# test the recipe calculator
node --test "catalog/*.test.mjs"

# regenerate types after a schema change
npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
```

Write each schema change as a new file in `supabase/migrations/`. Do not edit a migration that has already been pushed.

## Food data sources

- **Plain foods** (rice, egg, fish, fruit): USDA FoodData Central, SR Legacy, public domain. Marked `verified`, with the FDC id in `source_ref`.
- **Filipino dishes** (sinigang, adobo, kare-kare, pancit, lumpia, silog plates, pandesal and more): calculated from written recipes using USDA ingredient values. Marked `estimated`, with `source_ref = recipe:<id>`. The method, the substitutions for ingredients USDA lacks (kangkong, oxtail, saba) and the regeneration steps are in [`catalog/README.md`](catalog/README.md).

Not used yet:

- DOST-FNRI Philippine Food Composition Tables: the better source for Filipino dishes, but permission to use them in an app has not been confirmed.
- Open Food Facts: ODbL requires attribution and share-alike for the database.

## Health note

Nouri shows estimates. Calorie and macro targets are set by the user, and nothing in the app is medical or dietary advice.
