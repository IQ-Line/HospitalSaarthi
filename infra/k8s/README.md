# HIMS AKS Base Manifests

This directory contains a plain Kubernetes baseline for the HIMS platform and the
PDF platform sidecar. Apply directly, or use as input for Helm/Kustomize/ArgoCD.

## Deployable Images

**HIMS monorepo (`HospitalSaarthi`):**

- `hims.azurecr.io/abdm-adapter-svc:<sha>`
- `hims.azurecr.io/bff:<sha>`
- `hims.azurecr.io/billing-svc:<sha>`
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
| `PDF_PLATFORM_URL` | `hims-config` ConfigMap | `http://pdf-worker.himsv2.svc.cluster.local:8091` |
| `REPORT_WEB_ORIGIN` | `hims-config` ConfigMap | `https://dev.v2.hospitalsaarthi.com` (match public web host) |
| `REPORT_LOGO_URL` | `hims-config` ConfigMap | `/reportLogo.svg` |
| `GOTENBERG_URL` | `pdf-worker` Deployment env | `http://gotenberg.himsv2.svc.cluster.local:3000` |

`PDF_PLATFORM_URL` is **not** exposed via Ingress. Only `registration-svc` calls it inside the cluster.

**Dev (`dev.v2.hospitalsaarthi.com`)** — update in `hims-config`:

```yaml
AUTH_BASE_URL: "https://dev.v2.hospitalsaarthi.com"
CORS_ORIGINS: "https://dev.v2.hospitalsaarthi.com"
REPORT_WEB_ORIGIN: "https://dev.v2.hospitalsaarthi.com"
```

Then restart:

```bash
kubectl -n himsv2 rollout restart deployment/registration-svc
kubectl -n himsv2 rollout status deployment/registration-svc
```

**Verify from inside the cluster:**

```bash
kubectl -n himsv2 exec deploy/registration-svc -- wget -qO- http://pdf-worker.himsv2.svc.cluster.local:8091/ready
kubectl -n himsv2 logs deploy/registration-svc | grep "Registration PDF platform configured"
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
| `user-management-svc` | `3005` |
| `registration-svc` | `3006` |
| `abdm-adapter-svc` | `3007` |
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

Local dev: set `PDF_PLATFORM_URL` in the workspace root `.env` only (not
`services/registration-svc/.env`). Run pdf-platform with `pnpm dev` on port 8091.
