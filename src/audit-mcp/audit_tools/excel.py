"""用本机 Excel 重算填好的副本，读回公式结果（实现设计 8.3）。

只在 Windows 且装有 Excel 时可用；其他情况返回 None，调用方把这项核对记为 skipped。
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = r'''
$ErrorActionPreference = 'Stop'
$request = Get-Content -Raw -Encoding UTF8 $args[0] | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AskToUpdateLinks = $false
try {
  $book = $excel.Workbooks.Open($request.path, 0, $true)
  $excel.CalculateFull()
  $out = @{}
  foreach ($item in $request.cells) {
    $value = $book.Worksheets.Item($item.sheet).Range($item.cell).Value2
    $out[$item.sheet + '!' + $item.cell] = if ($null -eq $value) { $null } else { [string]$value }
  }
  $book.Close($false)
  $out | ConvertTo-Json -Compress | Out-File -Encoding UTF8 $args[1]
} finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
'''


def recalc(path, cells, timeout=180):
    """→ {'工作表!A1': 文本值或 None}；不可用时返回 None。"""
    if sys.platform != 'win32' or os.environ.get('AUDIT_EXCEL_DISABLED') == '1' or not cells:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        script, request, result = Path(tmp) / 'recalc.ps1', Path(tmp) / 'request.json', Path(tmp) / 'result.json'
        script.write_text(SCRIPT, encoding='utf-8-sig')
        request.write_text(json.dumps({'path': str(Path(path).resolve()), 'cells': [{'sheet': s, 'cell': c} for s, c in cells]}, ensure_ascii=False), encoding='utf-8')
        try:
            subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', str(script), str(request), str(result)],
                           capture_output=True, timeout=timeout, check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            return json.loads(result.read_text(encoding='utf-8-sig'))
        except (OSError, subprocess.SubprocessError, ValueError):
            return None
