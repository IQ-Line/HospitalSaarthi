# HIMS Architecture Documentation

Architecture documentation for the Hospital Information Management System (HIMS), targeting the AIIMS EOI scope.

## Reading order

For the **morning meeting**, start here:

1. [System Overview](hld/01-system-overview.md) — the narrative entry point. Start with the executive summary, then walk through the layer model, core modules, and shape constraints.
2. [Core Modules](hld/02-core-modules.md) — deep dive on the four always-on platform modules.
3. [Module Shape Template](hld/03-module-shape-template.md) — the contract every feature module must follow. **Highest-value document for the meeting.**
4. [AuthN/AuthZ Flow](hld/04-authn-authz-flow.md) — end-to-end identity and access narrative.
5. [Integration and Interop](hld/05-integration-and-interop.md) — Integration Hub, FHIR/HL7 boundaries, ABDM.

## Problem statement

Start here if you want to understand **what problem we're solving** before reading how we propose to solve it:

- [Problem Statement](problem-statement/README.md) — constraints, scenarios, stakeholders, regulatory requirements, and open questions. Solution-agnostic — designed so a reader can independently evaluate or propose architectures.

## Analysis

- [Rework vs. Rebuild](analysis/01-rework-vs-rebuild.md) — thorough evaluation of the production HIMS codebase. Examines data layer coupling, ABDM portability, authorization gaps, and clinical domain complexity to arrive at a build-new-port-patterns recommendation.
- [Module Build Order](analysis/02-module-build-order.md) — phased build plan optimized for fastest path to production HIMS feature parity, then expansion toward full AIIMS EOI scope. Includes dependency graph, team allocation, natural module groupings, and the charge-capture event pattern.
- [Database Principles](analysis/03-database-principles.md) — ground rules for schema design across all modules. Covers Citus distribution, tenant isolation, cross-module boundaries, audit columns, extension strategy, and a schema review checklist. **Read before designing DB diagrams.**

## Supporting documents

- [Architecture Decision Records](adr/README.md) — individual decisions with context, alternatives, and rationale.
- [Glossary](glossary.md) — acronyms and domain terms.
- [Diagrams](diagrams/) — Excalidraw (system context, module anatomy) and Mermaid (sequences, flows).

## Reference

- [HANDOFF.md](HANDOFF.md) — the original handoff document from the design conversation. Captures all prior decisions, constraints, and the phased work plan.
- [AIIMS_EOI.md](AIIMS_EOI.md) — the AIIMS Expression of Interest document defining the ~38-module scope.

## Status

This is a **working draft** produced for an initial architecture alignment meeting. It is not a final architecture document. Open questions are surfaced explicitly in the system overview.
