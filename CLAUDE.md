# CLAUDE.md

Project: multi-tenant business platform for accounting firms and small service businesses. A Hub (sign-in, organizations, team, clients) plus modules: CRM (tasks and time), Invoicing, Proposals, Appointment, Workdrive, SOP, Accounting.

## Stack
- Next.js 15 (App Router), **JavaScript only** (`.js`/`.jsx`). Use JSDoc `@typedef` for shapes. No TypeScript.
- PostgreSQL + Prisma (`prisma/schema.prisma`). Auth.js (NextAuth) for sign-in. Zod for validation.
- Tailwind CSS + shadcn/ui-style components in `src/components/ui`.
- Stripe for payments (hosted checkout only). Resend or SMTP for email. S3-compatible storage for files.
- Tests: Vitest (unit, API) and Playwright (end to end).

## Commands
- `npm run dev` start the app
- `npm test` run Vitest
- `npm run test:e2e` run Playwright
- `npm run lint` ESLint
- `npx prisma migrate dev` create a migration
- `npx prisma db seed` load demo data

## Hard rules
1. **Every database query is scoped to an organization.** Use the helper `withOrg(session)` in `src/server/db.js`; never call `prisma.<model>` directly in a route or action.
2. Money is stored as **whole cents** (integers). Format only in the UI.
3. No feature ships without a test. Isolation tests must prove org A cannot read or change org B data on every route.
4. Never store card numbers. Use Stripe hosted checkout and tokens.
5. Audit log entries are append-only. No edit, no delete, no purge button.
6. Never show internal codes (`auth.login`, `client.created`) to users. Map them to plain labels in `src/lib/labels.js`.
7. Validate all input with Zod on the server, even if the form validates too.
8. Server Actions and route handlers check role and app access through `requireAccess(session, { app, role })`.
9. Do not edit files outside the slice you were asked to build.

## Conventions
- Folders: `src/app/(hub)`, `src/app/(apps)/<module>`, `src/server`, `src/components`, `src/lib`.
- Files in kebab-case; components in PascalCase; server actions end in `Action`.
- Small pull requests: one screen plus its data and tests.
- Dates are stored in UTC and shown in the user's time zone with the zone name.
- Every list screen has loading, empty, error and long-content states.

## Workflow
spec (in `docs/specs`) -> plan -> small slice -> tests -> `/code-review` and `/security-review` -> check in a browser.
When Claude repeats a mistake, add a rule here.

## Specs
Read `../Unidesk Platform Specs/00-Foundations` before any UI work. Build one flow at a time from `../Unidesk Platform Specs/<module>/flows/`. Use only components from `05-Components.md` and icons from `03-Icons-Lucide.md`.
