# Problem Statement — Overview

**Purpose:** This directory defines the problem space for the HIMS platform architecture. It documents what the system must do, who it serves, what constraints it must satisfy, and what scenarios it must handle — without prescribing how. A reader who absorbs these documents should be able to independently evaluate or propose architectural solutions.

**Audience:** Engineering leads, architects, product managers, and anyone contributing to architectural decisions.

---

## What is this project?

Design and build a Hospital Information Management System (HIMS) covering the full scope of the AIIMS New Delhi "Digital AIIMS" Expression of Interest (EOI No. 01/CF/EOI/2025). The EOI specifies approximately 38 functional areas spanning clinical operations, diagnostics, administration, and academic/research management for a 5,000-bed tertiary-care institution.

But the system is not only for AIIMS. The same platform must serve the broader Indian hospital market — from single-doctor clinics and standalone pharmacies to multi-hospital chains — as a commercial product.

## Why does this project exist?

Three converging drivers:

1. **AIIMS EOI opportunity.** AIIMS New Delhi is procuring a comprehensive digital hospital ecosystem. The EOI is a competitive bid. Winning it requires demonstrating a system that covers all 38 functional areas with compliance to ABDM, DPDP Act, NABH, NABL, JCI, and other standards.

2. **Commercial platform ambition.** The company already has a production HIMS (OPD-focused, ABDM/ABHA certified, NHA FT certified) and a LIMS + RIS-PACS system. The new platform must subsume and extend these into a product that serves diverse hospital sizes and adoption patterns.

3. **Fragmented adoption reality.** Most Indian hospitals already run some form of HIS. They will not rip-and-replace. They need to adopt modules piecemeal — one or two at a time — alongside their existing systems, with the option to grow toward full platform deployment over time. Any architecture that requires all-or-nothing deployment is commercially non-viable for the Indian market.

## What makes this hard?

The core tension is between **comprehensiveness** and **incrementality**:

- AIIMS needs a full-platform deployment covering 38 functional areas for a 5,000-bed institution with 54+ lakh OPD patients/year.
- A district hospital needs 3-5 modules running alongside a legacy system.
- A standalone pharmacy needs a single module with minimal infrastructure.
- All three must be served by the same codebase, the same team, the same product.

This tension cascades into every design decision: module boundaries, data ownership, identity management, authorization, deployment topology, and interoperability strategy.

## Document index

| Document | What it covers |
|----------|----------------|
| [01 — Business Context](./01-business-context.md) | AIIMS EOI scope, company position, existing products, market landscape |
| [02 — Constraints and Invariants](./02-constraints-and-invariants.md) | Non-negotiable requirements the architecture must satisfy |
| [03 — Scenarios](./03-scenarios.md) | Concrete deployment, adoption, and usage scenarios the system must handle |
| [04 — Stakeholders and User Populations](./04-stakeholders.md) | Who uses the system, what they need, how they interact |
| [05 — Regulatory and Compliance](./05-regulatory-and-compliance.md) | ABDM, DPDP Act, NABH, FHIR, and other standards |
| [06 — Open Questions](./06-open-questions.md) | Genuinely unresolved decisions that need collective input |
