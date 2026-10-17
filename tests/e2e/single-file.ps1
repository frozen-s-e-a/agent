$ErrorActionPreference='Stop'
$workspace=(Resolve-Path '.').Path
$source=(Resolve-Path 'artifacts/AI审计助手-0.1.0-internal.29.exe').Path
$out=Join-Path $workspace ('artifacts/single-file-validation-'+[guid]::NewGuid().ToString('N').Substring(0,8))
$delivery=Join-Path $out 'only-exe'
New-Item -ItemType Directory -Path $delivery -Force | Out-Null
$copy=Join-Path $delivery 'AI审计助手.exe'
Copy-Item -LiteralPath $source -Destination $copy
if((Get-ChildItem -LiteralPath $delivery -File).Count -ne 1){throw '验证目录必须只有一个 EXE'}
$previous=@{data=$env:AUDIT_DATA_DIR;cache=$env:AUDIT_PORTABLE_ROOT;record=$env:AUDIT_PORTABLE_TEST_RECORD}
$env:AUDIT_DATA_DIR=Join-Path $out 'state'
$env:AUDIT_PORTABLE_ROOT=Join-Path $out 'program'
$records=@()
try {
 foreach($mode in @('cold','warm')) {
  $record=Join-Path $out ($mode+'.json')
  $env:AUDIT_PORTABLE_TEST_RECORD=$record
  $started=Get-Date
  $launcher=Start-Process -FilePath $copy -WorkingDirectory $delivery -WindowStyle Hidden -PassThru
  $deadline=(Get-Date).AddSeconds(120)
  while(-not (Test-Path -LiteralPath $record)) {
   if((Get-Date) -ge $deadline){throw '单文件程序启动超时'}
   if($launcher.HasExited -and $launcher.ExitCode -ne 0){throw '单文件准备失败'}
   Start-Sleep -Milliseconds 250
  }
  $result=Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
  if($result.error){throw $result.error}
  $actualPath=(Resolve-Path -LiteralPath $result.path).Path
  if(-not $actualPath.StartsWith($env:AUDIT_PORTABLE_ROOT+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)){throw '自动释放目录超出验证范围'}
  $expectedExe=Join-Path $actualPath 'AI助手.exe'
  $main=$null
  do {
   Start-Sleep -Milliseconds 250
   $candidate=Get-Process -Id $result.processId -ErrorAction SilentlyContinue
   if($candidate -and $candidate.Path -eq $expectedExe -and $candidate.MainWindowHandle -ne 0 -and (Test-Path -LiteralPath (Join-Path $env:AUDIT_DATA_DIR 'metadata.sqlite'))){$main=$candidate;break}
  } while((Get-Date) -lt $deadline)
  if(-not $main){throw '单文件程序没有打开工作台窗口'}
  $records+=@{mode=$mode;passed=$true;version=$result.version;appPath=$actualPath;elapsedSeconds=((Get-Date)-$started).TotalSeconds;windowTitle=$main.MainWindowTitle}
  if(-not $main.CloseMainWindow()){throw '验证窗口不能正常关闭'}
  if(-not $main.WaitForExit(8000)){throw '验证窗口退出超时'}
  if(-not $launcher.WaitForExit(8000)){throw '单文件启动器退出超时'}
 }
 if($records[0].appPath -ne $records[1].appPath){throw '再次打开没有复用已准备文件'}
 @{passed=$true;singleExeOnly=$true;cases=2;source=$source;records=$records} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out '单文件启动验收.json') -Encoding utf8
 Write-Output ("PASS single EXE cold/warm; report: "+$out)
} finally {
 $env:AUDIT_DATA_DIR=$previous.data;$env:AUDIT_PORTABLE_ROOT=$previous.cache;$env:AUDIT_PORTABLE_TEST_RECORD=$previous.record
}
