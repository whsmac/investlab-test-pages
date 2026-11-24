# INVESTLAB / SEC official API connectivity (TEST only)
# Requires: Windows PowerShell 5.1+ or PowerShell 7+
# Read-only: no Supabase calls, credentials, GitHub writes, downloads or file output.
# The contact string is entered locally and remains in process memory only.
[CmdletBinding()]
param(
  [ValidateRange(5,60)][int] $TimeoutSeconds = 25
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
Write-Host 'INVESTLAB TEST | SEC Company Facts request diagnostic' -ForegroundColor Cyan
Write-Host 'Official SEC servers only: Tesla and Microsoft; 2 GET requests, >= 1 second between requests.'
Write-Host 'No portfolio or user data will be accessed. No files are saved.'
Write-Host ''
Write-Host 'Type an identifying contact in the form: INVESTLAB Research your-real-email@domain.com'
Write-Host 'Enter it only here on your PC; do not send the address or screenshot of this input to chat.'
$ua = Read-Host 'SEC identifying User-Agent'
if ([string]::IsNullOrWhiteSpace($ua) -or $ua.Length -gt 250 -or
    $ua -notmatch '^.{3,}\s+[^\s@]+@[^\s@]+\.[^\s@]+\s*$' -or
    $ua -match '[\r\n\t]' -or
    $ua -match '@example\.(com|org|net|invalid)(\s|$)') {
  Write-Host '[STOP] Enter an organization/app label and a real contact email; no requests made.' -ForegroundColor Yellow
  exit 2
}
$targets = @(
  @{Ticker='TSLA'; CIK=1318605; Url='https://data.sec.gov/api/xbrl/companyfacts/CIK0001318605.json'},
  @{Ticker='MSFT'; CIK=789019; Url='https://data.sec.gov/api/xbrl/companyfacts/CIK0000789019.json'}
)
$results = @()
foreach ($target in $targets) {
  $result = [ordered]@{Ticker=$target.Ticker; Outcome='FAILED'; HttpCode='—'; ValidCIK=$false; USGAAPTags=0}
  try {
    $response = Invoke-WebRequest -Uri $target.Url -UserAgent $ua -Headers @{Accept='application/json'} `
      -TimeoutSec $TimeoutSeconds -UseBasicParsing -MaximumRedirection 0
    $result.HttpCode = [int]$response.StatusCode
    # Parse in memory only. Reject HTML, another issuer and empty Company Facts.
    $data = $response.Content | ConvertFrom-Json
    if ([int]$data.cik -ne [int]$target.CIK) {
      $result.Outcome = 'CIK_MISMATCH'
    } elseif ($null -eq $data.facts -or $null -eq $data.facts.'us-gaap') {
      $result.Outcome = 'NO_US_GAAP'
    } else {
      $result.ValidCIK = $true
      $result.USGAAPTags = @($data.facts.'us-gaap'.PSObject.Properties).Count
      $result.Outcome = 'PASS'
    }
  } catch {
    $err = $_.Exception
    $webResponse = $err.Response
    if ($webResponse -and $null -ne $webResponse.StatusCode) {
      try { $result.HttpCode = [int]$webResponse.StatusCode } catch { }
    }
    if ($result.HttpCode -eq 403) {
      $result.Outcome = 'FORBIDDEN_403'
    } elseif ($result.HttpCode -eq 429) {
      $result.Outcome = 'RATE_LIMIT_429'
    } elseif ($result.HttpCode -match '^\d+$') {
      $result.Outcome = 'HTTP_ERROR'
    } else {
      $result.Outcome = 'NETWORK_OR_TLS_ERROR'
    }
    # Never print raw exceptions, proxy URLs or the identifying User-Agent.
  }
  $results += [pscustomobject]$result
  Write-Host ('{0}: {1} | HTTP {2} | CIK {3} | US-GAAP tags {4}' -f
    $result.Ticker, $result.Outcome, $result.HttpCode, $result.ValidCIK, $result.USGAAPTags)
  if ($target.Ticker -ne 'MSFT') { Start-Sleep -Seconds 2 }
}
$ua = $null
Write-Host ''
Write-Host 'Safe to share: only the two result lines above (no contact/address/credentials).'
if (@($results | Where-Object { $_.Outcome -eq 'PASS' }).Count -eq 2) {
  Write-Host 'RESULT: BOTH_PASS | Company Facts API accessible from this Windows PowerShell session.' -ForegroundColor Green
  exit 0
}
Write-Host 'RESULT: INCOMPLETE | Browser access does not guarantee programmatic access.' -ForegroundColor Yellow
exit 1
