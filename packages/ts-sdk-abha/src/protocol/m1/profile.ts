/**
 * M1 — ABHA profile fetch + card download (ABHA card, PHR card, QR code).
 *
 * These endpoints require the `xToken` issued during enrolment/login,
 * read from `abdm_adapter.abdm_sessions` by the use-case layer.
 *
 * Source spec:
 *   - `docs/external/abdm/v3-m1-abha-v3-apis-creation-verification.md` §"Profile"
 *   - `docs/external/abdm-wrapper/docs/wrapperV3.yaml`
 *     (`/api/v3/profile/account`, `/api/v3/profile/account/abha-card`,
 *      `/api/v3/profile/account/qrCode`)
 *
 * TODO: dev to populate:
 *   - `FetchProfileResponse`              (account details)
 *   - `DownloadAbhaCardResponse`          (base64 PDF / PNG)
 *   - `DownloadPhrCardResponse`
 *   - `FetchQrCodeResponse`
 */

export {};
