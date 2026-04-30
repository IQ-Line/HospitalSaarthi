# 06 — Open Questions

These are genuinely unresolved decisions. They are listed here because they affect the architecture and require collective input — they cannot be resolved by one person in isolation. Each question includes the context needed to form an opinion and the trade-offs involved.

---

## Q1. What is the minimum viable deployment footprint?

**Context:** The architecture supports a spectrum from full Kubernetes deployment (AIIMS) to a hypothetical single-process "lite" mode (standalone pharmacy). The question is: what is the smallest deployment the team commits to supporting in the initial release?

**Options:**
- **Kubernetes service mode only.** Every module runs as a pod. Simplest to build and test — one deployment model. But this makes the platform unusable for very small tenants (clinics, pharmacies) who don't have Kubernetes infrastructure.
- **Kubernetes + embedded lite mode.** Module code is structured as libraries that can run either as individual services (Kubernetes) or as libraries within a single process. The lite mode reuses the same business logic with in-process adapters. This expands the addressable market to small tenants but requires every module to be built as a library first.
- **Kubernetes only initially, lite mode as a future phase.** Design the modules as libraries (so lite mode is architecturally possible) but don't invest in the lite packaging for v1. Focus on service mode.

**Why it matters:** If lite mode is a v1 requirement, every module team must build with library-first discipline from day one. If it's a future phase, teams can take shortcuts that make lite mode harder later.

---

## Q2. Is EMPI (Patient Identity) a core platform module?

**Context:** The initial architecture identifies three core modules: User Management, Configurator, and Master & Tenant Data. The proposed addition is a fourth: EMPI / Patient Identity.

**The case for EMPI as core:** Every realistic HIMS deployment includes patient-facing modules. Without a single patient identity authority, the same patient accumulates multiple identities across modules — a documented patient safety risk. ABDM compliance requires linking patient records to ABHA, which is impossible if patient identity is fragmented. Fragmented adoption (where some modules are platform-native and some are legacy) specifically requires a central identity resolver that links platform IDs to legacy MRNs.

**The case against EMPI as core:** Under a strict definition, "core" means required by every possible module combination. A deployment consisting only of Building Management + Equipment Maintenance does not need patient identity. Adding EMPI as core adds a hard runtime dependency for every patient-facing operation — if EMPI is down, patient registration fails.

**The compromise position:** EMPI is core for any deployment that includes patient-facing modules (which covers every hospital). It is omittable only for purely administrative deployments. This is an honest distinction.

**What the team needs to decide:** Is this compromise acceptable, or does the strict definition of "core" stand? If EMPI is not core, what is the alternative for patient identity management?

---

## Q3. How should global reference data and tenant-specific overrides relate?

**Context:** The platform needs global reference datasets (ICD codes, drug catalogs, LOINC codes) and per-tenant customization (a hospital's formulary, local naming conventions, department-specific code subsets).

**Option A — Inheritance model:** Global defaults are the base layer. Tenant overrides are deltas layered on top. The service resolves the merge internally and returns the effective data to consumers. Consumers never see the two-layer model.
- *Advantages:* Single consumer API, no merge logic in consuming modules, minimal duplication, global updates propagate automatically.
- *Disadvantages:* Internal merge logic adds complexity, harder to audit exactly what a tenant is running, override precedence must be well-defined.

**Option B — Separate types:** Global master data and tenant data are distinct types stored separately with no inheritance. Tenants either copy the global dataset and customize it, or consuming modules query both sources and merge at the application level.
- *Advantages:* Simpler mental model, clear ownership boundaries.
- *Disadvantages:* Massive duplication (drug catalogs have thousands of entries), synchronization burden when global data updates (drug recalls, new ICD codes must update every tenant copy), and if modules merge instead of copying, each module implements its own merge logic.

**What the team needs to decide:** Which approach? Or is there a hybrid?

---

## Q4. How should ~38 functional areas be grouped into deployment units?

**Context:** The 38 items in the AIIMS EOI are functional groupings, not necessarily individual services. Some may be combined into a single deployment unit where they share data models, workflow coupling, or scaling characteristics.

**Examples of likely groupings:**
- OPD + Appointment Scheduling + Queue Management → "OPD Service"
- Birth Registration + Death Registration + Issue of Certificates → "Civil Registration Service"
- OT Management + Cath Lab Management → "Surgical Services"

**A pragmatic concern:** Modules must justify being separate services. Not all 38 deserve their own running service — some should be grouped to reduce operational overhead.

**What the team needs to decide:** What criteria determine when two functional areas belong in one deployment unit vs. separate units? (Proposed criteria: shared data model, tight workflow coupling, same scaling characteristics, same team ownership.)

---

## Q5. What event bus technology?

**Context:** Inter-module communication is event-driven. The event bus technology is not yet chosen.

**Candidates:** Kafka, NATS, RabbitMQ, Azure Service Bus, Azure Event Hubs.

**What matters:**
- At-least-once delivery guarantee (events must not be silently lost).
- Ordering guarantees within a partition/subject (events for the same patient should be processed in order).
- Consumer group support (multiple instances of a module process events in parallel without duplication).
- Operational complexity (Kafka requires significant operational investment; managed services reduce this).
- Azure-native options may be preferred given AKS as the target deployment platform.

---

## Q6. What is the EMPI deduplication strategy?

**Context:** Patient deduplication is the process of detecting when two apparently different patient records are actually the same person. This is a hard problem with no perfect solution.

**Starting position:** The production `hims-production` project uses a rule from ABDM/NHA: phonetically similar name, age within ±2 years, same gender, same phone number. This is a deterministic matching rule.

**Future aspiration:** Probabilistic matching (Fellegi-Sunter family) for more sophisticated deduplication — assigning match probabilities based on multiple weighted fields, with human review for ambiguous cases.

**What the team needs to decide:** Is the deterministic matching rule sufficient for v1? What is the timeline for probabilistic matching? What is the human review workflow for ambiguous matches?

---

## Q7. Configurator UI — part of the main application or separate?

**Context:** The Configurator needs an admin interface. This interface could be part of the same web application as the clinical UIs (route-separated, same application shell) or a separate admin application.

**Current position:** Part of the main application for v1 (simpler deployment, shared authentication). Separate application considered for a future phase if operational or UX requirements justify the split.

**What the team needs to decide:** Is this the right default? Are there security or operational reasons to separate admin and clinical UIs from the start?

---

## Q8. Cerbos policy storage — Git-only or Git + database?

**Context:** Cerbos supports two policy storage models:
1. **Git-based:** Policies authored as YAML files, versioned in Git, tested in CI, distributed as bundles to PDP sidecars.
2. **Database-backed (Admin API):** Policies stored in a database, managed via an API. Enables runtime policy changes without Git commits.

**Current position:** Git-only as the default. Database-backed as an escape hatch for cases where runtime policy changes are genuinely needed and the Git pipeline is too slow.

**The concern:** If all policy changes require a Git commit and CI pipeline, how fast can a hospital administrator change a permission? Is that fast enough for operational needs?

**The counter-concern:** Database-backed policies bypass version control, code review, and CI testing. A misconfigured policy could grant unintended access to patient data. The audit trail for Git-based policies is stronger (Git history = complete policy audit trail).

---

## Q9. Frontend strategy

**Context:** The platform needs a web frontend and mobile applications (Android/iOS per EOI requirement). The frontend strategy is not yet defined.

**Questions:**
- Single web application with route-separated views for different user roles, or separate applications?
- What frontend framework?
- How does the frontend consume authorization data to show/hide UI elements?
- How does the mobile-first requirement (EOI Section 3.2) interact with the web application strategy?
- Indian language support (as required by EOI) — how is localization handled?
- Speech-to-text and text-to-speech — platform-native or third-party?

---

## Q10. How should the production HIMS and LIMS/RIS-PACS relate to the new platform?

**Context:** The company already has a production HIMS (OPD, ABDM-certified) and a LIMS/RIS-PACS. These are existing products with existing deployments.

**Options:**
- **Integrate as external systems.** Treat them like any third-party legacy system — connect via the Integration Hub. No code sharing.
- **Gradually subsume.** Rewrite the production HIMS functionality as modules of the new platform, migrating customers module-by-module. The LIMS becomes the platform's Lab module over time.
- **Hybrid.** Use the production HIMS's ABDM integration code/patterns in the new platform. Run the LIMS alongside the new platform via Integration Hub until a native Lab module is ready.

**What the team needs to decide:** What is the relationship between the existing products and the new platform? This affects team staffing, product roadmap, and customer communication.
