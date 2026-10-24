$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $env:LOCALAPPDATA 'NewTabLauncher'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
Copy-Item -Recurse -Force (Join-Path $sourceRoot 'extension') $destination
Copy-Item -Force (Join-Path $PSScriptRoot 'launcher.ahk') $destination
Write-Host "Extension folder: $(Join-Path $destination 'extension')"
Write-Host "After configuring the extension shortcut, run: $(Join-Path $destination 'launcher.ahk')"
Write-Host 'This script does not install AutoHotkey or start the key remapping.'
