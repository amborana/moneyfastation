# The Ledger — Project Description / Continuation Context

## Product goal
Build a polished, secure, multi-device household finance PWA that preserves the original Ledger functionality while adding cloud synchronization and modern finance-OS features.

## Non-negotiables
- Preserve original functionality.
- Categories AND subcategories.
- Transaction notes/merchant field.
- Expense and income handling.
- Person attribution and household members.
- Payment methods.
- Plan linking and contribution behavior.
- Monthly/yearly budgets.
- Base income and other income.
- Recurring expenses.
- Credit-card bill tracking.
- Future plans.
- Investments and contribution history.
- Dashboard charts/trends.
- History/month navigation.
- CSV import/export.
- Full reset/danger zone.
- No financial seed data.
- Supabase household-scoped cloud sync.
- RLS on exposed financial tables.
- No service-role or OpenAI secrets in the browser.
- No traditional backend server to maintain.

## Current Supabase project
Project ref: `aoupsryzexkauzwccnpi`
Project URL: `https://aoupsryzexkauzwccnpi.supabase.co`

## Database status
The database was intentionally verified empty during development. Do not add demo financial records.

## Current frontend
`index.html` is the active static PWA implementation. It has cloud auth, household onboarding, cloud data loading, realtime subscriptions, transaction/category flows, budgets, planning, investments, net worth, goals, bills, analytics, CSV/JSON export, and PWA shell. It is still being brought to complete source parity.

## Original source inventory
See `FEATURE_MATRIX.md` and `budget_ledger.reference.jsx`.

## How to continue
1. Read `plan.md`.
2. Read `FEATURE_MATRIX.md`.
3. Read `TEST_REPORT.md`.
4. Inspect `index.html` and compare behavior with `budget_ledger.reference.jsx`.
5. Implement the next unchecked plan item.
6. Test it.
7. Update `TEST_REPORT.md`.
8. Only then package a release.
