# The Ledger — Production Completion Plan

## Goal
Deliver the original Ledger as a complete, production-ready, cloud-synced PWA without losing any original functionality. No financial seed data. User performs onboarding after deployment.

## Source of truth
Primary product source: `budget_ledger.reference.jsx` (original uploaded Ledger).
Every original user-visible capability must either be preserved directly or have an explicit production equivalent.

## 1. Verified original functionality — MUST NOT REGRESS

### Navigation / core
- Dashboard
- Add Expense / transaction entry
- Budgets
- History
- Planning
- Investments
- Month picker and available-month history
- Household/person switching and attribution

### Transactions
- Expense and income handling
- Date
- Amount
- Category
- **Subcategory**
- **Note / merchant**
- Person / added by
- Payment method
- Plan linking / counts-toward-plan
- Recent transactions
- Delete
- Recurring transaction linkage

### Categories
- Category creation
- Category rename
- Category deletion
- Monthly vs yearly category classification
- **Subcategory creation and management**
- Category/subcategory selection from transactions

### Budgets / income
- Monthly income by person
- Monthly category budgets
- Yearly category budgets
- Base income
- Other income
- Recurring monthly items
- Auto-add recurring expenses
- Credit-card bill tracking
- Paid/unpaid bill state
- CSV export/import
- Full reset / danger zone

### Planning
- Future expense plans
- Target amount
- Saved so far
- Target month
- Notes
- Plan contribution tracking
- Contribution updates/reversal when linked transaction is removed where applicable

### Investments
- Investment name/type/owner
- Starting value
- Notes
- Current value calculation
- Contributions
- Contribution date
- Paid by
- Contribution note
- Contribution deletion
- Investment edit/delete
- Owner breakdown

### Dashboard analytics
- Income
- Budgeted
- Spent
- Budget vs actual
- Category spending composition
- Person breakdown
- Payment-method breakdown
- Plan progress
- Six-month spending trend
- Category trend data
- Top categories
- Yearly category analysis
- Historical month view

### Data portability
- CSV export
- CSV import
- Robust quoted CSV parsing
- JSON backup/restore for full cloud/local recovery where supported
- Validation and duplicate detection during import

## 2. Production architecture

- Static HTTPS frontend/PWA
- Supabase Auth
- Supabase PostgreSQL
- Household membership model
- RLS on every exposed financial table
- Realtime subscriptions for household data
- No service-role/secret key in browser
- No traditional backend server to maintain
- No financial seed data

## 3. Data model mapping

| Original concept | Production storage |
|---|---|
| categories | categories |
| subcategories | subcategories |
| monthly budget | monthly_budgets |
| yearly budget | yearly_budgets |
| expense | expenses |
| other income | other_income |
| recurring | recurring_items |
| credit card bills | credit_card_bills |
| future plans | plans |
| plan contributions | expense linkage / plan state |
| investments | investments |
| investment contributions | investment_contributions |
| people | profiles + household_members + owner/attribution fields |
| base income | settings.base_income |
| accounts | accounts |
| assets | assets |
| liabilities | liabilities |
| goals | goals + goal_contributions |
| subscriptions | subscriptions |
| financial calendar | financial_events |
| audit trail | audit_log |

## 4. Frontend completion work

### Phase A — Source parity
- Reconstruct every original screen and interaction.
- Replace simplified placeholder pages with functional implementations.
- Ensure every original button has a working action.
- Ensure charts render from actual data, not demo data.

### Phase B — Transaction system
- Complete add/edit/delete transaction flows.
- Category → subcategory dependency.
- Notes/merchant.
- Person attribution.
- Payment method.
- Plan linkage.
- Income and expense handling.
- Validation and confirmation states.

### Phase C — History + analytics
- Month navigation.
- Historical transaction list.
- Six-month trend.
- Category trend.
- Budget-vs-actual chart.
- Category composition.
- Person/payment breakdowns.
- Yearly analysis.
- Empty/loading/error states.

### Phase D — Budgets and recurring
- Monthly budgets.
- Yearly budgets.
- Base income.
- Other income.
- Category/subcategory management.
- Recurring expenses.
- Automatic monthly materialization.
- Credit-card bills.

### Phase E — Plans and investments
- Future plans.
- Contributions.
- Linked expense contribution accounting.
- Investments.
- Contribution history.
- Edit/delete/reversal behavior.

### Phase F — Cloud synchronization
- All user financial mutations write to Supabase.
- Remove accidental local-only persistence for authoritative financial state.
- Realtime refresh.
- Household-scoped reads/writes.
- Conflict-safe refresh behavior.
- Offline/read-only handling when disconnected.

### Phase G — Import/export
- RFC-style quoted CSV parser.
- Import preview.
- Column mapping.
- Category/subcategory mapping.
- Person/payment/note mapping.
- Validation errors.
- Duplicate detection.
- Transactional batch import where practical.
- Export preserves original Ledger fields.

### Phase H — Security
- RLS verification for all tables.
- No anon access to household financial data.
- Authenticated household membership required.
- Safe onboarding functions.
- Avoid public SECURITY DEFINER functions where unnecessary.
- Audit sensitive mutations.
- Never expose service-role or OpenAI secret.

### Phase I — PWA
- Valid manifest.
- 192/512 icons.
- Service worker.
- Installable on Android/iOS where browser permits.
- Desktop install support.
- Responsive navigation.
- Offline app shell.
- Clear connection/sync status.

### Phase J — AI Copilot
- UI can explain/analyze local household data.
- Production OpenAI calls only through a secure server-side function.
- No API key in frontend.
- Household-scoped tool/data access.
- Read-only by default.
- Explicit confirmation before financial writes.
- Audit AI-triggered mutations.

## 5. Testing gates

### Static tests
- HTML validity.
- JavaScript syntax validation.
- No missing local assets.
- Manifest validation.
- Service-worker syntax validation.

### Functional tests
- First-run onboarding.
- Create household.
- Join household.
- Add category.
- Add subcategory.
- Add expense with every original transaction field.
- Add income.
- Edit/delete transaction.
- Month switching.
- Budget save/load.
- Yearly budget save/load.
- Recurring item creation and materialization.
- Credit-card bill creation/toggle/edit/delete.
- Future plan creation/contribution/edit/delete.
- Investment creation/contribution/edit/delete.
- CSV export/import.
- Backup/restore.
- Sign out/sign in.
- Realtime change from second session.

### Security tests
- Anonymous user cannot read financial tables.
- User A cannot read User B's household.
- User outside household cannot access household rows.
- Member cannot change household ownership fields.
- Service-role key never appears in frontend.

### Production smoke test
- Deployed HTTPS URL.
- Chrome desktop.
- Safari/iPhone installation path.
- Android installation path.
- Desktop PWA installation path.
- Cross-device sync.

## 6. Release criteria

Do NOT call the app production-ready until:
1. Every MUST-NOT-REGRESS feature is implemented.
2. Charts/trends/history are visible and driven by real stored data.
3. Every major module can create, read, edit, and delete its data where applicable.
4. All authoritative financial data is cloud-backed.
5. RLS/security tests pass.
6. Import/export works with quoted CSV fields.
7. PWA assets and service worker validate.
8. No seeded personal/financial data exists.
9. A final ZIP is generated.
10. Deployment instructions are simple enough for non-server maintenance.

## 7. Current status

- Supabase schema: implemented.
- Supabase RLS: implemented and verified at table/policy level.
- Database: intentionally empty.
- PWA shell: implemented.
- Current frontend: **INCOMPLETE — simplified reconstruction; source-parity work is required.**
- Next priority: rebuild the frontend around the complete original functionality, then test each release gate before issuing a final production ZIP.

## 6. Execution log — 2026-09-11
- Re-verified original source inventory against uploaded `budget_ledger.jsx`.
- Retained original source in project as `budget_ledger.reference.jsx`.
- Added project handoff documentation: `PROJECT_DESCRIPTION.md`, `FEATURE_MATRIX.md`, `ARCHITECTURE.md`, `TEST_REPORT.md`, `CONTINUATION_PROMPT.md`.
- Active frontend remains `index.html`.
- Dashboard contains a six-month spending trend based on actual household expense records.
- History contains month selection and expense/income rows with category, subcategory, note, person and payment information.
- Analytics contains six-month trend and category composition views in addition to person/payment breakdowns.
- PWA manifest/icons/service-worker assets are present.

## 7. Release rule
No final production ZIP may be described as production-ready until every item in Sections 4 and 5 is implemented/tested or explicitly waived by the user. In particular, missing functionality must never be hidden behind empty placeholder cards.

## 4A — Overview / Dashboard implementation update (2026-09-11)

Status: [~] Implemented; verification remains required.

The active `index.html` now contains an expanded Overview financial analytics center with:
- Month-wise and broader historical dashboard scopes.
- Global filters for month, year, date range, category, subcategory, person, payment method and plan.
- KPI cards for income, spending, net cash flow, budget remaining, savings rate, net worth, recurring commitments and upcoming bills.
- Spending trend with selectable dimension: total, category, subcategory or person.
- Income vs expense trend.
- Category/subcategory composition and ranked spending views.
- Category trend and subcategory trend views.
- Person and payment-method spending analysis.
- Budget-vs-actual analysis.
- Plans/goals progress and commitment indicators.
- Historical-budget starting-point planner using observed spending history rather than seeded/demo financial data.
- Financial signal cards for expense/income ratio, budget usage, over-budget categories and planned commitments.

The dashboard uses current cloud-loaded state and does not insert financial seed data.

Verification still required: full browser interaction testing, source-parity audit, financial calculation edge cases, realtime/two-session behavior, mobile/PWA behavior and final security/RLS tests.

## Execution log — 2026-09-11 (continued)
- Implemented transaction edit for expense/income records.
- Implemented linked-plan contribution reversal on expense deletion.
- Upgraded CSV import with RFC-style quoted parsing, preview, validation and duplicate screening.
- Implemented guided JSON restore with explicit confirmation and household-scoped upsert.
- Added/verified PWA manifest, icons and service worker in the active project tree.
- Status remains `[!] Needs verification` for end-to-end, security, realtime, device/PWA and deployment gates.
