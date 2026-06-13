# バトルシミュレーターv2のスモークテスト
#
# ローカルサーバーを起動し、ヘッドレスEdgeで battle_simulator_v2/tests/test.html を読み込んで
# コアエンジンのルールテストを実行・コンソールログを収集する。Node.js 不要（Python + Edge のみ）。
#
# 使い方:  powershell -ExecutionPolicy Bypass -File scripts\tools\smoke-test-battle-sim.ps1
#
# 確認ポイント:
#   - "ALL TESTS PASSED" が出ていること
#   - "TEST FAIL" / "TESTS FAILED" が無いこと

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$port = 8765
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

# 既にサーバーが立っていなければ起動
$serverStarted = $false
try {
    Invoke-WebRequest -Uri "http://localhost:$port/battle_simulator_v2.html" -UseBasicParsing -TimeoutSec 2 | Out-Null
} catch {
    Start-Process python -ArgumentList '-m','http.server',"$port",'--directory',"$repoRoot" -WindowStyle Hidden
    $serverStarted = $true
    Start-Sleep -Seconds 2
}

Write-Output "=== v2 コアエンジンテスト ==="
# プロファイルを毎回ユニークにする（既存Edgeプロセスへの委譲で出力が空になるのを防ぐ）
$v2Profile = Join-Path $env:TEMP ("edge-smoke-v2-" + [guid]::NewGuid().ToString('N'))
$v2Log = Join-Path $env:TEMP "battle_sim_v2_test_console.log"
$v2Args = @(
    '--headless', '--disable-gpu', '--no-first-run',
    "--user-data-dir=$v2Profile",
    '--enable-logging=stderr', '--v=0', '--virtual-time-budget=30000',
    '--dump-dom', "http://localhost:$port/battle_simulator_v2/tests/test.html"
)
Start-Process -FilePath $edge -ArgumentList $v2Args -NoNewWindow -Wait `
    -RedirectStandardOutput (Join-Path $env:TEMP 'battle_sim_v2_test_dom.html') -RedirectStandardError $v2Log | Out-Null
Remove-Item -Recurse -Force $v2Profile -ErrorAction SilentlyContinue

$v2Console = (Select-String -Path $v2Log -Pattern 'INFO:CONSOLE' | ForEach-Object { $_.Line })
$v2Fails = $v2Console | Where-Object { $_ -match 'TEST FAIL|TESTS FAILED' }
$v2Pass = $v2Console | Where-Object { $_ -match 'ALL TESTS PASSED' }
if ($v2Pass) { Write-Output "OK: v2 コアテスト全合格"; $v2Pass | ForEach-Object { Write-Output "  $_" } }
elseif ($v2Fails) { Write-Output "NG: v2 テスト失敗:"; $v2Fails | ForEach-Object { Write-Output "  $_" } }
else { Write-Output "NG: v2 テストの結果が確認できない（$v2Log を確認）" }

Write-Output ""
Write-Output "全ログ: $v2Log"
if ($serverStarted) { Write-Output "(http.server は起動したままです。不要なら python プロセスを終了してください)" }
