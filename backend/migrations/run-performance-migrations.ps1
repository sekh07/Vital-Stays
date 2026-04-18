param(
    [string]$DbUser = "root",
    [string]$DbName = "hotel_management_db",
    [string]$MysqlExecutable = "mysql"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$migrations = @(
    "2026-04-18-add-booking-overlap-index.sql",
    "2026-04-18-add-payment-and-booking-history-indexes.sql",
    "2026-04-18-verify-performance-indexes.sql"
)

foreach ($migration in $migrations) {
    $migrationPath = Join-Path $scriptDir $migration

    if (!(Test-Path $migrationPath)) {
        Write-Error "Migration file not found: $migrationPath"
        exit 1
    }

    Write-Host "Running migration: $migration" -ForegroundColor Cyan

    $command = "$MysqlExecutable -u $DbUser -p $DbName < `"$migrationPath`""
    cmd /c $command

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Migration failed: $migration"
        exit $LASTEXITCODE
    }

    Write-Host "Migration completed: $migration" -ForegroundColor Green
}

Write-Host "All performance migrations completed successfully." -ForegroundColor Green
