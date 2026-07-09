# Jenkins build-speed demo — measured results (2026-07-09, local)

Local reproduction of the HIMS-DEV image-build bottleneck using the **same builder the
pipeline uses** (kaniko v1.23.2, in docker) pushing to a local registry. Service:
`billing-svc` (one of the smaller services — treat times as a lower bound). "Incremental" =
one-line source edit in `modules/billing/src/index.ts`, i.e. what a typical merge pays per
affected service. Re-run with `bash docs/architecture/cleanup/jenkins-demo/run-demo.sh`
(needs `docker run -d --name hims-demo-registry -p 5001:5000 registry:2`).

| Scenario | Cold | Incremental |
|---|---|---|
| **A. As-is Dockerfile, kaniko, no cache** (= today's pipeline) | 146 s | 116 s |
| **B. As-is Dockerfile + kaniko cache flags** (= shared-lib `e0518958` alone) | 116 s | 111 s |
| **C. Fixed layer order (`pnpm fetch`) + kaniko cache** | 164 s | 141 s |
| **D. Build once on the agent + thin runtime image** | — | **8 s (nx build + pnpm deploy) + 18 s (image)** |

## What the numbers actually say

1. **Today's cost is real and multiplicative.** ~2 min per image locally, ×14 affected
   services, serial — matches the measured Jenkins stage (1473 s for 14 apps ≈ 105 s/image
   on datacenter bandwidth). Every one of those images re-runs corepack + full `pnpm
   install` + `nx build` from scratch.
2. **Kaniko cache flags alone (scenario B) recover almost nothing here — 5 s.** Two causes,
   both visible in the logs (`logs/B2-*.log`): the as-is Dockerfile COPYs the full source
   trees before `pnpm install`, so a source edit invalidates the install layer *by design*;
   and kaniko's `--cache-copy-layers` **missed even on unchanged layers** (the
   manifests-only COPY reports "No cached layer found" despite identical content), which
   breaks the cache chain for everything after it. Porting commit `e0518958`'s flags to the
   HIMS job is NOT the fix on its own.
3. **Fixing the Dockerfile layer order (scenario C) cannot pay off while COPY-layer caching
   is unreliable** — the `pnpm fetch` layer chains off a COPY that spuriously misses, so the
   incremental build re-fetches. (It also pays a whole-workspace store fetch on cold builds.)
   Worth doing for correctness — the current "manifests first for maximum layer cache reuse"
   comment describes something the file doesn't do — but it is not where the win is.
4. **The win is scenario D — take the work out of the image build entirely.** One
   `pnpm install` + `nx run-many -t build` on the agent (8 s incremental for this service
   with warm host store; nx computation cache and a self-hosted remote cache make this
   near-constant across services), then each image is a thin COPY of the prebuilt
   `pnpm deploy` output: **18 s vs ~110–160 s, per service**. For a 14-service affected set:
   one shared install+build (minutes, parallelizable, cacheable) + 14 × ~20 s thin builds
   (parallelizable) instead of 14 × ~2 min serial full builds. This is also what makes the
   dev→SHA-tag rollout alignment trivial (each thin image is cheap to produce per SHA).

## Recommendation order (updates the recon doc's fix plan)

1. **Build-once-package-N** (scenario D) — the structural fix; largest, most reliable win.
   Requires a persistent pnpm store / nx cache on the agent (persistent workspace, PVC, or a
   self-hosted remote cache — **no SaaS**, e.g. `nx-remotecache-azure` on an org blob).
2. **Parallelize the per-service image loop** — composes with D (thin builds are I/O-light).
3. **Fix the Dockerfile layer order anyway** (correctness; helps any future BuildKit builder,
   where `RUN --mount=type=cache` and reliable layer caching actually work).
   **Decision (2026-07-09): deferred.** The fetch-pattern variant measured *slower* under
   kaniko in both cache modes (C vs A/B above), and kaniko is the org's only CI builder —
   rewriting the production Dockerfile would regress today's pipeline for a benefit that only
   materializes under BuildKit. The proven variant is kept here
   (`node-svc.fixed-layers.Dockerfile`) for the day a BuildKit builder exists; the misleading
   "maximum layer cache reuse" comment in the real Dockerfile was corrected instead.
4. **Kaniko cache flags** — cheap to add, but measured here as a ~5 s/image win under the
   current Dockerfile shape; do not expect it to move the needle alone.

## → Productized (2026-07-09)

Recommendation 1 now exists as real repo artifacts, adoptable by the pipeline as-is:
`tools/build-images.sh` (build once + stage per-service contexts + manifest),
`infra/docker/node-svc.thin.Dockerfile`, `infra/docker/web.thin.Dockerfile`, and paste-ready
stage code in `infra/devops-handoff.md` §6.5 (docker + kaniko variants, parallelizable).

## Fidelity caveats

- Base image swapped `acriqline.azurecr.io/node:24-bookworm-slim` → upstream
  `node:24-bookworm-slim` (same image; ACR reads are denied from this box).
- Local NVMe + home bandwidth vs AKS agent pods — absolute numbers differ; ratios and cache
  hit/miss behavior are the transferable findings (per-image ballpark matched Jenkins' 105 s).
- `billing-svc` is small; `web` and services pulling heavy deps will show larger absolute
  gaps in D's favor.
