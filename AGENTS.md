# AGENTS.md

Rules for anyone writing code in this repository, human or agent. Read `README.md` first for what Nouri is and where it stands.

## Before you change anything

1. Read this file and `README.md`.
2. Check the current branch and `git status`. Do not overwrite work you did not make.
3. Look up current library docs (Context7 or the official docs) before using an API you have not used in this repo. Supabase, Next.js and Capacitor change often.
4. Grep for an existing helper, function or migration before writing a new one.

## Stack

| Layer | Choice |
| --- | --- |
| UI | Next.js App Router, static export (`output: "export"`), React, TypeScript strict |
| Native shell | Capacitor (Android, iOS) |
| Styling | Tailwind CSS 4, Radix primitives, Lucide icons |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| UI state | Zustand, only for state that is not server data |
| Backend | Supabase: Postgres, Auth, RPC functions, Edge Functions when Postgres cannot do the job |
| Offline | Capacitor SQLite, with a browser fallback for development |
| Charts | Recharts |
| Tests | Vitest, Playwright, SQL checks in `supabase/tests` |

Adding a dependency needs a reason written in the PR or commit body.

## Architecture

One app, one Supabase project, one database. Feature modules, no microservices.

```text
screen / component
  -> feature hook (TanStack Query)
    -> repository (src/services/repositories)
      -> Supabase client or SQLite
```

- Components never import the Supabase client. They call a hook, the hook calls a repository.
- Nutrition maths and goal rules live in `src/domain` and import nothing from React, Next or Supabase.
- No Next.js API routes, Server Actions or server rendering. The app ships as static files.

## Database rules

- Every schema change is a new file in `supabase/migrations/`. Never edit a migration that has been pushed.
- UUID primary keys. Foreign keys on every relationship. Check constraints for units and ranges.
- RLS on every table. Policies name their role (`to authenticated`) and wrap `auth.uid()` as `(select auth.uid())`.
- Index every column a policy or a hot query filters on.
- `security definer` functions set `search_path = ''` and schema-qualify every name.
- Diary tables are written only by the RPC functions. Do not grant `insert`, `update` or `delete` on `food_logs` or `food_log_items` to client roles.
- The server calculates nutrients from catalog data. Never accept totals from the client.
- Logged items keep their snapshot. Catalog edits must not change past entries.
- Regenerate `src/types/database.types.ts` after every schema change and commit it with the migration.

## Nutrition rules

- Energy in kcal, macros in grams, sodium in milligrams.
- Catalog values are per 100 g. Every serving resolves to a gram weight.
- grams eaten = serving grams × quantity; nutrient = per 100 g value × grams eaten / 100.
- The SQL functions are the source of truth. The TypeScript calculator used for optimistic updates must produce the same numbers, and a test must prove it.
- Never mark a food `verified` unless its numbers trace to a named source record in `source_ref`. Use `estimated` or `unverified` otherwise.
- Filipino dishes come from `catalog/recipes.json` through `catalog/build-recipe-foods.mjs`. Change the recipe and regenerate into a new migration; never hand-edit generated SQL. Method and substitutions: `catalog/README.md`.
- No DOST-FNRI (PhilFCT) values until FNRI has granted permission in writing.

## Client data rules

- Writes are optimistic: generate the entry UUID on the device, update the query cache, call the RPC with that id, roll back on error. The RPC is idempotent on the id, so retries and offline replays are safe.
- Use the user's local calendar date for `log_date`. Never derive it from a UTC timestamp on the server.
- Production screens show database data or a clearly marked pending local entry. No mock numbers outside prototypes and tests.

## Keep it small

Climb this ladder before writing code:

1. Does this need to exist yet?
2. Is it already in the repo?
3. Does Postgres, the platform or an installed package already do it?
4. Can it be one line or one SQL function?
5. Only then write the minimum that works.

Mark a deliberate shortcut with a `ponytail:` comment that says where it stops working and what replaces it.

Not optional: input validation at trust boundaries, RLS, error handling that prevents data loss, accessibility.

## Design rules

Mobile first. Warm off-white background, charcoal text, one muted green accent, restrained macro colours. Generous spacing, subtle borders, small radius, bottom navigation. No decorative gradients, heavy shadows, emoji headings or filler copy. Nutrition numbers must be readable at a glance.

## Verification loop

Work in short loops: change, run the checks, read the output, fix, repeat. A task is done only when the checks pass.

Backend changes:

```bash
npx supabase db push --remote --dry-run   # review what will run
npx supabase db push --remote --yes
npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
```

Then run the SQL checks in `supabase/tests` against the project and confirm every check passes.

App changes:

```bash
npm run lint
npm run typecheck
npm test
npm run build        # must produce out/
npx cap sync android
```

UI changes also get checked in a browser at phone width (375 px) in light and dark mode. Visual rules and their reasons: `docs/design.md`.

Never report something as working if it was not run.

## Commits

- Format: `type(scope): summary`, types `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- The body says what changed, why, and how it was verified.
- One concern per commit where possible.
