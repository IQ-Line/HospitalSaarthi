## Re-review follow-up (`a89394f` must-fixes A/B/C)

### Must-fix

| Item | Resolution |
|------|------------|
| **A** Price overrides without permission gate | `validateDeskPricingPolicy` in `desk-pricing-policy.ts`: overrides require `BILLING_ALLOW_DESK_PRICE_OVERRIDE=true` on billing-svc, `source_module=registration`, and `unit_price_override > 0`. Returns `403 FORBIDDEN` otherwise. Phase 0 dev gate until Cerbos `billing:bills:override-price`. |
| **B** `deskTariff` synthesizes catalog rows | Removed entirely. `capture-charge` returns `NOT_FOUND catalog_row_not_found` when no active tariff; overrides only adjust an existing row snapshot. |
| **C** `load-env.ts` divergent from monorepo | Deleted. `billing-svc/project.json` uses Nx `envFile: "{workspaceRoot}/.env"` like other services. |

### Should-fix (addressed in this commit)

| Item | Resolution |
|------|------------|
| **D** `BILLING_DEV_TENANT_ID` → live dev UUID | Tenant fallback only when `BILLING_USE_MOCK_DATA=true`; default `00000000-0000-0000-0000-000000000007`. Real DB path requires tenant header via `tenantPlugin`. |
| **E** Consultation defaults to ₹0 | `visitRegistrationFormBlockers` blocks submit when provider selected and `consultation_fee.unit_price <= 0`. Tariff hydration from `CONS_GENERAL` deferred (TODO in code + PR description). |

### Prior review (unchanged / deferred)

- **7** Route dedup (`billing/` vs `billing-and-finance/`): redirects kept; follow-up issue.
- **2b** Alembic `034_frontdesk_finance_module_catalog.py`: removed from this branch (`124d3f0`); catalog in PR #83.
- **11** PR description: see `docs/pr-84-description.md` for updated summary bullets.

### Local dev

```env
BILLING_USE_MOCK_DATA=false
BILLING_ALLOW_DESK_PRICE_OVERRIDE=true
```

Create rack tariffs `REG_FEE` and `CONS_GENERAL` (provider blank) in Tariff Master before visit registration.
