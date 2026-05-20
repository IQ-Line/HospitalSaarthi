# HIMS local bootstrap — PowerShell equivalent of `make setup` (Windows without make/bash).
# Usage: .\scripts\bootstrap.ps1
#        .\scripts\bootstrap.ps1 -Reset   # docker down -v + full reset

param(
    [switch]$Reset,
    [switch]$MigrateOnly,
    [switch]$SeedOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Invoke-DockerCompose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$ComposeArgs)
    & docker compose -f infra/docker/docker-compose.yml @ComposeArgs
}

function Wait-Postgres {
    Write-Host "==> Waiting for PostgreSQL..."
    $ready = $false
    while (-not $ready) {
        Invoke-DockerCompose exec -T postgres pg_isready -U hims -d hims_dev 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        }
        else {
            Start-Sleep -Seconds 1
        }
    }
    Write-Host "PostgreSQL is ready."
}

if (-not $MigrateOnly -and -not $SeedOnly) {
    if (-not (Test-Path .env)) {
        Copy-Item .env.example .env
        Write-Host "==> Created .env from .env.example"
    }
    foreach ($svc in @("bff", "user-management-svc", "empi-svc", "configurator-svc", "billing-svc", "frontdesk-svc", "registration-svc", "abdm-adapter-svc", "web")) {
        $example = "services/$svc/.env.example"
        $target = "services/$svc/.env"
        if ((Test-Path $example) -and -not (Test-Path $target)) {
            Copy-Item $example $target
            Write-Host "==> Created $target from .env.example"
        }
    }
    if ((Test-Path modules/master-data/.env.example) -and -not (Test-Path modules/master-data/.env)) {
        Copy-Item modules/master-data/.env.example modules/master-data/.env
        Write-Host "==> Created modules/master-data/.env from .env.example"
    }
    if ($Reset) {
        Invoke-DockerCompose down -v
    }
    Write-Host "==> Installing dependencies..."
    pnpm install
    Write-Host "==> Starting infrastructure..."
    Invoke-DockerCompose up -d
    Wait-Postgres
}

if (-not $SeedOnly) {
    Write-Host "==> Running migrations..."
    npx nx run master-data:migrate
    npx nx run configurator:db-migrate
    npx nx run user-management:db-migrate
    npx nx run empi:db-migrate
    npx nx run registration:db-migrate
    npx nx run billing:db-migrate
    npx nx run abdm-adapter-svc:db-migrate
}

if (-not $MigrateOnly) {
    Write-Host "==> Syncing UM capabilities from Master Data..."
    pnpm sync:capabilities
    Write-Host "==> Seeding development data (tenant, capabilities, better-auth users)..."
    pnpm seed:user-management-dev
}

Write-Host "==> Bootstrap complete. Run: pnpm dev:web-stack"
Write-Host "==> Dev sign-in: platform@hospitalsaarthi.dev / admin@hospitalsaarthi.dev (password: password)"
