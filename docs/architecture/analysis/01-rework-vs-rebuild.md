# Production HIMS — Rework vs. Rebuild Analysis

This document evaluates whether the existing production HIMS codebase can be restructured to meet the new platform's architectural requirements, or whether it is more efficient to build fresh and port valuable patterns and logic.

The analysis is based on a thorough reading of the production codebase (`hims-production`) across all services.

---

## 1. Executive Summary

**Verdict: Build new. Port patterns and specific logic.**

The production HIMS has real, working code — ABDM certification, patient deduplication tuned for Indian names, multi-tenancy isolation, and clinical workflows running in production. These are not throwaway.

But the distance between the current architecture and the target architecture is not a refactoring gap — it is a replacement gap. The fundamental data store (MongoDB → PostgreSQL), the data model shape (monolithic 50-schema single-service → per-module data ownership), the authorization model (no-op middleware → Cerbos policy engine), and the communication model (synchronous-only → event-driven) all require rewriting, not editing. Attempting to rework the existing codebase would mean rewriting every layer while keeping the system running — a ship-of-Theseus migration that is slower, riskier, and more expensive than building clean and porting the valuable parts.

**What to port:**
- ABDM domain knowledge — protocol flows, NHA gateway integration patterns, FHIR resource mappings, and certification experience (the service itself must be rebuilt to fit the new Integration Hub architecture)
- Patient deduplication algorithm (~1,000 LOC, Indian phonetic matching)
- Multi-tenancy pattern (AsyncLocalStorage context injection)
- Dual vitals schema with migration path
- Visit idle auto-completion pattern (Service Bus integration)
- Security middleware patterns (XSS, NoSQL injection, rate limiting)

**What to leave behind:**
- MongoDB schemas and Mongoose-specific logic
- The monolithic service architecture
- The no-op authorization layer
- Direct cross-model database queries
- JavaScript (main backend) — new platform is TypeScript

---

## 2. Architecture Gap Analysis

### 2.1 Data store: MongoDB → PostgreSQL

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Primary database | MongoDB 7 (Mongoose) | PostgreSQL (Drizzle ORM, Citus sharding) | **Fundamental** |
| Query language | Mongoose query builder | SQL / Drizzle query builder | Full rewrite |
| Schema definition | 50 Mongoose schemas | Drizzle schema per module | Full rewrite |
| Transactions | `mongoose.startSession()` | PostgreSQL transactions | API change |
| Tenant isolation | Mongoose plugin + AsyncLocalStorage | Citus `tenant_id` column + RLS | Pattern portable, implementation different |
| Aggregation | MongoDB aggregation pipeline | SQL GROUP BY / window functions | Full rewrite |

**Assessment:** This alone makes rework infeasible. Every model file, every service method that queries data, every aggregation pipeline, every transaction block must be rewritten. That is the entire backend. MongoDB and PostgreSQL are not interchangeable — the query patterns, indexing strategies, relationship handling, and transaction models are fundamentally different.

### 2.2 Data model: Monolithic → Per-module ownership

The current codebase has **37+ Mongoose models in a single service** sharing one database connection. The dependency graph shows:

- **Patient** is referenced by 8 other models
- **Visit** is referenced by 11 other models
- **User** is referenced by 21 other models

Cross-model transactions span 3-5 models in critical workflows:

| Workflow | Models in transaction | Current pattern |
|----------|-----------------------|-----------------|
| Medicine issuance | Medicine, MedicineIssue, Visit, Prescription, StockChangeLog | Single MongoDB session |
| Visit completion | Visit, Prescription, VisitConsultationRecord | Single MongoDB session |
| Prescription finalization | Prescription, VisitConsultationRecord | Single MongoDB session |
| Pharmacy issuance | Prescription, MedicineIssue, MedicineInventory | Single MongoDB session |

The target architecture requires per-module data ownership: each module owns its database schema, no module reads another module's tables directly, and cross-module coordination uses events or APIs. Extracting modules from the current monolith would require:

1. Splitting the shared MongoDB connection into per-module PostgreSQL schemas
2. Replacing every direct cross-model query with an API call or event
3. Converting every multi-model transaction into a saga or choreography pattern
4. Building projection sync for shared entities (Patient, User)

This is not refactoring. This is rewriting the data layer and every service that touches it — which is all of them.

### 2.3 Authorization: No-op → Cerbos policy engine

The current authorization posture:

| Component | Current state |
|-----------|--------------|
| Backend `checkRole()` middleware | **Literally `next()` — no-op** |
| Backend JWT validation | **`jwt.decode()` without signature verification** |
| Backend audit trail middleware | **No-op** |
| Gateway authorization | Keycloak resource scope check (coarse-grained) |
| Per-resource authorization | **Does not exist** |
| Attribute-based access control | **Does not exist** |
| Break-glass with audit | **Does not exist** |
| Security middleware (XSS, NoSQL) | **Disabled (commented out)** |
| Rate limiting | **Disabled (global bypass flag)** |

The target architecture requires:

- Cerbos sidecar for per-resource, attribute-based authorization
- Every action authorized against tenant-scoped policies
- Audit trail for every authorization decision
- Break-glass with mandatory post-hoc review
- JWT signature verification at every service boundary

There is nothing to rework here. The authorization layer must be built from scratch. The current codebase has the scaffolding (middleware slots, role extraction from JWT, tenant context) but none of the enforcement logic.

### 2.4 Communication: Synchronous → Event-driven

| Aspect | Current | Target |
|--------|---------|--------|
| Inter-service communication | HTTP (synchronous) | Events (async) + API (sync reads) |
| Event bus | Azure Service Bus (one queue for visit idle) | Platform event bus for all inter-module events |
| Event patterns | None | Pub/sub, event sourcing for clinical audit |
| Saga/compensation | None | Required for cross-module workflows |

The current codebase has exactly one async pattern: visit idle auto-completion via Azure Service Bus. Everything else is synchronous HTTP or direct database queries. The target architecture requires event-driven communication as the primary inter-module coordination mechanism.

### 2.5 Language: JavaScript → TypeScript

The main backend (`hims-backend-ai-based`) — the largest service with ~50 models, 23 controllers, and 20+ services — is JavaScript. The master service and ABDM service are TypeScript.

Converting the main backend to TypeScript while simultaneously changing the database, data model, authorization layer, and communication model is four concurrent rewrites of the same files. This is not a viable engineering plan.

---

## 3. What Is Genuinely Valuable

### 3.1 ABDM Integration (Domain knowledge valuable, service architecture is not)

The production HIMS has real ABDM certification and working NHA gateway integration. That operational experience — understanding the protocol flows, handling the webhook chains, managing ABHA enrollment edge cases, generating FHIR bundles that pass NHA validation — is genuinely valuable.

However, the current ABDM service (`abdi-lims-backed`) is architecturally a single HTTP server that chains webhook callbacks. It does not match the new platform's Integration Hub model, which requires protocol adapters, canonical event translation, and standards-based module boundaries. The service carries significant technical debt and was built to solve the immediate problem of ABDM compliance, not to serve as a long-term integration architecture.

**What is reusable as reference:**
- **Protocol flow knowledge**: M1 (ABHA profile fetch) and M2 (linking, consent) endpoint sequences, error handling, retry patterns
- **NHA gateway integration**: Authentication, session management, endpoint URLs, sandbox vs. production switching
- **FHIR resource mappings**: Partial but working mappings for vitals, observations, diagnoses (`fhirBundleTransformer.ts`, `fhirResourceProcessor.ts`)
- **Encryption**: TweetNaCl-based public-key encryption for ABDM data exchange (`fidelius.ts`)
- **Certification experience**: Understanding of what NHA tests for during FT certification

**What must be rebuilt:**
- The service architecture — must be rebuilt as part of the Integration Hub with proper adapter patterns, event-driven communication, and standards-based interfaces
- The data layer — 9 MongoDB models need to become PostgreSQL schemas within the new platform's data ownership model
- The tenant context management — currently uses per-tenant MongoDB databases; new platform uses Citus sharding on `tenant_id`
- The webhook handling — currently ad-hoc HTTP callback chains; new platform should route these through the event bus

**Frontend components** (18+ React components for ABHA enrollment, linking, consent) are more portable — they communicate via HTTP and are independent of the backend's internal architecture. These can serve as a starting point for the new frontend's ABDM flows.

### 3.2 Patient Deduplication Algorithm (High value, directly portable)

The deduplication algorithm in `patientSearch.js` (~1,000 LOC) is genuinely complex and tuned for Indian healthcare:

- **Phonetic matching** with Indian language transliteration (handles गुलाम vs गुलफ़ाम variations)
- **Enhanced Soundex-like algorithm** with consonant normalization (m/n, b/p/v, d/t, g/k, s/z, sh/ch)
- **Weighted Levenshtein distance** (substitution cost 0.5 for similar letters, 1.0 for dissimilar)
- **Multi-stage matching**: phonetic key generation → regex pattern matching → similarity scoring
- **Thresholds**: >65% overall, >75% normalized, >55% consonant-only
- **Matching criteria**: phonetically similar name + age ±2 years + same gender + same phone

This algorithm is database-agnostic (operates on strings and numbers). It can be ported to the new EMPI service with minimal changes — replace Mongoose queries with PostgreSQL queries for candidate retrieval, keep the matching logic as-is.

### 3.3 Multi-tenancy Pattern (Pattern portable, implementation not)

The `tenantPlugin.js` implementation is elegant:

- AsyncLocalStorage injects tenant context per-request (no manual passing)
- Mongoose plugin auto-adds `iq-tenant-id` filter to all 11 query operations + aggregation pipelines
- Pre-save hook stamps every document with tenant ID
- Counter models use tenant-scoped keys (`${tenantId}:${sequenceName}`)

**The pattern is directly reusable** for the new architecture. The implementation is MongoDB/Mongoose-specific and cannot be ported, but the approach — middleware sets tenant context in AsyncLocalStorage, data layer reads it automatically — maps cleanly to PostgreSQL RLS or Drizzle middleware.

### 3.4 Clinical Domain Logic (Selective port)

| Logic | LOC | Port value | Rationale |
|-------|-----|------------|-----------|
| Patient deduplication | ~1,000 | **Must port** | Indian phonetic matching, non-trivial, production-tuned |
| Dual vitals schema (V1↔V2) | ~200 | **Should port** | Migration path pattern, regression risk if rebuilt |
| Free follow-up workflow | ~150 | **Should port** | Date arithmetic + billing implications |
| Visit idle auto-complete | ~250 | **Should port** | Service Bus integration, idempotency pattern |
| Women's health sub-schema | ~50 | **Should port** | Validation rules (menarche 8-20, children 0-20) |
| Medical history normalization | ~150 | **Consider** | Enum folding, tolerant matching |
| Visit/bill number generation | ~200 | **Consider** | Tenant-scoped daily counters |
| Pharmacy CRUD | ~345 | Rebuild | Standard inventory management |
| Lab report upload | ~200 | Rebuild | Straightforward document storage |
| Billing calculations | ~190 | Rebuild | Standard line-item math |
| Diagnosis/test masters | ~150 | Rebuild | Generic reference data CRUD |

### 3.5 Security Middleware Patterns (Reusable with fixes)

The security middleware has good regex patterns for XSS, NoSQL injection, SQL injection, command injection, and path traversal detection. These patterns are language-agnostic and can be ported to the new platform's input validation layer.

However: they are currently **disabled in production** (commented out in `server.js`). The rate limiting configuration is also disabled via a global bypass flag. These should be ported as patterns, not as "working, tested code."

---

## 4. What Cannot Be Saved

### 4.1 The entire Mongoose/MongoDB data layer

50 Mongoose schemas, all query builders, all aggregation pipelines, all transaction sessions, all index definitions. None of this transfers to PostgreSQL.

### 4.2 The monolithic service architecture

23 controllers and 20+ services in a single Express app sharing one database connection. The target architecture requires per-module services with independent data stores. The current code has no module boundaries — a single service imports and queries 5+ models directly.

### 4.3 The authorization "system"

There is no authorization system. `checkRole()` is a no-op. `audit.js` is a no-op. JWT tokens are decoded without signature verification. The gateway does Keycloak scope checks, but there is no per-resource authorization anywhere in the stack.

### 4.4 The API contracts

No OpenAPI/Swagger specs exist. REST endpoints evolved organically. Controller methods accept arbitrary payloads with no schema validation. There are no API contracts to port.

### 4.5 Test coverage

11 test files exist with thresholds set to 0%. There is no test suite that could serve as a regression safety net during refactoring — which is precisely what makes large-scale rework dangerous.

---

## 5. Structural Comparison

### 5.1 Rework path

| Phase | Work | Risk |
|-------|------|------|
| MongoDB → PostgreSQL migration | Rewrite all 50 schemas, all queries, all transactions, all aggregations | **Critical** — no test coverage to catch regressions |
| Module extraction | Split monolith into per-module services, replace direct queries with APIs/events, implement sagas | **Critical** — no module boundaries exist today |
| Authorization | Build Cerbos integration, per-resource policies, audit trail | High |
| TypeScript conversion | Convert main backend from JS to TS | Medium |
| Event-driven communication | Replace synchronous cross-module calls with events | High |
| Testing | Build test suite (currently 0% coverage) to support all above changes | — |

The rework path requires changing the database, the data model, the authorization layer, the communication model, and the language — simultaneously, in a running production system, with no test coverage. Each phase depends on the previous one completing correctly. The phases are mostly sequential (can't extract modules before changing the database, can't add events before extracting modules), which limits parallelization.

### 5.2 Build-new path

| Phase | Work | Risk |
|-------|------|------|
| Platform foundation | Core modules (Identity, Configurator, AuthZ, Tenant Data), module shape template, event bus | Low — clean design, TypeScript from day one |
| Build ABDM integration | Rebuild within Integration Hub architecture, using production service as protocol reference | Medium — new architecture, but protocol flows are well-understood from production |
| Port patient dedup | Extract algorithm, adapt to PostgreSQL queries for candidate retrieval | Low — algorithm is database-agnostic |
| Port clinical logic | Dual vitals, free follow-up, idle auto-complete, women's health | Low — well-understood domain rules |
| Build clinical modules | OPD, IPD, Pharmacy, Lab (using module shape template) | Medium — but with clean architecture from start |
| Data migration | Migrate production MongoDB data to PostgreSQL | Medium — schema mapping + validation |

The build-new path allows more parallelization: platform foundation and clinical domain design can overlap; porting logic and building modules can proceed concurrently across teams. The production system continues running unmodified until cutover.

### 5.3 Comparison

| Factor | Rework | Build new |
|--------|--------|-----------|
| Risk profile | Critical (production system at risk, no test safety net) | Medium (clean build, production unaffected) |
| Parallelizability | Low — phases are mostly sequential | High — platform + clinical work can overlap |
| Architecture debt at completion | Residual — some patterns will be "good enough" compromises | Clean — designed for target architecture |
| Team cognitive load | Very high (understand old + new simultaneously) | Moderate (learn new architecture once) |
| ABDM downtime | Risk during migration | Zero (old system runs until cutover) |
| TypeScript from day one | No (gradual conversion) | Yes |
| Test coverage at completion | Patchy (retrofitted) | Designed in from start |

---

## 6. Data Migration Strategy

Regardless of rework vs. rebuild, production data must be migrated. Key considerations:

| Data set | Volume estimate | Migration complexity |
|----------|----------------|---------------------|
| Patients | ~50K-100K records | Medium — UHID, ABHA, demographics, dedup records |
| Visits | ~180K/year/facility | Medium — status, vitals, chief complaints |
| Prescriptions | ~180K/year/facility | High — nested medicines, tests, medical history |
| Bills | ~180K/year/facility | Medium — line items, payments, discounts |
| Medicine inventory | ~5K-10K items | Low — catalog + stock levels |
| Lab reports | ~50K/year/facility | Medium — Base64-encoded PDFs + metadata |
| ABDM records | Varies | Low — already in separate database |

**Migration approach:** Write a one-time ETL pipeline that reads MongoDB collections, maps to PostgreSQL schemas, validates referential integrity, and loads into the new system. Run in parallel (dual-write) for a validation period before cutover.

---

## 7. Recommendation

**Build the new platform from scratch using the target architecture. Port the following from the production HIMS:**

1. **ABDM domain knowledge** — use the production service as a protocol reference (endpoint sequences, error handling, FHIR mappings, certification requirements) when building the new platform's ABDM integration within the Integration Hub architecture. The service itself must be rebuilt — its single-HTTP-server, webhook-chaining architecture does not fit the new platform's integration model.
2. **Patient deduplication algorithm** — port the phonetic matching and similarity scoring to the new EMPI service.
3. **Multi-tenancy pattern** — use the AsyncLocalStorage + automatic query injection pattern as the design basis for the new tenant isolation layer (design influence, not code port).
4. **Clinical domain rules** — port dual vitals, free follow-up, visit idle auto-complete, women's health validation.
5. **Security middleware patterns** — port XSS/NoSQL/injection detection regex patterns to the new input validation layer.
6. **Data** — ETL migration from MongoDB to PostgreSQL.

**Do not attempt to rework:** the MongoDB data layer, the monolithic service architecture, the authorization system, the JavaScript main backend, the ABDM service architecture, or the API contracts. The gap between current and target is too wide, and the absence of test coverage makes large-scale refactoring dangerous.

---

## Appendix A: Production Codebase Structure

```
hims-production/
├── hims-backend-ai-based/      # Main clinical backend (JS, Express, MongoDB)
│   ├── models/                  # 37+ Mongoose schemas
│   ├── controllers/             # 23 controllers
│   ├── services/                # 20+ services
│   ├── middleware/               # Auth, tenant, security, rate limiting
│   ├── plugins/                 # tenantPlugin.js (multi-tenancy)
│   └── server.js                # Entry point
├── chcms-master/                # Master config service (TS, MongoDB)
├── hims-api-gateway/            # API gateway (JS, Express)
├── abdi-lims-backed/            # ABDM/ABHA service (TS, MongoDB + PostgreSQL)
├── hims-frontend-ai-based/      # React 18.3 + Vite + TS
└── keycloak-customized/         # Custom Keycloak Docker image
```

## Appendix B: Key Files Read During Analysis

| File | Purpose | Key finding |
|------|---------|-------------|
| `hims-backend-ai-based/server.js` | Entry point, middleware chain | Security middleware disabled, audit middleware is no-op |
| `hims-backend-ai-based/plugins/tenantPlugin.js` | Multi-tenancy | Elegant pattern, MongoDB-specific implementation |
| `hims-backend-ai-based/middleware/authorization.js` | Auth extraction | `checkRole()` is literally `next()`, JWT decoded without verification |
| `hims-backend-ai-based/middleware/audit.js` | Audit trail | No-op (`next()`) |
| `hims-backend-ai-based/models/Visit.js` | Visit lifecycle | 493 lines, 79 fields, state machine, dual vitals |
| `hims-backend-ai-based/models/Patient.js` | Patient demographics | 333 lines, tenant-scoped UHID generation |
| `hims-backend-ai-based/models/Prescription.js` | Prescriptions | 304 lines, nested medical history, women's health |
| `hims-backend-ai-based/services/patient/patientSearch.js` | Deduplication | 1,977 lines, Indian phonetic matching, weighted Levenshtein |
| `hims-backend-ai-based/services/visitService.js` | Visit management | 1,532 lines, idle auto-complete, free follow-up |
| `hims-backend-ai-based/services/prescriptionService.js` | Prescriptions | 1,600 lines, dual vitals, medical history normalization |
| `hims-backend-ai-based/services/pharmacyService.js` | Pharmacy | 345 lines, stock management, medicine issuance |
| `chcms-master/routes/users.ts` | User management | No route-level auth checks |
| `hims-api-gateway/index.js` | Gateway routing | Dynamic route registry, Keycloak scope enforcement |
| `hims-api-gateway/keycloak.js` | Gateway auth | Token refresh, issuer validation, full token logging (security risk) |
| `abdi-lims-backed/app.ts` | ABDM entry point | Isolated service, but single-HTTP-server webhook-chaining architecture doesn't fit Integration Hub model |
| `abdi-lims-backed/src/services/` | ABDM services | M1/M2/M3 protocol flows valuable as reference; service architecture must be rebuilt |

## Appendix C: Model Dependency Graph

```
                    ┌─────────────────────────────────────────┐
                    │              User (21 refs)              │
                    └──────────┬──────────┬───────────┬────────┘
                               │          │           │
              ┌────────────────┼──────────┼───────────┼─────────────┐
              ▼                ▼          ▼           ▼             ▼
         ┌─────────┐    ┌──────────┐  ┌──────┐  ┌──────────┐  ┌────────┐
         │ Patient  │◄───│  Visit   │  │ Bill │  │Attendance│  │Notif.  │
         │ (8 refs) │    │(11 refs) │  │      │  │          │  │        │
         └────┬─────┘    └────┬─────┘  └──┬───┘  └──────────┘  └────────┘
              │               │           │
              │          ┌────┴────┐      │
              │          ▼         ▼      │
              │   ┌──────────┐ ┌──────┐   │
              ├──►│Prescript.│ │Report│   │
              │   └────┬─────┘ └──────┘   │
              │        │                  │
              │        ▼                  │
              │   ┌──────────┐            │
              │   │Med.Issue │            │
              │   └────┬─────┘            │
              │        │                  │
              │        ▼                  │
              │   ┌──────────┐            │
              │   │Med.Inv.  │            │
              │   └──────────┘            │
              │                           │
              ▼                           │
         ┌──────────┐                     │
         │CareCtx   │─── (direct Visit    │
         │          │     model import)   │
         └──────────┘                     │

    ── Inseparable clinical workflow cluster ──
```
