# Design Process Learnings

Lessons learned during the AuthN/AuthZ architecture revision (2026-05-03) that apply across all core modules. These learnings saved us from at least three silent-but-critical design flaws.

---

## 1. Library defaults are not safe defaults

**What happened:** better-auth's `revokeSessionsOnPasswordReset` defaults to `false`. Without explicitly setting it to `true`, old sessions survive password resets — a user whose password was compromised and "reset" still has valid sessions. We only caught this by reading the plugin source, not the marketing docs.

**Also:** Key rotation is disabled by default in the JWT plugin. The `jwks` table exists but no new keys are ever generated unless `rotationInterval` is explicitly configured. The `sentinel` plugin strips `+` suffixes from emails by default — this would have silently broken delegated recovery routes.

**Lesson:** For any library we adopt, create a "required configuration" table listing every setting where the default is unsafe or incompatible with our constraints. Check defaults against source code, not just documentation. The AuthN spec's §14 (Required better-auth Configuration) is the template for this practice.

**Applies to:** Any module integrating a third-party library — Cerbos policy defaults, database connection pool sizes, cache TTLs.

---

## 2. Look up latest docs before designing, not after

**What happened:** We nearly designed around better-auth's **OIDC Provider plugin**, which is deprecated. The replacement (**OAuth 2.1 Provider plugin**) has a different API surface and different capabilities. We also discovered that the `signUpOnVerification` callback (phone plugin) creates the user record but NOT the credential account — `signIn.username` silently fails until `setPassword` is called separately. Neither of these were obvious from high-level docs.

**Also:** The `mapProfileToUser` hook for federation doesn't work the way the name implies. Returning `{ id: existingUser.id }` does not reliably link accounts. The actual mechanism is email matching, which our adversarial reviewer (Gemini) caught.

**Lesson:** Before designing around any library feature, verify it against the latest docs AND source code for the specific version we'll use. A "deep research" step with Context7 or equivalent before design lock is not optional. This is especially important for libraries under active development where APIs change between minor versions.

**Applies to:** Every module that depends on an external library. Master Data (if using a taxonomy library), EMPI (if using a matching library), Integration Hub (FHIR library).

---

## 3. Adversarial review catches blind spots that single-reviewer consensus misses

**What happened:** Our initial design used sub-addressed emails (`admin+N@hospital.com`) in `ba_users.email`. This seemed technically viable after verifying better-auth supported it. Two independent adversarial reviewers (Claude instance T and Gemini instance G) both independently concluded it was wrong — but for different reasons:

- Instance T caught the **social engineering risk** (password reset emails to admin inbox)
- Instance G caught the **infrastructure coupling** (Indian hospital mail servers don't support RFC 5233)

Neither reviewer alone would have identified both issues. The synthetic email pattern we adopted was the result of their combined analysis.

**Lesson:** For foundational decisions (identity model, data distribution, security boundaries), run at least two independent reviews — ideally from different AI models or reviewers with different domain perspectives. The cost of a second review is trivial compared to the cost of discovering a foundational flaw after 50 hospitals are onboarded.

**Applies to:** Any ADR for a core module's primary design choice. Citus distribution strategy, EMPI matching algorithm selection, Integration Hub message routing.

---

## 4. Design the identity layer for the worst-case user, not the best-case user

**What happened:** The "happy path" user (Dr. Sharma with her own email, her own phone, one hospital) works with almost any identity design. The design challenge is the **worst-case user**: a ward attendant with no email, no personal phone, shared workstation, in a rural hospital with unreliable internet and a legacy mail server.

Designing for Dr. Sharma and then adding workarounds for the ward attendant produces a fragile, bolt-on architecture. Designing for the ward attendant first and then simplifying for Dr. Sharma produces a clean tier model where the happy path is just one tier.

**Lesson:** When designing any user-facing system in this platform, start with the most constrained user persona from the problem statement (`02-constraints-and-invariants.md`). If the design works for them, it works for everyone. If it doesn't, the design needs to change — not the user.

**Applies to:** Every module with user-facing workflows. OPD (offline-first for rural PHCs), Lab (shared workstation in the lab), Pharmacy (high-throughput dispensing with minimal training).

---

## 5. Design future phases to validate the foundation, not to build them

**What happened:** We designed 5 recovery tiers, 3 federation tiers, and 17 new scenarios — but only 2 recovery tiers and 0 federation tiers ship in MVP. The concern was that this was over-engineering.

The resolution: designing Phase 2 and 3 features isn't building them. It's **proving the foundation holds**. Specifically:
- The `recovery_tier` column must exist from day one (adding it later requires migrating every tenant's user table)
- The synthetic email pattern must be compatible with federation (discovering incompatibility after deployment forces an identity migration)
- The `auth_user_id` linking model must support multi-IdP scenarios (redesigning the link after thousands of users are linked is a data nightmare)

If we had only designed MVP, we wouldn't know whether adding delegated recovery later would require a schema migration, or whether federation would force us to rethink the email model.

**Lesson:** For any core module's schema design, sketch out Phase 2 and 3 scenarios as lightweight validation probes. The bar is: "would adding this feature later require a schema migration or architectural rework?" If yes, the MVP schema must accommodate it. If no, defer completely.

**Applies to:** Master Data (will the entity model support future specialties?), EMPI (will the matching strategy support cross-facility matching later?), Configurator (will the tenant model support multi-org hierarchies?).

---

## 6. Separate the identity anchor from everything else

**What happened:** The biggest single design insight was separating four concerns that are typically conflated:

| Concern | Where it lives | Mutates? |
|---------|---------------|----------|
| AuthN identity anchor | `ba_users.email` (synthetic) | Never |
| Business contact email | `users.email` | Freely |
| Recovery channel | `delegated_recovery_routes` or `users.email` | Per tier rules |
| Phone auth | `ba_users.phoneNumber` | With OTP verification |

By making the identity anchor synthetic and immutable, every other concern becomes a simple CRUD operation that never triggers AuthN-layer side effects (verification flows, session invalidation, account linking).

**Lesson:** When designing any module that bridges external data and internal identity, identify the **anchor** (the thing that must never change) and separate it from the **attributes** (things that change). Don't let mutable attributes pollute the identity anchor.

**Applies to:** EMPI (MPI anchor vs. demographic attributes), Master Data (canonical code vs. display name), Integration Hub (system identifier vs. endpoint URL).

---

## 7. "Never direct SQL against library-managed tables" is a hard rule, not a guideline

**What happened:** Early scenario drafts used `DELETE FROM ba_sessions WHERE user_id = ?` for session revocation. This seems functionally equivalent to calling `auth.api.revokeUserSessions()` — and in the current better-auth version, it is. But:

- Library internals change between versions. The session table's schema, indexes, and cleanup logic are not part of the public API.
- The API method may emit events, update caches, or perform cascading operations that raw SQL skips.
- Direct SQL bypasses the `IdentityProvider` interface, coupling modules to the specific provider.

**Lesson:** If a library provides an API for an operation, use the API — even if raw SQL is "faster" or "simpler." This applies to any library-managed table in any module. The abstraction layer exists for a reason, and violating it creates invisible tech debt that detonates on the next library upgrade.

**Applies to:** Any module that integrates with an external library managing its own schema. Cerbos policy storage (use the API, not the DB), FHIR resource storage (use the FHIR server API, not the underlying database).

---

## 8. Phase tags in architecture docs prevent scope misunderstandings

**What happened:** After completing the AuthN/AuthZ architecture docs (32 scenarios, 3 new tables, 5-tier recovery model), the concern arose that reviewers would interpret this as MVP scope — "do we need to build ALL of this?" The answer was no, but the docs didn't make that obvious.

Adding phase tags (MVP / Post-launch / Federation) to every section and scenario, plus a phasing preamble in HLD-04, immediately clarified scope. The summary table's Phase column lets someone scanning the scenarios doc instantly see that only ~15 of 32 scenarios are MVP.

**Lesson:** For any architecture document that describes more than MVP scope, add inline phase tags from the start — don't wait for someone to ask "is this all MVP?" The cost of tagging is minutes; the cost of a scope misunderstanding is days of meeting overhead.

**Applies to:** Every LLD and HLD that covers features beyond initial launch.
