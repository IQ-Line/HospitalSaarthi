# AKS + Jenkins Deployment Readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the monorepo Docker-buildable and Nx-affected-aware so DevOps can wire up a Jenkins → ACR → AKS pipeline using a thin contract (Dockerfiles + `.dockerignore` + a tutorial-style handoff doc).

**Architecture:** One shared TS Dockerfile template parameterized by `SERVICE_NAME`. Per-language Dockerfiles for web (Vite→Nginx), master-data (Python/uvicorn), Cerbos (image with baked policies). Each TS service gets an Nx `build` target via `tsup` (esbuild-based). Affected-detection uses `nx show projects --affected --type=app` with a moving `last-deployed-dev` git tag as the base SHA.

**Tech Stack:** Nx 22, pnpm 10.33, Node 24, tsup (esbuild), Docker BuildKit, Nginx, Cerbos (centralized in single AKS namespace).

**Reference:** Spec at `docs/superpowers/specs/2026-05-20-aks-jenkins-deployment-design.md`.

---

## File structure

### Created in this plan

| Path | Responsibility |
|---|---|
| `tsup.config.shared.ts` | Shared tsup config for all TS services. Bundles workspace `@hims/*` deps, externalizes npm deps. |
| `infra/docker/node-svc.Dockerfile` | Multi-stage Dockerfile for all 7 backend `*-svc` services + `bff`. Parameterized by `SERVICE_NAME` build arg. |
| `infra/docker/web.Dockerfile` | Vite build → Nginx static-serving image for the frontend SPA. |
| `infra/docker/web-nginx.conf` | Nginx config with SPA fallback. |
| `infra/docker/master-data.Dockerfile` | Python/uvicorn image for `modules/master-data`. Moved from `modules/master-data/Dockerfile`. |
| `infra/docker/cerbos.Dockerfile` | Cerbos PDP image with `infra/cerbos/policies` + `cerbos.yaml` baked in. |
| `.dockerignore` | Repo root; excludes `node_modules`, `.nx`, `dist`, `docs`, etc. from build context. |
| `tools/dockerfile-for-svc.sh` | Maps service name → Dockerfile path. Tiny helper called by the Jenkinsfile loop. |
| `infra/devops-handoff.md` | **Primary deliverable.** Tutorial-style guide for DevOps on Nx, affected detection, image building, and the Cerbos topology. |

### Modified in this plan

| Path | Change |
|---|---|
| `package.json` (root) | Add `tsup` to `devDependencies`. |
| `services/abdm-adapter-svc/project.json` | Add `build` target (tsup); normalize `projectType` + `deploy:aks` tag. |
| `services/billing-svc/project.json` | Same. |
| `services/configurator-svc/project.json` | Same. |
| `services/empi-svc/project.json` | Same. |
| `services/frontdesk-svc/project.json` | Same. |
| `services/registration-svc/project.json` | Same. |
| `services/user-management-svc/project.json` | Replace existing `build` (currently `tsc --noEmit`, not a real build) with tsup; keep `typecheck` separate. |
| `services/bff/project.json` | Add `build` target; normalize. |
| `services/web/project.json` | Already has `vite build`; just normalize `projectType` + tag. |
| `infra/cerbos/project.json` | Change `projectType` from `library` to `application`; add `deploy:aks` tag. |

### Deleted in this plan

| Path | Reason |
|---|---|
| `modules/master-data/Dockerfile` | Moved to `infra/docker/master-data.Dockerfile`. |

---

## Known constraints (read before starting)

1. **WSL2 `tsc` ban (user CLAUDE.md):** Do NOT run `npx tsc`, `tsc --noEmit`, or `tsc -b` on the host. Docker BuildKit running tsup/esbuild inside Linux containers is fine — that runs in the container, not the host.
2. **tsup ≠ typecheck.** tsup uses esbuild which transpiles but does NOT typecheck. A type error in service source will NOT fail the Docker build. Typecheck enforcement remains via `vitest` (ts-jest) in CI and the dev server HMR. This is an accepted Phase 1 risk; re-enabling `nx affected -t typecheck` in CI is a separate follow-up.
3. **Build context = repo root for TS services.** All TS Dockerfiles assume `docker build … .` is run from the repo root. The `.dockerignore` makes this fast despite the giant tree.
4. **Build context = `modules/master-data/` for Python service.** Different from TS! Called out explicitly in the handoff doc.
5. **Cerbos topology is centralized for Phase 1**, contradicting ADR-0004. Service deployments set `CERBOS_URL=cerbos.hims.svc.cluster.local:3593`. ADR amendment is a separate follow-up.
6. **`services/web` calls Cerbos PDP HTTP directly from the browser.** Phase 1 accepts exposing port 3592 via Ingress; proper fix (BFF proxy) is a separate follow-up.

---

## Task 1: Add tsup as a devDependency and create the shared tsup config

**Files:**
- Modify: `package.json` (root)
- Create: `tsup.config.shared.ts` (root)

- [ ] **Step 1: Install tsup at the repo root**

Run:
```bash
pnpm add -D -w tsup@^8.5.0
```

Expected: `package.json` now lists `"tsup": "^8.5.0"` under `devDependencies`. `pnpm-lock.yaml` updated. Note: tsup uses esbuild, which is already a built dependency.

- [ ] **Step 2: Create the shared tsup config**

Create `tsup.config.shared.ts` at the repo root with:

```ts
import { defineConfig, type Options } from "tsup";

/**
 * Shared tsup config for HIMS TypeScript services.
 *
 * Bundles workspace `@hims/*` deps into the output (so we don't have to
 * pre-build every module separately). Externalizes npm deps so they're
 * loaded from `node_modules` at runtime (smaller bundle, faster cold start,
 * native modules work).
 *
 * Each service has a tiny `tsup.config.ts` that re-exports this with
 * service-local entry points.
 */
export function sharedConfig(opts: Pick<Options, "entry">): Options {
  return {
    ...opts,
    format: ["esm"],
    target: "node24",
    outDir: "dist",
    clean: true,
    bundle: true,
    splitting: false,
    sourcemap: true,
    platform: "node",
    // Treat everything in node_modules as external by default. Without this,
    // tsup only externalizes deps listed in the CWD's package.json, which
    // misses transitively-imported deps (e.g., drizzle-orm pulled in via
    // @hims/ts-sdk-db) and esbuild fails to resolve them.
    skipNodeModulesBundle: true,
    // Force-bundle workspace @hims/* packages from source so we don't need
    // a separate build step for each module/package.
    noExternal: [/^@hims\//],
  };
}

export default defineConfig(sharedConfig({ entry: [] }));
```

**Important:** `skipNodeModulesBundle: true` is critical for monorepo setups. Without it, tsup tries to bundle transitively-imported npm deps and fails with "Could not resolve …" errors. See https://tsup.egoist.dev/ docs for details.

- [ ] **Step 3: Verify tsup is callable**

Run:
```bash
npx tsup --help | head -5
```

Expected: tsup help text. If it errors with "tsup not found", re-run Step 1.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml tsup.config.shared.ts
git commit -m "chore(deploy): add tsup + shared bundler config for TS services

Prep for AKS Dockerfile work: tsup is the Phase 1 bundler. Shared config
bundles workspace @hims/* deps and externalizes npm deps so pnpm deploy
can ship the runtime node_modules."
```

---

## Task 2: Add real `build` target to `billing-svc`

**Files:**
- Modify: `services/billing-svc/project.json`
- Create: `services/billing-svc/tsup.config.ts`

- [ ] **Step 1: Create the service-local tsup config**

Create `services/billing-svc/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";
import { sharedConfig } from "../../tsup.config.shared.js";

export default defineConfig(sharedConfig({ entry: ["src/main.ts"] }));
```

- [ ] **Step 2: Add the `build` target to `services/billing-svc/project.json`**

Replace `services/billing-svc/project.json` with:

```json
{
  "name": "billing-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:billing", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/billing-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "command": "tsx watch --include '../../modules/billing/src' src/main.ts",
      "options": {
        "cwd": "services/billing-svc"
      }
    }
  }
}
```

- [ ] **Step 3: Run the build target**

Run:
```bash
npx nx build billing-svc
```

Expected output (last few lines):
```
CLI Building entry: src/main.ts
ESM Build start
dist/main.js     <some size>
dist/main.js.map <some size>
ESM ⚡️ Build success in <ms>
```

- [ ] **Step 4: Verify the bundle exists and is roughly the right size**

Run:
```bash
ls -lh services/billing-svc/dist/
```

Expected: `main.js` and `main.js.map` exist. `main.js` should be in the range ~100KB–2MB (workspace code bundled in).

- [ ] **Step 5: Verify the bundle parses (lightweight check only)**

```bash
node --check services/billing-svc/dist/main.js && echo "(syntax OK)"
```

Expected: `(syntax OK)`.

**Do NOT run `node -e "import('./dist/main.js')"` on the host** — pnpm's strict resolution keeps transitive npm deps of workspace packages (e.g., `@fastify/swagger` imported via `@hims/ts-sdk-openapi`) inside the originating package's `node_modules`, not in the service's local layout. A host-side dynamic import will fail with "Cannot find package …" which is **not** a real bug — at runtime in the Docker image, `pnpm --filter @hims/<svc> deploy --prod /out` hoists every transitive dep into one flat `node_modules`. The real runtime smoke-test happens in Task 8 inside the built image.

**The one error that WOULD indicate a tsup config bug:** if `nx build` itself emits "Could not resolve `@hims/...`" — that means workspace bundling broke. Anything about external npm deps is expected.

- [ ] **Step 6: Commit**

```bash
git add services/billing-svc/project.json services/billing-svc/tsup.config.ts
git commit -m "feat(billing-svc): add nx build target via tsup

Bundles workspace deps; externalizes npm deps (Fastify, drizzle, pg).
Output: services/billing-svc/dist/main.js. Required for Docker image build."
```

---

## Task 3: Add `build` target to the remaining 6 backend services + `bff`

These are mechanical, identical-shape changes. Doing them as one commit since reviewing 7 identical diffs separately adds no value.

**Files:**
- Modify: `services/abdm-adapter-svc/project.json`
- Modify: `services/configurator-svc/project.json`
- Modify: `services/empi-svc/project.json`
- Modify: `services/frontdesk-svc/project.json`
- Modify: `services/registration-svc/project.json`
- Modify: `services/bff/project.json`
- Create: `services/abdm-adapter-svc/tsup.config.ts`
- Create: `services/configurator-svc/tsup.config.ts`
- Create: `services/empi-svc/tsup.config.ts`
- Create: `services/frontdesk-svc/tsup.config.ts`
- Create: `services/registration-svc/tsup.config.ts`
- Create: `services/bff/tsup.config.ts`

- [ ] **Step 1: Create identical `tsup.config.ts` in each of the 6 dirs**

Each file is byte-identical:

```ts
import { defineConfig } from "tsup";
import { sharedConfig } from "../../tsup.config.shared.js";

export default defineConfig(sharedConfig({ entry: ["src/main.ts"] }));
```

Create it at:
- `services/abdm-adapter-svc/tsup.config.ts`
- `services/configurator-svc/tsup.config.ts`
- `services/empi-svc/tsup.config.ts`
- `services/frontdesk-svc/tsup.config.ts`
- `services/registration-svc/tsup.config.ts`
- `services/bff/tsup.config.ts`

- [ ] **Step 2: Update `services/abdm-adapter-svc/project.json`**

Replace with:

```json
{
  "name": "abdm-adapter-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:abdm-adapter", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/abdm-adapter-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "command": "tsx watch src/main.ts",
      "dependsOn": ["ts-sdk-fhir:build", "ts-sdk-abha:build"],
      "options": {
        "cwd": "services/abdm-adapter-svc",
        "envFile": "{workspaceRoot}/.env"
      }
    },
    "db:migrate": {
      "command": "node scripts/migrate.mjs",
      "options": {
        "cwd": "services/abdm-adapter-svc",
        "envFile": "{workspaceRoot}/.env"
      }
    },
    "db-migrate": {
      "command": "node scripts/migrate.mjs",
      "options": {
        "cwd": "services/abdm-adapter-svc",
        "envFile": "{workspaceRoot}/.env"
      }
    }
  }
}
```

- [ ] **Step 3: Update `services/configurator-svc/project.json`**

Replace with:

```json
{
  "name": "configurator-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:configurator", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/configurator-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx tsx watch src/main.ts",
        "cwd": "services/configurator-svc"
      }
    }
  }
}
```

- [ ] **Step 4: Update `services/empi-svc/project.json`**

Replace with:

```json
{
  "name": "empi-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:empi", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/empi-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "command": "tsx watch src/main.ts",
      "options": {
        "cwd": "services/empi-svc"
      }
    }
  }
}
```

- [ ] **Step 5: Update `services/frontdesk-svc/project.json`**

Replace with:

```json
{
  "name": "frontdesk-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:frontdesk", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/frontdesk-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "command": "tsx watch src/main.ts",
      "options": {
        "cwd": "services/frontdesk-svc"
      }
    }
  }
}
```

- [ ] **Step 6: Update `services/registration-svc/project.json`**

Replace with:

```json
{
  "name": "registration-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:registration", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/registration-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "command": "tsx watch src/main.ts",
      "options": {
        "cwd": "services/registration-svc"
      }
    }
  }
}
```

- [ ] **Step 7: Update `services/bff/project.json`**

Replace with:

```json
{
  "name": "bff",
  "projectType": "application",
  "tags": ["type:service", "scope:bff", "language:typescript", "deploy:aks"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/bff"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx tsx watch src/main.ts",
        "cwd": "services/bff"
      }
    }
  }
}
```

- [ ] **Step 8: Build all 6 in one run**

Run:
```bash
npx nx run-many -t build -p abdm-adapter-svc,configurator-svc,empi-svc,frontdesk-svc,registration-svc,bff
```

Expected: 6 "Build success" messages. If any fail, fix that service before moving on. Each service should produce `services/<svc>/dist/main.js`.

- [ ] **Step 9: Verify outputs exist**

Run:
```bash
for svc in abdm-adapter-svc configurator-svc empi-svc frontdesk-svc registration-svc bff; do
  test -f "services/$svc/dist/main.js" && echo "OK: $svc" || echo "MISSING: $svc"
done
```

Expected: 6 "OK" lines.

- [ ] **Step 10: Commit**

```bash
git add services/abdm-adapter-svc services/configurator-svc services/empi-svc services/frontdesk-svc services/registration-svc services/bff
git commit -m "feat(services): add nx build target via tsup to remaining backend svcs

Same shape as billing-svc: bundles workspace @hims/* deps, externalizes npm
deps. Normalizes projectType=application and adds deploy:aks tag so
'nx show projects --affected --type=app' picks them up."
```

---

## Task 4: Replace `user-management-svc` build target (currently tsc --noEmit)

**Files:**
- Modify: `services/user-management-svc/project.json`
- Create: `services/user-management-svc/tsup.config.ts`

The existing `build` target on UM-svc runs `tsc -p tsconfig.json --noEmit`, which is type-checking, not a real build. Replace it. Keep the separate `typecheck` target for opt-in use.

- [ ] **Step 1: Create the tsup config**

Create `services/user-management-svc/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";
import { sharedConfig } from "../../tsup.config.shared.js";

export default defineConfig(sharedConfig({ entry: ["src/main.ts"] }));
```

- [ ] **Step 2: Update `services/user-management-svc/project.json`**

Replace with:

```json
{
  "name": "user-management-svc",
  "projectType": "application",
  "tags": ["type:service", "scope:platform", "language:typescript", "deploy:aks"],
  "targets": {
    "serve": {
      "dependsOn": ["user-management:db-migrate"],
      "command": "tsx src/main.ts",
      "options": {
        "cwd": "services/user-management-svc",
        "envFile": "{workspaceRoot}/.env"
      }
    },
    "typecheck": {
      "command": "tsc -p tsconfig.json --noEmit",
      "options": {
        "cwd": "services/user-management-svc"
      }
    },
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsup --config tsup.config.ts",
        "cwd": "services/user-management-svc"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "test": {
      "command": "vitest run",
      "options": {
        "cwd": "services/user-management-svc"
      }
    },
    "validate-spec": {
      "dependsOn": ["^build"],
      "command": "pnpm run validate-spec",
      "options": {
        "cwd": "services/user-management-svc"
      }
    },
    "openapi-codegen": {
      "command": "pnpm run openapi:codegen",
      "options": {
        "cwd": "services/user-management-svc"
      }
    }
  }
}
```

Note: tags changed from `["type:app", "scope:platform"]` to `["type:service", "scope:platform", "language:typescript", "deploy:aks"]`. The `type:app` tag was an inconsistency vs. other svcs; standardizing on `type:service` + `projectType: "application"`.

- [ ] **Step 3: Build it**

Run:
```bash
npx nx build user-management-svc
```

Expected: "Build success" with `services/user-management-svc/dist/main.js` created.

- [ ] **Step 4: Verify the existing `validate-spec` chain still works**

The `validate-spec` target has `dependsOn: ["^build"]` which builds upstream module deps. Verify the chain runs:

Run:
```bash
npx nx run user-management-svc:validate-spec
```

Expected: validates and exits 0. If it fails because something downstream needs the *service's* build output (not module deps), the `^build` arrow is wrong — but it almost certainly isn't, this command exists in CI already.

- [ ] **Step 5: Commit**

```bash
git add services/user-management-svc/project.json services/user-management-svc/tsup.config.ts
git commit -m "feat(user-management-svc): replace tsc-noEmit build with real tsup bundle

The old 'build' target was misnamed: it ran tsc --noEmit, which is
typechecking, not building. Renamed to 'typecheck'; new 'build' uses tsup
to produce a real dist/main.js for Docker. Standardizes tags + projectType."
```

---

## Task 5: Normalize `services/web/project.json` (it already has Vite build; just tags)

**Files:**
- Modify: `services/web/project.json`

Currently uses `["type:app", "scope:frontend"]`. Just need `projectType` explicit and the `deploy:aks` tag for consistency.

- [ ] **Step 1: Replace `services/web/project.json` with**

```json
{
  "name": "web",
  "projectType": "application",
  "tags": ["type:app", "scope:frontend", "language:typescript", "deploy:aks"],
  "targets": {
    "serve": {
      "command": "vite",
      "options": {
        "cwd": "services/web"
      }
    },
    "build": {
      "command": "vite build",
      "options": {
        "cwd": "services/web"
      },
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "preview": {
      "command": "vite preview",
      "options": {
        "cwd": "services/web"
      }
    },
    "test": {
      "command": "vitest run",
      "options": {
        "cwd": "services/web"
      }
    },
    "e2e": {
      "command": "playwright test",
      "options": {
        "cwd": "services/web"
      }
    }
  }
}
```

- [ ] **Step 2: Build web to confirm nothing regressed**

Run:
```bash
npx nx build web
```

Expected: vite build completes; `services/web/dist/index.html` exists.

- [ ] **Step 3: Verify all 9 deployable services + 1 Cerbos library are listed correctly**

Run:
```bash
npx nx show projects --type=app
```

Expected output (order may vary): the 9 services (`abdm-adapter-svc`, `billing-svc`, `configurator-svc`, `empi-svc`, `frontdesk-svc`, `registration-svc`, `user-management-svc`, `bff`, `web`). Note: `cerbos-policies` is still `library` type at this point — Task 6 promotes it.

- [ ] **Step 4: Commit**

```bash
git add services/web/project.json
git commit -m "chore(web): normalize projectType + add deploy:aks tag"
```

---

## Task 6: Amend `infra/cerbos/project.json` to be type `application`

**Files:**
- Modify: `infra/cerbos/project.json`

Currently `projectType: library`. Promote to `application` so `nx show projects --affected --type=app` picks up policy changes, triggering a Cerbos image rebuild.

- [ ] **Step 1: Verify nothing else in the repo references `cerbos-policies` by name**

Run:
```bash
grep -rn "cerbos-policies" --include="*.ts" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v .git
```

Expected: only matches in `infra/cerbos/project.json` itself. If other matches exist (e.g., CI workflows, a Makefile target), note them and update consistently.

- [ ] **Step 2: Replace `infra/cerbos/project.json` with**

```json
{
  "name": "cerbos-policies",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": ".",
  "tags": ["type:infra", "scope:cerbos", "deploy:aks"],
  "targets": {
    "compile": {
      "executor": "nx:run-commands",
      "options": {
        "cwd": "{workspaceRoot}",
        "commands": [
          "docker run --rm -v \"./infra/cerbos:/work\" ghcr.io/cerbos/cerbos:latest compile --tests=/work/tests /work/policies --verbose"
        ],
        "parallel": false
      }
    }
  }
}
```

Changes: `projectType` from `library` to `application`; added `deploy:aks` tag.

- [ ] **Step 3: Verify `nx show projects --type=app` now includes `cerbos-policies`**

Run:
```bash
npx nx show projects --type=app | sort
```

Expected: 10 entries — `abdm-adapter-svc`, `bff`, `billing-svc`, `cerbos-policies`, `configurator-svc`, `empi-svc`, `frontdesk-svc`, `registration-svc`, `user-management-svc`, `web`.

- [ ] **Step 4: Verify the `compile` target still works**

Run:
```bash
npx nx run cerbos-policies:compile
```

Expected: docker pulls cerbos image (if not cached), policies compile, tests pass. If it errors with docker-not-running or no docker, that's a local env issue — skip and confirm later.

- [ ] **Step 5: Commit**

```bash
git add infra/cerbos/project.json
git commit -m "chore(cerbos): promote cerbos-policies to projectType=application

Adds 'deploy:aks' tag and makes 'nx show projects --type=app' include
the Cerbos image so policy changes trigger a rebuild in the affected-detection
pipeline."
```

---

## Task 7: Write `.dockerignore` at repo root

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Check if a root `.dockerignore` already exists**

Run:
```bash
ls -la .dockerignore 2>/dev/null && cat .dockerignore || echo "no .dockerignore yet"
```

Expected: "no .dockerignore yet". If one already exists, integrate the contents below — do NOT overwrite blindly.

- [ ] **Step 2: Create `.dockerignore`**

```
# Version control
.git
.github

# Dependencies (will be reinstalled in builder stage)
node_modules
**/node_modules
.pnpm-store

# Build outputs (always rebuilt)
**/dist
**/build
**/.cache
**/coverage

# Nx cache
.nx

# Docs & non-source artifacts
docs
agent-reviews
specs
tests/load

# Local environment files (must be injected via k8s secrets at runtime)
.env
.env.*

# Editor/IDE
.vscode
.idea
*.swp
*.swo
.DS_Store

# Claude / tooling state
.claude
.cursorrules
.agents
related-projects.json
skills-lock.json

# Logs
*.log
npm-debug.log*

# Python (master-data has its own image with smaller context, but defense in depth)
**/__pycache__
**/*.pyc
**/.venv
**/.pytest_cache
```

- [ ] **Step 3: Verify the context size with `.dockerignore` applied**

Run:
```bash
docker build --no-cache --quiet -f - . <<'EOF'
FROM alpine
COPY . /context
RUN du -sh /context
EOF
```

Expected: a `du` output near the bottom showing the context is roughly 50–100MB (down from gigabytes uncompressed). If it shows >500MB, something big slipped through — investigate before proceeding.

- [ ] **Step 4: Commit**

```bash
git add .dockerignore
git commit -m "chore(deploy): add repo-root .dockerignore

Keeps docker build context lean — excludes node_modules, .nx cache,
dist outputs, docs, and editor cruft. Same .dockerignore is used by
every TS-service docker build since they all build from repo root."
```

---

## Task 8: Write `infra/docker/node-svc.Dockerfile` and smoke-test against `billing-svc`

**Files:**
- Create: `infra/docker/node-svc.Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1.7
# Shared multi-stage Dockerfile for all HIMS Node.js services.
#
# Usage:
#   docker build \
#     -f infra/docker/node-svc.Dockerfile \
#     --build-arg SERVICE_NAME=billing-svc \
#     -t hims.azurecr.io/billing-svc:<sha> \
#     .
#
# Build context MUST be the repo root.

ARG NODE_VERSION=24
ARG PNPM_VERSION=10.33.0

# ---------- base: node + pnpm ----------
FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# ---------- builder ----------
FROM base AS builder
ARG SERVICE_NAME

# Copy workspace manifests + lockfile first for maximum layer cache reuse
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json nx.json ./
COPY tsup.config.shared.ts ./

# Copy whole tree of services/modules/packages (their package.json files are
# needed for the pnpm filter graph). The .dockerignore keeps this manageable.
COPY services services
COPY modules modules
COPY packages packages
COPY tools tools

# Install with pnpm filter, mounted store cache for cross-build reuse on the same agent
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@hims/${SERVICE_NAME}..."

# Build via nx (driven by the service's project.json build target -> tsup)
RUN npx nx build "${SERVICE_NAME}"

# pnpm deploy produces an isolated prod-only directory.
# Workspace deps (@hims/*) are already bundled into dist/main.js by tsup,
# so deploy only ships npm deps + the service's package.json + dist.
RUN pnpm --filter "@hims/${SERVICE_NAME}" deploy --prod /out

# ---------- runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG SERVICE_NAME

ENV NODE_ENV=production
ENV NODE_OPTIONS=--enable-source-maps

WORKDIR /app
COPY --from=builder /out .

# Sanity: dist/main.js must exist
RUN test -f dist/main.js || (echo "FATAL: dist/main.js missing for ${SERVICE_NAME}" && exit 1)

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Build the billing-svc image**

Run from the repo root:
```bash
DOCKER_BUILDKIT=1 docker build \
  -f infra/docker/node-svc.Dockerfile \
  --build-arg SERVICE_NAME=billing-svc \
  -t hims-billing-svc:smoke \
  .
```

Expected: build completes with "Successfully tagged hims-billing-svc:smoke". On first run, expect a few minutes (pnpm install + tsup build). Subsequent runs leverage layer cache.

If it fails:
- "Cannot find module @hims/billing" at the `nx build` step → tsup `noExternal` regex is wrong; revisit Task 1.
- "no matching package" at `pnpm install --filter @hims/billing-svc...` → check that `package.json` of billing-svc has `"name": "@hims/billing-svc"`. Confirmed yes; the `@hims/` prefix is in package.json names.
- pnpm deploy errors → may need to inspect what `pnpm --filter @hims/billing-svc deploy --prod /out` produces. Run an interactive session: `docker run -it --entrypoint=/bin/bash hims-billing-svc:smoke` and inspect.

- [ ] **Step 3: Inspect the image size**

Run:
```bash
docker image ls hims-billing-svc:smoke
```

Expected: image size in the 200–400MB range. Significantly more (>800MB) suggests pnpm deploy isn't pruning correctly OR node_modules has dev deps.

- [ ] **Step 4: Smoke test — run the container, expect it to crash on missing env (that's fine)**

Run:
```bash
timeout 10 docker run --rm hims-billing-svc:smoke 2>&1 | head -30 || true
```

Expected: the process starts, gets to "binding port" / "connecting to DB" / etc., and then errors on missing `DATABASE_URL` / `CERBOS_URL`. **This is success** — it means the bundle is loadable and the runtime works. The `timeout 10 … || true` guard ensures the command returns even if the container doesn't exit on its own.

If you see "Cannot find module …" at startup, the bundle is missing something. Most likely a native module pg/drizzle issue — debug with: `docker run --rm --entrypoint=node hims-billing-svc:smoke -e "import('./dist/main.js').catch(e => console.error(e))"`.

- [ ] **Step 5: Commit**

```bash
git add infra/docker/node-svc.Dockerfile
git commit -m "feat(deploy): add shared TS service Dockerfile template

Multi-stage build (base/builder/runtime). Parameterized by SERVICE_NAME
build arg. Used by all 7 *-svc backends + bff. Uses pnpm filter for
isolated install + nx build (-> tsup) for bundling + pnpm deploy for
prod-only runtime image."
```

---

## Task 9: Smoke-test the Dockerfile against the other 7 TS services

**Files:** None modified — this is a verification task.

- [ ] **Step 1: Build every backend service + bff in sequence**

Run:
```bash
for svc in abdm-adapter-svc configurator-svc empi-svc frontdesk-svc registration-svc user-management-svc bff; do
  echo "=== building $svc ==="
  DOCKER_BUILDKIT=1 docker build \
    -f infra/docker/node-svc.Dockerfile \
    --build-arg SERVICE_NAME=$svc \
    -t hims-$svc:smoke \
    . || { echo "FAIL: $svc"; exit 1; }
done
echo "=== all 7 succeeded ==="
```

Expected: 7 builds in sequence, each completing successfully (later ones faster due to layer cache reuse across services).

If a build fails: investigate, fix, retry. Common issues:
- A service has unbuildable code (a TS error tsup can't catch but a missing import will). Run `npx nx build <svc>` locally first to see the actual error.
- A service has a different entry path (not `src/main.ts`). All current services use `src/main.ts` — confirmed in Task 3.

- [ ] **Step 2: Verify each image starts and reaches "expected to fail on missing env"**

Run:
```bash
for svc in abdm-adapter-svc billing-svc configurator-svc empi-svc frontdesk-svc registration-svc user-management-svc bff; do
  echo "=== $svc ==="
  timeout 10 docker run --rm hims-$svc:smoke 2>&1 | head -5 || true
  echo "---"
done
```

Expected: each service either logs a "missing env" / "DB connection refused" / similar error AND exits non-zero. None should fail with "module not found".

- [ ] **Step 3: No commit — this was verification only**

If everything passes, move to Task 10. If any service failed, fix per Task 8 troubleshooting notes and retry Step 1.

---

## Task 10: Move `modules/master-data/Dockerfile` → `infra/docker/master-data.Dockerfile`

**Files:**
- Move (git mv): `modules/master-data/Dockerfile` → `infra/docker/master-data.Dockerfile`
- Modify (during move): file content if context changes

The current Dockerfile lives next to the source and uses build context `modules/master-data/`. Moving it to `infra/docker/` requires path adjustments because the build context will still be `modules/master-data/` — but the Dockerfile reference becomes `-f infra/docker/master-data.Dockerfile`.

- [ ] **Step 1: Re-read the current Dockerfile to confirm its build context assumptions**

Run:
```bash
cat modules/master-data/Dockerfile
```

Expected (from prior inspection):
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
EXPOSE 8010
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
```

All `COPY` paths are relative to context root. As long as the build is run with context `modules/master-data/`, the Dockerfile content can stay identical.

- [ ] **Step 2: Move the file with `git mv`**

Run:
```bash
git mv modules/master-data/Dockerfile infra/docker/master-data.Dockerfile
```

- [ ] **Step 3: Verify the moved file still builds with the correct context**

Run:
```bash
docker build \
  -f infra/docker/master-data.Dockerfile \
  -t hims-master-data:smoke \
  modules/master-data
```

Note: context is `modules/master-data` (last arg), NOT `.` like the TS services.

Expected: build completes; image tagged. If it fails because pyproject.toml is "not found in context", the path assumption is wrong — confirm with `ls modules/master-data/pyproject.toml`.

- [ ] **Step 4: Smoke-test the image**

Run:
```bash
docker run --rm hims-master-data:smoke 2>&1 | head -10
```

Expected: uvicorn starts (or errors on missing DB env), but the import step succeeds.

- [ ] **Step 5: Commit**

```bash
git add infra/docker/master-data.Dockerfile modules/master-data/Dockerfile
git commit -m "chore(deploy): move master-data Dockerfile to infra/docker/

Consolidates all Dockerfiles under infra/docker/. Build context for this
image remains modules/master-data/ (NOT repo root — different from TS svcs).
Called out explicitly in the upcoming devops-handoff.md."
```

---

## Task 11: Write `infra/docker/web.Dockerfile` + `web-nginx.conf`

**Files:**
- Create: `infra/docker/web.Dockerfile`
- Create: `infra/docker/web-nginx.conf`

- [ ] **Step 1: Create the Nginx config for SPA fallback**

Create `infra/docker/web-nginx.conf`:

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Cache hashed assets aggressively
    location /assets/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback — every other route serves index.html so TanStack Router can resolve client-side
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health probe for k8s
    location = /healthz {
        access_log off;
        add_header Content-Type text/plain;
        return 200 "ok\n";
    }
}
```

- [ ] **Step 2: Create the Dockerfile**

Create `infra/docker/web.Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24
ARG PNPM_VERSION=10.33.0

FROM node:${NODE_VERSION}-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json nx.json ./
COPY services services
COPY modules modules
COPY packages packages
COPY tools tools

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@hims/web..."

RUN npx nx build web

# Sanity: index.html must exist
RUN test -f services/web/dist/index.html || (echo "FATAL: web build did not produce index.html" && exit 1)

# ---------- runtime: nginx ----------
FROM nginx:1.27-alpine AS runtime

# Replace default config with our SPA-aware one
RUN rm -f /etc/nginx/conf.d/default.conf
COPY infra/docker/web-nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /repo/services/web/dist /usr/share/nginx/html

# Run on 8080 (non-root nginx alpine image listens here by default in our config)
EXPOSE 8080

# nginx alpine has its own CMD; we keep it
```

- [ ] **Step 3: Build the image**

Run from repo root:
```bash
DOCKER_BUILDKIT=1 docker build \
  -f infra/docker/web.Dockerfile \
  -t hims-web:smoke \
  .
```

Expected: vite build runs in builder stage, copies dist into nginx stage, tag completes.

- [ ] **Step 4: Smoke-test — serve the image and curl**

Run:
```bash
docker run --rm -d -p 18080:8080 --name hims-web-smoke hims-web:smoke
sleep 2
echo "=== / (expect index.html) ==="
curl -s http://localhost:18080/ | head -10
echo "=== /healthz (expect 'ok') ==="
curl -s http://localhost:18080/healthz
echo "=== /some/random/spa/route (expect index.html via fallback) ==="
curl -s http://localhost:18080/some/random/spa/route | head -5
docker stop hims-web-smoke
```

Expected:
- First curl shows the HTML of the Vite-built `index.html`.
- Second curl shows `ok`.
- Third curl shows the same `index.html` (SPA fallback working).

If the image starts but `/` returns 404, the COPY path is wrong — verify `services/web/dist/index.html` exists in the builder layer.

- [ ] **Step 5: Commit**

```bash
git add infra/docker/web.Dockerfile infra/docker/web-nginx.conf
git commit -m "feat(deploy): add web Dockerfile (Vite -> Nginx)

Multi-stage: build SPA with vite, serve static via nginx:alpine.
Includes SPA fallback (every unknown route serves index.html so TanStack
Router can resolve) and /healthz for k8s readiness probes."
```

---

## Task 12: Write `infra/docker/cerbos.Dockerfile`

**Files:**
- Create: `infra/docker/cerbos.Dockerfile`

- [ ] **Step 1: Identify the Cerbos version to pin**

Check what's currently in dev compose:
```bash
grep "cerbos/cerbos" infra/docker/docker-compose.yml
```

Expected: `image: ghcr.io/cerbos/cerbos:latest`. That's bad for prod — pin a version. As of mid-2026, a known-good Cerbos release is `0.42.0`. Verify it still exists:
```bash
curl -sf https://ghcr.io/v2/cerbos/cerbos/manifests/0.42.0 -H "Accept: application/vnd.docker.distribution.manifest.v2+json" -o /dev/null && echo "tag exists" || echo "tag missing — find a recent stable"
```

Expected: "tag exists". If it errors with auth (ghcr requires anon token negotiation), assume the tag is valid; the actual docker pull during build will reveal any issue.

- [ ] **Step 2: Create the Dockerfile**

Create `infra/docker/cerbos.Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7
# Cerbos PDP image with HIMS policies baked in.
#
# Built whenever infra/cerbos/** changes. In AKS, this image runs as a
# centralized Deployment (replicas=2) in the hims namespace — NOT as a
# per-pod sidecar (see ADR-0004 pending amendment).
#
# Build context: repo root.

FROM ghcr.io/cerbos/cerbos:0.42.0

COPY infra/cerbos/policies /policies
COPY infra/cerbos/cerbos.yaml /config/cerbos.yaml

EXPOSE 3593 3592

CMD ["server", "--config=/config/cerbos.yaml"]
```

- [ ] **Step 3: Build the image**

Run from repo root:
```bash
DOCKER_BUILDKIT=1 docker build \
  -f infra/docker/cerbos.Dockerfile \
  -t hims-cerbos:smoke \
  .
```

Expected: pulls cerbos base, copies policies + config, tags completes. Should be very fast (<10 seconds after first run).

- [ ] **Step 4: Smoke-test — Cerbos should start and load the policies**

Run:
```bash
docker run --rm -d -p 13593:3593 -p 13592:3592 --name hims-cerbos-smoke hims-cerbos:smoke
sleep 3
echo "=== /_cerbos/health ==="
curl -s http://localhost:13592/_cerbos/health
echo ""
echo "=== /_cerbos/policies (expect non-empty list) ==="
curl -s http://localhost:13592/_cerbos/policies | head -50
docker stop hims-cerbos-smoke
```

Expected:
- Health endpoint returns 200 with JSON like `{"status":"SERVING"}`.
- Policies endpoint returns a list of policies loaded from `/policies`.

If health is 200 but policies is empty, the COPY path is wrong — verify `infra/cerbos/policies/` is non-empty in your checkout.

- [ ] **Step 5: Commit**

```bash
git add infra/docker/cerbos.Dockerfile
git commit -m "feat(deploy): add Cerbos image with baked-in HIMS policies

Phase 1 AKS topology: centralized Cerbos Deployment (2 replicas) in the
hims namespace, NOT per-pod sidecar. Pinned Cerbos version (0.42.0) instead
of :latest. Rebuilt whenever infra/cerbos/** changes via Nx affected."
```

---

## Task 13: Write `tools/dockerfile-for-svc.sh`

**Files:**
- Create: `tools/dockerfile-for-svc.sh`

Tiny helper for the Jenkinsfile loop: given a service name, prints which Dockerfile to use and (for master-data) the build context.

- [ ] **Step 1: Create the script**

Create `tools/dockerfile-for-svc.sh`:

```bash
#!/usr/bin/env bash
# Map a service name (as it appears in nx show projects) to the Dockerfile path
# and build context used to build its image.
#
# Output (two whitespace-separated tokens): <dockerfile-path> <build-context>
#
# Usage:
#   read -r DOCKERFILE CONTEXT < <(./tools/dockerfile-for-svc.sh billing-svc)
#   docker build -f "$DOCKERFILE" --build-arg SERVICE_NAME=billing-svc \
#     -t "hims.azurecr.io/billing-svc:$SHA" "$CONTEXT"
#
# Exits non-zero with a message on stderr for unknown services.

set -euo pipefail

svc="${1:?usage: $0 <service-name>}"

case "$svc" in
  # TS backend services + bff — all use the shared template, context = repo root
  abdm-adapter-svc|billing-svc|configurator-svc|empi-svc|frontdesk-svc|registration-svc|user-management-svc|bff)
    echo "infra/docker/node-svc.Dockerfile ."
    ;;
  web)
    echo "infra/docker/web.Dockerfile ."
    ;;
  cerbos-policies)
    echo "infra/docker/cerbos.Dockerfile ."
    ;;
  master-data|master-data-svc)
    # Python service — context is its own directory, NOT repo root
    echo "infra/docker/master-data.Dockerfile modules/master-data"
    ;;
  *)
    echo "ERROR: no Dockerfile mapping for service '$svc'" >&2
    echo "       update tools/dockerfile-for-svc.sh when adding new deployable services" >&2
    exit 1
    ;;
esac
```

- [ ] **Step 2: Make it executable**

Run:
```bash
chmod +x tools/dockerfile-for-svc.sh
```

- [ ] **Step 3: Smoke-test the script**

Run:
```bash
echo "billing-svc -> $(./tools/dockerfile-for-svc.sh billing-svc)"
echo "web -> $(./tools/dockerfile-for-svc.sh web)"
echo "master-data -> $(./tools/dockerfile-for-svc.sh master-data)"
echo "cerbos-policies -> $(./tools/dockerfile-for-svc.sh cerbos-policies)"
echo "bff -> $(./tools/dockerfile-for-svc.sh bff)"
./tools/dockerfile-for-svc.sh nonsense-svc 2>&1 || echo "(correctly errored)"
```

Expected:
```
billing-svc -> infra/docker/node-svc.Dockerfile .
web -> infra/docker/web.Dockerfile .
master-data -> infra/docker/master-data.Dockerfile modules/master-data
cerbos-policies -> infra/docker/cerbos.Dockerfile .
bff -> infra/docker/node-svc.Dockerfile .
ERROR: no Dockerfile mapping for service 'nonsense-svc'
       update tools/dockerfile-for-svc.sh when adding new deployable services
(correctly errored)
```

- [ ] **Step 4: Commit**

```bash
git add tools/dockerfile-for-svc.sh
git commit -m "feat(deploy): add dockerfile-for-svc.sh helper

Maps service name -> Dockerfile path + build context. Used by Jenkinsfile
loop. Handles the master-data special case (different build context from
repo-root TS services)."
```

---

## Task 14: Write `infra/devops-handoff.md` — the primary deliverable

**Files:**
- Create: `infra/devops-handoff.md`

This is the largest single artifact. Tutorial-style; assumes the reader is new to Nx and monorepos. Sections written long-form, with concrete copy-paste-ready examples.

- [ ] **Step 1: Create the file with the following content**

Create `infra/devops-handoff.md`:

````markdown
# HIMS Monorepo — DevOps Handoff Guide

**Audience:** DevOps engineers wiring up Jenkins → ACR → AKS for the HIMS platform.
**Assumes:** Familiarity with Jenkins, Docker, ACR, AKS, `kubectl`. **No prior Nx or monorepo experience required.**
**Last updated:** 2026-05-20.

## 1. What this repo is, in 60 seconds

The HIMS platform is a **single git repo (a "monorepo")** that contains:

- **~9 deployable services** under `services/` (TypeScript Fastify apps, a React SPA, a Python FastAPI service).
- **Shared business-logic libraries** under `modules/` and `packages/` that those services import. These are NOT deployed standalone — they're bundled into the services that use them.
- **Infrastructure config** under `infra/` (Cerbos policies, Dockerfiles, local dev compose).

When developers change code, they might touch a service directly, OR they might touch a shared library that several services use. The deployment pipeline needs to figure out which **deployable services** are actually affected and only rebuild those.

That's what **Nx** does for us — see §3.

## 2. The deployable services

| Service | Image to build | Dockerfile | Build context | What it is |
|---|---|---|---|---|
| `abdm-adapter-svc` | `hims.azurecr.io/abdm-adapter-svc:<sha>` | `infra/docker/node-svc.Dockerfile` (with `SERVICE_NAME=abdm-adapter-svc`) | repo root (`.`) | TS Fastify; ABDM gateway adapter |
| `billing-svc` | `hims.azurecr.io/billing-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `configurator-svc` | `hims.azurecr.io/configurator-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `empi-svc` | `hims.azurecr.io/empi-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `frontdesk-svc` | `hims.azurecr.io/frontdesk-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `registration-svc` | `hims.azurecr.io/registration-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `user-management-svc` | `hims.azurecr.io/user-management-svc:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify |
| `bff` | `hims.azurecr.io/bff:<sha>` | `infra/docker/node-svc.Dockerfile` | `.` | TS Fastify; browser-facing proxy |
| `web` | `hims.azurecr.io/web:<sha>` | `infra/docker/web.Dockerfile` | `.` | React SPA served by Nginx |
| `master-data` *(also called `master-data-svc`)* | `hims.azurecr.io/master-data:<sha>` | `infra/docker/master-data.Dockerfile` | **`modules/master-data`** | Python FastAPI |
| `cerbos-policies` *(image: just `cerbos`)* | `hims.azurecr.io/cerbos:<sha>` | `infra/docker/cerbos.Dockerfile` | `.` | Cerbos PDP with HIMS policies baked in |

**Important:** the **build context** (the last arg to `docker build`) is **`.` for everything except `master-data`**, which uses its own directory. The helper script `tools/dockerfile-for-svc.sh` returns the correct (dockerfile, context) pair for each service — use it instead of hardcoding the mapping.

## 3. Nx in 5 minutes

Nx is a build tool for monorepos. The only things you need to know:

1. **Project graph.** Nx reads every `project.json` and every `package.json` and figures out which library each service depends on. If `services/billing-svc/package.json` declares a dep on `@hims/billing`, Nx records "billing-svc depends on billing."
2. **Affected.** Given a git SHA range (`--base=X --head=Y`), Nx walks the project graph and produces the minimal list of projects whose source code OR dependencies changed.
3. **Tags & types.** Each project has a `projectType` (`application` for deployables, `library` for shared code) and free-form `tags`. We tag every deployable with `deploy:aks`.

The one command you'll use:

```bash
npx nx show projects --affected --base=<sha> --head=HEAD --type=app --json
```

Output: a JSON array of deployable service names that need rebuilding. For example:
```json
["billing-svc", "user-management-svc"]
```

That's it. Everything else in this guide builds on that command.

## 4. The pipeline contract

Your Jenkinsfile is responsible for:

1. Checking out the repo (`fetch-depth: 0` so Nx can see history).
2. Setting up Node 24 + pnpm 10.
3. Running `pnpm install --frozen-lockfile`.
4. Determining the **base SHA** for affected detection (§5).
5. Running `nx show projects --affected --type=app` to get the list.
6. For each affected service: building the image, tagging it `<service>:<short-sha>` and `<service>:<branch>-latest`, pushing to ACR.
7. On success (dev/master only — NOT PR builds), moving the `last-deployed-<branch>` git tag forward.
8. Triggering the AKS rollout (out of scope for this doc — your `kubectl set image` or ArgoCD flow).

The repo guarantees: if you run these commands as documented, working images come out. What happens after `docker push` is yours.

## 5. The base-SHA strategy

For affected detection to work, Nx needs to know **"what's the last commit we already successfully deployed?"** We use a **moving git tag** for this:

| Build context | What `BASE` should be |
|---|---|
| PR build (against `dev`) | `origin/dev` — by definition the PR's merge target |
| `dev` branch post-merge | `last-deployed-dev` — moving tag we push on every successful pipeline |
| `master` branch post-merge | `last-deployed-master` — same pattern |
| **First-ever run** (tag missing) | Fall back to `HEAD~1` (rebuilds whatever changed in the last commit) OR `--all` (rebuilds everything) |
| **Force-rebuild-everything** (pipeline param) | Set `BASE=""` and skip the `--affected` flag; loop over ALL `--type=app` projects |

Why a git tag instead of querying the Jenkins API for the last successful build's SHA? Because the git tag is auditable from any clone of the repo, portable across CI systems if you ever switch, and doesn't depend on Jenkins's internal state.

## 6. A working Jenkinsfile skeleton

This is a stage-by-stage shell pipeline. Translate to declarative syntax / Kubernetes agents per your team's conventions.

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
        sh '''
          corepack enable
          corepack prepare pnpm@${PNPM_VERSION} --activate
          pnpm install --frozen-lockfile
        '''
      }
    }

    stage('Determine base SHA') {
      steps {
        script {
          // PR builds vs. branch builds
          if (env.CHANGE_ID) {
            // PR build — base against the target branch (typically dev)
            env.BASE = "origin/${env.CHANGE_TARGET}"
          } else {
            // Branch build — use the moving tag, or fall back to HEAD~1
            env.BASE = sh(
              returnStdout: true,
              script: 'git rev-parse last-deployed-${BRANCH} 2>/dev/null || echo "HEAD~1"'
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
        sh 'az acr login --name hims'
      }
    }

    stage('Build & push images') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          SHA=$(git rev-parse --short HEAD)
          echo "$AFFECTED" | jq -r '.[]' | while read -r svc; do
            echo "=== building $svc ==="

            # Helper prints "<dockerfile> <context>" on one line
            mapping=$(./tools/dockerfile-for-svc.sh "$svc")
            DOCKERFILE=$(echo "$mapping" | awk '{print $1}')
            CONTEXT=$(echo "$mapping" | awk '{print $2}')

            # Special case: cerbos-policies project name -> 'cerbos' image name
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
        sh '''
          git tag -f last-deployed-${BRANCH} HEAD
          git push -f origin last-deployed-${BRANCH}
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
        sh '''
          SHA=$(git rev-parse --short HEAD)
          # Your kubectl set image / ArgoCD trigger / helm upgrade pattern here.
          # Loop over $AFFECTED and roll each Deployment.
          echo "$AFFECTED" | jq -r '.[]' | while read -r svc; do
            IMAGE_NAME="$svc"
            if [ "$svc" = "cerbos-policies" ]; then IMAGE_NAME="cerbos"; fi
            kubectl -n hims set image deployment/$IMAGE_NAME $IMAGE_NAME=$REGISTRY/$IMAGE_NAME:$SHA
          done
        '''
      }
    }
  }
}
```

## 7. AKS deployment topology

All services run in a **single namespace** (`hims`). One `Deployment` per service. Plus one shared **Cerbos Deployment** that every backend service talks to over gRPC.

### 7a. Cerbos (centralized; this Phase 1, may move to sidecar later)

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
            requests: { cpu: 50m, memory: 64Mi }
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
            - { name: DATABASE_URL, valueFrom: { secretKeyRef: { name: pg, key: url } } }
            - { name: JWKS_URL,    valueFrom: { configMapKeyRef: { name: hims-config, key: jwks_url } } }
          livenessProbe:
            httpGet: { path: /healthz, port: http }
          readinessProbe:
            httpGet: { path: /healthz, port: http }
          resources:
            requests: { cpu: 50m, memory: 128Mi }
            limits:   { cpu: 500m, memory: 512Mi }
---
apiVersion: v1
kind: Service
metadata: { name: billing-svc, namespace: hims }
spec:
  selector: { app: billing-svc }
  ports: [{ port: 3000, targetPort: http }]
```

The pattern repeats for the other 7 backend services. The Ingress (Application Gateway / NGINX Ingress Controller / whatever you're using) routes external traffic to **bff** (or directly to **web** for static), which proxies to the per-service endpoints internally.

### 7c. Web (static)

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
          readinessProbe: { httpGet: { path: /healthz, port: http } }
---
apiVersion: v1
kind: Service
metadata: { name: web, namespace: hims }
spec:
  selector: { app: web }
  ports: [{ port: 80, targetPort: http }]
```

### 7d. Known compromise — Cerbos HTTP exposed via Ingress

The web frontend currently calls Cerbos directly from the browser for UI permission gating. This means **Cerbos's HTTP port (3592) needs to be reachable from browsers** in production.

For Phase 1, add an Ingress rule:
```yaml
- path: /_cerbos
  pathType: Prefix
  backend:
    service:
      name: cerbos
      port: { number: 3592 }
```

This is a known compromise — frontend authz is UX-only (the backend Cerbos calls are still authoritative), but exposing the PDP HTTP port to the internet is not ideal. The proper fix (proxy via BFF) is tracked as a follow-up; once it lands, this Ingress rule can be removed.

## 8. Troubleshooting

### "nx show projects --affected returns []"

You probably ran it on a checkout without full git history. Ensure your Jenkins agent does `fetch-depth: 0` (or the equivalent). Test with:
```bash
git log --oneline -5  # should show actual history, not just one commit
```

### "nx show projects --affected returns ALL services even for a tiny change"

The `--base=` SHA is wrong or missing. Print it and verify it's a real ancestor of HEAD:
```bash
git log --oneline $BASE..HEAD | head -10
```

If `$BASE` is `HEAD~1` and only one file actually changed, you should see one commit. If `$BASE` is some unrelated commit hundreds back, the affected set will be huge — fix the base.

### "I changed `modules/billing/src/foo.ts` but billing-svc didn't rebuild"

Check the project graph manually:
```bash
npx nx graph --focus=billing-svc --file=graph.html
open graph.html
```

You should see `billing-svc → billing`. If not, `services/billing-svc/package.json` is probably missing the `@hims/billing` dep.

### "Docker build fails with 'cannot find module @hims/xxx'"

The tsup `noExternal` regex doesn't match. Verify `tsup.config.shared.ts` has `noExternal: [/^@hims\//]`. If it does, check that the import in source actually uses `@hims/xxx` (not a relative path or `@hims-broken/xxx`).

### "Image is huge (>1GB)"

Two likely causes:
1. `.dockerignore` is broken — verify `node_modules` and `.nx` are listed.
2. `pnpm deploy --prod` didn't run (or ran with `--dev` accidentally). Inspect: `docker run -it --entrypoint=ls hims-<svc>:smoke -lh node_modules` should show only prod deps.

### "Cerbos image starts but no policies loaded"

Verify `infra/cerbos/policies/` exists and is non-empty in your checkout. Some CI setups have a `.gitignore` that strips it.

### "Force rebuild everything" — how?

Two options:
- Set the `BASE` env var to empty in your pipeline and skip the `--affected` flag: `npx nx show projects --type=app --json`.
- Delete the `last-deployed-<branch>` tag: `git tag -d last-deployed-dev && git push origin :last-deployed-dev`. Next pipeline run will fall back to `HEAD~1` and rebuild only what changed in the last commit (which isn't quite "everything" — use option 1 for true everything).

## 9. Glossary

| Term | Meaning |
|---|---|
| **Monorepo** | A single git repo containing multiple deployable services + shared libraries. |
| **Project (Nx)** | Anything with a `project.json` — could be a deployable service (`projectType: application`) or a shared library (`projectType: library`). |
| **Affected** | The set of projects whose source code OR transitive dependencies changed between two git SHAs. |
| **`*-svc`** | Suffix convention for deployable backend services (e.g., `billing-svc`). |
| **BFF** | "Backend-for-frontend" — a thin proxy between `web` and the backend services. Aggregates calls, handles JWT verification. |
| **Cerbos PDP** | "Policy Decision Point" — the Cerbos service that answers "is this user allowed to do X?" Backend services call it over gRPC; the frontend calls it via HTTP for UI permission gating. |
| **`pnpm deploy`** | Pnpm subcommand that produces an isolated directory with one project's production node_modules — exactly what we want to put in a Docker runtime stage. |
| **tsup** | Bundler we use to compile TypeScript services into a single `dist/main.js` per service. Uses esbuild internally. |
| **`@hims/*`** | All our workspace packages. The tsup config bundles these into each service's `dist/main.js` so we don't have to pre-build modules separately. |

## 10. Open questions / follow-ups

- **ADR-0004 amendment** — the current ADR says Cerbos runs as a sidecar; Phase 1 implementation is centralized. ADR will be amended in a separate PR. No action needed from DevOps; just be aware the docs may shift.
- **Frontend Cerbos exposure (§7d)** — the public Ingress rule for `/_cerbos` is a known compromise. A future change will proxy through BFF; when that lands, the Ingress rule comes down.
- **Image vulnerability scanning** — not in this round. Whenever you wire up Trivy or your scanner of choice, the images named in §2 are the targets.
- **Build-time typechecking** — tsup transpiles but doesn't typecheck. CI (`vitest` + dev server HMR) catches most type errors during development. Re-enabling `nx affected -t typecheck` in CI is a separate hardening step.

## 11. Who to contact

- **Build / Nx issues:** Architecture team (`#hims-architecture`).
- **Cerbos / authz behavior:** Authz team (`#hims-authz`).
- **AKS / cluster issues:** ... (your DevOps escalation path).
````

- [ ] **Step 2: Verify the doc has no broken references**

Run:
```bash
grep -oE 'infra/docker/[a-zA-Z._-]+|tools/[a-zA-Z._/-]+' infra/devops-handoff.md | sort -u | while read p; do
  test -e "$p" && echo "OK: $p" || echo "MISSING: $p"
done
```

Expected: all paths exist (no MISSING lines).

- [ ] **Step 3: Commit**

```bash
git add infra/devops-handoff.md
git commit -m "docs(deploy): add DevOps handoff guide for AKS + Jenkins

Tutorial-style guide assuming no prior Nx or monorepo experience. Covers:
- What the monorepo contains
- Nx in 5 minutes (project graph, affected, tags)
- The deployable service inventory + Dockerfile mapping
- Base-SHA strategy with moving git tag
- Working Jenkinsfile skeleton
- AKS topology with manifests (Cerbos centralized, services, web, Ingress)
- Troubleshooting + glossary + follow-ups

This is the primary deliverable of the dev-deployment-readiness branch."
```

---

## Task 15: End-to-end affected-detection smoke test

**Files:** None modified — this is a verification task.

- [ ] **Step 1: Verify the baseline affected output is empty against HEAD**

Run:
```bash
npx nx show projects --affected --base=HEAD --head=HEAD --type=app --json
```

Expected: `[]` (nothing changed between HEAD and HEAD).

- [ ] **Step 2: Verify a synthetic library-only change triggers consumers**

Run:
```bash
echo "// touched $(date)" >> modules/billing/src/index.ts
npx nx show projects --affected --base=HEAD --head=. --type=app --json
git checkout modules/billing/src/index.ts  # revert the touch
```

Expected output: an array including `"billing-svc"` (since billing-svc depends on `@hims/billing`). It may also include any other consumer.

- [ ] **Step 3: Verify a service-only change triggers only that service**

Run:
```bash
echo "// touched $(date)" >> services/empi-svc/src/main.ts
npx nx show projects --affected --base=HEAD --head=. --type=app --json
git checkout services/empi-svc/src/main.ts
```

Expected: `["empi-svc"]`.

- [ ] **Step 4: Verify an infra/cerbos change triggers cerbos-policies**

Run:
```bash
echo "# touched $(date)" >> infra/cerbos/cerbos.yaml
npx nx show projects --affected --base=HEAD --head=. --type=app --json
git checkout infra/cerbos/cerbos.yaml
```

Expected: an array including `"cerbos-policies"`.

- [ ] **Step 5: Verify a docs-only change triggers nothing**

Run:
```bash
echo "<!-- touched $(date) -->" >> docs/architecture/README.md
npx nx show projects --affected --base=HEAD --head=. --type=app --json
git checkout docs/architecture/README.md
```

Expected: `[]`. If any service appears, an explicit input is too broad somewhere — investigate `nx.json` `namedInputs`.

- [ ] **Step 6: Final integration test — build every affected image end-to-end**

Force-affect everything and verify the loop in the handoff doc works:

```bash
mapfile -t SVCS < <(npx nx show projects --type=app --json | jq -r '.[]')
for svc in "${SVCS[@]}"; do
  echo "=== $svc ==="
  read -r DOCKERFILE CONTEXT < <(./tools/dockerfile-for-svc.sh "$svc")
  IMAGE_NAME="$svc"
  if [ "$svc" = "cerbos-policies" ]; then IMAGE_NAME="cerbos"; fi
  DOCKER_BUILDKIT=1 docker build \
    -f "$DOCKERFILE" \
    --build-arg SERVICE_NAME="$svc" \
    -t "hims-$IMAGE_NAME:e2e" \
    "$CONTEXT" || { echo "FAIL: $svc"; exit 1; }
done
echo "=== all images built ==="
docker image ls | grep "hims-.*:e2e"
```

Expected: 10 images tagged `hims-*:e2e`. Each image size is reasonable (TS services ~200-400MB, web ~50MB, master-data ~100MB, cerbos ~50MB).

- [ ] **Step 7: No commit — verification only.** If everything passes, the branch is ready for PR.

---

## Final wrap-up (after all 15 tasks complete)

- [ ] **Step 1: Run the full test suite to confirm nothing regressed**

Run:
```bash
npx nx affected -t test --parallel=2 --base=origin/dev
```

Expected: green. If any unit test fails, fix before opening PR.

- [ ] **Step 2: Re-check the file tree against the spec's "Repo deliverables" table**

Confirm each of these exists:
```bash
for f in \
  tsup.config.shared.ts \
  .dockerignore \
  infra/docker/node-svc.Dockerfile \
  infra/docker/web.Dockerfile \
  infra/docker/web-nginx.conf \
  infra/docker/master-data.Dockerfile \
  infra/docker/cerbos.Dockerfile \
  tools/dockerfile-for-svc.sh \
  infra/devops-handoff.md; do
  test -e "$f" && echo "OK: $f" || echo "MISSING: $f"
done
```

Expected: 9 "OK" lines.

- [ ] **Step 3: Open the PR**

```bash
git push -u origin dev-deployment-readiness
gh pr create \
  --base dev \
  --title "feat(deploy): AKS + Jenkins readiness — Dockerfiles, Nx build targets, DevOps handoff" \
  --body "$(cat <<'EOF'
## Summary
Makes the monorepo Docker-buildable and Nx-affected-aware so DevOps can wire up Jenkins → ACR → AKS.

- Adds one shared TS Dockerfile template (used by all 7 *-svc backends + bff)
- Adds web (Vite → Nginx), master-data (Python, moved), and Cerbos Dockerfiles
- Adds nx `build` targets via tsup to every TS service
- Normalizes `projectType` + tags across services so `nx show projects --type=app` works cleanly
- Promotes `infra/cerbos/project.json` to `application` so policy changes trigger image rebuild
- Writes `infra/devops-handoff.md` — tutorial-style guide for the DevOps team (new to Nx/monorepos)
- Removes empty `services/embedded-clinic/` directory + associated doc references

## Follow-ups (separate PRs)
- F1: ADR-0004 amendment (centralized Cerbos for Phase 1; sidecar deferred behind measured latency need)
- F2: Web → BFF proxy for Cerbos calls (remove public PDP HTTP exposure)
- F3: K8s manifests / Helm chart in repo
- F4: Image vulnerability scanning in CI
- F5: Pin Cerbos version in `infra/docker/docker-compose.yml`

## Test plan
- [ ] All 10 Docker images build cleanly from a fresh `pnpm install`
- [ ] Each image starts and reaches "missing env" rather than module-not-found
- [ ] `nx show projects --affected --type=app` returns expected sets against synthetic diffs
- [ ] DevOps has reviewed `infra/devops-handoff.md` and can run the example Jenkinsfile flow

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

**Spec coverage check:**
- D1 (thin contract) → Tasks 8-14 ship Dockerfiles + helper + handoff doc; DevOps owns Jenkinsfile/manifests. ✓
- D2 (ACR registry) → Documented in handoff §2, §6, §7. ✓
- D3 (short-SHA tags) → Documented in handoff §6, Jenkinsfile uses `git rev-parse --short HEAD`. ✓
- D4 (moving git tag for base SHA) → Documented in handoff §5, §6 ("Move deployment tag" stage). ✓
- D5 (centralized Cerbos) → Tasks 6, 12, 14 §7a. ✓
- D6 (shared TS template) → Tasks 8-9. ✓
- D7 (build targets via tsup) → Tasks 1-4. ✓
- D8 (Cerbos in Nx graph) → Task 6. ✓
- D9 (delete embedded-clinic) → Already done in prior commit (660f1bf / 2536eb5). ✓
- "Web Cerbos compromise" → Documented in handoff §7d. ✓
- "Python Dockerfile move" → Task 10 + handoff §2 note. ✓
- "Honest projectType" → Tasks 3, 4, 5, 6. ✓

**Placeholder scan:** No "TBD", "TODO", "fill in", "add appropriate error handling". Every step has concrete code or commands. ✓

**Type consistency:** Service names used consistently throughout (`billing-svc`, `bff`, `web`, `master-data`, `cerbos-policies`). Image names use the same except `cerbos-policies → cerbos` (called out in the handoff doc and helper script). ✓
