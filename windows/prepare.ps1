# Compatibility entry point for the original checkout layout.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '..\extensions\new-tab-launcher\windows\prepare.ps1')
