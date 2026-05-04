# API and Event Contracts

This directory contains the language-agnostic contracts that define module boundaries.

## Structure

```
specs/
├── openapi/          # OpenAPI 3.1 specs — one per module
│   ├── user-management.v1.yaml
│   ├── configurator.v1.yaml
│   └── ...
├── events/           # Event payload schemas — one per module
│   ├── _envelope.schema.json    # Standard event envelope
│   ├── user.events.yaml
│   └── ...
└── README.md
```

## Authoring rules

1. **Spec first.** Write or update the spec before writing handler code.
2. **One spec per module.** Named `<module-name>.v<version>.yaml`.
3. **Breaking changes = new version.** New optional fields or endpoints are non-breaking and go in the current version. Removing fields, changing types, or removing endpoints require a new version file.
4. **Every endpoint requires auth.** Use `security: [{ bearerAuth: [] }]` unless the endpoint is explicitly public.
5. **Tenant header.** All tenant-scoped endpoints require `iq_tenant_id` header parameter.
6. **Event payloads are rich.** Include all fields consumers might project — not just IDs. See [Module Build Order §7](../docs/architecture/analysis/02-module-build-order.md).
