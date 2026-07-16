# HIMS Monorepo — DevOps Handoff Guide

**Audience:** DevOps engineers wiring up Jenkins → ACR → AKS for the HIMS platform.
**Assumes:** Familiarity with Jenkins, Docker, ACR, AKS, `kubectl`. **No prior Nx or monorepo experience required.**
**Last updated:** 2026-07-09 (added §6.5 — the fast build path; adopt it, it is measured ~5–7× cheaper per image).

This document is a tutorial. Read sections 1–5 end-to-end before writing any pipeline code. Then keep sections 6–11 open as reference while you build.

---

## 1. What this repo is, in 60 seconds

The HIMS platform lives in a **single git repo** ("monorepo") under `/`. The interesting top-level directories are:

- **`services/`** — the **deployable units**. Each subdirectory is one runnable application: 7 TypeScript Fastify backends (suffixed `-svc`), one BFF proxy (`services/bff`), and one React SPA (`services/web`).
- **`modules/`** — shared business-logic libraries (e.g. `modules/billing`, `modules/user-management`). These are **not deployed standalone**. They are imported by services and bundled into the service's runtime artifact at build time. One exception: `modules/master-data` is a Python FastAPI app that **does** ship as its own image (the only Python service in the platform).
- **`packages/`** — cross-cutting TypeScript SDKs (`@hims/ts-sdk-db`, `@hims/ts-sdk-openapi`, `@hims/ts-sdk-events`, etc.). Like `modules/`, these are bundled into services, not deployed.
- **`infra/`** — Dockerfiles (`infra/docker/`), Cerbos policies (`infra/cerbos/`), and the local-dev compose file. This handoff doc lives here too.
- **`tools/`** — small scripts used by CI / dev tooling. The one you'll care about is `tools/dockerfile-for-svc.sh`.

When developers push a change, they might touch a service directly OR they might touch a shared library that several services use. The deployment pipeline needs to figure out which **deployable services** are actually affected so it can rebuild only those. That's what **Nx** does for us — see §3.

The total set of images Jenkins ever needs to build is 11. They're enumerated in §2.

---

## 2. The deployable services

There are exactly **9** images the pipeline ever has to produce:

| Service (Nx project name) | Image name in ACR | Dockerfile | Build context | What it is |
|---|---|---|---|---|
| `integration-hub-svc` | `hims.azurecr.io/integration-hub-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` (repo root) | TS Fastify; multi-tenant integration hub (ABDM) |
| `billing-svc` | `hims.azurecr.io/billing-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `configurator-svc` | `hims.azurecr.io/configurator-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `empi-svc` | `hims.azurecr.io/empi-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `registration-svc` | `hims.azurecr.io/registration-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `inventory-svc` | `hims.azurecr.io/inventory-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `user-management-svc` | `hims.azurecr.io/user-management-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `bff` | `hims.azurecr.io/bff:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify; browser-facing proxy |
| `web` | `hims.azurecr.io/web:<sha>` | `infra/docker/web.Dockerfile` | `.` | React SPA built by Vite, served by Nginx |
| `master-data` *(also called `master-data-svc`)* | `hims.azurecr.io/master-data:<sha>` | `infra/docker/master-data.Dockerfile` | `.` | Python FastAPI / uvicorn |
| `cerbos-policies` *(image name: `cerbos`)* | `hims.azurecr.io/cerbos:<sha>` | `infra/docker/cerbos.Dockerfile` | `.` | Cerbos PDP with HIMS policies baked in |

### One callout you must not miss

**`cerbos-policies` is the Nx project name; `cerbos` is the image name.** When Nx tells you "cerbos-policies is affected", the corresponding image is `hims.azurecr.io/cerbos:<sha>` (and the k8s Deployment is named `cerbos`). The §6 skeleton handles this rewrite explicitly.

All images build with **repo root** as context (the final positional arg to `docker build`). `tools/dockerfile-for-svc.sh` returns the (Dockerfile, context) pair for each service — use it rather than hardcoding paths, so new services can be added without changing the Jenkinsfile loop.

> **Faster path:** the Dockerfiles in this table are the self-contained fallback. For CI, use
> the build-once/package-N flow in **§6.5** — one shared `nx build` on the agent, then thin
> images (`*.thin.Dockerfile`) that just COPY prebuilt output. Measured ~18 s vs ~2 min per image.

---

## 3. Nx in 5 minutes

Nx is a build tool for monorepos. For this pipeline, you need exactly three concepts:

### 3.1 The project graph

Every deployable service has a `project.json` (e.g. `services/billing-svc/project.json`). Every shared library has one too. Nx reads them all, then reads each `package.json` to learn which packages depend on which. The result is a directed graph: "billing-svc depends on `@hims/billing`, which depends on `@hims/ts-sdk-db`, …".

You can visualize the graph any time with:

```bash
npx nx graph
```

It opens a browser. Useful for debugging "why didn't my service rebuild?".

### 3.2 Affected

Given a git SHA range (`--base=X --head=Y`), Nx walks the project graph and returns the minimal set of projects whose source code OR any transitive dependency changed between X and Y. That's the "affected" set.

The one command this pipeline uses:

```bash
npx nx show projects --affected --base=<sha> --head=HEAD --type=app --json
```

`--type=app` filters to **deployable** projects only (everything where `projectType: "application"` in `project.json`). Libraries are excluded — they don't ship as their own image.

Example output:
```json
["billing-svc","user-management-svc"]
```

That's a JSON array of Nx project names. Feed it into the build loop in §6.

### 3.3 Tags & types

Each project declares `projectType` (`application` for deployables, `library` for shared code) and free-form `tags`. Every deployable in this repo is tagged `deploy:aks`. You don't need to filter on tags — `--type=app` is already correct — but knowing the convention helps when debugging.

### Sanity check: list every deployable

```bash
npx nx show projects --type=app
```

Output (sorted): `bff`, `billing-svc`, `cerbos-policies`, `configurator-svc`, `empi-svc`, `integration-hub-svc`, `master-data`, `registration-svc`, `user-management-svc`, `web` — exactly 10 entries (`integration-hub-svc` replaces Phase 0 `abdm-adapter-svc`). `master-data` (the Python service) is an Nx project with `projectType: application` and the `deploy:aks` tag, so it participates in affected detection like any other deployable: change a file under `modules/master-data/` and `--affected` returns `["master-data"]`.

---

## 4. The pipeline contract

Your Jenkinsfile is responsible for:

1. Checking out the repo with **full git history** (`fetch-depth: 0` or equivalent). Without it, Nx's `--affected` calculation will be wrong or empty.
2. Setting up Node 24 + pnpm 10.33.
3. Running `pnpm install --frozen-lockfile`.
4. Determining the **base SHA** for affected detection (see §5).
5. Running `nx show projects --affected --type=app --json` to get the list.
6. For each affected service: building the image, tagging it `<service>:<short-sha>` and `<service>:<branch>-latest`, pushing to ACR.
7. On success on `dev` or `master` (NOT PR builds), force-moving the `last-deployed-<branch>` git tag to `HEAD`.
8. Triggering the AKS rollout (your `kubectl set image` / ArgoCD trigger / Helm upgrade — see §6 last stage).

The repo guarantees:

- Every Dockerfile in `infra/docker/` accepts the build args documented in §2 and produces a working image when invoked from the correct build context.
- `tools/dockerfile-for-svc.sh <service>` returns the correct `(dockerfile, context)` pair for every deployable.
- `nx show projects --affected --type=app` returns the minimal correct rebuild set whenever the base SHA is honest.
- Every Dockerfile uses `--build-arg SERVICE_NAME=<svc>` for parameterization where applicable; no registry name is hardcoded.

What happens after `docker push` (AKS manifests, secret injection, Ingress, TLS) is yours.

---

## 5. The base-SHA strategy

For affected detection to work, Nx needs to know **"what's the last commit we already successfully deployed?"** We track that via a **moving git tag**:

- After a successful pipeline run on `dev`, we force-push the tag `last-deployed-dev` to point at `HEAD`.
- Same for `master`: `last-deployed-master`.

Next pipeline run uses that tag as `--base`. If only one library changed since the tag, only the services that depend on that library will rebuild.

### Base-SHA per build context

| Build context | What `BASE` should be |
|---|---|
| **PR build** (against `dev`) | `origin/dev` — by definition the PR's merge target. Do not move any tag on PR builds. |
| **`dev` branch post-merge** | `last-deployed-dev` (the moving tag). On success, force-push it to `HEAD`. |
| **`master` branch post-merge** | `last-deployed-master`. On success, force-push it to `HEAD`. |
| **First-ever run** (tag missing) | Fall back to `HEAD~1` (rebuilds whatever changed in the last commit). The §6 skeleton already does this. |
| **Force rebuild all** (manual pipeline parameter) | Skip the `--affected` flag entirely; loop over the full output of `nx show projects --type=app --json`. See §8 for the recipe. |

### Why a moving git tag and not the Jenkins API?

- **Portable.** Any clone of the repo can ask "what was last deployed?". Doesn't lock us to Jenkins's internal state.
- **Auditable.** `git log last-deployed-dev..HEAD` shows everything pending deployment.
- **Survives CI migrations.** If we ever switch off Jenkins, the tag still works.

The pattern is borrowed from `nrwl/nx-set-shas` — the same approach the GitHub Actions community uses.

---

## 6. A working Jenkinsfile skeleton

Copy-paste this as your starting point, then adapt to your team's declarative-vs-scripted conventions, agent labels, credentials, etc.

The `sh` blocks below use `#!/usr/bin/env bash` and **awk-based parsing** (no process substitution `< <(…)` — that fails in `dash`, which is `/bin/sh` on many Jenkins agents).

```groovy
pipeline {
  agent any

  environment {
    REGISTRY     = 'hims.azurecr.io'
    BRANCH       = "${env.BRANCH_NAME}"     // 'dev', 'master', or 'PR-123'
    NODE_VERSION = '24'
    PNPM_VERSION = '10.33.0'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          extensions: [[$class: 'CloneOption', depth: 0, noTags: false, shallow: false]],
          // ... your repo URL, credentials, etc.
        ])
      }
    }

    stage('Setup') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          corepack enable
          corepack prepare pnpm@${PNPM_VERSION} --activate
          pnpm install --frozen-lockfile
        '''
      }
    }

    stage('Determine base SHA') {
      steps {
        script {
          if (env.CHANGE_ID) {
            // PR build — base against the merge target (typically dev)
            env.BASE = "origin/${env.CHANGE_TARGET}"
          } else {
            // Branch build — moving tag, or fall back to HEAD~1
            env.BASE = sh(
              returnStdout: true,
              script: 'git rev-parse "last-deployed-${BRANCH}" 2>/dev/null || echo "HEAD~1"'
            ).trim()
          }
          echo "Affected base: ${env.BASE}"
        }
      }
    }

    stage('Compute affected') {
      steps {
        script {
          def affectedJson = sh(
            returnStdout: true,
            script: "npx nx show projects --affected --base=${env.BASE} --head=HEAD --type=app --json"
          ).trim()
          env.AFFECTED = affectedJson
          echo "Affected services: ${env.AFFECTED}"
        }
      }
    }

    stage('Login to ACR') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          az acr login --name hims
        '''
      }
    }

    stage('Build & push images') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          SHA=$(git rev-parse --short HEAD)

          # awk parsing keeps this portable to dash/sh; avoid <(...) process substitution
          echo "$AFFECTED" | jq -r '.[]' | while read -r svc; do
            echo "=== building $svc ==="

            # Helper prints "<dockerfile> <context>" — one whitespace-separated line
            mapping=$(./tools/dockerfile-for-svc.sh "$svc")
            DOCKERFILE=$(echo "$mapping" | awk '{print $1}')
            CONTEXT=$(echo "$mapping"   | awk '{print $2}')

            # Nx project name 'cerbos-policies' maps to image name 'cerbos'
            IMAGE_NAME="$svc"
            if [ "$svc" = "cerbos-policies" ]; then IMAGE_NAME="cerbos"; fi

            DOCKER_BUILDKIT=1 docker build \\
              -f "$DOCKERFILE" \\
              --build-arg SERVICE_NAME="$svc" \\
              -t "$REGISTRY/$IMAGE_NAME:$SHA" \\
              -t "$REGISTRY/$IMAGE_NAME:$BRANCH-latest" \\
              "$CONTEXT"

            docker push "$REGISTRY/$IMAGE_NAME:$SHA"
            docker push "$REGISTRY/$IMAGE_NAME:$BRANCH-latest"
          done
        '''
      }
    }

    stage('Move deployment tag') {
      when {
        anyOf {
          branch 'dev'
          branch 'master'
        }
      }
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          git tag -f "last-deployed-${BRANCH}" HEAD
          git push -f origin "last-deployed-${BRANCH}"
        '''
      }
    }

    stage('Trigger AKS rollout') {
      when {
        anyOf {
          branch 'dev'
          branch 'master'
        }
      }
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          SHA=$(git rev-parse --short HEAD)
          # kubectl / ArgoCD / Helm — your pattern goes here.
          # The loop pattern: for each affected service, roll its Deployment.
          echo "$AFFECTED" | jq -r '.[]' | while read -r svc; do
            IMAGE_NAME="$svc"
            if [ "$svc" = "cerbos-policies" ]; then IMAGE_NAME="cerbos"; fi
            kubectl -n hims set image "deployment/$IMAGE_NAME" \\
              "$IMAGE_NAME=$REGISTRY/$IMAGE_NAME:$SHA"
          done
        '''
      }
    }
  }
}
```

### Notes on the skeleton

- The `set -euo pipefail` at the top of every `sh` block is deliberate. Without it, a `jq` failure mid-loop silently continues.
- `echo "$mapping" | awk '{print $1}'` is the portable equivalent of `read -r DOCKERFILE CONTEXT < <(./tools/dockerfile-for-svc.sh "$svc")` — same result, runs in any POSIX shell.
- `docker push` of both the SHA tag and the `<branch>-latest` tag is intentional. The SHA tag is the immutable canonical reference manifests target; `<branch>-latest` is for human convenience (e.g. when debugging on a dev cluster).
- The `Move deployment tag` stage runs **only on dev/master** and **only after** all builds + pushes succeed. PR builds never move the tag.

---

## 6.5. The fast build path — build once, package N times (ADOPT THIS)

The §6 skeleton's build loop runs a **full in-image `pnpm install` + `nx build` for every
affected service** (~2 min/image, serial — measured 1473 s for a 14-service affected set on the
dev pipeline, 84% of total deploy time). The fix: do the install+build **once on the agent**,
then each image is a thin COPY of prebuilt output.

Measured (kaniko, same service, see `docs/architecture/cleanup/jenkins-demo/RESULTS.md`):

| | Full in-image build (today) | Thin image (this section) |
|---|---|---|
| Per affected service | ~110–150 s, serial | **~18 s** (+ ONE shared `nx build` for the whole set — ~8 s warm, minutes on a cold agent; see notes) |
| Kaniko cache flags alone | saves ~5 s/image — **not the fix** | n/a |

**Replace the §6 `Build & push images` stage body with:**

```bash
#!/usr/bin/env bash
set -euo pipefail
SHA=$(git rev-parse --short HEAD)

# One install + one nx build for all affected services, then stage
# per-service image contexts under dist-images/. Emits dist-images/manifest.txt:
#   <nx-project> <image-name> <build-context> <dockerfile>
./tools/build-images.sh $(echo "$AFFECTED" | jq -r '.[]')

# Docker agents:
while read -r svc image ctx df; do
  echo "=== building $image ==="
  DOCKER_BUILDKIT=1 docker build -f "$df" --build-arg SERVICE_NAME="$svc" \
    -t "$REGISTRY/$image:$SHA" -t "$REGISTRY/$image:$BRANCH-latest" "$ctx"
  docker push "$REGISTRY/$image:$SHA"
  docker push "$REGISTRY/$image:$BRANCH-latest"
done < dist-images/manifest.txt
```

```bash
# Kaniko agents (K8s pod, no docker daemon) — same manifest, kaniko executor.
# Thin contexts are tiny, so these are safe to parallelize (xargs -P4).
while read -r svc image ctx df; do
  /kaniko/executor \
    --context "dir://$WORKSPACE/$ctx" \
    --dockerfile "$WORKSPACE/$df" \
    --build-arg "SERVICE_NAME=$svc" \
    --destination "$REGISTRY/$image:$SHA" \
    --destination "$REGISTRY/$image:$BRANCH-latest"
done < dist-images/manifest.txt
```

Notes:

- `tools/build-images.sh` handles ALL deployables: TS services + `web` get thin contexts
  (`infra/docker/node-svc.thin.Dockerfile` / `web.thin.Dockerfile`); `master-data`,
  `cerbos-policies`, `opd-svc` pass through with their existing self-contained Dockerfiles and
  repo-root context. The `cerbos-policies` → `cerbos` image-name rewrite is already in the
  manifest — delete the special-casing from your loop.
- The `Setup` stage's `pnpm install --frozen-lockfile` is reused; the script only installs if
  `node_modules` is missing. A **persistent agent workspace (or PVC-backed pnpm store + `.nx`
  cache)** makes the shared build near-constant across runs; add a self-hosted Nx remote cache
  (e.g. `nx-remotecache-azure` on an org blob container — no SaaS) to share it across agents.
- Rollout: the §6 `kubectl set image ...:$SHA` stage already does the right thing — per-service,
  immutable tags, `rollout undo` works. If a job instead does `kubectl apply` + `rollout restart`
  with a mutable `<branch>-latest` tag (the dev job does today), switch it to the §6 stage:
  it restarts ALL services on every deploy and cannot roll back. No manifest changes needed —
  `kubectl set image` overrides the manifest's tag after the initial apply.
- Kaniko cache flags (`--cache=true --cache-repo=...`) are measured as a ~5 s/image win under
  the current Dockerfile shape and its COPY-layer caching was observed missing on unchanged
  layers — do not expect them to substitute for this section.

---

## 7. AKS deployment topology

All services run in a **single namespace** (`hims`). One `Deployment` per service. One shared **Cerbos Deployment** that every backend service talks to over gRPC.

### 7a. Cerbos (centralized; Phase 1)

One Deployment + one Service. Two replicas for availability. Every backend service is configured with `CERBOS_URL=cerbos.hims.svc.cluster.local:3593`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cerbos
  namespace: hims
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
          livenessProbe:
            httpGet: { path: /_cerbos/health, port: http }
          readinessProbe:
            httpGet: { path: /_cerbos/health, port: http }
          resources:
            requests: { cpu: 50m,  memory: 64Mi }
            limits:   { cpu: 200m, memory: 256Mi }
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

This contradicts ADR-0004 (which calls for a per-pod sidecar). The amendment is tracked as a follow-up — see §10. Rationale: small fleet (~10 services), single namespace, ~1–2 ms intra-cluster latency cost is negligible vs. operational simplicity gain. Promote to sidecar later only if latency is measured and proven problematic.

### 7b. A typical backend service (e.g., billing-svc)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing-svc
  namespace: hims
spec:
  replicas: 2
  selector: { matchLabels: { app: billing-svc } }
  template:
    metadata: { labels: { app: billing-svc } }
    spec:
      containers:
        - name: billing-svc
          image: hims.azurecr.io/billing-svc:<sha>
          ports:
            - { name: http, containerPort: 3000 }
          env:
            - { name: NODE_ENV,    value: production }
            - { name: CERBOS_URL,  value: "cerbos.hims.svc.cluster.local:3593" }
            - name: DATABASE_URL
              valueFrom: { secretKeyRef:    { name: pg,          key: url } }
            - name: JWKS_URL
              valueFrom: { configMapKeyRef: { name: hims-config, key: jwks_url } }
          livenessProbe:
            httpGet: { path: /healthz, port: http }
          readinessProbe:
            httpGet: { path: /healthz, port: http }
          resources:
            requests: { cpu: 50m,  memory: 128Mi }
            limits:   { cpu: 500m, memory: 512Mi }
---
apiVersion: v1
kind: Service
metadata: { name: billing-svc, namespace: hims }
spec:
  selector: { app: billing-svc }
  ports: [{ port: 3000, targetPort: http }]
```

The same shape repeats for the other 6 backend services. Just swap the name, image, and any service-specific env. The three env-var patterns to reuse:

- `CERBOS_URL` — same value for every service (`cerbos.hims.svc.cluster.local:3593`), authz PDP location.
- `DATABASE_URL` — `secretKeyRef` to a Key Vault-backed Secret (`pg`). Every service has its own schema in the shared Postgres; the URL points to that schema.
- `JWKS_URL` — `configMapKeyRef` to a shared ConfigMap (`hims-config`). All backend services verify JWTs against the same JWKS endpoint exposed by `user-management-svc`.

External traffic enters via your Ingress controller, lands on **bff** (which handles JWT verification + aggregation) or **web** (for static assets), and is proxied internally to per-service ClusterIP Services.

### 7c. Web (static, port 8080)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: web, namespace: hims }
spec:
  replicas: 2
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      containers:
        - name: web
          image: hims.azurecr.io/web:<sha>
          ports: [{ name: http, containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /healthz, port: http }
          resources:
            requests: { cpu: 25m, memory: 32Mi }
            limits:   { cpu: 200m, memory: 128Mi }
---
apiVersion: v1
kind: Service
metadata: { name: web, namespace: hims }
spec:
  selector: { app: web }
  ports: [{ port: 80, targetPort: http }]
```

The image is Nginx serving the Vite-built SPA. It includes a `/healthz` endpoint and SPA fallback (every unknown path serves `index.html` so TanStack Router can resolve client-side).

### 7d. Known compromise — Cerbos HTTP exposed via Ingress

`services/web` currently calls Cerbos directly from the browser for UI permission gating (`services/web/src/lib/cerbos-client.ts`). This means **Cerbos's HTTP port (3592) needs to be reachable from browsers** in production.

For Phase 1, add an Ingress rule:

```yaml
- path: /_cerbos
  pathType: Prefix
  backend:
    service:
      name: cerbos
      port: { number: 3592 }
```

This is a documented Phase 1 compromise. Why it's acceptable: the frontend authz is **UX-only** — every Cerbos check the browser makes is also enforced by the backend service that handles the actual request. An attacker who bypasses the browser-side Cerbos call sees a UI that lets them click buttons, but the moment they hit a backend endpoint, that service's own Cerbos check rejects them. The PDP remains authoritative on the server side.

Why we'd still rather fix it: exposing the Cerbos HTTP port to the public internet means DoS attack surface and "oracle-style" probing (an attacker can ask Cerbos `is user X allowed to do Y?` and learn which permissions exist).

Tracked as follow-up F2 in §10: once `services/bff` exposes `POST /authz/check` proxying to internal Cerbos, this Ingress rule comes down.

---

## 8. Troubleshooting

### `nx show projects --affected` returns `[]`

You probably ran it on a checkout without full git history. Ensure your Jenkins agent does `fetch-depth: 0` (or the equivalent). Quick test on the agent:

```bash
git log --oneline -5
```

Should show 5 real commits. If it shows only 1, the clone is shallow — fix the checkout step.

A second cause: `--base` and `--head` are the same commit (e.g. you set `BASE=HEAD` accidentally). The §6 skeleton's `git rev-parse "last-deployed-${BRANCH}" 2>/dev/null || echo "HEAD~1"` fallback prevents this on the very first run.

### `nx show projects --affected` returns ALL services for a tiny change

The `--base=` SHA is too far back. Print it and verify it's a real ancestor of `HEAD`:

```bash
echo "BASE=$BASE"
git log --oneline "$BASE"..HEAD | head -10
```

If only one file changed but `$BASE` is hundreds of commits back, the affected set will include everything that depends on anything that changed in that range — which can be the whole repo. Fix by ensuring the moving tag is actually being force-pushed at the end of successful runs.

Second cause: a change to a file in `nx.json`'s `sharedGlobals` (currently `tsconfig.base.json`) invalidates everything by design. Check `nx.json`'s `namedInputs` if this surprises you.

### Library change doesn't trigger expected service rebuild

You touched something under `modules/billing/src/` but `billing-svc` didn't rebuild. Inspect the graph:

```bash
npx nx graph --focus=billing-svc --file=/tmp/graph.html
```

You should see `billing-svc → billing` (where `billing` is the Nx project name for `modules/billing`). If you don't, then `services/billing-svc/package.json` is missing `"@hims/billing"` from `dependencies` — that's the link Nx uses.

### Docker build fails with "cannot find module @hims/xxx"

The bundler's workspace-bundling regex didn't match. Verify `tsup.config.shared.ts` includes `noExternal: [/^@hims\//]`. If it does, check the failing service's source — make sure the import is `@hims/<name>`, not a relative path or a stale alias.

A second cause: the service's `package.json` has `"@hims/<name>"` listed under `devDependencies` instead of `dependencies`. `pnpm install --filter @hims/<svc>...` only follows `dependencies` for the production install. Move it.

### Image is huge (>1 GB)

Two likely causes:

1. **`.dockerignore` isn't being applied.** Verify `.dockerignore` exists at the repo root (`ls -la .dockerignore`). Run a context-size check:
   ```bash
   docker build --no-cache --quiet -f - . <<'EOF'
   FROM alpine
   COPY . /context
   RUN du -sh /context
   EOF
   ```
   Expected: ~50–100 MB. If it shows >500 MB, something big slipped through — start there.

2. **`pnpm deploy --prod` didn't prune dev deps.** Open an interactive shell in the image and inspect:
   ```bash
   docker run -it --entrypoint=/bin/sh hims.azurecr.io/billing-svc:<sha>
   du -sh node_modules
   ls node_modules | wc -l
   ```
   A correctly pruned TS service image is ~200–400 MB total; if `node_modules` alone is 800 MB+, the prune didn't work.

### Cerbos image starts but no policies are loaded

`curl http://<cerbos-pod>:3592/_cerbos/policies` returns an empty list. Verify the Dockerfile's `COPY infra/cerbos/policies /policies` step actually had something to copy:

```bash
ls infra/cerbos/policies/
```

If empty in your checkout, the policies directory isn't being included in CI (check your `.gitignore` and the CI clone settings — sometimes overzealous filtering strips data files).

### "Force rebuild everything" — how do I do it?

Two options, depending on intent:

**Option A: rebuild everything once, don't change the tag.** Add a pipeline parameter (e.g. `FORCE_REBUILD_ALL=true`), and when set, replace the `Compute affected` stage with:

```bash
AFFECTED=$(npx nx show projects --type=app --json)
```

(No `--affected`, no `--base`.) The build loop and rollout proceed normally.

**Option B: delete the moving tag.** Next pipeline run falls back to `HEAD~1`, which rebuilds whatever the most recent commit touched. This is **not** "rebuild everything" — it's "rebuild whatever the last commit affected". Use Option A if you truly want everything.

```bash
git tag -d last-deployed-dev
git push origin :refs/tags/last-deployed-dev
```

---

## 9. Glossary

| Term | Meaning |
|---|---|
| **Monorepo** | A single git repo containing multiple deployable services + shared libraries. |
| **Project (Nx)** | Anything Nx tracks via a `project.json` — either a deployable service (`projectType: application`) or a shared library (`projectType: library`). |
| **Affected** | The set of projects whose source code OR any transitive dependency changed between two git SHAs. The `--affected` flag returns this set. |
| **`*-svc`** | Suffix convention for deployable backend services (`billing-svc`, `empi-svc`, etc.). |
| **BFF** | "Backend-for-frontend" — a thin Fastify proxy (`services/bff`) between `web` and the per-domain backend services. Aggregates calls and handles JWT verification. |
| **Cerbos PDP** | "Policy Decision Point" — the Cerbos service that answers "is user X allowed to do Y on resource Z?". Backend services call it over gRPC (port 3593); the frontend currently calls it via HTTP (3592, see §7d). |
| **`pnpm deploy`** | pnpm subcommand that produces an isolated directory containing exactly one project's production `node_modules` — what we ship to the runtime stage of the TS Dockerfile. |
| **tsup** | Bundler we use to compile each TS service into a single `dist/main.js`. Uses esbuild internally. Fast; does **not** typecheck (see §10). |
| **`@hims/*`** | Namespace for all workspace packages (`@hims/billing`, `@hims/ts-sdk-db`, etc.). The tsup config bundles these into each service's `dist/main.js`, so we don't have to pre-build modules separately. |

---

## 10. Open questions / follow-ups

These are **not action items for DevOps in this round.** Listed so you know what's coming.

- **ADR-0004 amendment** (F1). The current architecture ADR specifies Cerbos as a per-pod sidecar. Phase 1 deploys it centralized (§7a). ADR amendment lands in a separate PR; nothing for DevOps to do.
- **Frontend Cerbos exposure** (F2; see §7d). The public Ingress rule for `/_cerbos` is a known compromise. A future change will proxy `web`'s Cerbos calls through `bff`. When that ships, this Ingress rule comes down — DevOps just removes it.
- **Image vulnerability scanning** (F4). Not in this round. When you wire up Trivy / Defender / your scanner of choice, the images named in §2 are the targets.
- **Build-time typechecking.** tsup transpiles but **does not** typecheck. CI (`vitest` via ts-jest, plus dev-server HMR) catches type errors during development. Re-enabling `nx affected -t typecheck` as a pipeline stage is a separate hardening step — when added, it will run **before** the build stage and fail fast on type errors.

---

## 11. Who to contact

Replace these with your team's actual channel names once you're set up.

- **Build / Nx / Dockerfile issues:** Architecture team — `#hims-architecture` (placeholder).
- **Cerbos / authz behavior:** Authz team — `#hims-authz` (placeholder).
- **AKS / cluster issues:** Your DevOps escalation path.

For one-off questions on this document, ping the architect listed in the most recent commit to `infra/devops-handoff.md`.

---

## Appendix A — Local verification checklist (for devs)

Use this when you're working in the monorepo and want to verify the deployment plumbing still works end-to-end on your machine. Useful before opening a PR that touches `infra/docker/**`, `tsup.config.shared.ts`, `pnpm-workspace.yaml`, `nx.json`, or any `packages/ts-sdk-*/package.json`. Full pass takes ~20 minutes the first time, ~5 minutes with BuildKit cache warm.

### A.1 Fast structural spot-checks (~30 seconds, no Docker)

```bash
# bundle integrity (catches tsup / source-export regressions instantly)
npx nx build billing-svc && node --check services/billing-svc/dist/main.js && echo OK

# project-graph sanity in one assertion
npx nx show projects --type=app --json | jq 'length == 10 and (index("@hims/tsconfig") | not) and (index("master-data") != null)'
# expect: true
```

### A.2 Nx project graph + helper mapping

```bash
# 10 entries; NO @hims/tsconfig; master-data IS present
npx nx show projects --type=app --json | jq -r '.[]' | sort

# every project resolves to a real Dockerfile + context
npx nx show projects --type=app --json | jq -r '.[]' | while read svc; do
  echo "$svc -> $(./tools/dockerfile-for-svc.sh "$svc")"
done
```

### A.3 Hermetic Nx build — proves no tsc cascade leaked back in

```bash
rm -rf packages/*/dist services/*/dist
npx nx run-many -t build \
  -p integration-hub-svc,billing-svc,configurator-svc,empi-svc,registration-svc,user-management-svc,bff,web \
  --skip-nx-cache
```

Expect 8 "Build success" messages. If you see `tsc` errors, either `nx.json`'s `targetDefaults.build.dependsOn` has had `^build` reintroduced, or a library re-added a `scripts.build` to its `package.json`.

### A.4 Affected-detection — three synthetic diffs

```bash
# library change → consumer rebuilds:
echo "// touch" >> modules/billing/src/index.ts
npx nx show projects --affected --base=HEAD --head=. --type=app --json   # expect ["billing-svc"]
git checkout modules/billing/src/index.ts

# service-only change → only that service:
echo "// touch" >> services/empi-svc/src/main.ts
npx nx show projects --affected --base=HEAD --head=. --type=app --json   # expect ["empi-svc"]
git checkout services/empi-svc/src/main.ts

# docs-only change → nothing affected:
echo "<!-- touch -->" >> docs/architecture/README.md
npx nx show projects --affected --base=HEAD --head=. --type=app --json   # expect []
git checkout docs/architecture/README.md
```

### A.5 Build one TS Docker image end-to-end

```bash
DOCKER_BUILDKIT=1 docker build \
  -f infra/docker/node-svc.Dockerfile \
  --build-arg SERVICE_NAME=billing-svc \
  -t hims-billing-svc:local .
docker image ls hims-billing-svc:local
```

Expect image around 380 MB. Common regressions:
- `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE` → `pnpm-workspace.yaml` lost `injectWorkspacePackages: true`.
- `Could not resolve "@hims/..."` → the source-export migration regressed (a package re-added `files: ["dist"]` or pointed its `main` back at `dist/`).

### A.6 Run the container — verify the bundle is loadable

```bash
docker run -d --rm --name billing-smoke -p 13000:3000 hims-billing-svc:local
sleep 5
docker logs billing-smoke | head -20
docker kill billing-smoke 2>/dev/null
```

**Good outcomes** (either):
- `Server listening at http://0.0.0.0:3003` — Fastify started, bundle fully loadable.
- An error about a missing env var (`DATABASE_URL`, `CERBOS_URL`, etc.) — bundle loaded, hit config validation.

**Bad outcome:** `Cannot find package '@fastify/swagger'` (or similar runtime npm dep error) — `--config.node-linker=hoisted` got dropped from `pnpm deploy` in the Dockerfile, or `files: ["dist"]` was reintroduced somewhere.

### A.7 The other three Dockerfiles

```bash
# Web (Vite → Nginx)
DOCKER_BUILDKIT=1 docker build -f infra/docker/web.Dockerfile -t hims-web:local .
docker run -d --rm -p 18080:8080 --name web-smoke hims-web:local
sleep 2
curl -s http://localhost:18080/healthz       # → "ok"
curl -s http://localhost:18080/ | head -2    # → "<!doctype html>" + "<html ...>"
docker kill web-smoke

# master-data (Python — same repo-root context as the TS services)
DOCKER_BUILDKIT=1 docker build -f infra/docker/master-data.Dockerfile -t hims-master-data:local .
docker run -d --rm -p 18010:8010 --name md-smoke hims-master-data:local
sleep 5
docker logs md-smoke | tail -5               # expect "Uvicorn running on http://0.0.0.0:8010"
docker kill md-smoke

# Cerbos (policies baked into image)
DOCKER_BUILDKIT=1 docker build -f infra/docker/cerbos.Dockerfile -t hims-cerbos:local .
docker run -d --rm -p 13593:3593 -p 13592:3592 --name cerbos-smoke hims-cerbos:local
sleep 3
docker logs cerbos-smoke 2>&1 | grep "executable policies"   # expect "Found 6 executable policies"
curl -s http://localhost:13592/_cerbos/health                # expect {"status":"SERVING"}
docker kill cerbos-smoke
```

### A.8 What this proves about the DevOps pipeline

If A.1 through A.7 all pass on your machine, the Jenkinsfile in §6 should behave identically — it runs the same `nx` / `docker` / `pnpm` commands. The only environmental differences:

- **BuildKit must be enabled** on Jenkins agents (default on modern Docker; confirm via `docker version` showing BuildKit).
- **ACR registry auth + push** instead of local `:local` image tags.
- **Network access** to `ghcr.io/cerbos/cerbos:0.42.0` for the Cerbos base image pull.

If verification passes locally and breaks in Jenkins, the difference is almost always one of those three.
