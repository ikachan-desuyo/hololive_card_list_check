# Run the rollout diagnostic headlessly (Edge) and collect DIAG lines.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\tools\rollout-diag.ps1 [query]
# Example: ...rollout-diag.ps1 "seed=7&turn=7&k=30"

param([string]$Query = "seed=7&turn=7&k=30")

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$port = 8765
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

try { Invoke-WebRequest -Uri "http://localhost:$port/battle_simulator_v2.html" -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch { Start-Process python -ArgumentList '-m','http.server',"$port",'--directory',"$repoRoot" -WindowStyle Hidden; Start-Sleep -Seconds 2 }

$profileDir = Join-Path $env:TEMP ("edge-diag-" + [guid]::NewGuid().ToString('N'))
$logFile = Join-Path $env:TEMP ("diag_console_" + [guid]::NewGuid().ToString('N') + ".log")
$domFile = Join-Path $env:TEMP ("diag_dom_" + [guid]::NewGuid().ToString('N') + ".html")
$url = "http://localhost:$port/battle_simulator_v2/tests/rollout-diag.html?$Query"
$edgeArgs = @('--headless','--disable-gpu','--no-first-run',"--user-data-dir=$profileDir",
    '--enable-logging=stderr','--v=0','--virtual-time-budget=600000','--dump-dom',$url)
Start-Process -FilePath $edge -ArgumentList $edgeArgs -NoNewWindow -Wait `
    -RedirectStandardOutput $domFile -RedirectStandardError $logFile | Out-Null
Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue

$lines = Select-String -Path $logFile -Pattern 'DIAG\||DIAG DONE|DIAG FAILED' |
    ForEach-Object { $_.Line -replace '.*CONSOLE\(\d+\)\]\s*','' -replace '.*CONSOLE:\d+\]\s*','' -replace '",\s*source:.*$','' -replace '^"','' }
$lines | ForEach-Object { Write-Output $_ }
if (-not ($lines -match 'DIAG DONE')) { Write-Output ("INCOMPLETE - full log: " + $logFile) }
