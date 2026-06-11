# HIMS AKS Base Manifests

This directory contains a plain Kubernetes baseline for the HIMS platform and the
PDF platform sidecar. Apply directly, or use as input for Helm/Kustomize/ArgoCD.

## Deployable Images

**HIMS monorepo (`HospitalSaarthi`):**

- `hims.azurecr.io/integration-hub-svc:<sha>`
- `hims.azurecr.io/bff:<sha>`
- `hims.azurecr.io/billing-svc:<sha>`
- `hims.azurecr.io/pharmacy-svc:<sha>`
- `hims.azurecr.io/cerbos:<sha>` from Nx project `cerbos-policies`
- `hims.azurecr.io/configurator-svc:<sha>`
- `hims.azurecr.io/empi-svc:<sha>`
- `hims.azurecr.io/master-data:<sha>`
- `hims.azurecr.io/registration-svc:<sha>`
- `hims.azurecr.io/user-management-svc:<sha>`
- `hims.azurecr.io/web:<sha>`

**PDF platform (`pdf-platform` repo — separate build):**

- `acriqline.azurecr.io/pdf-worker:<sha>` (or your registry)
- `gotenberg/gotenberg:8.21.0` (public image)

## First-Time Setup

1. Replace placeholder values in `base/hims-platform.yaml`, especially public
   origins (`AUTH_BASE_URL`, `CORS_ORIGINS`, `REPORT_WEB_ORIGIN`) and all secret values.
2. Create an image pull secret if your AKS cluster is not attached to ACR:
   ```bash
   kubectl -n himsv2 create secret docker-registry acr-pull \
     --docker-server=hims.azurecr.io \
     --docker-username=<client-id> \
     --docker-password=<client-secret>
   ```
3. Apply the baseline:
   ```bash
   kubectl apply -f infra/k8s/base/hims-platform.yaml
   kubectl apply -f infra/k8s/base/pdf-platform.yaml
   ```
4. Roll images after Jenkins pushes a new SHA:
   ```bash
   kubectl -n himsv2 set image deployment/billing-svc \
     billing-svc=hims.azurecr.io/billing-svc:<sha>
   kubectl -n himsv2 rollout status deployment/billing-svc
   ```

## OPD slip PDF wiring

Registration desk PDFs (`/api/registration/v1/.../documents/opd-slip.pdf`) flow:

```text
Browser → BFF → registration-svc → pdf-worker → gotenberg
```

| Config key | Set on | Example (cluster) |
| --- | --- | --- |
| `PDF_PLATFORM_URL` | `hims-config` ConfigMap | `http://pdf-worker.himsv2.svc.cluster.local:8091` (registration-svc + opd-svc) |
| `REPORT_WEB_ORIGIN` | `hims-config` ConfigMap | `https://dev.v2.hospitalsaarthi.com` (match public web host) |
| `REPORT_LOGO_URL` | `hims-config` ConfigMap | `/reportLogo.svg` |
| `GOTENBERG_URL` | `pdf-worker` Deployment env | `http://gotenberg.himsv2.svc.cluster.local:3000` |

`PDF_PLATFORM_URL` is **not** exposed via Ingress. `registration-svc` and `opd-svc` call pdf-worker inside the cluster.

**Dev (`dev.v2.hospitalsaarthi.com`)** — update in `hims-config`:

```yaml
AUTH_BASE_URL: "https://dev.v2.hospitalsaarthi.com"
CORS_ORIGINS: "https://dev.v2.hospitalsaarthi.com"
REPORT_WEB_ORIGIN: "https://dev.v2.hospitalsaarthi.com"
```

Then restart:

```bash
kubectl -n himsv2 rollout restart deployment/registration-svc deployment/opd-svc
kubectl -n himsv2 rollout status deployment/registration-svc
kubectl -n himsv2 rollout status deployment/opd-svc
```

**Verify from inside the cluster:**

```bash
kubectl -n himsv2 exec deploy/registration-svc -- wget -qO- http://pdf-worker.himsv2.svc.cluster.local:8091/ready
kubectl -n himsv2 logs deploy/registration-svc | grep "Registration PDF platform configured"
```

## Configurator branding logos

Tenant wizard organisation/tenant logo uploads (`POST /api/configurator/v1/branding-logos/*`) are served by **configurator-svc** and stored in Azure Blob Storage (same container as OPD patient documents).

**Required in `hims-secrets` (configurator-svc Deployment):**

| Key | Purpose |
| --- | --- |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob upload/download |
| `AZURE_STORAGE_ACCOUNT` | Optional; used with account key fallback |
| `AZURE_STORAGE_ACCOUNT_KEY` | Optional; used with account key fallback |
| `AZURE_BLOB_CONTAINER` | Optional; defaults to `hmis-patient-docs` when unset |

These are wired explicitly on the `configurator-svc` container in `hims-platform.yaml` (same pattern as `opd-svc`).

**Dev rollout after merging `logo-upload` / commit `d83ece94` or later:**

The dev Deployment image tag is `acriqline.azurecr.io/configurator-svc:dev-latest`. Rebuild and push that tag from current `origin/dev`, then roll the pod:

```bash
# After Jenkins (or manual docker build/push) updates dev-latest:
kubectl apply -f infra/k8s/base/hims-platform.yaml
kubectl -n himsv2 rollout restart deployment/configurator-svc
kubectl -n himsv2 rollout status deployment/configurator-svc
```

**Verify (expect 200 with `version`, not 404):**

```bash
curl -sS "https://dev.v2.hospitalsaarthi.com/api/configurator/v1/branding-logos/ready"
# 200 + {"feature":"branding-logos","version":"1.0.1",...} = new image live
# 404 = stale configurator-svc image — rebuild from origin/dev and roll pod
```

**Verify upload route registered (expect 401 without auth, not 404):**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST "https://dev.v2.hospitalsaarthi.com/api/configurator/v1/branding-logos/organization"
# 401 = route registered; 404 = stale configurator-svc image
```

**Pod logs after rollout** (should include `Configurator branding logos API registered`):

```bash
kubectl -n himsv2 logs deploy/configurator-svc | grep -i "branding logos"
```

**Smoke test with super-admin JWT and a PNG file** (multipart `slug` + `file`):

```bash
curl -sS -X POST "https://dev.v2.hospitalsaarthi.com/api/configurator/v1/branding-logos/organization" \
  -H "Authorization: Bearer <jwt>" \
  -H "iq_tenant_id: <platform-tenant-uuid>" \
  -F "slug=my-org" \
  -F "file=@./logo.png"
# Expect HTTP 201 with logo.storage_key in JSON body
```

## ABDM (integration-hub) routing

Browser and NHA callbacks use the same public host; BFF proxies to `integration-hub-svc`:

```text
Browser  → Ingress /api → BFF → integration-hub-svc:3007  (/api/abdm/v1/*)
NHA CM   → Ingress /api → BFF → integration-hub-svc:3007  (/api/v3/*)
```

| Config key | Set on | Example (cluster) |
| --- | --- | --- |
| `INTEGRATION_HUB_URL` | `hims-config` ConfigMap | `http://integration-hub-svc.himsv2.svc.cluster.local:3007` |
| `EMPI_BASE_URL` | `hims-config` ConfigMap | `http://empi-svc.himsv2.svc.cluster.local:3002` |
| `RECORD_FOUNDATION_BASE_URL` | `hims-config` ConfigMap | `http://opd-svc.himsv2.svc.cluster.local:8020` |
| `INTEGRATION_HUB_PUBLIC_BASE_URL` | `hims-config` ConfigMap | `https://dev.v2.hospitalsaarthi.com` (match public web host) |
| `ABDM_TOKEN_ENCRYPTION_KEY` | `hims-secrets` | 32-byte key (hex or base64) — required in production |
| `CONFIGURATOR_INTERNAL_API_KEY` | `hims-secrets` (optional in dev) | Same value as configurator-svc |
| `PHARMACY_INTERNAL_API_KEY` | `hims-secrets` (required in prod) | Same value on `opd-svc` and `pharmacy-svc` for queue projection push |

**Pharmacy stack** — BFF proxies `/api/pharmacy/v1`; OPD pushes queue updates to pharmacy internal routes:

| Config key | Set on | Example (cluster) |
| --- | --- | --- |
| `PHARMACY_URL` | `hims-config` ConfigMap | `http://pharmacy-svc.himsv2.svc.cluster.local:3004` |

After first deploy, restart BFF and OPD so they pick up `PHARMACY_URL`:

```bash
kubectl -n himsv2 rollout restart deployment/bff deployment/opd-svc deployment/pharmacy-svc
```

**Dev (`dev.v2.hospitalsaarthi.com`)** — also set in `hims-config`:

```yaml
INTEGRATION_HUB_PUBLIC_BASE_URL: "https://dev.v2.hospitalsaarthi.com"
```

Apply manifests, run `integration_hub` migrations once against cluster `DATABASE_URL`, then restart:

```bash
kubectl apply -f infra/k8s/base/hims-platform.yaml
kubectl -n himsv2 rollout restart deployment/bff deployment/integration-hub-svc
kubectl -n himsv2 rollout status deployment/integration-hub-svc
```

**Verify:**

```bash
curl -sS "https://dev.v2.hospitalsaarthi.com/api/abdm/v1/healthz"
# {"status":"ok"}
```

## Port Strategy

The Node Dockerfile exposes `3000`, but the services themselves listen on their
own runtime ports unless overridden. These manifests use the service defaults:

| Service | Container port |
| --- | --- |
| `bff` | `3000` |
| `configurator-svc` | `3001` |
| `empi-svc` | `3002` |
| `billing-svc` | `3003` |
| `pharmacy-svc` | `3004` |
| `user-management-svc` | `3005` |
| `registration-svc` | `3006` |
| `integration-hub-svc` | `3007` |
| `master-data` | `8010` |
| `web` | `8080` |
| `cerbos` | `3593` gRPC, `3592` HTTP |
| `gotenberg` | `3000` |
| `pdf-worker` | `8091` |

If you prefer every backend container to listen on `3000`, set each service's
port env var to `3000` and adjust the container/service ports together.

## Runtime Config

Keep image builds environment-agnostic. Inject environment through Kubernetes:

- `hims-config`: non-secret URLs, JWT issuer/audience, CORS, service URLs, PDF platform URL.
- `hims-secrets`: DB URLs, auth secret, and ABDM secrets.

For production, use Key Vault CSI or External Secrets instead of committing real
secret values to this file.

Local dev: set `PDF_PLATFORM_URL` in the workspace root `.env` (registration + OPD both read it).
Run pdf-platform with `pnpm dev` on port 8091.
