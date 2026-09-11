# The Ledger — Test Report

## Status
Active development. **Not final production sign-off yet.**

## Verified
- Original source file retained as `budget_ledger.reference.jsx`.
- Supabase production schema exists.
- RLS is enabled on the exposed financial tables.
- Database was verified empty during development.
- Anonymous execution of onboarding RPCs was restricted.
- `index.html` JavaScript syntax check: PASS.
- Static HTTP serving: PASS during local validation.
- PWA manifest exists.
- PWA icons exist.
- Service worker registration is present.
- Dashboard six-month chart code exists and reads actual expense data.
- History page reads expense and income history by month.
- Transaction entry includes category, subcategory, note/merchant, person, payment method and plan link.

## Remaining release gates
- Full UI interaction test of every page.
- Complete original source parity audit.
- Edit/reversal edge cases.
- Robust CSV import preview/mapping/duplicate handling.
- Full cloud mutation audit for every table.
- Realtime mutation test across two authenticated sessions.
- Offline behavior test.
- Final RLS adversarial test with two households.
- Final PWA install test on actual iPhone/Android/Mac/Windows.
- Production HTTPS deployment smoke test.

## Rule
Do not label the release production-ready until all remaining gates are tested and documented.

## Overview / Dashboard update — 2026-09-11

Implemented in active `index.html`:
- Month, year, date-range and all-history dashboard scopes.
- Category, subcategory, person, payment-method and plan filters.
- KPI cards covering income, spending, cash flow, budget remaining, savings rate, net worth, recurring commitments and unpaid bills.
- Spending trend with selectable total/category/subcategory/person dimension.
- Income vs expense trend.
- Spending composition and ranking views.
- Category and subcategory trend views.
- Person and payment-method spending views.
- Budget-vs-actual view.
- Plans/goals progress and financial signals.
- Historical spending-based budget starting point.

Validation performed:
- Extracted active inline JavaScript and `node --check` PASS.
- Confirmed overview helper/function definitions are not duplicated.
- Confirmed implementation is in the active `index.html` from the handoff package.

Not yet verified:
- Full browser UI interaction of every Overview filter and chart.
- Exact financial calculation behavior against production data and edge cases.
- Two-session realtime behavior.
- Mobile/PWA visual and interaction testing.
- Full source-parity audit and remaining release gates.

## Execution update — 2026-09-11
- Transaction edit flow added for expenses and income.
- Transaction deletion now reverses linked plan savings before deleting the expense.
- CSV import now uses a quoted-field parser, preview, validation and probable-duplicate screening.
- JSON restore now requires confirmation and upserts supported household records without deleting existing data.
- PWA manifest, SVG icons and service worker are present in the active project tree.
- Inline JavaScript syntax validation: PASS.

### Still requires real environment verification
- End-to-end authenticated UI tests.
- Two-household adversarial RLS tests.
- Realtime mutation test across two authenticated sessions.
- Full cloud mutation audit across every module.
- Device-level PWA installation/offline/reconnect tests.
- Production HTTPS deployment smoke test.
- Complete source-parity audit against the original React implementation.
