$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$targetRoot = 'C:\Users\Install\Desktop\ai助手'
if (-not (Test-Path -LiteralPath (Join-Path $targetRoot 'docs\项目方案.md'))) { throw '目标目录缺少用户方案，停止交付。' }
$version = (Get-Content -LiteralPath (Join-Path $sourceRoot 'package.json') -Raw | ConvertFrom-Json).version
$folders = @('src','tests','scripts','build\client','build\python','build\python-packages','build\runtime',"artifacts\test\windows-x64\$version",'artifacts\test-results\ui')
$rootFiles = @('package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.js','requirements.txt','启动AI助手.cmd')
$documentFiles = @('使用说明.md','implementation-notes.md','THIRD_PARTY_NOTICES.md','开发与验证.md','测试记录-20260909.md')
$files = @()
foreach ($dir in $folders) { $files += Get-ChildItem -LiteralPath (Join-Path $sourceRoot $dir) -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]__pycache__[\\/]' } }
foreach ($file in $rootFiles) { $files += Get-Item -LiteralPath (Join-Path $sourceRoot $file) }
foreach ($file in $documentFiles) { $files += Get-Item -LiteralPath (Join-Path $sourceRoot "docs\$file") }
$files += Get-Item -LiteralPath (Join-Path $sourceRoot 'artifacts\test-results\benchmark.json')
foreach ($file in $files) {
  $relative = $file.FullName.Substring($sourceRoot.Length).TrimStart('\')
  $targetFile = [IO.Path]::GetFullPath((Join-Path $targetRoot $relative))
  if (-not $targetFile.StartsWith($targetRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw '路径超出目标目录。' }
  if (Test-Path -LiteralPath $targetFile) {
    if ((Get-FileHash -LiteralPath $targetFile).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash) { throw "目标文件已经存在且不同，未覆盖：$relative" }
  }
}
foreach ($file in $files) {
  $relative = $file.FullName.Substring($sourceRoot.Length).TrimStart('\')
  $targetFile = Join-Path $targetRoot $relative
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($targetFile)) | Out-Null
  if (-not (Test-Path -LiteralPath $targetFile)) { Copy-Item -LiteralPath $file.FullName -Destination $targetFile }
}
$readme = Join-Path $targetRoot 'README.md'
$current = [IO.File]::ReadAllText($readme)
if (-not $current.Contains('## 应用实现进展 · 2026-09-09')) {
  $addition = @'

## 应用实现进展 · 2026-09-09

已新增可运行的 **0.1.0 内部测试程序**。上文 v0.4 为方案基线状态，完整首版范围保持不变；本次测试包尚未完成全功能迁移验收。

- 双击根目录 `启动AI助手.cmd`，或打开 artifacts/test/windows-x64/0.1.0-internal.2/AI助手/AI助手.exe。
- 已实现项目、会话、设置、独立计算与 16 项本地工具。
- 25 项 Python 测试、6 项后台测试和实际桌面流程通过；十万行单场景双模式结果一致。
- [使用说明](docs/使用说明.md) / [实施差异](docs/implementation-notes.md) / [测试记录](docs/测试记录-20260909.md) / [开发与验证](docs/开发与验证.md)。
- 银行、抽样、复杂底稿与附注、外部查询及扩展等仍属首版未完成范围，不能把内部测试包当作全功能首版。
'@
  [IO.File]::WriteAllText($readme, $current + [Environment]::NewLine + $addition, [Text.UTF8Encoding]::new($false))
}
Write-Output ("已交付 {0} 个文件到 {1}" -f $files.Count, $targetRoot)
