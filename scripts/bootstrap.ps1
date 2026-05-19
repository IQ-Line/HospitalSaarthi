# HIMS local bootstrap — PowerShell equivalent of `make setup` (Windows without make).
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
    param([string[]]$Args)
    docker compose -f infra/docker/docker-compose.yml @Args
}

function Wait-Postgres {
    Write-Host "==> Waiting for PostgreSQL..."
    do {
        Invoke-DockerCompose exec -T postgres pg_isready -U hims 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
    } while ($true)
    Write-Host "PostgreSQL is ready."
}

function Reset-ModuleDatabases {
    Write-Host "==> Dropping module databases..."
    Get-Content infra/db/drop-module-databases.sql | Invoke-DockerCompose exec -T postgres psql -U hims -d hims_dev
}

function New-ModuleDatabases {
    Write-Host "==> Creating module databases..."
    Get-Content infra/db/create-module-databases.sql | Invoke-DockerCompose exec -T postgres psql -U hims -d hims_dev
}

if (-not $MigrateOnly -and -not $SeedOnly) {
    if (-not (Test-Path .env)) {
        Copy-Item .env.example .env
        Write-Host "==> Created .env from .env.example"
    }
    if ($Reset) {
        Invoke-DockerCompose down -v
    }
    Invoke-DockerCompose up -d
    Wait-Postgres
    if ($Reset) {
        Reset-ModuleDatabases
    }
    New-ModuleDatabases
}

if (-not $SeedOnly) {
    Write-Host "==> Running migrations..."
    npx nx run configurator:db-migrate
    npx nx run user-management:db-migrate
    npx nx run empi:db-migrate
    npx nx run registration:db-migrate
    npx nx run billing:db-migrate
    npx nx run master-data:migrate
}

if (-not $MigrateOnly) {
    Write-Host "==> Seeding development data..."
    pnpm seed
}

Write-Host "==> Bootstrap complete. Run: pnpm dev:web-stack"
