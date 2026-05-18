# ABDM Adapter — Phase B implementation matrix (M1 ABHA verification)

Phase B maps Postman folder **ABHA Verification** and `docs/plans/abdm-milestone1-adapter-specification.md` §5 to platform routes.

NHA paths use **`/v3/profile/login/request/otp`** and **`/v3/profile/login/verify`** (not legacy `/api/v3/abha/verify/...`).

## Phase B — platform routes ↔ NHA

| Status | Postman / product flow | Platform routes | NHA paths |
|--------|------------------------|-----------------|-----------|
| Done | ABHA number + Aadhaar OTP | `POST /m1/login/otp` (`channel: aadhaar`) or `POST /m1/verify/abha-number/otp` | `login/request/otp` → `login/verify` |
| Done | ABHA number + ABHA OTP | Same with `channel: abha-otp` | scopes `abha-login` + `mobile-verify`, `otpSystem: abdm` |
| Done | Verify via Aadhaar | `POST /m1/login/aadhaar/otp` → `POST /m1/login/verify` | `loginHint: aadhaar`, scopes `abha-login` + `aadhaar-verify` |
| Done | Verify via mobile — Send OTP | `POST /m1/login/mobile/otp` | `loginHint: mobile`, scopes `abha-login` + `mobile-verify` |
| Done | Verify via mobile — Verify OTP | `POST /m1/login/verify` | `login/verify`; may return `accounts[]` |
| Done | Verify via mobile — Verify User | `POST /m1/login/verify/user` | `login/verify/user` + header **`T-token: Bearer <transfer jwt>`** |
| Done | Frontdesk verify ABHA number (mirror) | `POST /m1/verify/abha-number/*` | Same NHA login paths; `flowKind: abdm.m1.verify-existing.v1` |
| Done | Frontdesk verify ABHA address | `POST /m1/verify/abha-address/otp` + verify | `abha-address-login` scopes per channel |
| Done | Frontdesk mobile multi-account | `POST /m1/verify/abha-number/verify/user` | Same as `login/verify/user` |

### Out of scope (Phase B)

- Password and biometric login branches (Postman subfolders).
- Find ABHA / search-abha trees (`milestone1.md` §7.6) unless product extends.

## Session behaviour (mobile multi-ABHA)

1. After `login/verify`, if NHA returns **`accounts`**, adapter stores **`loginTransferToken`** in session context (not `x_token` yet) and returns `needsUserSelection: true` + masked account list.
2. Client calls **`login/verify/user`** with chosen `abhaNumber`; adapter sends **`T-token`** header and persists final **`x_token`** for profile/card GETs.

## Tests

| Layer | Coverage |
|-------|----------|
| Unit | `login-verify-otp-request.test.ts` (multi-account path), `login-verify-user-request.test.ts` |
| Sandbox | Reuse `RUN_ABDM_SANDBOX_TESTS=1` when mobile test credentials available |

## Related

- Phase A (enrolment): [03-phase-a-implementation-matrix.md](./03-phase-a-implementation-matrix.md)
- Flow catalogue: [02-m1-flows.md](./02-m1-flows.md)
