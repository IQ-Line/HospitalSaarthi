# Runtime entitlement intersection rollout runbook

## Symptom: user retains access after module disabled

1. Confirm all PEP services deployed with ADR-0032 wiring (user-management, billing, registration).
2. Check `RUNTIME_ENTITLEMENT_INTERSECTION` is not `false`.
3. Verify Configurator PATCH called UM invalidation (`UM_INTERNAL_API_KEY` set on both services).
4. Inspect UM logs for `principal_entitlement_intersection_filtered` (filtered grant counts).
5. SPA: confirm principal refetched — `refreshAuthorizationContext` runs after module toggle; hard refresh if another admin changed modules.

## Symptom: all authenticated requests fail after deploy

1. Configurator or Master Data unreachable — entitlement resolution fails closed.
2. Check `CONFIGURATOR_URL` and `MASTER_DATA_URL` on billing/registration/user-management services.
3. Temporary rollback: set `RUNTIME_ENTITLEMENT_INTERSECTION=false` on PEP services.

## Verification

```bash
pnpm exec nx run user-management:test
pnpm exec nx run user-management-svc:test
pnpm exec nx run web:test
```

Compare `GET /internal/module-entitlements/:tenantId` assignable keys with `GET /auth/principal` effective keys for a test user.
