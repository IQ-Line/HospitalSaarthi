# AKS + Jenkins Deployment Readiness — Design

**Date:** 2026-05-20
**Branch:** `dev-deployment-readiness`
**Author:** Architect (Ayush) + Claude
**Status:** Approved (sections 1–5)
**Supersedes:** None
**Related:** ADR-0004 (Cerbos sidecar — to be amended), ADR-0019 (Fastify v5, Node 24)

## Context

The platform is moving to AKS for the first time. DevOps will write the Jenkinsfile directly in Jenkins (not in the repo). Our job is to make the monorepo *Docker-buildable and Nx-affected-aware* so DevOps's pipeline can do "build only what changed, push to ACR, roll AKS" without needing deep Nx knowledge.

**Important constraint:** the DevOps team is new to Nx and monorepos. The primary deliverable — the handoff doc — must be tutorial-style, not a terse reference.

## Scope

**In scope:**
- All 7 TypeScript backend services under `services/*-svc/` (`abdm-adapter-svc`, `billing-svc`, `configurator-svc`, `empi-svc`, `frontdesk-svc`, `registration-svc`, `user-management-svc`)
- `services/web` (React/Vite frontend) and `services/bff` (Fastify proxy)
- `modules/master-data` (Python/FastAPI)
- Cerbos as a centralized in-cluster service
- Single AKS namespace for all services

**Out of scope (DevOps owns):**
- The Jenkinsfile itself
- ACR authentication and image push commands
- K8s manifests, Helm charts, Kustomize overlays
- Secret management (Key Vault → CSI driver)
- Ingress configuration and TLS

**Deferred (follow-ups, listed at end):**
- ADR-0004 amendment for centralized Cerbos
- Web → BFF proxy for Cerbos calls
- K8s manifests in repo
- Image vulnerability scanning in CI

## Decisions

### D1 — Thin contract with DevOps

The handoff line is `docker build`. We ship Dockerfiles + `.dockerignore` + a documented Nx workflow. DevOps writes the Jenkinsfile, owns rollout. Rationale: maximum DevOps autonomy, no coupling of Jenkins behavior to Nx executors, avoids the lock-in of @nx-tools/nx-container-style "thick" approaches.

### D2 — Image registry: Azure Container Registry

Image refs follow `hims.azurecr.io/<service>:<tag>`. Dockerfiles remain registry-agnostic at the file level (use ARGs); the registry name is supplied at build time by DevOps.

### D3 — Image tag scheme: git short SHA

Every build tags `<svc>:<short-sha>`. The pipeline also pushes a moving `<svc>:dev-latest` (and `<svc>:prod-latest` on master) for convenience. SHA tags are the immutable canonical reference; manifests target SHA tags so rollouts are atomic.

### D4 — Affected-services detection via moving git tag

For `dev` builds: a moving tag `last-deployed-dev` records the last successfully-deployed SHA. The pipeline reads it as `--base`, runs `nx show projects --affected --base=$BASE --head=HEAD --type=app --json`, and only rebuilds the returned set. On pipeline success, the tag is force-moved to `HEAD`. For PR builds: `--base=origin/dev`; no tag movement.

Rationale: portable across CI systems, auditable from any checkout, no Jenkins API coupling, no Nx Cloud dependency.

### D5 — Cerbos topology: centralized for Phase 1

One `Deployment` (2 replicas) + one `Service` in the `hims` namespace. All services set `CERBOS_URL=cerbos.hims.svc.cluster.local:3593`. **This contradicts ADR-0004 (sidecar)** — F1 below tracks the amendment. Rationale: small fleet (~10 services), single namespace, devs already use a shared Cerbos container in `docker-compose`, ~1-2ms intra-cluster latency cost is negligible vs. operational simplicity gain. Promote to sidecar later only if latency is measured and proven problematic.

### D6 — Dockerfile pattern: one shared TS template

`infra/docker/node-svc.Dockerfile` is parameterized by `--build-arg SERVICE_NAME=<svc>` and reused by all 7 `*-svc` services AND `bff`. Uses pnpm + multi-stage + `pnpm deploy --prod /out` to produce isolated runtime images. Build context is repo root; `.dockerignore` keeps context small. BuildKit cache mount (`--mount=type=cache`) shares the pnpm store across builds.

`services/web` gets a separate Dockerfile (Vite → Nginx). `modules/master-data` keeps its Python Dockerfile (moved from `modules/master-data/Dockerfile` to `infra/docker/master-data.Dockerfile` for consistency). Cerbos gets its own image baking `infra/cerbos/policies` + `cerbos.yaml`.

### D7 — Missing `build` targets get added

Currently `services/*/project.json` declares only `serve` (tsx watch). Each service needs a `build` target using **tsup** (esbuild internally; already a transitive dep). Output: `<service>/dist/main.js`. Cacheable, with `{projectRoot}/dist` as the output.

### D8 — Track Cerbos image in Nx graph

Add a minimal `infra/cerbos/project.json` (or amend existing) declaring an Nx project of type `application` with tag `deploy:aks`. This way `nx affected --type=app` picks up policy changes automatically and Jenkins doesn't need a side path for "did Cerbos change?".

### D9 — Genuinely remove `embedded-clinic`

Delete the empty `services/embedded-clinic/.gitkeep` directory AND remove all references from `docs/architecture/lld/repo-structure/01-monorepo-setup.md` (tree diagram, non-module services table, and the entire "6.2 Embedded mode" subsection — section 6 reduces from three deployment topologies to two; former 6.3 Offline mode becomes 6.2). Rationale: the directory was a placeholder for a topology that may never be built, and devs were finding it confusing. Better to delete now and re-add intentionally if/when the topology becomes real.

## Architecture

### Repo deliverables

| Path | Purpose |
|---|---|
| `infra/docker/node-svc.Dockerfile` | Shared template for `*-svc` + `bff`. Parameterized via `SERVICE_NAME` ARG. |
| `infra/docker/web.Dockerfile` | Vite build → Nginx static serving. |
| `infra/docker/web-nginx.conf` | Nginx config with SPA fallback (`try_files $uri /index.html`). |
| `infra/docker/master-data.Dockerfile` | Python/uvicorn for `modules/master-data`. Moved from existing location. |
| `infra/docker/cerbos.Dockerfile` | `FROM cerbos/cerbos:<pinned>` + bakes policies + config. |
| `.dockerignore` (repo root) | Excludes `node_modules`, `.nx`, `dist`, `docs`, etc. |
| `tools/dockerfile-for-svc.sh` | Tiny helper: maps service name → which Dockerfile to use. Optional but simplifies the loop in the Jenkinsfile. |
| `services/*/project.json` updates | Add `build` target using tsup. |
| `infra/cerbos/project.json` | Declare Cerbos as an Nx `application` so `--type=app` picks it up. |
| `infra/devops-handoff.md` | **Primary deliverable.** Tutorial-style guide for DevOps. |

### DevOps deliverables (in Jenkins / k8s side)

- The Jenkinsfile (multibranch or freestyle)
- ACR authentication (`az acr login` or service principal)
- K8s manifests (Deployment, Service, Ingress, ConfigMaps) — one per backend svc, plus `cerbos`, plus `web`, plus `master-data`
- AKS rollout strategy (`kubectl set image` per affected svc, or ArgoCD)
- Secret injection (Key Vault → CSI driver mounted to pods)

### Affected-services flow (canonical pseudocode for the handoff doc)

```bash
# Step A: establish base SHA
if [ "$BRANCH" = "dev" ]; then
  BASE=$(git rev-parse last-deployed-dev 2>/dev/null || echo "HEAD~1")
else
  BASE="origin/dev"   # PR build
fi

# Step B: ask Nx what changed
AFFECTED=$(npx nx show projects --affected \
  --base=$BASE --head=HEAD \
  --type=app --json)

# Step C: build + push each affected
SHA=$(git rev-parse --short HEAD)
for svc in $(echo "$AFFECTED" | jq -r '.[]'); do
  DOCKERFILE=$(./tools/dockerfile-for-svc.sh "$svc")
  docker build \
    -f "$DOCKERFILE" \
    --build-arg SERVICE_NAME="$svc" \
    -t "$REGISTRY/$svc:$SHA" \
    -t "$REGISTRY/$svc:$BRANCH-latest" \
    .
  docker push "$REGISTRY/$svc:$SHA"
  docker push "$REGISTRY/$svc:$BRANCH-latest"
done

# Step D: on dev branch success, move the tag
if [ "$BRANCH" = "dev" ]; then
  git tag -f last-deployed-dev HEAD
  git push -f origin last-deployed-dev
fi

# Step E: kick AKS rollout — DevOps owns
```

### TS service Dockerfile shape

Multi-stage:
1. **base** — `node:24-bookworm-slim` + pnpm via corepack
2. **builder** — copies workspace manifests, runs `pnpm install --filter @hims/<svc>...`, runs `nx build <svc>`, runs `pnpm --filter @hims/<svc> deploy --prod /out`
3. **runtime** — `node:24-bookworm-slim`, copies `/out` from builder, runs as `node` user, `CMD ["node", "dist/main.js"]`

BuildKit cache mount on the pnpm store (`--mount=type=cache,id=pnpm-store`) shares downloads across service builds on the same agent.

### Cerbos k8s shape (for handoff doc — illustrative)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: cerbos, namespace: hims }
spec:
  replicas: 2
  selector: { matchLabels: { app: cerbos } }
  template:
    metadata: { labels: { app: cerbos } }
    spec:
      containers:
        - name: cerbos
          image: hims.azurecr.io/cerbos:<sha>
          ports:
            - { name: grpc, containerPort: 3593 }
            - { name: http, containerPort: 3592 }
          livenessProbe: { httpGet: { path: /_cerbos/health, port: http } }
          readinessProbe: { httpGet: { path: /_cerbos/health, port: http } }
---
apiVersion: v1
kind: Service
metadata: { name: cerbos, namespace: hims }
spec:
  selector: { app: cerbos }
  ports:
    - { name: grpc, port: 3593, targetPort: grpc }
    - { name: http, port: 3592, targetPort: http }
```

Service Deployments add `env: [{ name: CERBOS_URL, value: "cerbos.hims.svc.cluster.local:3593" }]`.

## Known issues / open problems

### Web service calls Cerbos directly from the browser

`services/web/src/lib/cerbos-client.ts:11` uses `@cerbos/http` pointed at `VITE_CERBOS_URL`. In AKS this means Cerbos's HTTP port (3592) must be reachable from the browser. Two paths:

- **Phase 1 compromise:** add Ingress rule `/_cerbos/check → cerbos:3592`. Document as known compromise. Acceptable because frontend authz is UX-only (per project rule "frontend auth is UX, not security") — the PDP is still authoritative on the backend; an attacker who bypasses Cerbos in the browser sees the UI but can't bypass the server-side checks. Still exposes PDP attack surface (DoS, oracle-style probing) that we'd rather not expose.
- **Proper fix (F2 below):** BFF exposes `POST /authz/check` proxying to internal Cerbos. Web's `@cerbos/http` client points at BFF. PDP stays internal-only.

This design ships with the Phase 1 compromise; F2 tracks the proper fix.

### Existing `modules/master-data/Dockerfile`

The current file works. Moving it to `infra/docker/master-data.Dockerfile` requires updating the build context: build context becomes the repo root (or `modules/master-data/`, depending on what the Python build needs). The handoff doc must call this out explicitly because TS images and the Python image have different build contexts — easy to get wrong.

### `nx show projects --type=app` requires honest `projectType`

Today `billing-svc/project.json` doesn't declare a `projectType` field. Nx defaults to inferring it, which works but isn't explicit. Recommend setting `"projectType": "application"` explicitly on every `services/*/project.json` and `"projectType": "library"` on every `modules/*` and `packages/*`. This makes `--type=app` filtering bulletproof.

## Testing strategy

### What we verify locally before handoff

1. **Per-service Dockerfile builds cleanly.** For each TS service: `docker build -f infra/docker/node-svc.Dockerfile --build-arg SERVICE_NAME=<svc> -t test/<svc>:local .`
2. **Resulting image runs and binds its port.** `docker run -p 3000:3000 --env-file ./test.env test/<svc>:local` against a local Postgres + Cerbos.
3. **`nx show projects --affected` returns sensible answers** against a few synthetic diffs (touch `modules/billing/src` → expect `billing-svc`; touch `packages/ts-sdk-authz` → expect every consumer).
4. **Image size sanity** — TS service runtime images should land under ~250MB. Significantly more = wrong copy strategy.
5. **Web Nginx image serves `/` with the bundle.** `docker run -p 8080:8080 test/web:local` + curl.

### What we ask DevOps to verify (in the handoff doc)

1. Pipeline can `docker login hims.azurecr.io` and push images.
2. `nx show projects --affected` returns the expected set in their pipeline context (this is the bit that depends on git fetch depth — they need `fetch-depth: 0` equivalent).
3. The `last-deployed-dev` tag pattern works end-to-end on their agents (write permission to push tags).
4. AKS Deployment for any one service can pull from ACR and start.

## Migration / rollout plan

1. **PR 1 (this branch):** add Dockerfiles, `.dockerignore`, `build` targets, helper script, handoff doc, delete `embedded-clinic` dir + all its doc references. CI runs as-is (lint + unit tests); no Docker builds in CI yet.
2. **DevOps Phase A:** they write a Jenkinsfile against `dev`. We support, answer questions, iterate on the handoff doc as gaps surface.
3. **DevOps Phase B:** AKS namespace stood up, first service deployed (recommend `user-management-svc` since it's the most-exercised), then the rest.
4. **PR 2 (follow-up branch):** ADR-0004 amendment.
5. **Subsequent:** F2–F5 follow-ups, scheduled per priority.

## Follow-ups (will not land in this branch)

| ID | Item | Why deferred |
|---|---|---|
| F1 | ADR-0004 amendment — Phase 1 centralized Cerbos, sidecar deferred behind measured latency need | Architectural doc change; separate PR for visibility |
| F2 | Web → BFF proxy for Cerbos calls (eliminate public PDP exposure) | Code change in `services/bff` + `services/web`; separate concern |
| F3 | K8s manifests / Helm chart in repo | DevOps owns externally for now; in-repo is a later step for reviewability |
| F4 | Image vulnerability scanning in CI (Trivy) | Belongs in CI pipeline addition, not deployment-readiness |
| F5 | Pin Cerbos version (replace `:latest` in `infra/docker/docker-compose.yml`) | Same dependency hygiene as the new Cerbos image |

## Open questions to settle during implementation

- **tsup vs. esbuild direct vs. ts source + tsx in prod?** Recommend tsup; will benchmark image size + cold start in implementation.
- **Build context for Python image** — repo root (consistent with TS) or `modules/master-data/` (smaller context, current behavior)? Likely the latter; handoff doc must call this out.
- **`tools/dockerfile-for-svc.sh` content** — a simple case statement is fine; we could also inline this into the Jenkinsfile example. Inlining is more transparent for new-to-Nx DevOps readers.

## References

- ADR-0004 (Cerbos sidecar — to be amended; see F1)
- ADR-0019 (Fastify v5, Node 24)
- `CLAUDE.md` — module structure, "no tsc on WSL2" rule, "frontend auth is UX" rule
- `nx.json` — `defaultBase: dev`, named inputs
- `nrwl/nx-set-shas` GitHub Action — the conceptual source for the moving-base-SHA pattern
- Cerbos docs — sidecar vs. centralized PDP deployment patterns
