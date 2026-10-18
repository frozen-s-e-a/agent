$ErrorActionPreference = 'Stop'
$agentLaunchRoot = $PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $agentLaunchRoot 'resources\app\runtime\node.exe')) {
    $agentNodePath = Join-Path $agentLaunchRoot 'resources\app\runtime\node.exe'
    $agentScriptPath = Join-Path $agentLaunchRoot 'resources\app\scripts\offline-demo.mjs'
} else {
    $agentNodePath = Join-Path $agentLaunchRoot 'build\runtime\node.exe'
    $agentScriptPath = Join-Path $agentLaunchRoot 'scripts\offline-demo.mjs'
}
Start-Process -FilePath $agentNodePath -ArgumentList ('"{0}"' -f $agentScriptPath) -WorkingDirectory $agentLaunchRoot -WindowStyle Hidden
