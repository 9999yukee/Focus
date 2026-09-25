param([string]$Output = 'artifacts\screenshots\focus-desktop.png')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FocusCapture {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int left, top, right, bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
}
'@
$process = Get-Process -Name focus -ErrorAction Stop | Select-Object -First 1
$window = $process.MainWindowHandle
if ($window -eq 0) { throw 'Focus has no visible window.' }
[void][FocusCapture]::ShowWindow($window, 9)
[void][FocusCapture]::SetForegroundWindow($window)
Start-Sleep -Seconds 2
$rectangle = New-Object FocusCapture+Rect
[void][FocusCapture]::GetWindowRect($window, [ref]$rectangle)
$bitmap = New-Object Drawing.Bitmap(($rectangle.right - $rectangle.left), ($rectangle.bottom - $rectangle.top))
$graphics = [Drawing.Graphics]::FromImage($bitmap)
try {
    $graphics.CopyFromScreen($rectangle.left, $rectangle.top, 0, 0, $bitmap.Size)
    $bitmap.Save([IO.Path]::GetFullPath($Output), [Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $bitmap.Dispose() }
