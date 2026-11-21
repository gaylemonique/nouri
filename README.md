# Nouri

A mobile food diary for Android and iOS. You log what you eat, Nouri works out calories, protein, carbs and fat from a food catalog, and shows how the day compares with the targets you set. The catalog is built to include Filipino dishes and the serving sizes people in the Philippines actually use (a cup of rice, a piece of pandesal, a bowl of sinigang).

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 02 | Supabase schema, RLS, food logging functions, reference seed | Done, live on Supabase |
| 04 (backend) | Filipino catalog: 24 dishes as recipe estimates, search, recents, favorites | Done, live on Supabase |
| 00 | Next.js static export, Capacitor with Android, Tailwind, env validation, Supabase client | Done |
| 01 | Design tokens and bottom navigation done; five screens are placeholders that say "Not built yet" | In progress |
| 03, 05 to 08 | Auth flows, diary UI, analytics, offline sync, store builds | Not started |

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

To run on Android: `npm run cap:sync`, then `npx cap open android` and run from Android Studio (needs Android Studio with JDK 21). iOS needs a Mac with Xcode; the `ios/` project has not been added yet.

## How it fits together

```text
Next.js (static export) inside Capacitor
        |
   repositories (TypeScript)        SQLite (offline cache + sync queue)
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

The catalog is readable by signed-in users and writable only through migrations or the service role.

## Repository layout

```text
src/
  app/               routes: (main)/ holds Home (/), diary, discover, progress, profile
  components/        navigation/ and shared/ UI
  domain/nutrition/  client copy of the server's nutrition formula
  infrastructure/    Supabase client and env validation
  types/             generated database types
tests/unit/          Vitest tests
android/             Capacitor Android project
docs/design.md       colours, type, spacing and the reasons for them
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

`src/features/` and `src/services/repositories/` arrive with the first screen that reads data.

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
