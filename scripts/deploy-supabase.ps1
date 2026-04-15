param(
  [string]$ProjectRef,
  [string]$DbPassword,
  [switch]$SkipMigrations,
  [switch]$SkipSecrets,
  [switch]$SkipFunctions
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$supabaseDir = Join-Path $repoRoot "supabase"
$smsKeys = @("SMS_API_KEY", "SMS_SENDER_ID", "SMS_TEMPLATE_ID", "SMS_BASE_URL")

function Read-EnvMap {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing .env file at $Path"
  }

  $map = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    $trimmed = $line.Trim()
    if ($trimmed.StartsWith("#")) {
      continue
    }

    $separator = $line.IndexOf("=")
    if ($separator -lt 1) {
      continue
    }

    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()
    $map[$name] = $value
  }

  return $map
}

function Get-ProjectRefFromUrl {
  param([string]$Url)

  if ($Url -match "^https://([^.]+)\.supabase\.co/?$") {
    return $Matches[1]
  }

  throw "Could not extract a Supabase project ref from VITE_SUPABASE_URL=$Url"
}

$envMap = Read-EnvMap -Path $envPath

if (-not $ProjectRef) {
  if (-not $envMap.ContainsKey("VITE_SUPABASE_URL")) {
    throw "VITE_SUPABASE_URL is missing from .env"
  }

  $ProjectRef = Get-ProjectRefFromUrl -Url $envMap["VITE_SUPABASE_URL"]
}

$missingSmsVars = @(
  $smsKeys | Where-Object {
    (-not $envMap.ContainsKey($_)) -or [string]::IsNullOrWhiteSpace($envMap[$_])
  }
)

if ($missingSmsVars.Count -gt 0) {
  throw "Missing SMS values in .env: $($missingSmsVars -join ', ')"
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw "SUPABASE_ACCESS_TOKEN is not set. Run `"supabase login`" first or set the token in your shell."
}

if (-not $SkipMigrations -and -not $DbPassword) {
  $DbPassword = $env:SUPABASE_DB_PASSWORD
}

if (-not $SkipMigrations -and -not $DbPassword) {
  $securePassword = Read-Host "Enter the remote database password for project $ProjectRef" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try {
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

if (-not $SkipMigrations -and [string]::IsNullOrWhiteSpace($DbPassword)) {
  throw "Remote database password is required for supabase link/db push."
}

$tempSecretsPath = Join-Path $env:TEMP ("supabase-secrets-{0}.env" -f [guid]::NewGuid().ToString("N"))

try {
  $secretLines = foreach ($key in $smsKeys) {
    "{0}={1}" -f $key, $envMap[$key]
  }
  Set-Content -LiteralPath $tempSecretsPath -Value $secretLines -Encoding Ascii

  if (-not $SkipMigrations) {
    Write-Host "Linking local Supabase folder to project $ProjectRef..."
    & npx.cmd supabase link --project-ref $ProjectRef --password $DbPassword --workdir $supabaseDir
    if ($LASTEXITCODE -ne 0) {
      throw "supabase link failed."
    }

    Write-Host "Pushing migrations to project $ProjectRef..."
    & npx.cmd supabase db push --linked --yes --workdir $supabaseDir
    if ($LASTEXITCODE -ne 0) {
      throw "supabase db push failed."
    }
  }

  if (-not $SkipSecrets) {
    Write-Host "Syncing SMS secrets to project $ProjectRef..."
    & npx.cmd supabase secrets set --project-ref $ProjectRef --env-file $tempSecretsPath --workdir $supabaseDir
    if ($LASTEXITCODE -ne 0) {
      throw "supabase secrets set failed."
    }
  }

  if (-not $SkipFunctions) {
    Write-Host "Deploying Edge Function delivery-api to project $ProjectRef..."
    & npx.cmd supabase functions deploy delivery-api --project-ref $ProjectRef --use-api --no-verify-jwt --workdir $supabaseDir
    if ($LASTEXITCODE -ne 0) {
      throw "supabase functions deploy failed."
    }
  }

  Write-Host ""
  Write-Host "Supabase deployment steps completed for $ProjectRef."
  Write-Host "Test endpoint: https://$ProjectRef.supabase.co/functions/v1/delivery-api/numbers"
} finally {
  Remove-Item -LiteralPath $tempSecretsPath -Force -ErrorAction SilentlyContinue
}
