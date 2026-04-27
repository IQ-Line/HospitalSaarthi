# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform is a multi-module, multi-tenant system targeting the AIIMS EOI scope (~38 functional modules) with a hard requirement to support fragmented adoption — hospitals running individual modules alongside legacy systems, or any subset up to the full platform. The architecture has many cross-cutting decisions (identity, authorization, multi-tenancy, integration, data ownership) that affect every module and every team. We need a durable, reviewable record of those decisions, why they were made, what alternatives were considered, and what trade-offs were accepted.

Without such a record, decisions get re-litigated in design reviews, new team members lack context for why things are shaped the way they are, and the rationale behind any given pattern is lost as the team grows.

## Decision drivers

- Many teams (or one team building many modules) need a shared, citable source of truth on architectural patterns.
- AIIMS EOI and similar procurement processes expect documented architectural rationale.
- New decisions will continue to arise; the system must support adding decisions without rewriting old ones.
- Reviewers should be able to engage with one decision at a time.

## Considered options

1. **Markdown ADRs in the repo (MADR format)** — one decision per file, numbered, version-controlled alongside code.
2. **Confluence / wiki pages** — long-form architecture docs in the company wiki.
3. **No formal record** — rely on tribal knowledge and Slack history.

## Decision outcome

Chosen option: **Markdown ADRs in the repo (MADR format)**, because they are version-controlled, diff-able in PRs, co-located with the system they describe, and impose minimal tooling overhead. The MADR format is widely adopted and gives reviewers a predictable structure.

### Consequences

**Positive:**

- Decisions are reviewable in pull requests like any other change.
- ADRs survive team turnover; new engineers can read the chain of decisions.
- One decision per ADR keeps reviews focused and superseding decisions cleanly handled.

**Negative / accepted trade-offs:**

- Requires discipline to write ADRs as decisions are made, not retroactively.
- Discoverability is weaker than a wiki for non-engineering stakeholders. Mitigated by maintaining a top-level `adr/README.md` index and a curated final architecture overview document.

**Follow-up actions:**

- [x] Establish `adr/` directory and template (this commit).
- [ ] Write ADRs for each settled architectural decision listed in HANDOFF §2.
- [ ] Add ADR index (`adr/README.md`) listing every ADR with status and one-line summary.

## Pros and cons of the options

### Markdown ADRs in the repo

- *Good:* version-controlled, diff-able, lives with the code.
- *Good:* MADR is a known format with template support.
- *Good:* Forces one-decision-per-document discipline.
- *Bad:* Less accessible to non-engineering readers than a wiki.

### Confluence / wiki

- *Good:* Familiar to non-engineering stakeholders.
- *Bad:* Not version-controlled in any meaningful sense; edit history is weak.
- *Bad:* Encourages mega-pages that mix many decisions.

### No formal record

- *Good:* Zero overhead.
- *Bad:* Decisions get re-litigated; rationale is lost; new team members lack context.
- *Bad:* Fails any procurement or audit process that expects documented architecture rationale.

## Links

- Template: [0000-template.md](./0000-template.md)
- MADR project: <https://adr.github.io/madr/>, accessed YYYY-MM-DD
- Michael Nygard's original ADR proposal: <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>, accessed YYYY-MM-DD
