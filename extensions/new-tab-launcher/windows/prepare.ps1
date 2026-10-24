$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $env:LOCALAPPDATA 'NewTabLauncher'
$extensionDirectory = Join-Path $destination 'extension'
New-Item -ItemType Directory -Force -Path $extensionDirectory | Out-Null
Copy-Item -Recurse -Force (Join-Path $sourceRoot 'src\*') $extensionDirectory
Copy-Item -Force (Join-Path $PSScriptRoot 'launcher.ahk') $destination
# Remove only an obsolete file distributed by earlier launcher versions.
$obsoleteWindow = Join-Path $extensionDirectory 'window.html'
if (Test-Path $obsoleteWindow) { Remove-Item $obsoleteWindow }
Write-Host "Extension folder: $extensionDirectory"
Write-Host 'Load or reload this folder from your browser extension settings.'
Write-Host 'Set the extension shortcut to Ctrl+Shift+Space.'
Write-Host 'Use PowerToys Keyboard Manager or launcher.ahk to map Ctrl+T.'
Write-Host 'This script does not install software or start key remapping.'
