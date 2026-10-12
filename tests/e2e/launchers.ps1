$ErrorActionPreference='Stop'
$workspace=(Resolve-Path '.').Path
$delivery=(Resolve-Path 'artifacts/test/windows-x64/0.1.0-internal.29/AI助手').Path
$expectedExe=Join-Path $delivery 'AI助手.exe'
$out=Join-Path $workspace ('artifacts/launcher-validation-'+[guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $out | Out-Null
$report=@()
$savedData=$env:AUDIT_DATA_DIR
try {
 foreach($script in @((Join-Path $workspace '启动AI助手.cmd'),(Join-Path $delivery '启动AI助手.cmd'))) {
  $state=Join-Path $out ('state-'+$report.Count)
  $env:AUDIT_DATA_DIR=$state
  $launcher=Start-Process -FilePath (Join-Path $env:SystemRoot 'System32/cmd.exe') -ArgumentList @('/d','/c',('"'+$script+'"')) -WorkingDirectory $workspace -WindowStyle Hidden -PassThru
  $deadline=(Get-Date).AddSeconds(30)
  $main=$null
  do {
   Start-Sleep -Milliseconds 300
   $candidate=Get-CimInstance Win32_Process -Filter "ParentProcessId = $($launcher.Id)" | Where-Object {$_.ExecutablePath -eq $expectedExe -and $_.CommandLine -notmatch '--type='} | Select-Object -First 1
   if($candidate) {
    $process=Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
    if($process -and $process.MainWindowHandle -ne 0 -and (Test-Path -LiteralPath (Join-Path $state 'metadata.sqlite'))) {$main=$process;break}
   }
  } while((Get-Date) -lt $deadline)
  if(-not $main) {throw "启动脚本未打开桌面程序：$script"}
  $report+=@{script=$script;passed=$true;processId=$main.Id;windowTitle=$main.MainWindowTitle;isolatedState=$state}
  $closed=$main.CloseMainWindow()
  if(-not $closed) {throw '测试窗口不能正常关闭'}
  if(-not $main.WaitForExit(8000)) {throw '测试程序退出超时'}
 }
 $shell=New-Object -ComObject WScript.Shell
 $shortcut=$shell.CreateShortcut((Join-Path $workspace 'AI助手桌面版.lnk'))
 if($shortcut.TargetPath -ne $expectedExe -or $shortcut.Arguments) {throw '项目快捷方式未指向独立程序包'}
 @{passed=$true;cases=$report.Count;shortcutVerified=$true;records=$report} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out '启动方式验收.json') -Encoding utf8
 Write-Output ("PASS launchers 2/2 and shortcut; report: "+$out)
} finally {$env:AUDIT_DATA_DIR=$savedData}
