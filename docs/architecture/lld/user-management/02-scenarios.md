# User Management — Scenarios Walkthrough

This document shows the canonical capability-based model in realistic flows.

> **Phase 1A admin API (PR #56):** Role template access uses `POST/GET/DELETE /users/{id}/roles` and materialized grants in `user_capabilities`. There is **no** `/role-assignments` surface. Snapshot semantics (apply, re-apply subset sync, detach revoke) are defined in [ADR-0031](../../adr/0031-um-role-template-snapshot-semantics.md).

> **Superseded 2026-07-09 (issue #60, Phase 1.5):** the snapshot semantics above — `user_capabilities` populated by copy-on-apply, `grant_source`/`source_role_id`, re-apply sync, detach-revokes — describe the Phase 1 (PR #56) shape only. As of [ADR-0037](../../adr/0037-user-capability-live-join-grant-deny-overrides.md), `user_capabilities` is an override-only table (`effect: grant|deny`, `reason`) and role composition is read live from `user_roles ⨝ role_capabilities` on every request; there is no snapshot-on-apply or re-apply-sync step anymore. This section is left as-is below for historical trace of the Phase 1 design — read it as superseded, not current.

> **Legacy sections below (§9+):** Detailed walkthroughs may still reference target-state `role_assignments`, ward scoping, and live join resolution. Treat those as forward-looking unless explicitly mapped to Phase 1A tables.

## 1. Tenant onboarding
When a new tenant is initialized:

1. the tenant receives a `users` partition identified by `iq_tenant_id`
2. platform role templates are created in `roles`
3. the canonical capability catalog is seeded into `capabilities`
4. default role composition is written to `role_capabilities`

This gives the tenant an immediately usable authorization baseline without forking Cerbos policy files.

## 2. Creating a custom tenant role
An administrator creates a role such as `chief-resident`:

1. `POST /roles` creates the flat role container
2. `PUT /roles/{id}/capabilities` replaces the role composition with capability keys such as:
   - `um:user:read`
   - `lab:order:create`
   - `opd:consultation:notes:edit`

The role does not inherit from any other role. Everything it grants is explicit in `role_capabilities`.

## 3. Applying a role template to a user
When a tenant admin applies a role template:

1. `POST /users/{id}/roles` with `role_id` (optional `role_template_capability_ids` subset) writes:
   - a `user_roles` association row
   - `user_capabilities` snapshot rows with `grant_source = role_template` and `source_role_id = role_id`
2. Entitlement assert runs before persist (Configurator module enablement + Master Data catalog).
3. The user's next request is enriched from **active** `user_capabilities` (plus delegated overlays and clearances). Until issue #60, PEP may temporarily union live `role_capabilities` for active `user_roles` — see ADR-0031.

The JWT remains unchanged. Effective capabilities are resolved at runtime from persisted grants, not from JWT claims.

## 4. Request authorization
For a protected request:

1. JWT verification resolves `sub`, `iq_tenant_id`, `roles`, `department`, and `org_id`
2. principal enrichment resolves:
   - active capability keys from `user_capabilities` (`revoked_at IS NULL`)
   - delegated capabilities and clearances
   - *(temporary)* live template capabilities from `user_roles ⨝ role_capabilities` until #60
3. Cerbos evaluates the request using `principal.attr.capabilities` and ABAC resource attributes
4. the handler proceeds only on `ALLOW`

Master Data and Configurator are **not** called during step 3.

Example Cerbos principal shape:

```json
{
  "id": "usr-111",
  "roles": ["physician"],
  "attr": {
    "iq_tenant_id": "aiims-delhi",
    "department": "cardiology",
    "org_id": null,
    "capabilities": ["um:user:read", "lab:order:create"],
    "delegated_capabilities": [],
    "clearances": {},
    "um_clearance_effective_tier": 0
  }
}
```

## 5. Tenant-specific customization without policy drift
Two tenants can keep the same Cerbos policy but compose roles differently:

- Tenant A gives `nurse` the capability `lab:order:create`
- Tenant B does not

Cerbos policy stays the same in both cases: allow only if the principal has `lab:order:create`. The difference lives entirely in `role_capabilities`.

## 6. Role administration in the UI
The admin surface is capability-driven:

1. `/capabilities` and `/capabilities/assignable` provide catalog and entitlement-filtered pick lists
2. `/roles` manages role template definitions
3. `/roles/{id}/capabilities` manages template composition (`role_capabilities`)
4. `/users/{id}/roles` applies or detaches role templates for a user
5. `/users/{id}/capabilities` replaces **manual** direct grants only

Runtime model:

- capabilities are the primitive
- roles are templates (`role_capabilities`)
- apply copies a snapshot into `user_capabilities`; detach revokes scoped `role_template` rows

## 7. Delegation and clearance overlays
Role-derived capabilities are not the whole entitlement set.

- `delegated_capability_grants` adds temporary direct authority
- `user_clearances` adds ABAC sensitivity attributes

The effective authorization set is therefore:

`user_capabilities` (manual + role_template snapshots, active rows only)
`+ delegated_capability_grants`
`+ clearances`

That effective set is what Cerbos evaluates at request time (with temporary live-join overlay per ADR-0031 until #60).

## 8. Role template snapshot lifecycle (PR #56)

### 8.1 Apply with subset

1. Admin selects role template "Registrar" and picks two of five capabilities in the UI.
2. `POST /users/{id}/roles` sends `role_id` + `role_template_capability_ids`.
3. UM validates each id belongs to the role and is entitled for the tenant, then upserts `user_capabilities` rows (`grant_source = role_template`, `source_role_id = registrar_role_id`).

### 8.2 Re-apply to narrow

1. Admin re-applies the same template with a smaller subset.
2. UM synchronizes: revokes active `role_template` grants for that `source_role_id` outside the new set; upserts missing ids; never touches `manual` / `delegated` / `system`.

### 8.3 Detach

1. Admin removes the template from the user.
2. `DELETE /users/{id}/roles/{roleId}` deletes the `user_roles` row and soft-revokes all active `role_template` grants with matching `source_role_id`.
3. Manual grants for the same capability ids remain if they existed before apply.

### 8.4 Template definition change without re-apply

1. Administrator adds a new capability to the Registrar role via `PUT /roles/{id}/capabilities`.
2. Users who already have Registrar applied **do not** gain the new capability until an administrator re-applies (full or subset) or grants it manually.

---

## 9. Delegation worked example (target-state detail)

**Step 2 — Audit record created**

```
permission_change_audit:
  iq_tenant_id: 'aiims-delhi'
  entity_type: 'delegation'
  entity_id: (delegation row id)
  action: 'created'
  changed_by: 'usr-333' (Dr. Mehta herself)
  new_value: { delegatee: 'usr-444', role: 'medical-superintendent', until: '2026-05-14' }
  reason: 'Medical leave delegation'
```

**Step 3 — PEP enrichment picks it up**

When Dr. Gupta makes a request, the PEP:
1. Resolves Dr. Gupta's own roles and capabilities.
2. Queries active delegations: `WHERE delegatee_id = 'usr-444' AND status = 'active' AND effective_from <= now() AND effective_to >= now()`.
3. Finds the medical-superintendent delegation → adds all medical-superintendent capabilities to Dr. Gupta's Cerbos principal as `delegated_capabilities`.
4. Cerbos policy evaluates: "this approval action is allowed because `principal.attr.delegated_capabilities` includes the required capability."

**Step 4 — Delegation expires**

On 2026-05-15, the delegation's `effective_to` is in the past. The PEP query returns no active delegation. Dr. Gupta's approval authority reverts to his own roles automatically. A background job marks the delegation `status = 'expired'`.

### Why the schema supports this

- Delegations are time-bounded with explicit `effective_from` / `effective_to` — no manual revocation needed for planned absences.
- The `reason` field provides an audit trail of WHY the delegation exists. A compliance officer can see "Dr. Mehta delegated to Dr. Gupta because of medical leave" — not just a row diff.
- Delegation-type flexibility: `delegation_type = 'role'` delegates all capabilities of a role; `delegation_type = 'capability'` delegates a single atomic capability (e.g., only the approval capability, not the full superintendent role).

---

## 6. Sensitivity clearance — psychiatric records

**Scenario:** AIIMS Delhi's Psychiatry department treats a VIP patient. Only staff with explicit psychiatric clearance AND VIP clearance can view the record.

### What happens

**Step 1 — Clearances granted**

```
user_clearances:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-555' (Dr. Rao, Psychiatry)
  clearance_type: 'psychiatric'  clearance_level: 'view_and_edit'
  granted_by: 'usr-001' (Admin Patel)  granted_at: now()  expires_at: NULL

  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-555'
  clearance_type: 'vip'  clearance_level: 'view_and_edit'
  granted_by: 'usr-001'  granted_at: now()  expires_at: NULL
```

**Step 2 — PEP enrichment**

When Dr. Rao accesses the patient record, the PEP constructs:

```json
{
  "id": "usr-555",
  "roles": ["physician"],
  "attr": {
    "capabilities": ["opd:consultation:notes:view", "opd:consultation:notes:edit", ...],
    "clearances": {
      "psychiatric": "view_and_edit",
      "vip": "view_and_edit"
    }
  }
}
```

**Step 3 — Cerbos evaluation**

The patient record has resource attributes `sensitivity: ["psychiatric", "vip"]`. The Cerbos policy checks:

```
allow if:
  for all s in resource.attr.sensitivity:
    principal.attr.clearances[s] exists AND principal.attr.clearances[s] in ["view", "view_and_edit"]
```

Dr. Rao has both clearances → **ALLOW**.

**Step 4 — Unauthorized access attempt**

Dr. Kumar (Cardiology) tries to view the same patient's record. Dr. Kumar has no psychiatric or VIP clearance → `clearances: {}` in the Cerbos principal → **DENY**. The audit log records the denied access attempt (at the Cerbos PDP level, not in User Management's `permission_change_audit`).

### Why the schema supports this

- Clearances are ABAC attributes — orthogonal to roles. A cardiologist (role) and a psychiatrist (role) may both need VIP clearance, but only the psychiatrist needs psychiatric clearance.
- Clearances have lifecycle: `granted_at`, `expires_at`, `revoked_at`. Temporary clearances (e.g., a locum doctor covering Psychiatry for 2 weeks) expire automatically.
- The Cerbos evaluation is resource-driven: the data sensitivity label on the record determines which clearances are needed. User Management provides the clearances; the clinical module marks the record as sensitive.

---

## 7. Department transfer — Nurse Patel moves from Cardiology to Emergency

**Scenario:** Nurse Patel is transferred from Cardiology to the Emergency department at AIIMS Delhi.

### What happens

**Step 1 — Close current department assignment**

```
user_department_assignments:
  -- close existing assignment
  UPDATE: effective_to = '2026-05-01' WHERE user_id = 'usr-666' AND department_id = 'dept-cardiology' AND effective_to IS NULL
```

**Step 2 — Create new department assignment**

```
user_department_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-666'  department_id: 'dept-emergency'
  is_primary: true  effective_from: '2026-05-01'  effective_to: NULL
```

**Step 3 — Role reassignment (if needed)**

If Nurse Patel had a department-scoped role:

```
role_assignments:
  -- revoke cardiology-scoped role
  UPDATE: revoked_at = now(), revoked_by = 'usr-001' WHERE user_id = 'usr-666' AND scope_type = 'department' AND scope_id = 'dept-cardiology'

  -- assign emergency-scoped role
  INSERT: user_id = 'usr-666'  role_id: (charge-nurse)  scope_type: 'department'  scope_id: 'dept-emergency'  assigned_by: 'usr-001'
```

**Step 4 — Clearance review**

If Nurse Patel had ward-specific clearances (e.g., Cardiac ICU clearance), the admin reviews and revokes them:

```
user_clearances:
  UPDATE: revoked_at = now() WHERE user_id = 'usr-666' AND clearance_type = 'cardiac_icu'
```

**Step 5 — Audit trail**

```
permission_change_audit:
  entity_type: 'user_status'      action: 'updated'   changed_by: 'usr-001'  reason: 'Department transfer: Cardiology → Emergency'
  entity_type: 'role_assignment'   action: 'revoked'   changed_by: 'usr-001'  reason: 'Transferred to Emergency'
  entity_type: 'role_assignment'   action: 'created'   changed_by: 'usr-001'  reason: 'Transfer from Cardiology'
  entity_type: 'clearance'        action: 'revoked'   changed_by: 'usr-001'  reason: 'No longer in Cardiac ICU'
```

(Department assignment changes are captured via `old_value`/`new_value` JSONB on the `user_status` entity type, which records the full context of the transfer.)


**Step 6 — Next login**

Nurse Patel's next JWT carries `department: "dept-emergency"`. The PEP resolves the new role (charge-nurse in Emergency) and its capabilities. Cardiology-scoped capabilities are gone.

### Why the schema supports this

- Department assignments use `effective_from` / `effective_to` — the history is preserved. "When was Nurse Patel in Cardiology?" is a simple query, not a CDC archaeology exercise.
- Role scoping (`scope_type: 'department'`) means department-specific roles are revoked precisely during transfers. Tenant-wide roles (scope_type = NULL) are unaffected by the transfer.
- Every permission change is recorded in `permission_change_audit` with `reason` and `changed_by` — the compliance officer sees a coherent transfer narrative, not a series of disconnected column diffs.

---

## 8. Service-to-service auth — OPD module orders a lab test

**Scenario:** A doctor creates a consultation in OPD and orders a lab test. The OPD module's backend calls the Lab module's API to place the order.

### What happens

**Step 1 — Service account exists**

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'svc-opd'  auth_user_id: NULL  kind: 'service'
  full_name: 'OPD Service Account'  status: 'active'

role_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'svc-opd'  role_id: (opd-service)

role_capabilities:
  role_id: (opd-service)  capability_id: (lab:order:create)
  role_id: (opd-service)  capability_id: (lab:order:status)
```

**Step 2 — OPD backend calls Lab API**

OPD authenticates with its service JWT (signed by the same JWKS). The JWT carries:

```json
{
  "sub": "svc-opd",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["opd-service"],
  "kind": "service"
}
```

**Step 3 — Lab module PEP evaluates**

1. PEP resolves `opd-service` role → capabilities include `lab:order:create`.
2. Cerbos check: action=`create`, resource=`lab:order`, principal has `lab:order:create` → **ALLOW**.

### Why the schema supports this

- Service accounts are first-class citizens in the `users` table (`kind: 'service'`). They follow the same role-capability model as human users — no separate auth mechanism.
- `auth_user_id` is NULL for service accounts (they don't authenticate through better-auth login).
- The Lab module doesn't need to understand OPD-specific roles. It only checks capabilities: "does this principal have `lab:order:create`?" The decoupling means adding a new module that creates lab orders (e.g., Emergency) only requires granting `lab:order:create` to the new module's service account.

---

## 9. Scheduled agent — nightly shift-end report generation

**Scenario:** A cron job generates shift-end reports every night at 11 PM, reading patient census data and nurse assignments.

### What happens

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'agt-reports'  auth_user_id: NULL  kind: 'agent'
  full_name: 'Shift Report Agent'  status: 'active'

role_assignments:
  iq_tenant_id: 'aiims-delhi'  user_id: 'agt-reports'  role_id: (report-agent)

role_capabilities:
  role_id: (report-agent)  capability_id: (opd:census:read)
  role_id: (report-agent)  capability_id: (admin:staff-schedule:read)
  role_id: (report-agent)  capability_id: (reports:shift-end:generate)
```

At 11 PM, the cron job authenticates as `agt-reports` using service credentials and generates the report. Cerbos evaluates: the agent can read census and schedule data and generate reports, but cannot modify patient records, prescribe medication, or change staffing.

### Why the schema supports this

- `kind: 'agent'` distinguishes automated processes from service-to-service communication (`kind: 'service'`). Cerbos policies can have agent-specific rules: e.g., agents are never allowed to write clinical data, even if they have a read capability.
- The capability model limits the agent's blast radius: `opd:census:read` permits reading census data but nothing else in OPD.
- Audit trails clearly distinguish agent actions from human actions (the JWT `sub` points to `agt-reports`).

---

## 10. SCIM provisioning — bulk sync from a government HR system

**Scenario:** AIIMS Delhi uses a government HR system as the source of truth for staff records. The HR system pushes changes via SCIM (System for Cross-domain Identity Management) to keep User Management in sync.

### What happens

**Step 1 — IdP + SCIM configuration created**

The GOV-HR system uses SAML for login federation and SCIM for directory provisioning — two separate protocols, tracked in two related tables:

```
idp_configurations:
  iq_tenant_id: 'aiims-delhi'
  provider_type: 'saml'
  provider_name: 'GOV-HR System'
  is_active: true
  auto_provision: true
  attribute_mapping: { employeeId: 'employee_id', name: 'full_name', department: 'department_code' }

scim_sync_state:
  iq_tenant_id: 'aiims-delhi'
  idp_configuration_id: (above)
  last_sync_at: '2026-05-01T02:00:00Z'
  sync_status: 'idle'
  sync_cursor: 'page-42'
```

**Step 2 — New staff member in HR system**

GOV-HR adds Dr. Verma. SCIM push arrives:
1. User Management creates a `ba_users` record (if email doesn't exist) and a `users` record with the tenant ID.
2. Default role assigned based on the HR designation mapping (configured in Configurator).
3. Department assignment created based on the HR department code → matched to `department_projection`.

**Step 3 — Staff member leaves in HR system**

GOV-HR marks a nurse as "terminated." SCIM push arrives:
1. User Management sets `users.status = 'inactive'` for that user.
2. All active `role_assignments` are revoked with `revoked_by = 'svc-scim-sync'` (the SCIM sync service account).
3. `permission_change_audit` records the deactivation with `changed_by: 'svc-scim-sync'`, `reason: 'HR system termination sync'`.

### Why the schema supports this

- `idp_configurations` stores tenant-specific IdP/SCIM integration details. Each tenant can have different HR systems.
- `scim_sync_state` tracks sync progress — the system knows where it left off if a sync is interrupted.
- `employee_id` on `users` maps to the HR system's staff identifier, enabling bidirectional matching.
- The `permission_change_audit` captures SCIM-driven changes with the same semantic richness as manual admin changes — the compliance officer can see that the deactivation was driven by the HR system, not by a manual admin action.

---

## 11. Compliance audit — "show me all changes to Dr. Sharma's access"

**Scenario:** A compliance officer is investigating a potential unauthorized access incident. They need a complete history of all permission changes for Dr. Sharma in the last 90 days.

### What happens

**Single query against `permission_change_audit`:**

```sql
SELECT entity_type, action, old_value, new_value, reason, changed_by, changed_at
FROM user_management.permission_change_audit
WHERE iq_tenant_id = 'aiims-delhi'
  AND (
    (entity_type = 'role_assignment' AND (new_value->>'user_id' = 'usr-111' OR old_value->>'user_id' = 'usr-111'))
    OR (entity_type = 'delegation' AND (new_value->>'delegatee_id' = 'usr-111' OR new_value->>'delegator_id' = 'usr-111'))
    OR (entity_type = 'clearance' AND new_value->>'user_id' = 'usr-111')
  )
  AND changed_at >= now() - interval '90 days'
ORDER BY changed_at;
```

**Result returns a coherent narrative:**

| Date | Event | Who Changed | Reason |
|------|-------|-------------|--------|
| 2026-02-15 | Role `physician` assigned | Admin Patel | Staff onboarding |
| 2026-03-01 | Clearance `vip` granted | Admin Patel | Assigned to VIP ward rotation |
| 2026-03-15 | Delegation received: `medical-superintendent` approval | Dr. Mehta | Conference delegation |
| 2026-03-22 | Delegation expired | SYSTEM | Auto-expiry |
| 2026-04-01 | Clearance `vip` revoked | Admin Patel | VIP ward rotation ended |
| 2026-04-15 | Role `chief-resident` assigned | Admin Patel | Promotion |

### Why this matters vs. CDC-only audit

A CDC-based audit service for the same investigation would show:
- "row X in `role_assignments` inserted" (no reason, no who-approved context)
- "row Y in `user_clearances` column `revoked_at` changed from NULL to `2026-04-01`" (no reason)
- The compliance officer would need to JOIN multiple tables, cross-reference timestamps, and still wouldn't have the `reason` field.

The in-module `permission_change_audit` gives the compliance officer a self-contained, business-level narrative. CDC serves a different purpose (row-level forensics, event replay, analytics).

---

## 12. Organization-level access — regional medical director

**Scenario:** Dr. Singh is the Regional Medical Director for a hospital chain (org_id = 'org-north-zone') that includes AIIMS Delhi and District Hospital. She needs read access to reports across all hospitals in her zone.

### What happens

**Step 1 — Org-scoped role created in each tenant**

The role definition is per-tenant (roles are tenant-scoped data), so it must be created in both hospitals:

```
roles:
  iq_tenant_id: 'aiims-delhi'    name: 'regional-director'  scope_level: 'organization'  is_system: true
  iq_tenant_id: 'district-hosp'  name: 'regional-director'  scope_level: 'organization'  is_system: true

role_capabilities:  (same capabilities assigned in both tenants)
  iq_tenant_id: 'aiims-delhi'    role_id: (regional-director)  capability_id: (reports:facility:view)
  iq_tenant_id: 'aiims-delhi'    role_id: (regional-director)  capability_id: (reports:clinical-summary:view)
  iq_tenant_id: 'aiims-delhi'    role_id: (regional-director)  capability_id: (admin:staff-summary:view)
  iq_tenant_id: 'district-hosp'  role_id: (regional-director)  capability_id: (reports:facility:view)
  iq_tenant_id: 'district-hosp'  role_id: (regional-director)  capability_id: (reports:clinical-summary:view)
  iq_tenant_id: 'district-hosp'  role_id: (regional-director)  capability_id: (admin:staff-summary:view)
```

**Step 2 — Dr. Singh has user records in each tenant**

```
users:
  iq_tenant_id: 'aiims-delhi'    id: 'usr-777'  auth_user_id: 'auth-777'  org_id: 'org-north-zone'
  iq_tenant_id: 'district-hosp'  id: 'usr-888'  auth_user_id: 'auth-777'  org_id: 'org-north-zone'

role_assignments:
  iq_tenant_id: 'aiims-delhi'    user_id: 'usr-777'  role_id: (regional-director)
  iq_tenant_id: 'district-hosp'  user_id: 'usr-888'  role_id: (regional-director)
```

**Step 3 — JWT for AIIMS Delhi session**

```json
{
  "sub": "usr-777",
  "iq_tenant_id": "aiims-delhi",
  "roles": ["regional-director"],
  "org_id": "org-north-zone"
}
```

**Step 4 — Accessing cross-tenant reports**

When Dr. Singh needs to see reports from all hospitals in her zone, the reporting module uses `org_id` to query across tenants within the organization. Cerbos evaluates:

- Principal has `reports:facility:view` → allowed to view facility reports.
- Principal's `org_id = 'org-north-zone'` → allowed to see data from tenants within this org.
- Cerbos policy: `allow if resource.attr.org_id == principal.attr.org_id AND principal.capabilities.includes("reports:facility:view")`.

### Why the schema supports this

- `org_id` on the `users` record connects the user to an organization that spans tenants.
- `scope_level: 'organization'` on the role indicates this role's permissions apply across the org.
- Each tenant still has its own `users` row for Dr. Singh — per-tenant roles, departments, and clearances are independent. The `regional-director` role is additional, not a replacement.

---

## 13. Handling a security incident — revoking all access immediately

**Scenario:** A nurse's credentials are compromised. The security admin needs to revoke all access immediately.

### What happens

**Step 1 — Suspend the user**

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-666'  status: 'suspended'  updated_by: 'usr-001'
```

**Step 2 — Invalidate all sessions**

Platform calls `auth.api.revokeUserSessions({ body: { userId: 'auth-666' } })` — this revokes all active sessions for the compromised user across all tenants. Direct SQL against `ba_sessions` is never used.

Next refresh attempt at the BFF fails (no valid session). The user is forced to re-login, which is blocked by `status = 'suspended'`. Maximum exposure window: 1-2 minutes (current JWT lifetime).

**Step 3 — Audit**

```
permission_change_audit:
  entity_type: 'user_status'  action: 'updated'  changed_by: 'usr-001'
  reason: 'Credential compromise — incident INC-2026-0042'
  old_value: { status: 'active' }
  new_value: { status: 'suspended' }
```

**Step 4 — Investigate and remediate**

Security admin reviews `ba_sessions` records (via admin API, not direct SQL) for the compromised user's recent activity. After investigation, admin can either:
- Unsuspend and force password change (`users.must_change_password = true`)
- Keep suspended if the breach is severe

### Why the schema supports this

- `status = 'suspended'` is distinct from `'inactive'` — suspended means "access revoked for cause," inactive means "no longer employed." Both block access, but they have different operational meanings and different remediation paths.
- Session revocation uses `auth.api.revokeUserSessions()`, not direct SQL against `ba_sessions` — the better-auth API is the correct abstraction layer.
- The audit record captures the incident reference (`INC-2026-0042`) in the `reason` field — linking the User Management action to the security incident tracking system.

---

## 14. Feature rollout — enabling Smart Parcha for one tenant

**Scenario:** The OPD team ships the "Smart Parcha" feature. AIIMS Delhi should get it; District Hospital should not.

### What happens

**Step 1 — Capabilities already seeded (from OPD module migration)**

```
capabilities:
  module: 'opd'  name: 'opd:smart-parcha:visit:create'   display_name: 'Create Smart Parcha visit'
  module: 'opd'  name: 'opd:smart-parcha:visit:read'     display_name: 'View Smart Parcha visit'
  module: 'opd'  name: 'opd:smart-parcha:visit:update'   display_name: 'Update Smart Parcha visit'
```

These exist in the capabilities reference table, available to all tenants (replicated to all Citus nodes, no `iq_tenant_id` column).

**Step 2 — Configurator feature flag**

Configurator sets `opd.smart_parcha.enabled = true` for AIIMS Delhi, `false` for District Hospital.

**Step 3 — AIIMS Delhi admin assigns capabilities**

Admin Patel adds Smart Parcha capabilities to the physician role:

```
role_capabilities:
  iq_tenant_id: 'aiims-delhi'  role_id: (physician)  capability_id: (opd:smart-parcha:visit:create)
  iq_tenant_id: 'aiims-delhi'  role_id: (physician)  capability_id: (opd:smart-parcha:visit:read)
```

**Step 4 — Defense in depth**

Even if a District Hospital admin mistakenly assigns `opd:smart-parcha:visit:create` to a role:
- The OPD module's backend checks the Configurator feature flag FIRST.
- `opd.smart_parcha.enabled = false` → the endpoint returns 404 (feature not available), regardless of capabilities.
- Capabilities are necessary but not sufficient — the feature must also be enabled at the tenant level.

### Why the schema supports this

- Capabilities exist globally (reference table), but assignment is per-tenant (role_capabilities).
- Two-layer enforcement: Configurator feature flag (entitlement — "does the tenant have this?") + capability assignment (authorization — "can this user use it?").
- No Master Data involvement needed. The OPD module's migration seeded the capabilities; Configurator manages the feature flag; the admin assigns capabilities. One-place-per-concern.

---

## 15. Ward-level scoping — charge nurse for a specific ward

**Scenario:** AIIMS Delhi's Cardiology department has two wards: Ward A and Ward B. Nurse Patel is the charge nurse for Ward A only.

### What happens

```
role_assignments:
  iq_tenant_id: 'aiims-delhi'
  user_id: 'usr-666' (Nurse Patel)
  role_id: (charge-nurse)
  scope_type: 'ward'
  scope_id: 'ward-card-a'
  assigned_by: 'usr-001'
```

When Nurse Patel accesses Ward A patient data:
1. PEP sees role `charge-nurse` scoped to `ward: ward-card-a`.
2. Cerbos evaluates: action on resource in `ward-card-a` + principal has `charge-nurse` scoped to `ward-card-a` → **ALLOW**.

When Nurse Patel accesses Ward B patient data:
1. PEP sees no `charge-nurse` role scoped to `ward-card-b`.
2. Nurse Patel may still have her base `nurse` role (tenant-wide, no scope) → she can perform basic nursing tasks. But charge-nurse-specific actions (e.g., approving medication administration records) are denied for Ward B.

### Why the schema supports this

- `role_assignments.scope_type` + `scope_id` enables fine-grained scoping without creating separate roles per ward.
- The same `charge-nurse` role definition is reused — only the assignment scope differs.
- A tenant-wide role (scope_type = NULL) and a ward-scoped role can coexist for the same user. The PEP merges capabilities from all active assignments.

---

## 16. Token Handler refresh — seamless refresh during long clinical session

> **Phase 1 — MVP**

**Scenario:** Dr. Sharma is in the middle of a 6-hour outpatient clinic. Her JWT expires every 1-2 minutes but she should never be interrupted.

### What happens

**Step 1 — JWT expires**

Dr. Sharma clicks to view a patient's lab results. The SPA detects the current JWT has expired.

**Step 2 — Silent refresh**

The SPA calls the BFF's refresh endpoint. The BFF sends the HttpOnly refresh token cookie to better-auth. better-auth validates the session (still active in `ba_sessions`), issues a new JWT.

**Step 3 — Seamless continuation**

The BFF returns the new JWT to the SPA. The SPA retries the original request with the fresh token. Dr. Sharma sees the lab results without any interruption or login prompt.

**Step 4 — If the session was revoked**

If an admin had revoked Dr. Sharma's session during those 1-2 minutes, the BFF's refresh call would fail. The SPA receives a 401, redirects to the login page. Maximum exposure after revocation: 1-2 minutes (one JWT lifetime).

### Why the schema supports this

- `ba_sessions` stores the refresh token server-side (BFF holds only an opaque cookie reference)
- `users.status` is checked at refresh time — a suspended user's refresh will fail
- Short JWT lifetime (1-2 min) means revocation without a distributed blocklist

---

## 17. Key rotation — JWKS rotation with grace period

> **Phase 1 — MVP**

**Scenario:** The platform's JWKS keys are rotated per the configured schedule (e.g., every 7 days).

### What happens

**Step 1 — Rotation fires**

better-auth's JWT plugin generates a new key pair. The old key's `expiresAt` is set to `now() + gracePeriod`.

```
jwks:
  id: 'key-001'  alg: 'EdDSA'  expiresAt: '2026-05-10'  (old, in grace period)
  id: 'key-002'  alg: 'EdDSA'  expiresAt: NULL            (new, active for signing)
```

**Step 2 — JWKS endpoint serves both keys**

Any module fetching `/.well-known/jwks.json` receives both keys. JWTs signed with `key-001` (still valid, not yet expired) are verified using the `kid` header.

**Step 3 — Grace period expires**

After the grace period (e.g., 14 days), `key-001` is removed from the JWKS response. Any JWT signed with `key-001` that somehow survives beyond 14 days will fail verification. Given 1-2 minute token lifetimes, this is impossible under normal operation — the grace period exists for edge cases like long-offline pods.

**Step 4 — Module cache invalidation**

Modules cache the JWKS with a TTL (e.g., 1 hour). On rotation, modules will fetch the updated JWKS within one TTL cycle. During the window between rotation and cache refresh, the old key is still in the JWKS (grace period), so no verification failures occur.

### Why the schema supports this

- `jwks` table persists keys in the DB — all pods see the same keys
- `expiresAt` tracks rotation lifecycle per key
- Private keys are AES-256-GCM encrypted at rest — database access alone does not compromise signing capability

---

## 18. Standard-tier password reset — user with own email self-serves

> **Phase 1 — MVP**

**Scenario:** Dr. Sharma (recovery_tier = `standard`, `users.email = 'sharma@example.com'`) forgets her password.

### What happens

**Step 1 — Dr. Sharma clicks "Forgot Password"**

On the login page, she enters her username `sharma.cardiology`.

**Step 2 — Platform routes the reset**

Platform intercepts better-auth's `sendResetPassword` callback, looks up `users WHERE auth_user_id = 'auth-111'`, finds `recovery_tier = 'standard'` and `email = 'sharma@example.com'`. Sends the reset email to `sharma@example.com`.

**Step 3 — Password reset**

Dr. Sharma clicks the reset link in her email, sets a new password. `revokeSessionsOnPasswordReset: true` means all existing sessions are invalidated. She logs in with the new password.

### Why the schema supports this

- `users.recovery_tier = 'standard'` tells the routing logic to use self-serve email reset
- `users.email` holds the real email (not the synthetic `ba_users.email`)
- `ba_users.email` (`sharma.cardiology@auth.internal`) is never shown and never emailed

---

## 19. Delegated-tier password reset — admin-initiated, delegated email route

> **Phase 2 — Post-launch**

**Scenario:** Nurse Patel (recovery_tier = `delegated`, no personal email) is locked out.

### What happens

**Step 1 — Setup: Nurse Patel was onboarded with delegated recovery**

```
ba_users:
  id: 'auth-666'  username: 'patel.nurse'  email: 'patel.nurse@auth.internal'

users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-666'  auth_user_id: 'auth-666'
  email: NULL  recovery_tier: 'delegated'  phone_auth_enabled: false

delegated_recovery_routes:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-666'
  address: 'it.admin+emp042@aiims.edu'  verified: true
```

**Step 2 — Nurse Patel clicks "Forgot Password"**

She enters username `patel.nurse`. The platform looks up `recovery_tier = 'delegated'`.

**Step 3 — UI shows delegated message**

The UI shows: "Your account uses delegated recovery. A reset link has been sent to your organization's administrator."

**Step 4 — Platform routes reset**

`sendResetPassword` callback finds the `delegated_recovery_routes` entry, sends the reset link to `it.admin+emp042@aiims.edu`. Also notifies the admin via the admin dashboard.

**Step 5 — Admin delivers the link**

The IT admin receives the email, walks to the ward, and gives Nurse Patel the reset link (or scans a QR code).

**Step 6 — Nurse Patel resets password**

She clicks the link, sets a new password, and logs in.

### Why the schema supports this

- `delegated_recovery_routes.address` holds the sub-addressed admin email for routing
- `delegated_recovery_routes.verified = true` means deliverability was tested at setup
- The real email route is platform-owned — `ba_users.email` is synthetic and uninvolved

---

## 20. Admin-only tier recovery — direct password set, in-person handoff

> **Phase 1 — MVP**

**Scenario:** Ward attendant Raju (recovery_tier = `admin_only`, no email, no phone for auth) is locked out.

### What happens

**Step 1 — Raju approaches the IT admin in person**

There is no self-serve path. The IT admin verifies Raju's identity (badge, known face).

**Step 2 — Admin resets password**

Admin opens User Management → finds Raju → clicks "Reset Password":

1. Cerbos authorizes `admin:user:reset_password`
2. Admin re-authenticates (step-up verification)
3. Platform calls `auth.api.setUserPassword({ body: { userId: 'auth-raju', newPassword: 'Temp@1234' } })`
4. Platform calls `auth.api.revokeUserSessions({ body: { userId: 'auth-raju' } })`
5. Platform sets `users.must_change_password = true`

```
permission_change_audit:
  entity_type: 'user_password'  action: 'admin_reset'  changed_by: 'usr-001'
  target_user_id: 'usr-raju'  reason: 'User locked out, in-person verification'
```

**Step 3 — Admin tells Raju the temp password**

In person, phone call, or printed slip — never emailed.

**Step 4 — Raju logs in**

Raju enters username and temp password. `must_change_password = true` forces a password change screen before any clinical access is granted.

### Why the schema supports this

- `users.recovery_tier = 'admin_only'` means the `sendResetPassword` callback is suppressed
- `users.must_change_password` enforces password rotation after admin set
- `permission_change_audit` records who reset whose password, when, and why

---

## 21. Magic link recovery — admin generates link, delivers via QR/SMS

> **Phase 2 — Post-launch**

**Scenario:** Lab technician Anand (recovery_tier = `delegated`) needs password recovery, but the admin mailbox is temporarily down.

### What happens

**Step 1 — Admin chooses magic link**

Admin opens User Management → finds Anand → clicks "Generate Login Link" (Flow B):

1. Cerbos authorizes `admin:user:generate_recovery_link`
2. Admin re-authenticates (step-up)
3. Platform calls `auth.api.signInMagicLink` server-side with `metadata: { adminGenerated: true, targetUserId: 'usr-anand', adminId: 'usr-001' }`

**Step 2 — sendMagicLink callback intercepts**

The `sendMagicLink` callback sees `metadata.adminGenerated = true`, stores the recovery link in the platform's recovery link table instead of emailing it.

**Step 3 — Admin delivers the link**

Admin UI shows the link as a one-time QR code. Admin shows the QR to Anand, or sends it via SMS/WhatsApp.

**Step 4 — Anand opens the link**

The magic link is single-use (`allowedAttempts: 1`), expires in 5 minutes (`expiresIn: 300`). Anand is authenticated and lands in a "recover your account" flow — not directly into clinical modules. He sets a new password.

### Why the schema supports this

- `permission_change_audit` logs the admin who generated the link, the target user, and the timestamp
- `users.must_change_password` can be set to force password change after magic link entry
- Magic link configuration (`disableSignUp: true`) prevents unknown users from creating accounts

---

## 22. Phone-only user sets up username/password — credential account creation

> **Phase 2 — Post-launch**

**Scenario:** Community health worker Priya registers with her phone number (no email).

### What happens

**Step 1 — Phone OTP sign-up**

Priya enters phone `+919876543210`. OTP is sent and verified.

**Step 2 — User record created**

Platform assigns username `priya.chw`. `signUpOnVerification` fires with `getTempEmail` returning `priya.chw@auth.internal`.

```
ba_users:
  id: 'auth-priya'  username: 'priya.chw'  email: 'priya.chw@auth.internal'  phoneNumber: '+919876543210'

users:
  iq_tenant_id: 'phc-rajapur'  id: 'usr-priya'  auth_user_id: 'auth-priya'
  phone: '+919876543210'  email: NULL  recovery_tier: 'phone_recovery'  phone_auth_enabled: true
```

**Step 3 — Credential account created**

**Critical:** Platform calls `auth.api.setUserPassword({ body: { userId: 'auth-priya', newPassword: (temporary) } })` — because `signUpOnVerification` creates the user record but NOT the credential account. Without this step, `signIn.username` would fail with "Credential account not found."

**Step 4 — Priya sets her own password**

`users.must_change_password = true` forces Priya to choose her own password on first login.

**Step 5 — Priya can now log in two ways**

- Username (`priya.chw`) + password
- Phone (`+919876543210`) + OTP

### Why the schema supports this

- `users.phone_auth_enabled = true` enables phone OTP login for this user
- `users.recovery_tier = 'phone_recovery'` means recovery uses phone OTP, not email
- `ba_users.email` follows the standard synthetic pattern — no special case for phone users

---

## 23. Shared phone number — contact only, no phone auth

> **Phase 2 — Post-launch**

**Scenario:** Two nurses at a rural PHC share a family phone number `+919111222333`.

### What happens

**Step 1 — First nurse onboarded**

```
ba_users:
  id: 'auth-n1'  username: 'meera.nurse'  email: 'meera.nurse@auth.internal'  phoneNumber: '+919111222333'

users:
  iq_tenant_id: 'phc-village'  id: 'usr-n1'  phone: '+919111222333'  phone_auth_enabled: true
```

**Step 2 — Second nurse onboarded with same phone**

Platform detects `+919111222333` is already associated with another auth-enabled user.

```
ba_users:
  id: 'auth-n2'  username: 'asha.nurse'  email: 'asha.nurse@auth.internal'
  phoneNumber: NULL  (not stored in ba_users — ambiguous for auth)

users:
  iq_tenant_id: 'phc-village'  id: 'usr-n2'  phone: '+919111222333'  phone_auth_enabled: false
```

**Step 3 — First nurse's phone auth is also disabled**

Since the phone is now shared, `phone_auth_enabled` is set to `false` for both users. The phone is contact-only for both.

Both nurses log in with username + password only.

### Why the schema supports this

- `users.phone_auth_enabled` is the platform-controlled flag that gates phone OTP login
- The phone number is stored as contact info (`users.phone`) even when not auth-enabled
- `ba_users.phoneNumber` is only set when the phone is unique and auth-enabled

---

## 24. Federation after 1,000 local users — explicit linking, duplicate prevention

> **Phase 3 — Federation**

**Scenario:** AIIMS Delhi deploys Microsoft Entra ID. 1,000 staff already have local username+password accounts.

### What happens

**Step 1 — Tenant admin configures IdP**

```
idp_configurations:
  iq_tenant_id: 'aiims-delhi'  provider: 'entra_id'
  issuer: 'https://login.microsoftonline.com/abc123/v2.0'
  domain: 'aiims.edu'  status: 'configured'  implicit_signup_enabled: false
```

Implicit SSO sign-up is disabled until matching is complete.

**Step 2 — Platform imports Entra user roster**

Platform queries Entra ID for users, displaying them alongside existing platform users for admin matching.

**Step 3 — Admin matches users**

For each Entra user, the admin matches by employee_id, HR-id, or manual review — never by email alone:

```
auth_identity_links:
  iq_tenant_id: 'aiims-delhi'  user_id: 'usr-111'  auth_user_id: 'auth-111'
  provider_id: 'entra_id'  issuer: 'https://login.microsoftonline.com/abc123/v2.0'
  subject: '550e8400-e29b-41d4-a716-446655440000'
  claim_snapshot: { email: 'sharma@aiims.edu', name: 'Dr. Sharma', groups: ['physicians'] }
  linked_by: 'usr-001'  linked_at: now()
```

**Step 4 — Test and enable**

After linking is verified in staging, the admin enables `implicit_signup_enabled = true` for genuinely new users (employees who join after federation is live).

**Step 5 — Dr. Sharma logs in via SSO**

Dr. Sharma clicks "Sign in with AIIMS ID" → redirected to Entra → authenticated → better-auth callback fires → platform's `provisionUser` hook looks up `auth_identity_links` by `(provider_id, issuer, subject)` → finds `usr-111` → linked. No duplicate user created.

### Why the schema supports this

- `auth_identity_links` provides explicit, admin-controlled matching — no reliance on email-based auto-linking
- `idp_configurations.implicit_signup_enabled` gates JIT provisioning until matching is done
- `auth_identity_links.subject` uses the IdP's stable subject identifier, not email (which can change)
- The unique index `(iq_tenant_id, provider_id, subject)` prevents duplicate linking

---

## 25. Federated user email differs from synthetic — link by subject, not email

> **Phase 3 — Federation**

**Scenario:** Dr. Sharma's Entra email is `sharma@aiims.edu`, but her `ba_users.email` is `sharma.cardiology@auth.internal`. Auto-linking by email would fail.

### What happens

This scenario demonstrates why explicit linking (§24) is necessary:

1. better-auth's automatic SSO account linking works by matching `ba_users.email` to the IdP's email claim under a verified domain
2. `sharma@aiims.edu` does not match `sharma.cardiology@auth.internal` — auto-linking fails
3. Without explicit `auth_identity_links`, better-auth would create a new `ba_users` record for `sharma@aiims.edu` — resulting in a duplicate clinical user
4. With explicit linking, the platform's `provisionUser` hook checks `auth_identity_links` first, finds the match by `(provider_id, issuer, subject)`, and links to the existing `auth-111` user

### Why the schema supports this

- Synthetic emails make auto-linking impossible by design — this is intentional, not a bug
- `auth_identity_links.subject` (the IdP's stable sub claim) is the correct matching key
- The platform controls the linking workflow, not better-auth's internal logic

---

## 26. SCIM pushes real email for delegated user — recovery tier upgrade

> **Phase 3 — Federation**

**Scenario:** Nurse Patel (recovery_tier = `delegated`) gets her own AIIMS email when the hospital rolls out email for all staff via SCIM.

### What happens

**Step 1 — SCIM event received**

SCIM sync pushes `{ email: 'patel.nurse@aiims.edu' }` for Nurse Patel.

**Step 2 — Platform updates contact email**

```
users:
  iq_tenant_id: 'aiims-delhi'  id: 'usr-666'
  email: 'patel.nurse@aiims.edu'  (was NULL)
  recovery_tier: 'standard'       (was 'delegated')
```

**Step 3 — Delegated route deactivated**

The `delegated_recovery_routes` entry for `usr-666` is soft-deleted or marked inactive. Nurse Patel can now self-serve password resets via her own email.

**Step 4 — ba_users unchanged**

`ba_users.email` remains `patel.nurse@auth.internal` — the identity anchor is never mutated. Only `users.email` and `users.recovery_tier` changed.

### Why the schema supports this

- Recovery tier upgrade is a simple `UPDATE users` — no AuthN layer changes
- `ba_users.email` stability means no better-auth verification flows, no session invalidation
- `delegated_recovery_routes` lifecycle is independent of the identity anchor

---

## 27. Admin mailbox changes — delegated route migration with audit

> **Phase 2 — Post-launch**

**Scenario:** AIIMS Delhi's IT admin mailbox changes from `it.admin@aiims.edu` to `helpdesk@aiims.edu`.

### What happens

**Step 1 — Admin updates base mailbox**

In the admin UI, the tenant admin changes the base email from `it.admin@aiims.edu` to `helpdesk@aiims.edu`.

**Step 2 — Deliverability test**

Platform sends a probe to `helpdesk+hims-test@aiims.edu`. If it fails, the migration is blocked.

**Step 3 — Batch update**

All `delegated_recovery_routes` rows referencing the old `base_email_id` are updated:
- `address` changes from `it.admin+emp042@aiims.edu` to `helpdesk+emp042@aiims.edu`
- `verified` resets to `false`
- Platform sends probes to each new address

**Step 4 — Audit trail**

```
permission_change_audit:
  entity_type: 'delegated_recovery_routes'  action: 'batch_migrated'
  changed_by: 'usr-001'
  reason: 'IT admin mailbox migration — it.admin@ → helpdesk@'
  old_value: { base_email: 'it.admin@aiims.edu', affected_users: 42 }
  new_value: { base_email: 'helpdesk@aiims.edu' }
```

### Why the schema supports this

- `delegated_recovery_routes.base_email_id` allows batch lookup of all routes using a given base mailbox
- `verified` flag requires re-verification after address change
- `permission_change_audit` captures the bulk operation for compliance

---

## 28. Admin mailbox compromised — disable delegated recovery, rotate, revoke

> **Phase 2 — Post-launch**

**Scenario:** The IT admin mailbox `it.admin@aiims.edu` is compromised. All delegated recovery routes using it must be disabled immediately.

### What happens

**Step 1 — Disable all delegated routes**

```
UPDATE delegated_recovery_routes
SET verified = false
WHERE iq_tenant_id = 'aiims-delhi' AND base_email_id = (compromised mailbox ID);
```

This immediately prevents any password reset from being routed through the compromised mailbox.

**Step 2 — Revoke sessions for affected users**

For each user who had a delegated route through the compromised mailbox:
- Platform calls `auth.api.revokeUserSessions({ body: { userId } })` for each affected `auth_user_id`
- This is precautionary — if the attacker used a reset link before detection

**Step 3 — Notify and investigate**

- All affected users are flagged for admin-initiated password reset (Flow A)
- Admin reviews `permission_change_audit` for any suspicious resets in the timeframe
- New base mailbox is configured, routes migrated (§27)

### Why the schema supports this

- `delegated_recovery_routes.verified = false` is the kill switch — unverified routes are never used
- Session revocation uses `auth.api.revokeUserSessions()`, not direct SQL
- Audit trail enables forensic investigation of the compromise window

---

## 29. 2FA recovery for delegated user — backup codes on screen only, never emailed

> **Phase 2 — Post-launch**

**Scenario:** Nurse Meera (recovery_tier = `delegated`) enables TOTP 2FA and later loses her authenticator app.

### What happens

**Step 1 — 2FA enrollment**

When Nurse Meera enables TOTP, the platform shows backup codes on screen one time. Codes are NOT emailed (no personal email to send to, and emailing to the admin mailbox would expose them).

**Step 2 — Authenticator lost**

Nurse Meera cannot provide TOTP. She approaches the IT admin.

**Step 3 — Admin resets 2FA**

1. Cerbos authorizes `admin:user:reset_2fa`
2. Admin re-authenticates (step-up)
3. Platform calls `auth.api.disableTwoFactor({ body: { userId: 'auth-meera' } })` (or equivalent admin API)
4. Platform calls `auth.api.revokeUserSessions({ body: { userId: 'auth-meera' } })`

```
permission_change_audit:
  entity_type: 'user_2fa'  action: 'admin_reset'  changed_by: 'usr-001'
  target_user_id: 'usr-meera'  reason: 'Authenticator app lost, in-person verification'
```

**Step 4 — Nurse Meera re-enrolls**

On next login, Nurse Meera is prompted to set up TOTP again.

### Why the schema supports this

- 2FA reset follows the same Cerbos-gated, step-up-authenticated, audited pattern as password reset
- Session revocation ensures the compromised authenticator (if stolen) cannot maintain access

---

## 30. Shared workstation — fast user switching, re-auth before clinical action

> **Phase 1 — MVP**

**Scenario:** Emergency department has a shared workstation. Multiple staff use it during a shift.

### What happens

**Step 1 — Nurse Asha logs in**

Nurse Asha enters username `asha.emergency` + password. BFF issues JWT, stores refresh token.

**Step 2 — Dr. Kapoor needs the workstation**

Asha clicks "Switch User" (not "Logout"). The SPA clears the current JWT from memory but does NOT destroy the BFF cookie (Asha's session stays active server-side for fast switch-back).

Dr. Kapoor enters his username + password. New JWT issued, new refresh token cookie.

**Step 3 — Clinical action requires re-authentication**

When Dr. Kapoor attempts to prescribe a controlled substance, the module's PEP enforces step-up authentication (a high-assurance action). Dr. Kapoor must re-enter his password before the action proceeds.

### Why the schema supports this

- Username-based login enables fast switching (no email to type)
- Short JWT lifetime (1-2 min) limits exposure from abandoned sessions
- Step-up re-authentication is enforced by Cerbos policies, not by the workstation
- `permission_change_audit` logs each distinct user's actions for the full shift

---

## 31. BFF down during clinical session — existing JWTs expire, operational behavior

> **Phase 1 — MVP**

**Scenario:** The BFF goes down for 5 minutes during a busy clinic.

### What happens

**Step 1 — BFF goes down**

Existing JWTs are still valid — modules verify signatures against cached JWKS, not against the BFF. Doctors currently in the middle of a clinical note can continue working.

**Step 2 — JWT expires (1-2 minutes later)**

The SPA tries to refresh via the BFF. The refresh call fails (BFF is unreachable). The SPA shows a "Connection lost, retrying..." banner but does NOT immediately log the user out.

**Step 3 — BFF recovers**

When the BFF comes back, the SPA retries the refresh. If the underlying better-auth session is still valid, the refresh succeeds and the user continues seamlessly. If the session expired during the outage (unlikely in 5 min, since sessions last longer), the user must re-login.

**Step 4 — Module independence preserved**

Modules that received valid JWTs before the outage continue processing those requests. The BFF outage does NOT cause module-level errors for in-flight requests.

### Why the schema supports this

- Zero-trust: modules verify JWTs against JWKS, independent of BFF
- JWKS is cached — module verification works even if the JWKS endpoint (behind the BFF) is temporarily unreachable
- BFF is stateful (cookie store) but its outage is bounded — no data loss, only a brief auth gap

---

## 32. Training/sandbox environment — prevent unsafe credential practices from normalizing

> **Phase 1 — MVP**

**Scenario:** Hospital sets up a training environment for new staff to learn the system.

### What happens

**Step 1 — Sandbox tenant created**

A separate tenant (`aiims-delhi-sandbox`) is created with `environment = 'sandbox'` (Configurator-managed).

**Step 2 — Training accounts**

Training accounts are created with explicit sandbox markers:

```
ba_users:
  id: 'auth-train-1'  username: 'train.nurse.01'  email: 'train.nurse.01@auth.internal'

users:
  iq_tenant_id: 'aiims-delhi-sandbox'  id: 'usr-train-1'  auth_user_id: 'auth-train-1'
  kind: 'user'  status: 'active'  recovery_tier: 'admin_only'
```

**Step 3 — Password policy enforced**

Training accounts still require unique passwords and follow the same credential policies as production. Password sharing ("everyone use `Training123`") is prevented by:
- Each account has a distinct username and password
- `permission_change_audit` logs all access even in sandbox
- Sandbox accounts cannot be reused in production tenants (different `iq_tenant_id`)

**Step 4 — No cross-contamination**

Sandbox tenant data is on a separate Citus shard. Cerbos tenant isolation ensures sandbox principals cannot access production resources.

### Why the schema supports this

- `iq_tenant_id` distribution provides complete data isolation between sandbox and production
- Same auth model in sandbox and production prevents "training shortcuts" from becoming habits
- `recovery_tier = 'admin_only'` for training accounts — no email recovery, admin resets only

---

## Summary: what the schema handles

| Category | Scenarios | Phase | Key schema features |
|----------|-----------|-------|-------------------|
| **Tenant lifecycle** | §1 onboarding, §14 feature rollout, §32 sandbox | MVP | `iq_tenant_id` distribution, `is_system` roles, capabilities reference table |
| **User lifecycle** | §2 onboarding, §7 transfer, §13 security incident | MVP | `users.status`, department assignments, `ba_users.username`, synthetic email |
| **Multi-tenancy** | §3 multi-tenant login, §4 role customization | MVP | `auth_user_id` linking, per-tenant `role_capabilities`, Token Handler |
| **Authorization granularity** | §4 capabilities, §6 clearances, §15 ward scoping | MVP | `role_capabilities`, `user_clearances`, `role_assignments.scope_type` |
| **Delegation** | §5 superintendent delegation | MVP | `delegations` with time bounds, PEP enrichment |
| **Non-human principals** | §8 service accounts, §9 agents | MVP | `users.kind` (user/service/agent), same capability model |
| **Token lifecycle** | §16 refresh, §17 key rotation, §31 BFF down | MVP | `jwks`, Token Handler, JWKS caching |
| **Recovery (MVP)** | §18 standard, §20 admin-only | MVP | `recovery_tier`, `must_change_password` |
| **Recovery (extended)** | §19 delegated, §21 magic link, §29 2FA | Post-launch | `delegated_recovery_routes`, admin workflows |
| **Phone auth** | §22 phone setup, §23 shared phone | Post-launch | `phone_auth_enabled`, phone-only registration flow |
| **Operations** | §11 audit, §27 mailbox migration, §28 mailbox compromise, §30 shared workstation | Mixed | `permission_change_audit`, `delegated_recovery_routes` lifecycle |
| **External integration** | §10 SCIM, §24 federation, §25 email mismatch, §26 SCIM upgrade | Federation | `idp_configurations`, `auth_identity_links`, `employee_id` |
| **Compliance** | §11 audit, §13 incident, §29 2FA recovery | Mixed | `permission_change_audit` with `reason`, `status` lifecycle |
| **Organization** | §12 regional director | MVP | `org_id`, `scope_level: 'organization'` |
