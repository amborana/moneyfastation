# The Ledger — Original Feature Matrix

| Area | Original capability | Production requirement |
|---|---|---|
| Navigation | Dashboard | Preserve |
| Navigation | Add Expense | Preserve as Add Transaction |
| Navigation | Budgets | Preserve |
| Navigation | History | Preserve |
| Navigation | Planning | Preserve |
| Navigation | Investments | Preserve |
| Transactions | Expense/income | Cloud-backed |
| Transactions | Date | Required |
| Transactions | Amount | Required |
| Transactions | Category | Required for expense |
| Transactions | Subcategory | Required capability |
| Transactions | Note / merchant | Required capability |
| Transactions | Person / added by | Required |
| Transactions | Payment method | Required |
| Transactions | Plan link | Required |
| Transactions | Recent transactions | Required |
| Transactions | Delete | Required |
| Categories | Create/rename/delete | Required |
| Categories | Monthly/yearly classification | Required |
| Categories | Subcategory management | Required |
| Budgets | Monthly income by person | Required |
| Budgets | Monthly category budgets | Required |
| Budgets | Yearly category budgets | Required |
| Budgets | Base income | Required |
| Budgets | Other income | Required |
| Budgets | Recurring items | Required |
| Budgets | Auto-add recurring expenses | Required |
| Budgets | Credit-card bills | Required |
| Budgets | Paid/unpaid bills | Required |
| Planning | Future expense plans | Required |
| Planning | Target/saved/month/notes | Required |
| Planning | Contribution tracking | Required |
| Investments | Holdings/type/owner | Required |
| Investments | Starting value | Required |
| Investments | Notes | Required |
| Investments | Contributions/date/by/note | Required |
| Investments | Edit/delete | Required |
| Analytics | Income/budget/spent | Required |
| Analytics | Budget vs actual | Required |
| Analytics | Category composition | Required |
| Analytics | Person/payment breakdown | Required |
| Analytics | Six-month trend | Required |
| Analytics | Category trend | Required |
| Analytics | Top categories | Required |
| Analytics | Yearly analysis | Required |
| History | Month picker | Required |
| Data | CSV import/export | Required |
| Data | Quoted CSV parser | Required |
| Data | Import validation/duplicates | Required |
| Data | JSON backup/restore | Required |
| Safety | Full reset | Required |
| Cloud | Auth/household | Required |
| Cloud | RLS | Required |
| Cloud | Realtime | Required |
| PWA | Manifest/icons/service worker | Required |

## Overview analytics expansion — 2026-09-11

| Area | Capability | Implementation status |
|---|---|---|
| Dashboard | Month-wise / historical scope | [x] Implemented; needs browser verification |
| Dashboard | Global filters: month/year/date range/category/subcategory/person/payment/plan | [x] Implemented; needs browser verification |
| Dashboard | KPI financial command center | [x] Implemented; needs calculation verification |
| Analytics | Spending trend with selectable dimension | [x] Implemented; needs browser verification |
| Analytics | Income vs expense trend | [x] Implemented; needs browser verification |
| Analytics | Category/subcategory composition | [x] Implemented; needs browser verification |
| Analytics | Category/subcategory trend | [x] Implemented; needs browser verification |
| Analytics | Person/payment-method analysis | [x] Implemented; needs browser verification |
| Analytics | Budget vs actual | [x] Implemented; needs calculation verification |
| Analytics | Plans/goals/commitment indicators | [x] Implemented; needs browser verification |
| Budgets | Historical starting-point budget planner | [x] Implemented as guidance; does not auto-save |
