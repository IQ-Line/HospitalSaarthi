# Smart Parcha — HospitalSaarthi integration

Smart Parcha is a standalone orchestration module: visit/prescription data is delegated to the **host HIMS** over HTTP; canvas pages and optional AI ingest are owned by `@hims/smart-parcha`.

## Layout

| Layer | Path |
|-------|------|
| Domain module | `modules/smart-parcha` |
| HTTP service | `services/smart-parcha-svc` (port **3008**) |
| BFF proxy | `services/bff` → `/api/v1/smart-parcha`, legacy `/v2` |
| SPA feature | `services/web/src/features/smart-parcha` |
| Consultation route | `/opd/consultation/$visitId` |

## Local run

1. Copy env from workspace `.env.example` (add `SMART_PARCHA_URL`, `SMART_PARCHA_SVC_PORT`, `HIMS_*`).
2. Start stack (minimum):

```bash
pnpm nx run smart-parcha-svc:serve
pnpm nx run bff:serve
pnpm nx run web:serve
```

3. Open consultation: `http://localhost:5173/opd/consultation/<visitId>`.

With `HIMS_ADAPTER=mock`, full-context returns fixture data without a real HIMS.

## BFF

| Browser path | Upstream |
|--------------|----------|
| `/api/v1/smart-parcha/*` | `SMART_PARCHA_URL` (default `http://localhost:3008`) |
| `/v2/*` | same (legacy Create RX paths) |

## Public API (v1)

- `GET /api/v1/smart-parcha/visits/:visitId/full-context?addendum=true`
- `POST /api/v1/smart-parcha/:visitId/save-and-ingest`
- `POST /api/v1/smart-parcha/visits/:visitId/save-prescription`
- `POST /api/v1/smart-parcha/visits/:visitId/end-consultation`

Legacy HIMS clients may keep using `/v2/visits/...` and `/v2/smart-parcha/...`.

## Host HIMS (HTTP adapter)

Set in `services/smart-parcha-svc/.env` or workspace `.env`:

| Variable | Purpose |
|----------|---------|
| `HIMS_ADAPTER` | `mock` or `http` |
| `HIMS_BASE_URL` | e.g. `http://localhost:5000/hims-backend-ser` |
| `HIMS_PATH_FULL_CONTEXT` | default `/v2/visits/%s/full-context` |
| `HIMS_FORWARD_HEADERS` | `authorization,x-tenant-id,x-user-id` |

## Frontend

- API client: `features/smart-parcha/api/client.ts` (via BFF `VITE_API_BASE_URL`).
- Access rules (read-only / addendum): `lib/visit-consultation-access.ts`.
- Canvas: port `hims-frontend-ai-based` Konva canvas into `features/smart-parcha/components/canvas` when ready.

## OPD queue link

From OPD patient list, navigate to:

```ts
router.navigate({ to: '/opd/consultation/$visitId', params: { visitId } });
```
