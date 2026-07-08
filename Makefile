.DEFAULT_GOAL := help

# --- Variables ---------------------------------------------------------------
DOCKER_COMPOSE := docker compose -f infra/docker/docker-compose.yml
NX := npx nx

# Services that ship a .env.example to seed a personal .env (kept in sync with
# the actual services/ tree; see docs/dev/port-allocation.md for ports).
SERVICE_ENVS := bff user-management-svc empi-svc configurator-svc billing-svc registration-svc pharmacy-svc inventory-svc integration-hub-svc record-foundation-svc web

# --- Setup -------------------------------------------------------------------

.PHONY: setup
setup: ## Full bootstrap: env, deps, infra, migrate, seed
	@echo "==> Checking prerequisites..."
	@command -v node >/dev/null 2>&1 || { echo "node is required"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }
	@$(MAKE) env-init
	@echo "==> Installing dependencies..."
	@pnpm install
	@echo "==> Starting infrastructure..."
	@$(MAKE) infra
	@echo "==> Waiting for services to be healthy..."
	@$(MAKE) _wait-healthy
	@echo "==> Running migrations..."
	@$(MAKE) db-migrate
	@echo "==> Seeding development authorization data..."
	@$(MAKE) seed
	@echo "==> Setup complete. Run 'pnpm dev:web-stack' to start the demo stack."

.PHONY: env-init
env-init: ## Copy every .env.example to .env (skips files that already exist)
	@if [ ! -f .env ]; then \
		cp .env.example .env && echo "==> Created .env from .env.example"; \
	else \
		echo "==> .env exists; not overwriting"; \
	fi
	@for svc in $(SERVICE_ENVS); do \
		if [ -f services/$$svc/.env.example ] && [ ! -f services/$$svc/.env ]; then \
			cp services/$$svc/.env.example services/$$svc/.env && \
			echo "==> Created services/$$svc/.env from .env.example"; \
		fi; \
	done
	@if [ -f modules/master-data/.env.example ] && [ ! -f modules/master-data/.env ]; then \
		cp modules/master-data/.env.example modules/master-data/.env && \
		echo "==> Created modules/master-data/.env from .env.example"; \
	fi
	@echo "==> Env init complete. Personal overrides go in any .env.local (gitignored)."

# --- Development -------------------------------------------------------------

.PHONY: dev
dev: ## Start all services via Nx
	$(NX) run-many -t serve --parallel=14

.PHONY: dev-pharmacy
dev-pharmacy: ## Start web + BFF + OPD + pharmacy counter stack
	pnpm dev:pharmacy-stack

.PHONY: dev-module
dev-module: ## Start a single module service (usage: make dev-module m=empi-svc)
	$(NX) run $(m):serve

.PHONY: dev-web
dev-web: ## Start only the frontend dev server
	$(NX) run web:serve

# --- Infrastructure ----------------------------------------------------------

.PHONY: infra
infra: ## Start docker infrastructure (PostgreSQL+Citus, PgBouncer, Cerbos)
	$(DOCKER_COMPOSE) up -d

.PHONY: infra-down
infra-down: ## Stop docker infrastructure
	$(DOCKER_COMPOSE) down

.PHONY: infra-logs
infra-logs: ## Tail docker infrastructure logs
	$(DOCKER_COMPOSE) logs -f

# --- Database ----------------------------------------------------------------

.PHONY: db-migrate
db-migrate: ## Run all pending migrations
	# Each module's migrations are self-contained: every module owns its own schema,
	# there are no cross-schema FKs, and no migration depends on another module's
	# schema at migrate time. Order is therefore independent — listed here roughly by
	# foundation-first for readability, one invocation per module (no double-runs).
	$(NX) run master-data:db-migrate
	$(NX) run configurator:db-migrate
	$(NX) run user-management:db-migrate
	$(NX) run empi:db-migrate
	$(NX) run registration:db-migrate
	$(NX) run record-foundation:db-migrate
	$(NX) run opd:db-migrate
	$(NX) run billing:db-migrate
	$(NX) run pharmacy:db-migrate
	$(NX) run inventory:db-migrate
	$(NX) run integration-hub:db-migrate

.PHONY: seed
seed: ## Seed Configurator tenant, UM runtime data, Cerbos smoke check (catalog = Alembic)
	pnpm seed

.PHONY: seed-abdm-profile
seed-abdm-profile: ## Seed configurator.tenant_integration_profiles from integration-hub-svc .env
	pnpm seed-abdm-profile

.PHONY: copy-abdm-schema
copy-abdm-schema: ## Copy abdm_adapter tables → integration_hub (idempotent); use ARGS="-- --drop" to drop legacy schema
	pnpm copy-abdm-schema $(ARGS)

.PHONY: db-reset
db-reset: ## Drop volumes, recreate infra, migrate, seed
	$(DOCKER_COMPOSE) down -v
	$(MAKE) infra
	$(MAKE) _wait-healthy
	$(MAKE) db-migrate
	$(MAKE) seed
	@echo "==> Database reset complete."

.PHONY: db-studio
db-studio: ## Open Drizzle Studio
	$(NX) run-many -t db:studio

# --- Local-runnable proof ----------------------------------------------------

.PHONY: verify-local
verify-local: ## Full local-runnable proof: infra+migrate+seed+cerbos+boot smoke
	@echo "==> [1/5] Infra up + healthy..."
	@$(MAKE) infra
	@$(MAKE) _wait-healthy
	@echo "==> [2/5] Migrations (all modules)..."
	@$(MAKE) db-migrate
	@echo "==> [3/5] Seed..."
	@$(MAKE) seed
	@echo "==> [4/5] Cerbos policy compile + test suite..."
	@docker exec hims-cerbos /cerbos compile /policies
	@docker cp infra/cerbos/tests hims-cerbos:/tmp/vl-tests >/dev/null
	@docker exec hims-cerbos /cerbos compile --tests=/tmp/vl-tests /policies
	@echo "==> [5/5] Backend boot smoke..."
	@bash scripts/verify-local-smoke.sh
	@echo ""
	@echo "=================================================================="
	@echo " verify-local: PASS — repo is fully locally runnable end-to-end"
	@echo "=================================================================="

# --- Testing -----------------------------------------------------------------

.PHONY: test
test: ## Run affected tests
	$(NX) affected -t test

.PHONY: test-all
test-all: ## Run all tests
	$(NX) run-many -t test

.PHONY: test-integration
test-integration: ## Run affected integration tests
	$(NX) affected -t test:integration

# --- CI ----------------------------------------------------------------------

.PHONY: ci-local
ci-local: ## Run the full PR pipeline locally (same checks as CI)
	pnpm run ci:pr

.PHONY: lint
lint: ## Lint affected projects
	$(NX) affected -t lint

# --- Load Testing ------------------------------------------------------------

.PHONY: load-test
load-test: ## Run a specific load test (usage: make load-test s=empi/search-patient.k6.js)
	$(NX) run load-tests:run -- --scenario=$(s)

# --- Utilities ---------------------------------------------------------------

.PHONY: graph
graph: ## Open Nx project graph
	$(NX) graph

.PHONY: clean
clean: ## Remove node_modules, dist, and Nx cache
	rm -rf node_modules dist .nx

.PHONY: _wait-healthy
_wait-healthy:
	@echo "Waiting for PostgreSQL..."
	@until $(DOCKER_COMPOSE) exec -T postgres pg_isready -U hims >/dev/null 2>&1; do sleep 1; done
	@echo "PostgreSQL is ready."

# --- Help --------------------------------------------------------------------

.PHONY: help
help: ## Show all available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
