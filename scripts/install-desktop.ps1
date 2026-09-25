param([switch]$Uninstall, [switch]$NoLaunch, [string]$PackagePath)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$destination = Join-Path $env:LOCALAPPDATA 'FocusDesktop'
if (-not $PackagePath) { $PackagePath = Join-Path $PSScriptRoot '..\artifacts\desktop\Focus' }
$discordRoot = Join-Path $env:LOCALAPPDATA 'Discord'
$discordApp = Get-ChildItem -LiteralPath $discordRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^app-[\d.]+$' -and (Test-Path -LiteralPath (Join-Path $_.FullName 'Discord.exe')) } |
    Sort-Object { [version]($_.Name.Substring(4)) } -Descending | Select-Object -First 1
if (-not $discordApp) { throw 'Discord Desktop doit etre installe. Telechargement officiel : https://discord.com/download' }
if (Get-Process Discord -ErrorAction SilentlyContinue) { throw 'Fermez Discord avant de modifier son installation. Les appels en cours ne sont pas interrompus par ce script.' }
. (Join-Path $PSScriptRoot 'WindowsIdentity.ps1')
$receiptPath = Join-Path $destination 'install-receipt.json'
$previousReceipt = if (Test-Path -LiteralPath $receiptPath) { Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json } else { $null }
$installer = Join-Path $destination 'VencordInstallerCli.exe'
$installerHash = '15268aba25625797bf562187dd87ddadf42882e079c7b6192880ad3e83353ef5'
$shortcutPaths = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Focus.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Focus.lnk')
)
if ($Uninstall) {
    if (-not (Test-Path -LiteralPath $receiptPath)) { throw 'Aucune installation Focus geree par ce script.' }
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $installerHash) { throw 'Integrite de l outil de desinstallation invalide.' }
    & $installer --uninstall --branch stable
    if ($LASTEXITCODE -ne 0) { throw 'La restauration de Discord a echoue.' }
    $receipt = $previousReceipt
    foreach ($entry in $receipt.shortcuts) {
        if (Test-Path -LiteralPath $entry.path) {
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($entry.path)
            if ($shortcut.Description -eq 'Focus - Discord Desktop') { Remove-Item -LiteralPath $entry.path }
        }
        if ($entry.backup -and (Test-Path -LiteralPath $entry.backup)) { Copy-Item -LiteralPath $entry.backup -Destination $entry.path -Force }
    }
    foreach ($entry in $receipt.replacedDiscordShortcuts) {
        if (-not (Test-Path -LiteralPath $entry.path) -and (Test-Path -LiteralPath $entry.backup)) {
            Copy-Item -LiteralPath $entry.backup -Destination $entry.path
        }
    }
    Move-Item -LiteralPath $receiptPath -Destination (Join-Path $destination ('uninstalled-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.json'))
    Write-Output 'Discord restaure. Les preferences locales et les sauvegardes Focus sont conservees.'
    return
}
$PackagePath = (Resolve-Path -LiteralPath $PackagePath).Path
$manifest = Get-Content -LiteralPath (Join-Path $PackagePath 'build.json') -Raw | ConvertFrom-Json
foreach ($entry in $manifest.files.PSObject.Properties) {
    if ($entry.Name -notmatch '^[a-z]+\.(js|css)$') { throw 'Nom de fichier inattendu dans le manifeste.' }
    $file = Join-Path $PackagePath ('dist\' + $entry.Name)
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value.sha256) { throw "Integrite invalide : $($entry.Name)" }
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$backup = Join-Path $destination ('backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$resources = Join-Path $discordApp.FullName 'resources'
foreach ($name in @('app.asar','_app.asar','app')) {
    $original = Join-Path $resources $name
    if (Test-Path -LiteralPath $original) { Copy-Item -LiteralPath $original -Destination (Join-Path $backup $name) -Recurse }
}
if (Test-Path -LiteralPath (Join-Path $destination 'dist')) {
    Copy-Item -LiteralPath (Join-Path $destination 'dist') -Destination (Join-Path $backup 'focus-dist') -Recurse
}
Copy-Item -LiteralPath (Join-Path $PackagePath 'dist') -Destination $destination -Recurse -Force
foreach ($name in @('Focus.ico','build.json','LICENSE-Vencord')) { Copy-Item -LiteralPath (Join-Path $PackagePath $name) -Destination $destination -Force }
if (-not (Test-Path -LiteralPath $installer)) {
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/Vencord/Installer/releases/download/v1.4.2/VencordInstallerCli.exe' -OutFile $installer
}
if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $installerHash) { throw 'Integrite de l installateur Vencord invalide.' }
$oldData = $env:VENCORD_USER_DATA_DIR
$oldDev = $env:VENCORD_DEV_INSTALL
try {
    $env:VENCORD_USER_DATA_DIR = $destination
    $env:VENCORD_DEV_INSTALL = '1'
    & $installer --install --branch stable
    if ($LASTEXITCODE -ne 0) { throw 'L integration de Focus dans Discord a echoue.' }
} finally {
    $env:VENCORD_USER_DATA_DIR = $oldData
    $env:VENCORD_DEV_INSTALL = $oldDev
}
$shell = New-Object -ComObject WScript.Shell
$shortcuts = @()
foreach ($path in $shortcutPaths) {
    $previous = $null
    $originalShortcut = @($previousReceipt.shortcuts | Where-Object { $_.path -eq $path }) | Select-Object -First 1
    if ($originalShortcut) { $previous = $originalShortcut.backup }
    elseif (Test-Path -LiteralPath $path) {
        $previous = Join-Path $backup ('shortcut-' + $shortcuts.Count + '.lnk')
        Copy-Item -LiteralPath $path -Destination $previous
    }
    $shortcut = $shell.CreateShortcut($path)
    $shortcut.TargetPath = Join-Path $discordRoot 'Update.exe'
    $shortcut.Arguments = '--processStart Discord.exe'
    $shortcut.WorkingDirectory = $discordRoot
    $shortcut.IconLocation = (Join-Path $destination 'Focus.ico') + ',0'
    $shortcut.Description = 'Focus - Discord Desktop'
    $shortcut.Save()
    # WScript keeps the link open; release it before committing its property store.
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shortcut)
    [Focus.WindowsIdentity]::SetShortcutId($path, 'Focus.DiscordDesktop')
    $shortcuts += @{path=$path;backup=$previous}
}
$replacedDiscordShortcuts = @($previousReceipt.replacedDiscordShortcuts | Where-Object { $_ })
$discordShortcutsToRemove = @()
foreach ($focusPath in $shortcutPaths) {
    $discordPath = Join-Path (Split-Path -Parent $focusPath) 'Discord.lnk'
    if (-not (Test-Path -LiteralPath $discordPath)) { continue }
    $discordShortcut = $shell.CreateShortcut($discordPath)
    $isDiscordShortcut = $discordShortcut.TargetPath.StartsWith($discordRoot + '\', [StringComparison]::OrdinalIgnoreCase)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($discordShortcut)
    if (-not $isDiscordShortcut) { continue }
    if (-not ($replacedDiscordShortcuts | Where-Object { $_.path -eq $discordPath })) {
        $savedShortcut = Join-Path $backup ('discord-shortcut-' + $replacedDiscordShortcuts.Count + '.lnk')
        Copy-Item -LiteralPath $discordPath -Destination $savedShortcut
        $replacedDiscordShortcuts += @{path=$discordPath;backup=$savedShortcut}
    }
    $discordShortcutsToRemove += $discordPath
}
@{version=$manifest.version;installedAt=(Get-Date).ToString('o');discord=$discordApp.FullName;backup=$backup;shortcuts=$shortcuts;replacedDiscordShortcuts=$replacedDiscordShortcuts} |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
foreach ($path in $discordShortcutsToRemove) { Remove-Item -LiteralPath $path }
Write-Output "Focus installe dans Discord Desktop. Sauvegarde : $backup"
if (-not $NoLaunch) {
    $runAsNode = $env:ELECTRON_RUN_AS_NODE
    try {
        $env:ELECTRON_RUN_AS_NODE = $null
        Start-Process -FilePath (Join-Path $discordRoot 'Update.exe') -ArgumentList '--processStart Discord.exe' -WindowStyle Hidden
    } finally { $env:ELECTRON_RUN_AS_NODE = $runAsNode }
}
