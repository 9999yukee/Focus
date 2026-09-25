param([string]$Version = '0.2.0')
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$package = Join-Path $workspace 'artifacts\desktop\Focus'
$archive = Join-Path $workspace "artifacts\desktop\Focus-$Version-DiscordDesktop.zip"
$output = Join-Path $workspace 'artifacts\desktop\installer-build'
$installer = Join-Path $workspace "artifacts\desktop\Focus-$Version-Setup.exe"

if (-not (Test-Path -LiteralPath (Join-Path $package 'build.json'))) {
    throw 'Le paquet desktop est absent. Lancez d abord node scripts/build-desktop.mjs.'
}
Compress-Archive -Path (Join-Path $package '*') -DestinationPath $archive -Force
if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Recurse -Force }
New-Item -ItemType Directory -Path $output | Out-Null

$manifest = Join-Path $workspace 'installer\Cargo.toml'
$env:FOCUS_PACKAGE = $archive
node (Join-Path $workspace 'scripts\build-installer.mjs') build --release --manifest-path $manifest --target x86_64-pc-windows-msvc
if ($LASTEXITCODE -ne 0) { throw 'La compilation de l installeur a echoue.' }

Copy-Item -LiteralPath (Join-Path $workspace 'installer\target\x86_64-pc-windows-msvc\release\focus-installer.exe') -Destination $installer -Force
$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($installer + '.sha256') -Value "$hash  Focus-$Version-Setup.exe" -Encoding ASCII
Remove-Item -LiteralPath $output -Recurse -Force
Write-Output "Installeur Focus produit : $installer"
Write-Output "SHA-256 : $hash"