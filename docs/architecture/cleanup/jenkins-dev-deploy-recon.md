# Jenkins HIMS-DEV deploy recon — why deploys are slow (2026-07-08)

Read-only recon of the org's Jenkins CI/CD for this monorepo's dev deploys. Uncommitted draft for
discussion with devops. No infra was modified.

## MEASURED (2026-07-09, authenticated wfapi + console reads)

Recent HospitalSaarthi build durations: **7.5–29 min** (#92-93 ≈ 7.5-8.4 min small affected sets;
#90/#95 ≈ 27.5-29 min when the affected set is large). Build **#95** (14 affected apps) stage
breakdown — total 1753 s:

| Stage | Time | Share |
|---|---|---|
| Build And Push Images | **1473 s** | **84%** |
| Run Migrations In AKS | 189 s | 11% |
| Checkout + Setup + Affected | 59 s | 3% |
| Roll Deployments + Move Tag | 9 s | <1% |

Console log confirms: **kaniko executor, ZERO cache flags** (no `--cache*` anywhere in the
output), `corepack + pnpm install` runs cold inside every image, ~105 full-filesystem snapshot
operations, builds effectively serial. Hypotheses 1–3 below are now measured fact; queueing
(hypothesis in item 6/10) is NOT the problem — the stage timings account for the wall-clock.
`config.xml` needs a higher permission (HTML wall), but the console output makes the job's
behavior unambiguous.

## Where the pipeline lives

- **Pipeline-as-code repos:** `IQ-Line/jenkins-job-dsl` (seed DSL: `himsDEV.groovy`,
  `himsV2DEV.groovy` — folders HIMS-DEV-NEW / HIMSv2-DEV, webhook triggers on merged PRs into dev)
  and `IQ-Line/jenkins-shared-lib` (`vars/commonK8sPipeline.groovy` = checkout → kaniko build →
  trivy → crane promote → kubectl apply; `vars/himsV2DEVConfig.groovy` = namespace `himsv2`,
  registry `acriqline.azurecr.io`, kube secret `iqline-dev-shared-aks-kube-config`).
- **BUT the HospitalSaarthi monorepo job is NOT in jenkins-job-dsl** — it is configured directly in
  the Jenkins UI. It implements the contract documented in-repo at `infra/devops-handoff.md` §6:
  full-history checkout → pnpm install → `nx affected --base=last-deployed-<branch>` → per-service
  docker build/push (SHA + `<branch>-latest` tags) → move tag → rollout.
- **Proof it's live:** `refs/tags/last-deployed-dev` == `origin/dev` HEAD (0386cf54, PR #313);
  all 16 deployments in namespace `himsv2` on `iqline-qa-shared-aks` run image tag `5a239d4a`
  == `last-deployed-qa`.
- Jenkins itself: `aks-qa.centralindia.cloudapp.azure.com/jenkins` (135.235.187.117 — NOT the QA
  ingress IP; no jenkins namespace on the QA cluster, so it runs elsewhere — likely dev-shared AKS
  or a VM). Anonymous REST is 403 (Entra ID OIDC); an authenticated API token would let us read
  `job/.../config.xml` + `lastBuild/wfapi/describe` (per-stage timings — the ground truth).

## Why it's slow (evidence-ranked)

1. **No image build cache.** Org pipelines build with kaniko on ephemeral K8s agent pods with zero
   cache flags; kaniko caching was added ONLY to the PACS pipeline on 2026-07-06 (shared-lib commit
   `e0518958`). The `RUN --mount=type=cache` pnpm-store mount in `infra/docker/node-svc.Dockerfile`
   is inert under kaniko — every build re-downloads and reinstalls the full dependency tree.
2. **Per-service full-workspace build ×N.** Each affected service's image independently runs
   corepack + `pnpm install --filter` + `nx build` from the repo root. A shared-package change
   marks most of ~14 TS services affected → N × (cold install + build + ~380MB push), and the
   handoff skeleton's build loop is **serial**.
3. **Dockerfile layer-order defect.** `node-svc.Dockerfile` / `web.Dockerfile` COPY the full
   source trees BEFORE `pnpm install`, so any source change invalidates the dependency layer even
   where caching exists.
4. **No Nx remote cache.** nx.json has local `cache: true` only; nothing shared across runs or
   across the N per-image builds.
5. **Sequential heavy stages** (shared-lib jobs on the same instance): fresh `rm -rf && git clone`
   per build, double Trivy scans per image with `TRIVY_EXIT_CODE=0` (purely informational, in the
   critical path), crane promote dance, `disableConcurrentBuilds` + small shared agent nodepool →
   queueing.
6. **Affected-set degradation risk.** All 16 QA deployments at one SHA is consistent with
   rebuild-the-world runs (FORCE_REBUILD / tag-miss fallback / `tsconfig.base.json` in
   `sharedGlobals` legitimately affecting everything). Confirm from console logs.

## ⚡ Local before/after demo — DONE 2026-07-09

See `jenkins-demo/RESULTS.md` (+ runnable `run-demo.sh`) — same builder (kaniko) against a
local registry. Headline: kaniko cache flags alone recover ~5 s/image (COPY-layer caching
proved unreliable in kaniko, breaking the cache chain); **build-once-package-N cuts a
per-service image from ~2 min to ~26 s** and composes with parallelism. The fix-plan order
below is superseded by RESULTS.md's recommendation order (build-once first, cache flags last).

## Fix plan (discuss with devops before touching their repos)

Ordered by leverage; items 3–5 are changes in THIS repo, the rest live in devops' repos/job config.

1. **Ground truth first** (user): log into Jenkins via the corp Entra account → mint an API token →
   fetch the job's `config.xml` + `lastBuild/wfapi/describe`. Stage timings decide everything below.
2. **Kaniko cache flags** on the monorepo job (replicate shared-lib commit `e0518958`):
   `--cache=true --cache-repo=acriqline.azurecr.io/kaniko-cache --cache-copy-layers
   --cache-run-layers --compressed-caching=false --snapshot-mode=redo`.
3. **This repo — Dockerfile layer order:** copy manifests+lockfile → `pnpm install` → copy source.
4. **This repo — build once, package N times:** one `pnpm install` + `nx run-many -t build` on the
   agent, then thin runtime images that only COPY each service's built output. Collapses the
   biggest multiplier.
5. **This repo — dev manifests:** `infra/k8s/base/hims-platform.yaml` pins mutable `:dev-latest` +
   `rollout restart` (restarts ALL services, no rollback); QA already uses immutable SHA tags +
   `kubectl set image` per affected service — align dev with QA.
6. **Parallelize the per-service loop** (Jenkins `parallel` / `xargs -P`).
7. **Nx remote cache — self-hosted only** (user decision: no SaaS reliance, Nx Cloud is out).
   Use `nx-remotecache-azure` against an org blob container, or an S3/minio-compatible cache task
   runner; also remove the dead `NX_CLOUD_ACCESS_TOKEN` env from GitHub ci.yml when this lands.
8. **Trivy out of the critical path** (async post-push scan by digest; drop the promote dance).
9. **Reference-repo checkout** instead of fresh clone (keep FULL history — `nx affected` needs it).
10. **Export the UI job into `jenkins-job-dsl`** so it's version-controlled like every other job.

## Access notes (for the follow-up session)

- `az` logged in (3 subscriptions); AKS listable; ACR reads denied (401); only
  `iqline-qa-shared-aks` reachable from this box at recon time — **other clusters were probed at
  ~2am and may simply have been off/asleep; unreachable ≠ no access, re-probe during the day.**
- `gh` authenticated with org-wide read.
