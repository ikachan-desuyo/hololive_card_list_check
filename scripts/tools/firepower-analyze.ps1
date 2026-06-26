# Run the deck firepower analysis headlessly (Edge) and print FP-* lines.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\tools\firepower-analyze.ps1 [query]
# Example: ...firepower-analyze.ps1 "deck=FUWAMOCO&top=4&cheers=6"

param([string]$Query = "deck=Azki%E5%8D%98&top=4&cheers=6")

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$port = 8765
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

try { Invoke-WebRequest -Uri "http://localhost:$port/battle_simulator_v2.html" -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch { Start-Process python -ArgumentList '-m','http.server',"$port",'--directory',"$repoRoot" -WindowStyle Hidden; Start-Sleep -Seconds 2 }

$profileDir = Join-Path $env:TEMP ("edge-fp-" + [guid]::NewGuid().ToString('N'))
$logFile = Join-Path $env:TEMP ("fp_console_" + [guid]::NewGuid().ToString('N') + ".log")
$domFile = Join-Path $env:TEMP ("fp_dom_" + [guid]::NewGuid().ToString('N') + ".html")
$url = "http://localhost:$port/battle_simulator_v2/tests/firepower-analyze.html?$Query"
$edgeArgs = @('--headless','--disable-gpu','--no-first-run',"--user-data-dir=$profileDir",
    '--enable-logging=stderr','--v=0','--virtual-time-budget=120000','--dump-dom',$url)
Start-Process -FilePath $edge -ArgumentList $edgeArgs -NoNewWindow -Wait `
    -RedirectStandardOutput $domFile -RedirectStandardError $logFile | Out-Null
Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue

$lines = Select-String -Path $logFile -Pattern 'FP-START|FP-TOP|FP-ART|FP DONE|FP FAILED' |
    ForEach-Object { $_.Line -replace '.*CONSOLE\(\d+\)\]\s*','' -replace '.*CONSOLE:\d+\]\s*','' -replace '",\s*source:.*$','' -replace '^"','' }
$lines | ForEach-Object { Write-Output $_ }
if (-not ($lines -match 'FP DONE')) { Write-Output ("INCOMPLETE - full log: " + $logFile) }
