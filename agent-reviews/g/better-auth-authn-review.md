# Review of User Management & AuthN Solution Deliberation

This is a comprehensive review of the `user-management-authn-solution-deliberation.txt` excerpt, specifically focusing on validating the `better-auth` capabilities and implementation strategies proposed.

I've queried the latest Context7 `better-auth` documentation to verify the specific footguns, edge cases, and feature behaviors.

## 1. Email Sub-Addressing (`+` suffix) & The Sentinel Plugin
**Viable?**: Yes.
**Verification Result**: 
The deliberation correctly identifies a massive footgun: the `sentinel` plugin strips `+` suffixes by default. The official documentation confirms this under its "Email normalization" feature: *"This process includes lowercasing, removing plus-address tags on common providers... You can enable normalization independently from disposable-domain validation."*

**Actionable Recommendation**: 
If you use the `sentinel` plugin, you **must explicitly configure it** to disable email normalization (or at least the plus-address removal part if configurable) if you plan to rely on sub-addressed emails as unique identities.
```typescript
sentinel({
  security: {
    emailNormalization: {
      enabled: false, // Must be false if relying on plus-addressing
    },
  },
})
```

## 2. Admin Magic Link Generation (Intercepting without Email)
**Viable?**: Yes.
**Verification Result**: 
The proposed strategy of using the `sendMagicLink` callback and `metadata` to intercept the URL and prevent the email from actually being sent is fully supported and idiomatic. 

The `signIn.magicLink` endpoint supports a `metadata` property that gets forwarded directly to the server-side callback:
```typescript
// Client
await authClient.signIn.magicLink({
  email: "admin+1@hospital.com",
  callbackURL: "/dashboard",
  metadata: { adminGenerated: true, targetUserId: "123" }
});

// Server
magicLink({
  sendMagicLink: async ({ email, token, url, metadata }, ctx) => {
    if (metadata?.adminGenerated) {
       // Intercept URL, do not send email
       return;
    }
    // send email
  }
})
```

## 3. Phone Number Auth & `signUpOnVerification`
**Viable?**: Yes, but requires attention to credential creation.
**Verification Result**: 
The docs confirm that `signUpOnVerification` in the `phoneNumber` plugin accepts `getTempEmail` and `getTempName` to bootstrap the user record.
However, the deliberation points out a critical flaw: *"signUpOnVerification creates the user record but does NOT create a credential account"*. 

The documentation specifies that `POST /sign-in/phone-number` requires an existing account record with `providerId: 'credential'`. The deliberation is correct: you *must* manually trigger password setup (or equivalent credential creation) immediately after phone sign-up, otherwise subsequent username/password or phone/password logins will fail.

## 4. OIDC Account Linking via `mapProfileToUser`
**Viable?**: Yes, but the implementation detail needs adjustment.
**Verification Result**: 
The deliberation proposes:
```typescript
mapProfileToUser: async (profile, account) => {
  const existingUser = await findByEmployeeId(profile.employeeId);
  if (existingUser) {
    return { id: existingUser.baUserId }; // Link to existing user
  }
}
```
While `mapProfileToUser` allows you to customize the mapped user object, the primary way `better-auth` links social accounts to existing users automatically is by **email match**. If you return an object with just `{ id }`, it may not behave identically to native account linking.

**Actionable Recommendation**: 
Instead of trying to return `{ id: existingUser.baUserId }`, the safer approach is to look up the existing user by `employeeId`, and then map the profile's `email` to match the existing user's `better-auth` email exactly. When `better-auth` sees the mapped email matches an existing user, it will link them.

```typescript
mapProfileToUser: async (profile, account) => {
  const existingUser = await findByEmployeeId(profile.employeeId);
  if (existingUser) {
    return { 
      email: existingUser.baEmail, // Forces better-auth to link to this existing account
      firstName: profile.given_name,
      lastName: profile.family_name
    }; 
  }
  // ... fallback for JIT provisioning
}
```

## 5. Dual-Mode Email Model & `changeEmail`
**Viable?**: Yes.
**Verification Result**: 
Your proposed approach to gracefully upgrading Tier B (delegated/sub-addressed email) users to Tier A (real email) using `changeEmail` is sound. Bypassing client verification for admin-initiated corrections directly via the adapter (`ctx.adapter.update`) is standard practice since better-auth is designed to allow adapter-level overrides. 

**Recommendation:** Ensure that whenever `ctx.adapter.update` is used to update the email directly, you also trigger your platform's webhook/sync logic so that the `users.email` and `users.security_tier` mirror the new state.

## Summary Conclusion
The deep research presented in the deliberation is high-quality and technically accurate against the latest `better-auth` specifications. The identified footguns—especially the `sentinel` plugin's email normalization and the phone plugin's credential omission—are very real. Proceeding with this architectural revision is safe, provided the actionable recommendations for plugin configuration and account linking are strictly followed.
