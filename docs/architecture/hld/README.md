# High-Level Design Documents

These documents describe the HIMS platform architecture at the system and module level. They are the narrative companion to the [ADRs](../adr/README.md) — HLDs explain the shape and rationale; ADRs record the individual decisions.

## Documents

| # | Document | Focus |
|---|----------|-------|
| 01 | [System Overview](01-system-overview.md) | Big picture, layer model, shape constraints, open questions |
| 02 | [Core Modules](02-core-modules.md) | The four always-on platform modules in depth |
| 03 | [Module Shape Template](03-module-shape-template.md) | The contract every feature module follows |
| 04 | [AuthN/AuthZ Flow](04-authn-authz-flow.md) | End-to-end identity and access narrative |
| 05 | [Integration and Interop](05-integration-and-interop.md) | Integration Hub, FHIR/HL7, ABDM |

## Reading order

Start with 01, then 03 (the highest-value document for alignment), then 02, 04, 05. Each document is self-contained but cross-links to the others and to relevant ADRs.
