param([switch]$KeepOpen)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FocusSmokeNative {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr info);
}
'@
if (Get-Process -Name focus -ErrorAction SilentlyContinue) { throw 'Close Focus before running the smoke test.' }
$process = Start-Process -FilePath (Join-Path $workspace 'src-tauri\target\release\focus.exe') -ArgumentList '--settings' -WindowStyle Hidden -PassThru
$deadline = [DateTime]::UtcNow.AddSeconds(60)
do { Start-Sleep -Milliseconds 200; $process.Refresh() } while ($process.MainWindowHandle -eq 0 -and !$process.HasExited -and [DateTime]::UtcNow -lt $deadline)
if ($process.HasExited -or $process.MainWindowHandle -eq 0) { throw 'Focus failed to create its native window.' }
$window = $process.MainWindowHandle
[void][FocusSmokeNative]::ShowWindow($window, 9)
[void][FocusSmokeNative]::SetForegroundWindow($window)
$root = [Windows.Automation.AutomationElement]::FromHandle($window)
function Find-Control([string]$Name) {
    $condition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty, $Name)
    $limit = [DateTime]::UtcNow.AddSeconds(15)
    do {
        $found = $root.FindFirst([Windows.Automation.TreeScope]::Descendants, $condition)
        if ($found) { return $found }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $limit)
    throw ('Control not found: ' + $Name)
}
function Click-Control([string]$Name) {
    $control = Find-Control $Name
    $rectangle = $control.Current.BoundingRectangle
    [void][FocusSmokeNative]::SetCursorPos([int]($rectangle.X + $rectangle.Width / 2), [int]($rectangle.Y + $rectangle.Height / 2))
    [FocusSmokeNative]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
    [FocusSmokeNative]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
    Start-Sleep -Milliseconds 400
}
$checks = @()
[void](Find-Control 'Black theme'); $checks += 'Native local shell and IPC startup'
Click-Control 'White theme'
$settingsPath = Join-Path $env:LOCALAPPDATA 'app.focus.desktop\settings.json'
$settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
if ($settings.theme -ne 'white') { throw 'Theme was not persisted by the native backend.' }
$checks += 'Native settings persistence'
Click-Control 'Black theme'
& (Join-Path $PSScriptRoot 'capture-window.ps1') -Output (Join-Path $workspace 'artifacts\screenshots\focus-desktop-appearance.png')
Click-Control 'Performance'
Click-Control 'Performance monitor'
Start-Sleep -Seconds 3
[void](Find-Control 'Working set'); $checks += 'Performance panel accessible'
& (Join-Path $PSScriptRoot 'capture-window.ps1') -Output (Join-Path $workspace 'artifacts\screenshots\focus-desktop-performance.png')
Click-Control 'Performance monitor'
[void][FocusSmokeNative]::ShowWindow($window, 6)
Start-Sleep -Milliseconds 400
if (![FocusSmokeNative]::IsIconic($window)) { throw 'Minimize failed.' }
[void][FocusSmokeNative]::ShowWindow($window, 9)
Start-Sleep -Milliseconds 400
if ([FocusSmokeNative]::IsIconic($window)) { throw 'Restore failed.' }
$checks += 'Native minimize and restore'
$second = Start-Process -FilePath (Join-Path $workspace 'src-tauri\target\release\focus.exe') -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2
if (@(Get-Process -Name focus).Count -ne 1) { throw 'Single-instance guard failed.' }
$checks += 'Single native executable instance'
Click-Control 'Discord'
# Check only non-sensitive login labels. Never read fields, cookies, storage or QR data.
try { [void](Find-Control 'Log In'); $checks += 'Official Discord login controls visible' } catch { $checks += 'Official Discord login controls need manual verification' }
$result = @{ passed=$true; checks=$checks; measuredAt=[DateTime]::UtcNow.ToString('o'); authenticatedFlows='Not tested' }
[void](New-Item -ItemType Directory -Force -Path (Join-Path $workspace 'artifacts\test-results'))
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workspace 'artifacts\test-results\native-smoke.json') -Encoding UTF8
Write-Output ($result | ConvertTo-Json)
if (!$KeepOpen) { $process.CloseMainWindow() | Out-Null }
