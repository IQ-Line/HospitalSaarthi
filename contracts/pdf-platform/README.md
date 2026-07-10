# pdf-platform report contract (vendored)

`report-contracts.schema.json` is the **single source of truth** for the report
request bodies HIMS sends to the external `pdf-platform` service
(`IQ-Line/smart-report-v2`) at `POST /v1/pdf/reports/:slug`.

It is a JSON-Schema bundle whose `definitions` are keyed by PascalCase type names
(`OpdReceiptReportRequest`, …), with a `reportTypes` map from report **slug** to
type name. HIMS's TypeScript and Python clients are **generated from this file** —
never hand-edit the generated types, and never hand-edit this file.

## Provenance

- Upstream repo: `IQ-Line/smart-report-v2`
- Pinned commit: see `PINNED_REF` (currently the tip of PR #12,
  branch `feat/report-contract-schema-export`).
- Produced upstream by `pnpm --filter @pdf-platform/contracts emit-schema`
  (`zod-to-json-schema` over the Zod contract).

## Regenerating the HIMS clients from this file

```bash
make gen-report-contracts     # regenerate TS (pdf-client) + Python (opd) types
make check-report-contracts   # CI drift-gate: regenerate + fail if anything changed
```

## Bumping the pin (when the upstream contract changes)

```bash
make sync-report-contracts REF=<upstream-commit-or-branch>
```

This re-fetches `report-contracts.schema.json` from the upstream repo at `REF`,
updates `PINNED_REF`, and regenerates the clients. Review the diff to the schema
and the generated types before committing — a changed request shape is a
contract change and must be intentional.
