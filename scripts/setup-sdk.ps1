$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$workspace = Split-Path -Parent $PSScriptRoot
# Official Microsoft SDK NuGet distributions. This installs no services and needs no elevation.
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($package in @(@{ Name='microsoft.windows.sdk.cpp'; Folder='sdk-base' }, @{ Name='microsoft.windows.sdk.cpp.x64'; Folder='sdk-x64' })) {
    $destination = Join-Path $workspace ('.tools\' + $package.Folder)
    if (Test-Path -LiteralPath (Join-Path $destination 'c')) { continue }
    [void](New-Item -ItemType Directory -Force -Path $destination)
    $archive = Join-Path $workspace ('.tools\' + $package.Folder + '.zip')
    $url = 'https://api.nuget.org/v3-flatcontainer/' + $package.Name + '/10.0.19041.5/' + $package.Name + '.10.0.19041.5.nupkg'
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $archive
    [IO.Compression.ZipFile]::ExtractToDirectory($archive, $destination)
}
Write-Output 'Windows SDK 19041 is available locally. Run pnpm tauri build.'
