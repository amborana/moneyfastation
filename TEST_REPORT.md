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
