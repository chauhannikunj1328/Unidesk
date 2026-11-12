# Unidesk: where we stopped, and how to carry on

Last updated 4 Nov 2026. Branch `feat/foundations-team-auth` (2 commits on top of the create-next-app commit, nothing pushed, no remote yet).

## Pick it up in five minutes

```bash
cd app
npm install
cp .env.example .env     # set DATABASE_URL and AUTH_SECRET; optionally DEMO_OWNER_EMAIL
npx prisma migrate dev   # or: npm run setup
npx prisma db seed
npm run dev              # http://localhost:3000
```

- Demo data: two organizations (Unidesk Demo, Harbor Advisory). Every seeded person shares the demo password in `prisma/seed.mjs`. Demo only.
- `DEMO_OWNER_EMAIL` (in the untracked `.env`) makes that person the single owner of Unidesk Demo and moves Paul Smith to Admin. Their password is set separately and is never in the repo.
- In development, `/dev/emails` lists every email the app "sent" (confirmation and reset links) and the theme switcher sits at the bottom right.
- Checks: `npm run lint`, `npm test` (154 unit and database tests), `npm run test:e2e` (54 browser tests in your installed Chrome; they reseed the demo data first).

## What is built

| Area | State |
|---|---|
| Foundations | Next.js 15 (JavaScript), Prisma/Postgres, Auth.js, Zod, Tailwind. Org-scoped data access (`withOrg`), `requireAccess`, append-only audit log, labels, money and date helpers, pricing |
| Themes | Glass, pastel, grove as design tokens (muted colours darkened to pass AA, tested). Three shells: full sidebar, icon rail + utility pill, hero band. Control sizes (buttons, iOS-style switch) set per theme |
| Shared components | Buttons, chips, fields (with password and checkbox), dialog, drawer, toast, banner, tabs, table, menu, command palette (⌘K), notifications panel, profile menu |
| Hub flow 01 | Sign in, sign up, confirm email (button on a confirm page), forgot and reset password, sign out, route protection, server-checked sessions. Auth pages in all three structures. Placeholders: `/hub/onboarding`, `/portal`, `/terms`, `/privacy` |
| Team pilot (flows 04, 06, 07 in part) | People and App access in all three structures. Shared logic in `src/features/team`, screens in `src/themes/<theme>` |
| Review | Manual and formal security and code reviews done; all 10 findings fixed with tests |

## What is not built yet

- **Hub:** flow 02 onboarding, 03 dashboard, 05 invite people, 08 pending invites, 09 shared data, 10 deactivate/remove/transfer owner, 11 to 25 (clients and projects, contacts, templates, integrations, referrals, billing, audit log, settings, full top bar).
- **Hidden until their flow exists (not dead links):** Invite people and Resend buttons, Roles page, Shared data tab, Deactivate/Remove, Settings, most sidebar items.
- **Components still to build:** date picker, combobox, money and email-chip inputs, file drop, chart wrappers, full data table (selection, sort, columns menu, pagination), popover, date-range control.
- **Left out on purpose for now:** Google sign-in (needs credentials), new-device sign-in email, mail provider (emails go to the log), CI and staging deploy.
- **Apps:** CRM, Invoicing, Proposals, Appointment, Workdrive, SOP, Accounting. Their sidebar entries open a plain "not built yet" page.

## Rules to keep (the user asked for these)

1. **Three themes differ in structure, not only colour.** Every new flow needs a screen spec per theme (`Unidesk Platform Specs/00-Foundations/12-Theme-Pattern-Language.md`) and acceptance criteria checked in all three. Shared logic goes in `src/features/<module>`, theme screens in `src/themes/<theme>/<module>`.
2. **Follow `06-UX-Rules.md`** (errors after blur, no codes on screen, one date format, empty/loading/error states, no link that goes nowhere).
3. **Plan first, then build one flow at a time**, tests with each slice, then `/code-review` and `/security-review` on a committed branch (they need a remote or a local `origin/HEAD` ref).
4. Product name is **Unidesk**; the sample person is **Sumit Okafor**.

## Decisions waiting for the client (also in `Build Docs/07-Decisions-and-Risks.md`)

- Seats: Client logins are free (screens show 6 of 10, not the mock-ups' 7 of 10). Confirm.
- Locking an email after 5 failed tries lets anyone who knows the email lock that person out for 15 minutes (spec behaviour). Revisit if abused.
- Terms and Privacy are draft placeholders; real text needs legal review.
- Trial length (30 days), bundle discount tiers, referral rewards, contact categories: see the Hub README open questions.

## Known limits from the reviews (not fixed, low risk)

- Sessions end 30 days (or 12 hours without "Keep me signed in") after sign-in even with activity; they do not slide.
- Two simultaneous grants could briefly pass an app's seat limit.
- Per-address limits trust the proxy's `x-forwarded-for` header; hosting must overwrite it.
- A Manager can give a report an app the Manager lacks (the spec is silent).
- A manager's organization is checked in application code, not by a database constraint.

## Next steps, in the order I would take them

1. **Rest of Team** (flows 05 invite, 08 pending invites, 09 shared data, 10 deactivate/remove/transfer owner), then the Invite and Resend buttons come back and the Roles and Shared data tabs appear. Three structures each.
2. **Hub flow 02 onboarding** (sign-up already lands on a placeholder at `/hub/onboarding?step=1`), then **flow 03 dashboard**.
3. Hub flows 11 to 25 in the order in `Unidesk Platform Specs/01-Hub/README.md`, then CRM, Invoicing, and the rest following `Build Docs/05-Build-Phases.md`.
4. Set up a remote, CI and a staging deploy; choose the mail provider.

## Practical notes

- The Figma file ("Aroh360 | UX Audit", key `Yd2PDGYtj9qbKUP0JdHHAk`) cannot be read: the connected Figma account has no access. Designs arrive as screenshots pasted into the chat.
- A stray `package-lock.json` in the home folder triggers a Next.js warning; `outputFileTracingRoot` in `next.config.mjs` silences it.
- Do not run `next build` while the dev server runs; both use `.next`. Stop one, clear `.next`, start the other.

## Flow 05, Invite people (12 Nov 2026)
- Open it from the Team header button, the command palette ("Invite people"), or `/hub/team?invite=1` (`&inviteRole=ACCOUNTANT` preselects a role). One drawer for all three themes; grove gets the band-coloured header.
- Sending is two steps so Undo really works: `createInvites` saves people as Invited, the email goes out 8 seconds later (`deliverInvites`, timer in `ui/invite-sender.js`). If the tab closes first, `flushDueInvites` (called by `getTeam`) sends it on the next Team page load.
- The link token is made at delivery and only its hash is stored. Resend makes a new token and the old link stops working.
- Accept page: `/invite/[token]` (new person: name + password; existing account: sign in as the invited email, then "Accept invite").
- Emails go to `EmailLog` (see `/dev/emails`); no real mail provider yet.
- Known gaps: Google sign-in on the accept page; the inviter is not notified (no notifications table yet, only the audit event); "Reports to" is a plain select, not the avatar combobox; "Add seats" has no link until Billing exists; a person who already belongs to another organization accepts fine but must switch organization to see the new one; pastel's "Invite an accountant" empty-slot entry and floating bar are not built.
- After changing `prisma/schema.prisma`, restart the dev server (it keeps the old Prisma client otherwise).
- `tests/unit/auth-flow.test.js` "locks an address after 20 failures across emails" can exceed the 5 second limit on a slow machine (20 password hashes); it is unrelated to invites.

## Flow 08, Pending invites (12 Nov 2026)
- Tab "Invites" at `/hub/team/invites` (all three themes; glass now has People and Invites tabs). The tab count comes from `pendingInviteCount`, the same query the list uses. Managers see only invites they sent.
- Resend: once an hour per invite, subject "Reminder: ...". Revoke removes the person and frees the seat; the invite row stays (`Invite.membershipId` is now nullable, set null on removal) so the old link says "no longer valid".
- "Copy invite link" makes a NEW link and copies it (links are stored hashed, so the old one cannot be shown); owners and admins only; dates unchanged; no email.
- Expired invites stay listed with "Send new invite" for 30 days after expiry.
- The seed now creates a real invite for Lena Fischer (sent 2 days ago), so the tab is not empty in demo data.
- Not done: the dashboard "Needs attention" entry (flow 03).

## Flow 09, Shared data (12 Nov 2026)
- Tab "Shared data" at `/hub/team/shared-data`, owners and admins only. Table `SharedDataSetting` (one row per organization and app; no row = defaults in `shared-data-rules.js`, the spec's proposed table, still to confirm with the client).
- Projects need Clients both ways (Clients off turns Projects off; Projects on turns Clients on). Turning off something an app relies on asks first, with the consequence text from `CONSEQUENCE`. Undo restores all three switches of the app.
- IMPORTANT: no app reads these settings yet (the apps are not built). Every app must check `SharedDataSetting` (through `getSharedData`-style helpers, scoped by organization) when it reads contacts, clients or projects.
- The seed clears shared-data rows for the demo organization so tests start from the defaults.
- Layout change (12 Nov): all three shells now fill the window width (no 1440px cap) with 40px padding around the page content (24px below 1100px).

## Roles and permissions page (12 Nov 2026)
- `/hub/team/roles` (tab "Roles 6" in glass and grove; pastel opens it as a drawer from the "Roles & permissions" pill, `?roles=1`). Read-only. The rows live in `roles-rules.js`; `tests/unit/roles-rules.test.js` fails if the page says something the permission helpers do not enforce, so update both together.
- Decision: the invite drawer keeps the Client role (the Figma Team frame shows four roles).
