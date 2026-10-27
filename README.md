# jobsoxo.com

Marketing site for JobsOxo: landing page, `/privacy`, `/terms`, and a waitlist endpoint. This repo is separate from the JobsOxo app.

- **Stack:** Astro + TypeScript, deployed on Vercel. Pages are static; `POST /api/waitlist` is the only serverless function.
- **Waitlist:** stored in Supabase (`waitlist` table); a confirmation email goes out through Resend.
- **Analytics:** Plausible (production builds only). Each signup sends a `waitlist_submit` event with `trade` and `crew` props.

## Develop

```sh
npm install
cp .env.example .env   # fill in values to test the waitlist end to end
npm run dev            # http://localhost:4321
npm run build          # type-check + build
```

## Layout

```
src/pages/index.astro         landing page (sections below, in order)
src/components/               Nav, Hero, Problem, Features, BuiltInTheTrade,
                              NothingElse, Waitlist, Questions, Footer
src/pages/privacy.astro       legal pages (share src/layouts/Legal.astro)
src/pages/terms.astro
src/pages/api/waitlist.ts     POST endpoint: validate → Supabase → Resend
src/lib/waitlist.ts           email regex, trades, crew sizes (shared client/server)
src/styles/global.css         design tokens (light; dark ready via data-theme="dark")
supabase/config.toml          Supabase CLI config
supabase/migrations/          database schema changes, applied in filename order
public/                       logo, favicons, app screenshots
```

## Database changes

Schema changes live in `supabase/migrations/`. Never edit a migration that has already run; add a new one instead:

```sh
npx supabase migration new add_phone_column   # creates supabase/migrations/<timestamp>_add_phone_column.sql
```

Write the SQL in the new file, then commit and push. With the Supabase GitHub integration connected (working directory `.`), migrations are applied to production when they land on `main`. Without the integration, apply them yourself:

```sh
npx supabase login
npx supabase link --project-ref fpgrgfhfcflwlxtjzuin
npx supabase db push
```

## Before launch

- **Photos:** the hero and founder photos are placeholders. Put the files in `public/` and pass `src` to the `<Photo>` in `Hero.astro` and `BuiltInTheTrade.astro`.
- **Legal:** fill in the `[bracketed]` items (effective date, mailing address, notice period) in `privacy.astro` and `terms.astro`, then get a legal review.
- **Copy:** the waitlist panel and FAQ still say "beta". Confirm that wording.
- **Alternate hero:** `<Hero layout="app" />` in `index.astro` swaps the photo for the dashboard screenshot.

## Waitlist API

`POST /api/waitlist` with `{ name, email, trade, crew, source }` returns `{ ok: true }` or `{ ok: false, error }`.

- Emails are lowercased. A repeat email returns `ok: true` without inserting again, so the response doesn't reveal who's already on the list.
- A hidden `company` honeypot field silently drops bot submissions.
- The confirmation email is best-effort: if Resend fails, the error is logged and the signup still counts.
- If `WAITLIST_NOTIFY_EMAIL` is set, each new signup also sends a notification to that address.
