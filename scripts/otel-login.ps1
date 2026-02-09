param(
  [string]$Email,
  [string]$Password,
  [switch]$Signup,
  [switch]$ExportToken
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

function Read-Secret([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$supabaseUrl = Require-Env 'SUPABASE_URL'
$supabaseAnonKey = Require-Env 'SUPABASE_ANON_KEY'

if ([string]::IsNullOrWhiteSpace($Email)) {
  $Email = Read-Host -Prompt 'Supabase email'
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = Read-Secret -Prompt 'Supabase password'
}

$commonHeaders = @{
  'apikey' = $supabaseAnonKey
  'Content-Type' = 'application/json'
}

if ($Signup) {
  $signupBody = @{ email = $Email; password = $Password } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "$supabaseUrl/auth/v1/signup" -Headers $commonHeaders -Body $signupBody | Out-Null
    Write-Host '[otel-login] Signup attempted. If account exists, continuing to login.' -ForegroundColor Yellow
  } catch {
    Write-Warning "[otel-login] Signup warning: $($_.Exception.Message)"
  }
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Headers $commonHeaders -Body $loginBody
} catch {
  throw "Login failed. Check SUPABASE_URL/SUPABASE_ANON_KEY and credentials. $($_.Exception.Message)"
}

$token = $response.access_token
if ([string]::IsNullOrWhiteSpace($token)) {
  throw 'Login response missing access_token.'
}

Write-Host 'Authorization header:' -ForegroundColor Cyan
Write-Output "Authorization: Bearer $token"

if ($ExportToken) {
  $env:KELEDON_OBS_TOKEN = $token
  Write-Host 'Exported KELEDON_OBS_TOKEN for current PowerShell session.' -ForegroundColor Green
}

Write-Host "Use token against RBAC proxy: http://localhost:3014" -ForegroundColor Green
