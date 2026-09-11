# The Ledger — Project Handoff & Run Guide

## Purpose
The Ledger is a household financial operating system derived from the original `budget_ledger.jsx` and being migrated to a cloud-synced PWA.

## Current architecture
- Frontend: static HTML/CSS/JS PWA (`index.html` + modular JavaScript chunks)
- Cloud: Supabase Auth + PostgreSQL + RLS + Realtime
- No traditional backend server
- No financial seed data
- Browser must only contain the Supabase publishable key; never a service-role/secret key.

## Local run
### Windows
Run `RUN_LEDGER.bat` if present in the release package.

### Mac/Linux
Run `RUN_LEDGER.command` if present, or serve this folder with any simple HTTPS/static server.

Do not open `index.html` with `file://`; service workers and some browser APIs require HTTP(S).

## Cloud onboarding
1. Deploy the static frontend to an HTTPS static host.
2. Open the URL.
3. Create the first account.
4. Create a household.
5. Share the generated invite code with the second user.
6. Each device signs in with its own account.
7. All household-scoped data syncs through Supabase.

## Current implementation status
The active working tree contains the enhanced interactive Overview, transaction editing/deletion with plan reversal, guided CSV import, guided JSON restore, recurring/bill/planning/investment/goal modules, and PWA shell assets. It remains an active production-hardening build until every release gate in `plan.md` and `TEST_REPORT.md` is green.

## Source of truth
`budget_ledger.reference.jsx` is the original uploaded Ledger source. Do not remove original capabilities while improving architecture.
