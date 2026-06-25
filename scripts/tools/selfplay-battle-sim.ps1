# Run the CPU self-play harness headlessly (Edge) and collect SP-* metrics.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\tools\selfplay-battle-sim.ps1 [query]
# Examples:
#   ...selfplay-battle-sim.ps1 "seeds=1-12&turns=5"
#   ...selfplay-battle-sim.ps1 "seeds=3&turns=5&full=3"   # also dump full detail log of seed 3
#
# Output lines: SP-START / SP-GAME / SP-AGG / SP-LOG and SELFPLAY DONE

param([string]$Query = "seeds=1-12&turns=5")

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$port = 8765
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

try { Invoke-WebRequest -Uri "http://localhost:$port/battle_simulator_v2.html" -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch { Start-Process python -ArgumentList '-m','http.server',"$port",'--directory',"$repoRoot" -WindowStyle Hidden; Start-Sleep -Seconds 2 }

$profileDir = Join-Path $env:TEMP ("edge-selfplay-" + [guid]::NewGuid().ToString('N'))
$logFile = Join-Path $env:TEMP ("selfplay_console_" + [guid]::NewGuid().ToString('N') + ".log")
$domFile = Join-Path $env:TEMP ("selfplay_dom_" + [guid]::NewGuid().ToString('N') + ".html")
$url = "http://localhost:$port/battle_simulator_v2/tests/selfplay.html?$Query"
$edgeArgs = @(
    '--headless', '--disable-gpu', '--no-first-run',
    "--user-data-dir=$profileDir",
    '--enable-logging=stderr', '--v=0', '--virtual-time-budget=600000',
    '--dump-dom', $url
)
Start-Process -FilePath $edge -ArgumentList $edgeArgs -NoNewWindow -Wait `
    -RedirectStandardOutput $domFile -RedirectStandardError $logFile | Out-Null
Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue

$lines = Select-String -Path $logFile -Pattern 'SP-START|SP-GAME|SP-AGG|SP-LOG|SELFPLAY DONE|SELFPLAY FAILED' |
    ForEach-Object { $_.Line -replace '.*CONSOLE\(\d+\)\]\s*', '' -replace '.*CONSOLE:\d+\]\s*', '' -replace '",\s*source:.*$', '' -replace '^"', '' }
$lines | ForEach-Object { Write-Output $_ }
if (-not ($lines -match 'SELFPLAY DONE')) { Write-Output ("INCOMPLETE - full log: " + $logFile) }
