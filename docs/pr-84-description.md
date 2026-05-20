## Summary

- Wire visit registration to billing APIs (charges → discount → finalize → payment).
- Desk line amounts (`unit_price`, tax, discount) sent as charge overrides; catalog row required in `tariff_master`.
- Tariff master UI under `/billing-and-finance/tariff-master`; legacy `/billing/*` redirects.
- No SQL/Alembic seed files in this PR (create `REG_FEE` / `CONS_GENERAL` via Tariff Master UI).

## Dev env

- `BILLING_USE_MOCK_DATA=false`
- `BILLING_ALLOW_DESK_PRICE_OVERRIDE=true` (billing-svc only; Phase 0 dev gate until Cerbos `billing:bills:override-price`)

## QA notes

- Provider selection does not yet change consultation rack price (`CONS_GENERAL`, `provider_id: null`).
- Consultation fee must be entered manually when a provider is selected (> ₹0).
