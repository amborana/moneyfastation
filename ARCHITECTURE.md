# The Ledger — Architecture

## Target
Static PWA + Supabase Cloud.

## Client
The browser renders the UI and calls Supabase with the publishable client key. It must never contain a service-role key, database password, or OpenAI secret.

## Supabase
Tables include households, profiles, household_members, settings, categories, subcategories, monthly_budgets, yearly_budgets, expenses, other_income, recurring_items, credit_card_bills, plans, investments, investment_contributions, accounts, assets, liabilities, goals, goal_contributions, subscriptions, financial_events, and audit_log.

## Authorization
Every household-owned table uses a household membership predicate through the database security model. RLS must remain enabled on all exposed financial tables.

## Realtime
Household-scoped mutations should update the local UI and realtime subscriptions should refresh other devices.

## AI
If AI is enabled later: browser → authenticated Supabase Edge Function → OpenAI API. Never browser → OpenAI with a secret key.
