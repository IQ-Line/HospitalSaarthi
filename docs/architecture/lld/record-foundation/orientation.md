# Record Foundation — Module Orientation

**For the developer who just got assigned to Record Foundation.** 10-minute read; points you at the 4-5 files you'll actually touch.

---

## What this module does, in one paragraph

Record Foundation is the **fifth core platform module**: the substrate for ABDM care contexts and immutable FHIR Document Bundles. Clinical modules (OPD, IPD, Lab) finalise events and emit `<module>.<event>.finalized` events with their FHIR resources attached; Record Foundation **composes** those resources into a Document Bundle per the NRCeS profile, stores it byte-exactly, and registers a `care_contexts` row that Integration Hub uses for ABDM linkage. Also receives external-HIP bundles (M3 HIU) into the external-record inbox with consent-driven erasure scheduling.

Lives in `modules/record-foundation/`, deployed in `services/record-foundation-svc/` (always-on core module per [ADR-0028](../../adr/0028-record-foundation-fifth-core-module.md)).

---

## Where to start

1. **[ADR-0028](../../adr/0028-record-foundation-fifth-core-module.md)** — why this module exists and what makes it the fifth core (not an EMR product).
2. **[ADR-0022](../../adr/0022-immutable-fhir-document-storage.md)** — the byte-exact storage rule. **The load-bearing decision** for this module; if you only read one document, read this.
3. **[ADR-0023](../../adr/0023-distributed-fhir-assembly.md)** — per-module FHIR serialisers + central Composition assembly. Clarifies who owns what.
4. **[HLD 02 §5](../../hld/02-core-modules.md#5-record-foundation)** — purpose / owns / exposes / depends-on.
5. **[01-schema-design.md](./01-schema-design.md)** — 6 tables.
6. **[02-scenarios.md](./02-scenarios.md)** — 8 sequence diagrams: HIP disclosure, HIU ingestion, finalisation, erasure.
7. **[dev-guide.md](./dev-guide.md)** — your phased checklist.

Then the cheat-sheet: **[docs/architecture/dev-cheatsheet.md](../../dev-cheatsheet.md)**. Pin it.

---

## The 4-5 files you'll touch most

| Path (after scaffold) | What | When you edit |
|---|---|---|
| `modules/record-foundation/src/use-cases/compose-document-bundle.ts` | Takes a clinical-event payload + a profile id, calls `@hims/ts-sdk-fhir` builders, runs validation, returns the Bundle. | Every new document-type support. |
| `modules/record-foundation/src/use-cases/store-bundle.ts` | Computes canonical JSON (RFC 8785 / JCS), hashes, inserts into `bundle_storage`, links via `record_bundle_manifests`. | Set-and-forget after Phase 1c. |
| `modules/record-foundation/src/use-cases/register-care-context.ts` | INSERT into `care_contexts` with the bundle's profile + display fields; triggers ABDM linkage flow downstream. | Each new clinical-source type. |
| `modules/record-foundation/src/events/consumers/<module>-finalized.ts` | Subscribers for `consultation.finalized` (OPD), `lab-report.finalized` (Lab), `discharge.finalized` (IPD). Each calls the composition pipeline. | Each new clinical source. |
| `modules/record-foundation/src/data-access/drizzle-<entity>-repository.ts` | Repositories for `care_contexts`, `record_bundle_manifests`, `bundle_storage`, `external_health_records`, `erasure_log`. | Adding queries. |
| `specs/openapi/record-foundation.v1.yaml` | API contract (timeline read endpoints, disclosure-on-consent endpoints used by Integration Hub). | Change endpoint shape. |
| `packages/ts-sdk-fhir/src/` | Shared FHIR builders + validators. **Cross-module — coordinate with whoever else is consuming it (OPD primarily).** | Building support for a new NRCeS profile. |

---

## The mental model

> **A Document Bundle, once finalised, is byte-immutable.** It is hashed with canonical JSON, stored in `bundle_storage` (INSERT-only, never UPDATE), and registered in `record_bundle_manifests`. Subsequent corrections create *new* bundles with a `Composition.relatesTo` pointing at the previous (`replaces` semantics). **Record Foundation never amends a bundle in place.** External HIPs' bundles are stored as-received (we don't re-validate; we trust the source's declared profile conformance) and erased on consent expiry.

If you remember nothing else:
1. **No UPDATE on `bundle_storage`.** Ever.
2. **Canonical JSON before hashing.** Different whitespace = different hash = different bundle. RFC 8785 / JCS.
3. **`@hims/ts-sdk-fhir` does the heavy lifting** — builders, validators, profile registry. Don't reinvent FHIR resources by hand.
4. **The clinical module ships its own FHIR resources** (per ADR-0023). Record Foundation composes; OPD/IPD/Lab serialise.

---

## What to ignore in Phase 1

- **MRD-specific workflows** — separate module post-Phase 4.
- **AI summarisation, longitudinal-view UI** — Phase 4 EMR product builds on top of Record Foundation; Record Foundation v1 has no specialty UI of its own.
- **Bundle versioning beyond `Composition.relatesTo`** — FHIR's amendment semantics are sufficient.
- **A separate `external_record_audit` table** — [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md). Use `erasure_log` (which already exists; it's a domain-required append-only log, not an audit table) + rich `external-record.received` and `external-record.erased` events.

---

## Common pitfalls

| Trap | What to do instead |
|---|---|
| "I'll regenerate the bundle on every read for fresh data." | Bundles are byte-immutable. Store once at finalisation; re-render the stored bytes. See [ADR-0022](../../adr/0022-immutable-fhir-document-storage.md). |
| "Let me UPDATE `bundle_storage` to fix a typo in the Composition narrative." | New bundle with `Composition.relatesTo` of type `replaces`. The old bundle row stays. |
| "I'll let OPD write directly to `care_contexts`." | OPD emits `consultation.finalized`; Record Foundation's consumer creates the care_context. Module boundary. |
| "I'll re-validate external HIP bundles before storing them." | Don't. Store as-received with `validation_status='not_validated'`. We trust the source's declared profile. |
| "Let me hash the bundle JSON as-is." | Canonical JSON (`@hims/ts-sdk-fhir`'s canonical-json helper, RFC 8785) before hashing. Whitespace matters. |

---

## When you hit a decision the LLD doesn't cover

Look in **[dev-doubts/01.md](./dev-doubts/01.md)** — 12 implementation choices with recommendations.
