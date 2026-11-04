# Unidesk

Multi-tenant business platform: a Hub plus seven apps. Next.js 15 (App Router, JavaScript), PostgreSQL, Prisma, Auth.js, Zod, Tailwind.

Specs live next to this folder: `../Unidesk Platform Specs` and `../Build Docs`. Rules for Claude Code are in `CLAUDE.md`.

## Run it

Needs Node 20+ and a local PostgreSQL.

```bash
createdb unidesk_dev
cp .env.example .env        # then set DATABASE_URL and AUTH_SECRET
npm run setup               # install, generate client, migrate, seed
npm run dev                 # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm test` | Unit and isolation tests (Vitest). Needs the seed loaded |
| `npm run test:e2e` | Browser tests (Playwright). Run `npx playwright install chromium` once |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create a migration |
| `npm run db:seed` | Load demo data (two organizations) |

## Status

Full handoff (how to resume, what is and is not built, open decisions, next steps): `docs/HANDOFF.md`.

**Phase 0 (foundations):** done except CI and staging, and some components (date picker, combobox, money and email inputs, file drop, charts).

**Hub flow 01 (sign in and sign up):** done in all three theme structures: sign in, sign up, check your inbox, forgot and reset password, sign out, route protection, real sessions. Placeholders: `/hub/onboarding` (flow 02), `/portal`, `/terms`, `/privacy`. Not included: Google sign-in, new-device email.

**Team pilot:** People and App access in all three themes (see `../Unidesk Platform Specs/00-Foundations/12-Theme-Pattern-Language.md`). Shared logic in `src/features/team`; screens in `src/themes/<theme>`.

## Try it

Demo owner: `demo@unidesk.com`, password in `prisma/seed.mjs` (demo data only). Every seeded person has the same demo password; Jordan Lee is a Client, Lena Fischer is invited.

In development: the theme control sits at the bottom right, and `/dev/emails` lists every email the app "sent" (confirmation and reset links). Browser tests run in your installed Google Chrome (`npm run test:e2e`).

Not built yet (hidden, not dead links): invite, invites list, roles page, shared data, deactivate and remove, settings, onboarding.
