# HIMS AKS Base Manifests

This directory contains a plain Kubernetes baseline for the 10 deployable HIMS
images. It is intentionally tool-neutral: apply it directly, or use it as the
input for Helm/Kustomize/ArgoCD.

## Deployable Images

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

## First-Time Setup

1. Replace placeholder values in `base/hims-platform.yaml`, especially public
   origins and all secret values.
2. Create an image pull secret if your AKS cluster is not attached to ACR:
   ```bash
   kubectl -n hims create secret docker-registry acr-pull \
     --docker-server=hims.azurecr.io \
     --docker-username=<client-id> \
     --docker-password=<client-secret>
   ```
3. Apply the baseline:
   ```bash
   kubectl apply -f infra/k8s/base/hims-platform.yaml
   ```
4. Roll images after Jenkins pushes a new SHA:
   ```bash
   kubectl -n hims set image deployment/billing-svc \
     billing-svc=hims.azurecr.io/billing-svc:<sha>
   kubectl -n hims rollout status deployment/billing-svc
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

If you prefer every backend container to listen on `3000`, set each service's
port env var to `3000` and adjust the container/service ports together.

## Runtime Config

Keep image builds environment-agnostic. Inject environment through Kubernetes:

- `hims-config`: non-secret URLs, JWT issuer/audience, CORS, and service URLs.
- `hims-secrets`: DB URLs, auth secret, and ABDM secrets.

For production, use Key Vault CSI or External Secrets instead of committing real
secret values to this file.
