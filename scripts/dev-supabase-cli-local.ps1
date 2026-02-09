Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw '[dev-supabase-cli-local] npx not found'
}

try {
  npx supabase --version | Out-Null
} catch {
  throw '[dev-supabase-cli-local] Supabase CLI unavailable via npx'
}

try {
  npx supabase start | Out-Host
} catch {
  throw '[dev-supabase-cli-local] supabase start failed'
}

$status = npx supabase status -o env
$map = @{}
foreach ($line in $status) {
  $idx = $line.IndexOf('=')
  if ($idx -gt 0) {
    $key = $line.Substring(0, $idx)
    $value = $line.Substring($idx + 1)
    $map[$key] = $value
  }
}

$supabaseUrl = $map['API_URL']
$anonKey = $map['ANON_KEY']
$serviceRoleKey = $map['SERVICE_ROLE_KEY']

if ($supabaseUrl.StartsWith('"') -and $supabaseUrl.EndsWith('"')) {
  $supabaseUrl = $supabaseUrl.Trim('"')
}
if ($anonKey.StartsWith('"') -and $anonKey.EndsWith('"')) {
  $anonKey = $anonKey.Trim('"')
}
if ($serviceRoleKey.StartsWith('"') -and $serviceRoleKey.EndsWith('"')) {
  $serviceRoleKey = $serviceRoleKey.Trim('"')
}

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($anonKey) -or [string]::IsNullOrWhiteSpace($serviceRoleKey)) {
  throw '[dev-supabase-cli-local] Failed to read API_URL/ANON_KEY/SERVICE_ROLE_KEY from supabase status -o env'
}

Write-Output "[dev-supabase-cli-local] SUPABASE_URL=$supabaseUrl"
Write-Output "[dev-supabase-cli-local] SUPABASE_ANON_KEY=$anonKey"
Write-Output "[dev-supabase-cli-local] SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
