param(
  [string]$Email,
  [string]$UserId,
  [string]$Role = 'ROLE_SUPERADMIN_OBSERVER'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-EnvOrDotEnv([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    return $value
  }

  $dotEnvPaths = @(
    (Join-Path $PSScriptRoot '..\observability\.env.local.supabase'),
    (Join-Path $PSScriptRoot '..\cloud\.env')
  )

  foreach ($dotEnvPath in $dotEnvPaths) {
    if (Test-Path $dotEnvPath) {
      $line = Get-Content $dotEnvPath | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
      if ($line) {
        return ($line -split '=', 2)[1].Trim()
      }
    }
  }

  return $null
}

function Require-Env([string]$Name) {
  $value = Get-EnvOrDotEnv $Name
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

$supabaseUrl = Require-Env 'SUPABASE_URL'
$serviceKey = Get-EnvOrDotEnv 'SUPABASE_SERVICE_ROLE_KEY'
if ([string]::IsNullOrWhiteSpace($serviceKey)) {
  $serviceKey = Get-EnvOrDotEnv 'SUPABASE_SERVICE_KEY'
}
if ([string]::IsNullOrWhiteSpace($serviceKey)) {
  throw 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY'
}

if ([string]::IsNullOrWhiteSpace($Email) -and [string]::IsNullOrWhiteSpace($UserId)) {
  throw 'Provide -Email or -UserId.'
}

$headers = @{
  'apikey' = $serviceKey
  'Authorization' = "Bearer $serviceKey"
  'Content-Type' = 'application/json'
}

$usersResponse = Invoke-RestMethod -Method Get -Uri "$supabaseUrl/auth/v1/admin/users?page=1&per_page=200" -Headers $headers
$users = @($usersResponse.users)

$target = $null
if (-not [string]::IsNullOrWhiteSpace($UserId)) {
  $target = $users | Where-Object { $_.id -eq $UserId } | Select-Object -First 1
}
if (-not $target -and -not [string]::IsNullOrWhiteSpace($Email)) {
  $target = $users | Where-Object { $_.email -ieq $Email } | Select-Object -First 1
}
if (-not $target) {
  throw 'User not found. Create user first or verify Email/UserId.'
}

$existingRoles = @()
if ($target.app_metadata -and $target.app_metadata.roles) {
  $existingRoles = @($target.app_metadata.roles)
}
if ($target.app_metadata -and $target.app_metadata.role) {
  $existingRoles += @($target.app_metadata.role)
}

$newRoles = @($existingRoles + $Role | Select-Object -Unique)
$appMetadata = @{
  roles = $newRoles
  role = $Role
}
$updateBody = @{ app_metadata = $appMetadata } | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Put -Uri "$supabaseUrl/auth/v1/admin/users/$($target.id)" -Headers $headers -Body $updateBody | Out-Null

Write-Host '[otel-assign-observer-role] Role assignment successful.' -ForegroundColor Green
Write-Output "user_id=$($target.id)"
Write-Output "email=$($target.email)"
Write-Output "roles=$($newRoles -join ',')"
