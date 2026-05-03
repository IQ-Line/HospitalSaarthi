# Review: Better Auth, Delegated Email, Recovery, and Federation

**Date:** 2026-05-03  
**Reviewed input:** `user-management-authn-solution-deliberation.txt`  
**Related internal artifacts:** `docs/superpowers/specs/2026-05-03-authn-authz-revision-design.md`, `docs/architecture/problem-statement/*`, `docs/architecture/AIIMS_EOI.md`, `docs/architecture/hld/01-system-overview.md`, `docs/architecture/hld/04-authn-authz-flow.md`, `docs/architecture/adr/0003-authn-better-auth-identity-adapter.md`, `docs/architecture/lld/user-management/01-schema-design.md`, `docs/architecture/lld/user-management/02-scenarios.md`

## Short Verdict

Better Auth is still a viable base for the HIMS AuthN design, including username-primary login, admin-created users, admin password reset, phone OTP, magic links, JWKS-backed JWTs, and OAuth/OIDC provider behavior.

But I would not approve the current deliberation as-is. After reading the system overview, problem statement, AIIMS EOI context, and Gemini's critique, I would tighten the recommendation further:

1. **For local username/password users, `ba_users.email` should be treated as an internal AuthN key, not as the business email.** Gemini is right that synthetic Better Auth emails are the safer default for this platform.
2. **Sub-addressing is useful as a recovery/contact routing strategy, but it should not become the primary identity value in Better Auth.** It depends on tenant mail infrastructure and creates sensitive AuthN-level email mutation work later.
3. **Federated account linking for previously local/delegated users is the largest unsolved risk.** The cited `mapProfileToUser` approach is not supported by the current SSO docs in the way the deliberation assumes.
4. **Recovery must be a platform workflow, not just "Better Auth password reset sent to the admin."** Better Auth provides the primitives, but the safety guarantees come from our wrapper, audit model, admin authorization, and tenant-specific recovery policy.

My recommendation: proceed with Better Auth, but revise the design into an explicit **credential identity policy matrix**:

- `standard_local`: local username/password user with a unique business email in `users.email`; Better Auth email remains an internal synthetic key.
- `delegated_recovery`: local username/password user with no personal email; delegated mailbox/alias is used only by the platform recovery workflow, not as the Better Auth identity key.
- `synthetic_internal`: local username/password user with no usable email route; all recovery is admin/phone/in-person.
- `phone_primary`: user authenticates/recovers via verified phone, with username/password enabled only after a credential account exists.
- `federated`: user is bound to a verified IdP subject; local password recovery may be disabled or treated as break-glass.

## Sources Checked

I used Context7 for current Better Auth documentation and also checked the live Better Auth docs pages for the highest-risk areas.

Key docs consulted:

- Context7 library: `/better-auth/better-auth`
- Better Auth Username plugin: https://www.better-auth.com/docs/plugins/username
- Better Auth Email & Password: https://www.better-auth.com/docs/authentication/email-password
- Better Auth Admin plugin: https://www.better-auth.com/docs/plugins/admin
- Better Auth Magic Link plugin: https://www.better-auth.com/docs/plugins/magic-link
- Better Auth Phone Number plugin: https://www.better-auth.com/docs/plugins/phone-number
- Better Auth JWT plugin: https://www.better-auth.com/docs/plugins/jwt
- Better Auth OAuth 2.1 Provider plugin: https://www.better-auth.com/docs/plugins/oauth-provider
- Better Auth OIDC Provider plugin: https://www.better-auth.com/docs/plugins/oidc-provider
- Better Auth SSO plugin: https://www.better-auth.com/docs/plugins/sso

## Domain Context Changes The Default

The AIIMS and problem-statement documents raise the bar beyond ordinary SaaS authentication:

- The platform must serve AIIMS-scale operations: 60+ departments, multiple campuses, 5,000-bed expansion, 54+ lakh OPD visits/year, nearly 4 lakh IPD visits/year, and 3 lakh surgeries/year.
- The same codebase must also serve district hospitals, standalone pharmacies, hospital chains, and fragmented deployments alongside legacy systems.
- The EOI explicitly asks for a unified clinical workstation with SSO, centralized user lifecycle management, patient-context launch, integrated legacy views, role-based access, audit trails, secure data handling, training, and operations support.
- The compliance context includes DPDP, ABDM, NABH/NABL/JCI, ISO 22600 access control, ISO 27789 audit trails, ISO 27799 health security, SOC, POC, RTO/RPO, and on-prem BCP.
- The problem statement requires one authoritative identity source for every principal, federated identity for hospitals with existing IdPs, persistent shadow records for audit, and tenant-aware authorization across fragmented deployments.

In that context, the AuthN layer should minimize the semantic meaning carried by Better Auth's required `email` field. A real hospital email is mutable, sometimes shared, sometimes absent, sometimes tenant-specific, and sometimes controlled by an external IdP. A Better Auth user row is part of the platform identity anchor. Mixing those two concepts makes the identity anchor less stable.

Therefore my revised default is:

> For local users, `ba_users.email` should be a synthetic, non-routable, globally unique internal key. Real emails, shared/delegated emails, admin base mailboxes, phone numbers, and recovery routes belong in platform-owned User Management tables.

This agrees with Gemini's core point. The difference is that I would not store `admin+placeholder@hospital.com` directly in `users.email` as though it were the staff member's email. It should be modeled as a delegated recovery route or contact route, because legally and operationally it is not the user's own email.

## Review Of Gemini's Recommendations

Gemini's strongest contribution is the sharper separation between AuthN identity and business-contact reality. I agree with the direction:

- Use synthetic Better Auth emails for local username/password users.
- Keep `users.email` nullable and governed by tenant policy.
- Do not let generic self-service "forgot password" trigger email reset for shared/synthetic users.
- Treat Better Auth's `getTempEmail` patterns in phone/anonymous plugins as evidence that synthetic emails are a supported library pattern, not an architectural smell.

I would adjust or challenge these parts:

1. **`base+x` should not be placed in `users.email` by default.** If the address is not truly controlled by the user, store it as a recovery route such as `delegated_recovery_routes`, with owner/admin mailbox, deliverability status, and tenant approval. `users.email` should mean "this user's own business/contact email" where possible.
2. **`generatePasswordResetToken` was not validated in the current docs I checked.** The docs clearly support `requestPasswordReset`, `resetPassword`, `sendResetPassword`, and admin `setUserPassword`; if an internal server API exists for token generation, it needs source-level proof before entering the spec.
3. **"Manager-approved reset token inactive until release" is a custom platform recovery system, not a direct Better Auth feature.** It is viable, but then the token lifecycle should be owned by User Management and only call Better Auth when the approved recovery action is executed.
4. **The multi-tenant consultant example is under-specified.** If Dr. Smith has `smith@auth.internal` in one tenant and `smith_guest@auth.internal` in another, that is not automatically one Better Auth user. The platform needs a global identity merge/link workflow, not username coincidence.
5. **Federation remains the hard edge.** If local users have synthetic Better Auth emails and SSO users arrive with IdP emails, Better Auth's documented same-email linking will not link them. That is acceptable only if we build an explicit platform-controlled linking workflow.

## Real-World Hospital Judgment

The domain reality pushes me toward boring, explicit controls rather than clever email tricks:

- **Hospitals are not stable identity environments.** Residents rotate, interns arrive in batches, contractual staff churn, nurses transfer wards, and consultants practice across institutions. The primary key for a person must survive email changes, department changes, tenant assignments, and IdP migrations.
- **Shared devices are normal.** Nurses and clerks often work on shared workstations. The application session must always represent a named user, even if the Windows login, browser profile, or physical terminal is shared.
- **Email ownership is a weak proxy for identity in many Indian facilities.** Some staff have official email, some have personal email, some have only phone, and some depend on an administrator. Treating email as the AuthN identity anchor will produce either exclusion or unsafe sharing.
- **HRMS/SCIM should become the long-term source of staff lifecycle truth where available.** For AIIMS-scale deployments, manual admin-only user lifecycle does not scale. But many smaller hospitals will not have a reliable HRMS, so local admin provisioning remains necessary.
- **Recovery is a clinical safety workflow.** A password reset can grant access to patient data, medication orders, certificates, MLC/forensic workflows, billing, and administrative approvals. It deserves the same seriousness as a permission change: authorization, reason, step-up, audit, and review for high-risk cases.
- **Training and go-live matter.** The EOI explicitly calls out training, sandbox environments, UAT, parallel run, and stabilization. If the training environment normalizes shared passwords or informal reset links, those habits will carry into production.
- **Patient portal identity should be treated separately.** Staff identity and patient identity have different assurance, consent, guardian/dependent access, and recovery semantics. Do not let staff delegated-email compromises bleed into patient-facing auth decisions.

This means the practical design center should be: local username/password with synthetic Better Auth email, explicit staff lifecycle records, explicit recovery policies, and explicit external-IdP linking. Use email and phone as verified channels, not as the sole source of personhood.

## What The Prior Research Got Right

The Better Auth feature surface is real:

- Username login is supported through the username plugin. It extends email/password auth and adds `signIn.username`, while signup still requires an email field.
- Admin user provisioning and recovery are supported by the admin plugin through `createUser`, `setUserPassword`, `banUser`, and `revokeUserSessions`.
- Email/password reset is callback-based through `sendResetPassword`, and Better Auth exposes `revokeSessionsOnPasswordReset`, which is important because it is **off by default**.
- Magic link delivery is callback-controlled. `sendMagicLink` receives `{ email, token, url, metadata }`, and the docs explicitly forward request `metadata` to the callback.
- Phone number auth supports OTP verification, `signUpOnVerification.getTempEmail`, phone/password sign-in, phone password reset, and a custom phone validator.
- JWT/JWKS support is strong enough for module-local verification: Better Auth's JWT plugin publishes `/jwks`, supports custom JWKS paths, DB-backed key storage by default, key rotation when configured, and custom payload definitions.
- The OAuth 2.1 Provider plugin exists and is the right direction for platform-as-provider use. The OIDC Provider plugin page explicitly says it will soon be deprecated in favor of OAuth Provider.

These are enough to continue with Better Auth. The issue is not feature absence; it is boundary discipline.

## Critical Finding 1: Sub-Addressing Must Not Become AuthN Identity

The deliberation's strongest overclaim is:

> The sub-addressing approach is strictly better than pure synthetic emails because it preserves email deliverability while maintaining uniqueness.

That is only true if we are comparing recovery delivery routes, not identity anchors. It also depends on all of the following being true:

- The base mailbox is a durable role mailbox, not a human admin's personal mailbox.
- The mail provider actually supports plus addressing.
- No Better Auth option, plugin, proxy, or future migration normalizes away the `+tag` portion.
- The tenant accepts that recovery emails and potentially auth links land in an admin-controlled mailbox.
- The admin mailbox itself has strong security controls.

If any of those fail, sub-addressing becomes a hidden dependency on tenant mail infrastructure. For hospitals with unreliable mail systems, on-prem Exchange variance, government mailboxes, or admins using personal addresses, the safer Better Auth identity value remains a non-routable synthetic email.

The revised position is: `base+x` may be an excellent delegated recovery route after deliverability testing, but it should not be the value that anchors the Better Auth user row.

### Recommended Rule

Use this selection algorithm during user creation:

1. For local users, set `ba_users.email` to a synthetic internal value derived from an immutable platform identity key, not from a mutable business email. Prefer a generated auth identity such as `{authUserId}@auth.internal` or a globally stable username key.
2. If the user has a unique real email, store it in `users.email`, mark the recovery policy `self_email`, and route Better Auth reset/verification callbacks through the platform-owned email value.
3. If the tenant has a verified delegated base mailbox and a successful alias deliverability test, store `base+stableUserAlias@domain` as a delegated recovery route, not as the Better Auth email.
4. If no reliable email route exists, mark recovery as admin/phone/in-person only.

This keeps the strength of the prior research while avoiding a brittle universal rule.

### Additional Guardrails

- Never derive the `+N` suffix from CSV row order alone. Use a stable identifier such as employee ID or a generated immutable staff code.
- Treat delegated alias deliverability as a tenant onboarding check. Send a verification probe to `base+hims-test@domain` before enabling delegated aliases.
- Store `base_email_id`, alias local part, and delivery status separately so base mailbox/domain migration can be audited and safely replayed.
- Do not include delegated or synthetic email in JWT claims, logs visible to end users, or downstream clinical modules.
- Add a CI/config assertion that email sub-address normalization is disabled. A Better Auth PR exists for opt-in sub-address normalization; whether or not it is in the current released docs, the architecture must explicitly forbid enabling it.
- Make `ba_users.email` changes rare. A user's personal email change should normally update platform-owned contact/recovery data, not mutate the Better Auth identity key.

## Critical Finding 2: Federated Linking Is Not Solved By `mapProfileToUser`

The deliberation proposes a flow like:

```ts
sso({
  mapProfileToUser: async (profile, account) => {
    const existingUser = await findByEmployeeId(profile.employeeId);
    if (existingUser) return { id: existingUser.baUserId };
  }
})
```

I could not validate this against the current Better Auth SSO docs. The SSO docs describe:

- OIDC/SAML provider registration with domain and provider ID.
- `provisionUser` and `provisionUserOnEveryLogin` for custom logic after sign-in/provisioning.
- Domain verification.
- Automatic account linking when the provider domain is verified and an existing account with the **same email** exists.
- `accountLinking.trustedProviders` as the mechanism for trusted providers.

That is not the same as arbitrary "return `{ id }` from a profile mapper and link this IdP subject to an existing user by employee ID."

This matters because delegated/local users often have:

- Better Auth email: `auth-abc123@auth.internal`
- Delegated recovery route: `admin+42@hospital.com`
- IdP email: `dr.sharma@hospital.com` or `sharma@hospital.onmicrosoft.com`
- Matching business identity: employee ID, HR ID, or badge number

The docs-supported automatic linking path is same-email under verified domain. A previously local/synthetic user will fail that condition and may be JIT-provisioned as a duplicate unless we explicitly control linking.

### Required Design Change

For federation rollout at an existing tenant, add an explicit linking workflow before allowing implicit SSO sign-up:

1. Tenant admin configures IdP and verifies domain/provider.
2. User Management imports or previews IdP users by stable subject and claims.
3. The platform matches IdP users to existing `users` rows by tenant + employee ID, HR ID, or manually reviewed match.
4. The platform records an explicit link: `(iq_tenant_id, user_id, auth_user_id, provider_id, issuer, subject, claim_snapshot, linked_by, linked_at)`.
5. Disable implicit SSO signup until the tenant has a duplicate-handling policy.
6. On SSO callback, reject ambiguous matches; never silently create a second clinical user for the same employee.

Better Auth's SSO `provisionUser` hook can still be used, but our architecture must not rely on undocumented linking semantics. We need either a documented Better Auth account-linking API for this exact case or a platform-controlled linking layer that is verified in a proof of concept.

## Critical Finding 3: Delegated Password Reset Should Not Be Default Self-Service

Better Auth's email/password reset is viable:

- `sendResetPassword({ user, url, token })` is callback-controlled.
- Reset tokens can expire.
- `revokeSessionsOnPasswordReset` exists but must be set to `true`.

However, for delegated users, a normal "forgot password" UX is dangerous because the person requesting the reset may not control the email destination. If the reset link lands in an admin mailbox, the security event is no longer user-private. That may be acceptable by contract, but it should not be casually framed as equivalent to normal recovery.

### Recommended Recovery Modes

For `standard_local` users:

- User-initiated password reset to their own verified email.
- `revokeSessionsOnPasswordReset: true`.
- Email sending done asynchronously to avoid timing attacks, as the docs recommend.

For `delegated_recovery` users:

- Do not expose generic "forgot password by email" as the primary path.
- Prefer admin-initiated reset from the tenant admin UI.
- Allow reset link generation only after admin re-authentication and reason capture.
- Display clear UI: "This account uses delegated recovery through tenant administrators."

For `synthetic_internal` users:

- No email reset.
- Admin direct password set, phone OTP recovery if phone is unique/verified, or in-person desk recovery.

For `federated` users:

- Prefer IdP recovery.
- Local password reset should be disabled unless the tenant explicitly enables local break-glass credentials.

## High Finding 4: Admin Direct Password Set Is The Best Baseline Recovery

The admin plugin documents `setUserPassword`, `revokeUserSessions`, and `banUser`. These are safer primitives than direct SQL against Better Auth tables.

The LLD scenario currently talks about deleting `ba_sessions`. That should be revised. Direct SQL may work, but it bypasses library-level behavior and future schema changes.

### Recommended Flow

1. Admin selects a user in User Management.
2. Cerbos authorizes `admin:user:reset_password` for that tenant and scope.
3. Admin re-authenticates or passes step-up verification for high-risk recovery.
4. Platform calls `auth.api.setUserPassword`.
5. Platform calls `auth.api.revokeUserSessions`.
6. User is marked `must_change_password = true` in platform-owned data.
7. `permission_change_audit` records actor, reason, channel, and target.
8. User login forces password change before clinical access.

This works for users with no email, no phone, and no reliable mailbox.

## High Finding 5: Magic Link Is Viable, But Needs A Platform Handoff Contract

The magic link callback does support out-of-band delivery because the app controls `sendMagicLink`. The docs show `metadata` is forwarded to the callback and verification can be performed through the token.

The safe version is not "generate a login link and let the admin copy it anywhere." The safe version is an audited handoff flow:

- `disableSignUp: true` for any admin-generated login link path.
- `allowedAttempts: 1` or the default single-use behavior.
- Very short `expiresIn`, likely 2-5 minutes for in-person QR and no more than 10 minutes for remote handoff.
- Store token hashed if tokens are persisted through Better Auth's verification storage.
- Generate only from a server-side admin endpoint after Cerbos authorization.
- Bind metadata to target user, tenant, admin actor, recovery reason, and delivery channel.
- Show the link or QR once; do not leave a reusable URL in an admin activity feed.
- After magic-link login, land the user in a constrained "recover account" flow, not directly into clinical modules.

This is a good optional UX for low-email environments, but it should be treated as privileged recovery, not a normal passwordless sign-in feature.

## High Finding 6: Phone Auth Works, But Shared Phone Numbers Are A Product Boundary

The phone plugin supports:

- OTP send and verify.
- `signUpOnVerification.getTempEmail`.
- Phone/password sign-in, but only if the `account` table has a credential account.
- Phone-number password reset.
- Phone number update only through OTP verification.
- OTP attempt limiting.

The deliberation is right that phone-based identity can help. But in Indian healthcare deployment reality, shared phones are common. We should not let Better Auth's phone login become ambiguous or socially unsafe.

### Recommended Rule

Phone number can be used for auth only when:

- The phone number is verified.
- The phone number is unique among auth-enabled phone users in that tenant or global identity scope.
- The user has accepted that phone as an authentication factor.
- `users.phone_auth_enabled = true`.

If a phone number is shared, keep it as contact data only. Do not use it for login, password reset, or OTP-based recovery.

### Phone-Only Signup Footgun

The docs confirm that `signIn.phoneNumber` with password requires a `credential` account. `signUpOnVerification` creates a user through phone verification, but the design must explicitly create or prompt for a password credential afterward if username/password or phone/password login is expected.

## Medium Finding 7: Username Login Is Good, But Enumeration Needs Attention

The username plugin supports the intended login model. Important details:

- Signup still goes through `signUp.email`, with `email`, `name`, and `password` required.
- `signIn.username` is supported.
- Username normalization defaults to lowercase.
- Default username validation allows alphanumeric characters, underscores, and dots.
- The plugin exposes `isUsernameAvailable` unless disabled.

For this product, usernames are institution-assigned identifiers. We should disable public username availability checks or wrap them behind admin-only flows to reduce enumeration. We should also define whether usernames are globally unique human-friendly handles, tenant-prefixed handles, or opaque staff codes. The current spec says globally unique; that is workable but will leak organization naming if usernames include tenant slugs.

## Medium Finding 8: JWT/JWKS Design Is Strong, With Two Corrections

The JWT plugin supports the desired module-local verification model:

- Public JWKS endpoint.
- `kid` in JWT header.
- DB-backed `jwks` table by default.
- Custom JWKS path such as `/.well-known/jwks.json`.
- `definePayload`.
- Configurable `expirationTime`.
- Optional key rotation.

Two corrections:

1. The latest JWT docs say private keys are encrypted by default with AES-256-GCM unless `disablePrivateKeyEncryption` is set. The prior spec's "library-managed storage" phrasing is safer than "plain PEM"; the architecture should explicitly require encryption enabled.
2. Key rotation is disabled by default. The spec must require setting `rotationInterval` and `gracePeriod`; otherwise the table exists but rotation does not happen.

The docs also caution that the JWT plugin is not meant as a replacement for sessions. That aligns with the BFF Token Handler pattern: session/refresh continuity stays with Better Auth/BFF, while short-lived JWTs are for service verification.

## Medium Finding 9: OAuth 2.1 Provider Is Correct, But Still Needs Capability Scoping

The OAuth 2.1 Provider plugin is the right replacement for the soon-deprecated OIDC Provider plugin. The docs confirm:

- OAuth 2.1 provider behavior with OIDC compatibility.
- PKCE required by default for authorization code flows.
- `/oauth2/token`, `/oauth2/introspect`, `/oauth2/revoke`, `/oauth2/userinfo`.
- JWT access token signing when requesting a `resource`.
- JWKS verification through the JWT plugin.
- `customAccessTokenClaims`.
- Endpoint rate limits.

But the docs also say some dynamic client registration parameters are not yet supported, including `jwks` and `jwks_uri`. That may matter for sophisticated external clients that want private-key JWT client authentication or registered JWKS. It is not a blocker for MVP, but it should be captured as a limitation.

For HIMS, every OAuth client should have:

- Tenant/resource restrictions.
- Scope-to-capability mapping.
- Consent/skip-consent policy by client trust level.
- Audit logs for token issue, introspection, and revocation.
- No synthetic/delegated email in `userinfo` unless explicitly intended.

## Recommended Concrete Design

### Data Additions

Add platform-owned fields or equivalent structures:

- `users.identity_assurance_tier`: `standard_local`, `delegated_recovery`, `synthetic_internal`, `phone_primary`, `federated`.
- `users.recovery_policy`: `self_email`, `delegated_admin_email`, `admin_only`, `phone_otp`, `idp_managed`, `break_glass`.
- `users.phone_auth_enabled`: boolean.
- `users.must_change_password`: boolean.
- `auth_identity_links`: tenant/user to external provider subject mapping.
- `delegated_recovery_bases`: tenant/org base mailboxes with verification status.
- `delegated_recovery_routes`: generated alias or mailbox route, target user, base mailbox, status, last delivery check.
- `auth_recovery_events`: recovery-specific audit if `permission_change_audit` is too broad.
- `auth_identities` or equivalent: stable platform-auth identity keys used to derive Better Auth synthetic emails.

### User Creation Policy

Pseudo-spec:

```ts
function chooseBetterAuthEmail(input: CreateUserInput): AuthEmailDecision {
  return {
    // Better Auth requires email; the platform does not treat this as contact data.
    email: `${input.authIdentityKey}@auth.internal`,
    tier: chooseIdentityAssuranceTier(input),
  };
}
```

Then configure recovery separately:

```ts
function chooseRecoveryPolicy(input: CreateUserInput): RecoveryPolicy {
  if (input.realEmail && input.realEmailVerifiedOrVerifiable) return "self_email";
  if (input.delegatedBaseEmail?.verifiedForPlusAliases) return "delegated_admin_email";
  if (input.verifiedUniquePhone) return "phone_otp";
  return "admin_only";
}
```

### Recovery Policy Matrix

| Tier | Better Auth email | Login | Primary recovery | Explicitly disabled |
| --- | --- | --- | --- | --- |
| `standard_local` | Synthetic internal | Username/password, SSO if explicitly linked | User email reset through `users.email` | Direct Better Auth email-login/reset endpoints |
| `delegated_recovery` | Synthetic internal | Username/password | Admin reset or audited delegated route | Anonymous/self-service email reset |
| `synthetic_internal` | Synthetic internal | Username/password | Admin reset/in-person | Email reset, email magic link |
| `phone_primary` | Synthetic internal or phone plugin temp email | Phone OTP, username/password after credential setup | Phone OTP or admin reset | Email reset |
| `federated` | Better Auth/SSO-created value or synthetic subject key, pending POC | SSO | IdP-managed recovery | Local reset unless break-glass |

### Federation Rollout For Existing Delegated Users

1. Register SSO provider with domain verification.
2. Disable implicit sign-up during migration.
3. Import IdP roster and claims.
4. Match to existing users by employee ID, HR ID, or manual admin confirmation.
5. Persist explicit provider-subject links.
6. Test first login for matched users.
7. Only then enable JIT provisioning for unmatched new users, with duplicate detection.

### Admin Recovery Flow

1. Admin opens user recovery screen.
2. Platform shows the user's identity tier and allowed recovery modes.
3. Admin selects recovery action and enters reason.
4. Cerbos authorizes the action.
5. Admin step-up auth is required for password reset, magic link, 2FA reset, or phone change.
6. Better Auth admin API performs the credential/session action.
7. Platform marks `must_change_password` or equivalent recovery state.
8. Audit event records actor, target, tenant, channel, reason, and session IDs revoked.

## Scenarios That Must Be Added To The LLD

1. **Tenant with verified unique staff emails.** Standard email verification and reset.
2. **Tenant with no staff emails but verified plus-alias admin mailbox.** Delegated aliases enabled.
3. **Tenant whose mail server rejects plus aliases.** Synthetic internal fallback with admin-only recovery.
4. **Admin/base mailbox changes.** Alias migration with audit and no user ID churn.
5. **Admin mailbox is compromised.** Disable delegated recovery, rotate aliases, revoke sessions.
6. **Phone number shared by two users.** Contact-only phone, no phone auth.
7. **Phone-only user later sets username/password.** Ensure credential account exists.
8. **Federation introduced after 1,000 local users already exist.** Explicit linking, duplicate prevention.
9. **Federated user email differs from local delegated alias.** Link by verified external subject, not email.
10. **SCIM pushes a real email for a delegated-recovery user.** Controlled recovery-policy upgrade from `delegated_recovery` to `standard_local` without mutating the Better Auth identity key.
11. **User works at two hospitals with one auth identity.** Tenant-specific `users` rows and recovery policy per tenant.
12. **Clinical emergency while BFF is down.** Existing JWT expires quickly; define operational behavior.
13. **Password compromise.** Use `revokeUserSessions` and short JWT lifetime; do not direct-delete sessions as the primary spec.
14. **2FA recovery for delegated user.** No backup code email to delegated/admin mailbox.
15. **AIIMS-style shared workstation or shared Windows login.** Application session must still represent one named user; fast user switching or re-auth is required before clinical action.
16. **On-prem BCP or network disruption.** Existing sessions continue briefly, but recovery and new login behavior must be defined when User Management or external IdP is unavailable.
17. **Training/sandbox environment.** Synthetic accounts must not train staff into unsafe shared-password practices before go-live.

## Decision Recommendation

Approve Better Auth as the base AuthN library, but block final architecture approval until the following changes are made:

1. Replace "sub-addressing is strictly better" with "Better Auth email is an internal synthetic key for local users; sub-addressing is a delegated recovery route when verified."
2. Add the federation linking workflow and do not rely on undocumented `mapProfileToUser` semantics.
3. Convert recovery into first-class platform workflows with Cerbos authorization, admin step-up, audit, and tier-specific allowed actions.
4. Require `revokeSessionsOnPasswordReset: true`, JWT key rotation, encrypted private keys, disabled public username availability checks, and no direct SQL for normal session revocation.
5. Add LLD scenarios for mail alias failure, base mailbox compromise, federation rollout after delegated users, shared phones, phone-only credential setup, shared terminals, BCP disruption, and training/sandbox users.
6. Run a Better Auth proof of concept for SSO linking from an existing synthetic-email local user to an IdP account with a different email before finalizing federation migration semantics.

If these are adopted, the Better Auth path looks sound. If they are not, the design risks encoding the messiest hospital identity realities as undocumented assumptions around Better Auth's email field, and that would be exactly the kind of hidden footgun we are trying to avoid.
