# Problem Statement

This directory defines the problem space for the HIMS platform architecture — what the system must do, who it serves, what constraints it must satisfy, and what scenarios it must handle. It is deliberately solution-agnostic: a reader who absorbs these documents should be able to independently evaluate or propose architectural solutions.

For the proposed architectural solutions, see the [HLD](../hld/) and [ADR](../adr/) directories.

## Documents

| # | Document | Summary |
|---|----------|---------|
| 00 | [Overview](./00-overview.md) | What this project is, why it exists, what makes it hard |
| 01 | [Business Context](./01-business-context.md) | AIIMS EOI scope (38 functional areas), company products, Indian hospital market |
| 02 | [Constraints and Invariants](./02-constraints-and-invariants.md) | 10 non-negotiable requirements: fragmented adoption, multi-tenancy, data ownership, interop, identity, authorization, hierarchy, audit, deployment spectrum, performance |
| 03 | [Scenarios](./03-scenarios.md) | 18 concrete scenarios: deployment (5), adoption/migration (3), clinical workflow (7), integration (3) |
| 04 | [Stakeholders](./04-stakeholders.md) | User populations: clinical staff, administrative staff, hospital administrators, patients, external systems, service accounts |
| 05 | [Regulatory and Compliance](./05-regulatory-and-compliance.md) | ABDM, DPDP Act, NABH/NABL, JCI, FHIR/HL7/DICOM, MeitY cloud, security standards |
| 06 | [Open Questions](./06-open-questions.md) | 10 unresolved decisions needing collective input |

## How to read

**If you have 15 minutes:** Read [00-Overview](./00-overview.md) and [02-Constraints](./02-constraints-and-invariants.md).

**If you have 30 minutes:** Add [03-Scenarios](./03-scenarios.md) — the scenarios make the constraints concrete.

**If you have an hour:** Read everything. The documents are designed to be read in order.
