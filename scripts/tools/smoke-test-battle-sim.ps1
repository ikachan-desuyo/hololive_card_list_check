# バトルシミュレーターのスモークテスト
#
# ローカルサーバーを起動し、ヘッドレスEdgeで battle_simulator.html を読み込んで
# コンソールログを収集する。Node.js 不要（Python + Edge のみ）。
#
# 使い方:  powershell -ExecutionPolicy Bypass -File scripts\tools\smoke-test-battle-sim.ps1
#
# 確認ポイント:
#   - "初期化プロセス完了" が出ていること
#   - ERROR / 💥 / ❌ のログが無いこと
#   - 同じ初期化ログが2回出ていないこと（二重初期化の検出）

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$port = 8765
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

# 既にサーバーが立っていなければ起動
$serverStarted = $false
try {
    Invoke-WebRequest -Uri "http://localhost:$port/battle_simulator.html" -UseBasicParsing -TimeoutSec 2 | Out-Null
} catch {
    Start-Process python -ArgumentList '-m','http.server',"$port",'--directory',"$repoRoot" -WindowStyle Hidden
    $serverStarted = $true
    Start-Sleep -Seconds 2
}

$logFile = Join-Path $env:TEMP "battle_sim_smoke_console.log"
$domFile = Join-Path $env:TEMP "battle_sim_smoke_dom.html"
# プロファイルを毎回ユニークにする（既存Edgeプロセスへの委譲で出力が空になるのを防ぐ）
$profileDir = Join-Path $env:TEMP ("edge-smoke-" + [guid]::NewGuid().ToString('N'))

Write-Output "=== ヘッドレスEdgeで読み込み中... ==="
$edgeArgs = @(
    '--headless', '--disable-gpu', '--no-first-run',
    "--user-data-dir=$profileDir",
    '--enable-logging=stderr', '--v=0', '--virtual-time-budget=10000',
    '--dump-dom', "http://localhost:$port/battle_simulator.html"
)
$proc = Start-Process -FilePath $edge -ArgumentList $edgeArgs -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput $domFile -RedirectStandardError $logFile
Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue

Write-Output "=== コンソールログ (CONSOLE行のみ) ==="
Select-String -Path $logFile -Pattern 'INFO:CONSOLE' | ForEach-Object { $_.Line }

Write-Output ""
Write-Output "=== 判定 ==="
$console = (Select-String -Path $logFile -Pattern 'INFO:CONSOLE' | ForEach-Object { $_.Line })
$errors = $console | Where-Object { $_ -match '💥|❌|ERROR|エラー' }
$completed = $console | Where-Object { $_ -match '初期化プロセス完了' }
$dupInit = ($console | Where-Object { $_ -match 'カードデータ読み込み開始' }).Count

if ($errors) { Write-Output "NG: エラーログあり:"; $errors | ForEach-Object { Write-Output "  $_" } }
if (-not $completed) { Write-Output "NG: 初期化が完了していません" }
if ($dupInit -gt 1) { Write-Output "NG: 初期化が $dupInit 回実行されています（二重初期化）" }
if (-not $errors -and $completed -and $dupInit -le 1) { Write-Output "OK: 初期化完了・エラーなし・単一初期化" }

Write-Output ""
Write-Output "DOMダンプ: $domFile / 全ログ: $logFile"
if ($serverStarted) { Write-Output "(http.server は起動したままです。不要なら python プロセスを終了してください)" }
