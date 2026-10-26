$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $env:LOCALAPPDATA 'LinkPeek\extension'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
Copy-Item -Recurse -Force (Join-Path $sourceRoot 'src\*') $destination
Write-Host "Extension folder: $destination"
Write-Host 'Load this folder from dia://extensions or chrome://extensions.'
Write-Host 'Reload existing web pages after installing the extension.'
