param([Parameter(Mandatory=$true)][string]$PackageDirectory)
$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath $PackageDirectory).Path
$expectedExe = Join-Path $packageRoot 'AI助手.exe'
$launcher = Join-Path $packageRoot '启动Agent离线体验.cmd'
$node = Join-Path $packageRoot 'resources\app\runtime\node.exe'
$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$out = Join-Path $workspace ('artifacts\offline-launcher-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$state = Join-Path $out 'state'
[IO.Directory]::CreateDirectory($out) | Out-Null
$savedData = $env:AUDIT_DATA_DIR
$main = $null
$report = @{packageDirectory=$packageRoot; state=$state; checks=@(); passed=$false}
$probe = Join-Path $out 'probe.mjs'
$probeSource = @'
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
const db=new DatabaseSync(path.join(process.argv[2],'metadata.sqlite'),{readOnly:true});
const settings=JSON.parse(db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get('settings','settings').value);
const projects=db.prepare('SELECT count(*) n FROM records WHERE kind=?').get('projects').n;
db.close();
if(new URL(settings.baseUrl).hostname!=='127.0.0.1')throw Error('Expected loopback model');
const response=await fetch(settings.baseUrl+'/models',{signal:AbortSignal.timeout(3000)});
const models=await response.json();
if(!response.ok||!models.data.some(item=>item.id==='offline-demo')||!projects)throw Error('Offline demo unavailable');
console.log(JSON.stringify({model:settings.model,projectCount:projects,ready:true}));
'@
[IO.File]::WriteAllText($probe,$probeSource,[Text.UTF8Encoding]::new($false))
function Start-TestLauncher([string]$suffix) {
    $process = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\cmd.exe') -ArgumentList @('/d','/c',('"'+$launcher+'"')) -WorkingDirectory $packageRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $out ($suffix+'-stdout.txt')) -RedirectStandardError (Join-Path $out ($suffix+'-stderr.txt'))
    if (-not $process.WaitForExit(10000)) { throw 'Launcher command did not exit' }
    if ($process.ExitCode -ne 0) { throw ('Launcher command failed: '+$process.ExitCode) }
    if ((Get-Item -LiteralPath (Join-Path $out ($suffix+'-stderr.txt'))).Length) { throw 'Launcher wrote an error' }
}
try {
    $env:AUDIT_DATA_DIR=$state
    $existingIds=@(Get-Process -Name 'AI助手' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
    Start-TestLauncher 'first'
    $deadline=(Get-Date).AddSeconds(25)
    do {
        foreach($candidate in @(Get-CimInstance Win32_Process -Filter "Name = 'AI助手.exe'" | Where-Object {$_.ExecutablePath -eq $expectedExe -and $_.CommandLine -notmatch '--type=' -and $_.ProcessId -notin $existingIds})) {
            $process=Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
            if($process -and $process.MainWindowHandle -ne 0 -and (Test-Path -LiteralPath (Join-Path $state 'metadata.sqlite'))) {$main=$process;break}
        }
        if(-not $main) {Start-Sleep -Milliseconds 300}
    } while(-not $main -and (Get-Date) -lt $deadline)
    if(-not $main) {throw 'Launcher did not open a visible app window'}
    $firstHelper=Get-Content -LiteralPath (Join-Path $state 'offline-helper.pid')
    $model=& $node $probe $state
    if($LASTEXITCODE -ne 0) {throw 'Launched model service is unavailable'}
    $report.checks+=@{name='cmd_opens_window_and_model';windowTitle=$main.MainWindowTitle;processId=$main.Id;model=($model | ConvertFrom-Json)}
    Start-TestLauncher 'second'
    Start-Sleep -Milliseconds 700
    if((Get-Content -LiteralPath (Join-Path $state 'offline-helper.pid')) -ne $firstHelper -or $main.HasExited) {throw 'Repeated launcher did not reuse existing app'}
    $report.checks+=@{name='repeat_reuses_helper_and_window';helperId=[int]$firstHelper}
    if(-not $main.CloseMainWindow() -or -not $main.WaitForExit(8000)) {throw 'App did not close normally'}
    $deadline=(Get-Date).AddSeconds(8)
    while((Test-Path -LiteralPath (Join-Path $state 'offline-helper.pid')) -and (Get-Date) -lt $deadline) {Start-Sleep -Milliseconds 200}
    if(Test-Path -LiteralPath (Join-Path $state 'offline-helper.pid')) {throw 'Model helper remained after app closed'}
    $report.checks+=@{name='closing_app_stops_helper'}
    $report.passed=$true
    Write-Output ('PASS offline launcher '+$report.checks.Count+'/3; report: '+$out)
} catch {
    $report.error=$_.Exception.Message
    throw
} finally {
    if($main -and -not $main.HasExited) {$main.CloseMainWindow() | Out-Null;$main.WaitForExit(8000) | Out-Null}
    $env:AUDIT_DATA_DIR=$savedData
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'offline-launcher.json') -Encoding utf8
}
