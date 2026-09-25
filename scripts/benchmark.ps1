param(
    [ValidateSet('Focus','OfficialWeb')][string]$Target = 'Focus',
    [int]$Seconds = 30,
    [string]$Scenario = 'login-idle',
    [switch]$Minimized,
    [string]$Output = ''
)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
if ($Seconds -lt 4 -or $Seconds -gt 1200) { throw 'Use a duration between 4 and 1200 seconds.' }
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class FocusBenchmarkNative {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Entry {
    public uint size, usage, pid; public UIntPtr heap; public uint module, threads, parent; public int priority; public uint flags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string name;
  }
  [DllImport("kernel32.dll")] static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint id);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern bool Process32FirstW(IntPtr handle, ref Entry entry);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern bool Process32NextW(IntPtr handle, ref Entry entry);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  public static int[] Tree(int root) {
    var rows = new List<Entry>(); var handle = CreateToolhelp32Snapshot(2, 0);
    var entry = new Entry(); entry.size = (uint)Marshal.SizeOf(typeof(Entry));
    if (Process32FirstW(handle, ref entry)) do { rows.Add(entry); } while (Process32NextW(handle, ref entry));
    CloseHandle(handle); var ids = new HashSet<int>(); ids.Add(root);
    bool changed;
    do { changed=false; foreach(var row in rows) if(ids.Contains((int)row.parent) && (row.name.Equals("msedgewebview2.exe",StringComparison.OrdinalIgnoreCase) || row.name.Equals("msedge.exe",StringComparison.OrdinalIgnoreCase))) changed |= ids.Add((int)row.pid); } while(changed);
    var result = new int[ids.Count]; ids.CopyTo(result); return result;
  }
}
'@

if ($Target -eq 'Focus') {
    $executable = Join-Path $workspace 'src-tauri\target\release\focus.exe'
    $arguments = @()
    if (Get-Process -Name focus -ErrorAction SilentlyContinue) { throw 'Close Focus before a startup trial. This avoids attaching to an existing session.' }
} else {
    $executable = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    $profile = Join-Path $workspace '.tools\official-web-benchmark-profile'
    $arguments = @('--app=https://discord.com/app', ('--user-data-dir="' + $profile + '"'), '--no-first-run', '--no-default-browser-check')
}
if (!(Test-Path -LiteralPath $executable)) { throw "Executable not found: $executable" }
$timer = [Diagnostics.Stopwatch]::StartNew()
$startOptions = @{ FilePath = $executable; PassThru = $true; WindowStyle = 'Hidden' }
if ($arguments.Count -gt 0) { $startOptions.ArgumentList = $arguments }
$process = Start-Process @startOptions
$rootId = $process.Id
$window = [IntPtr]::Zero
while ($timer.Elapsed.TotalSeconds -lt 60) {
    $process.Refresh()
    if ($process.HasExited) { throw 'The launched process exited. Close any prior dedicated benchmark instance and retry.' }
    if ($process.MainWindowHandle -ne 0) { $window = $process.MainWindowHandle; break }
    Start-Sleep -Milliseconds 100
}
if ($window -eq [IntPtr]::Zero) { throw 'No application window appeared within 60 seconds.' }
$startup = $timer.Elapsed.TotalMilliseconds
[void][FocusBenchmarkNative]::ShowWindow($window, 9)
[void][FocusBenchmarkNative]::SetForegroundWindow($window)
# Allow network/page initialization to settle. This is separate from window startup.
Start-Sleep -Seconds 15
if ($Minimized) { [void][FocusBenchmarkNative]::ShowWindow($window, 6); Start-Sleep -Seconds 3 }
$logicalProcessors = [Environment]::ProcessorCount
$previous = @{}
$samples = @()
$lastTime = $timer.Elapsed.TotalSeconds
for ($sampleIndex = 0; $sampleIndex -le [Math]::Ceiling($Seconds / 2); $sampleIndex++) {
    $now = $timer.Elapsed.TotalSeconds
    $deltaCpu = 0.0; $workingSet = 0L; $privateMemory = 0L; $measured = 0; $webviewCount = 0
    $ids = [FocusBenchmarkNative]::Tree($rootId)
    $next = @{}
    foreach ($processId in $ids) {
        try {
            $item = Get-Process -Id $processId -ErrorAction Stop
            $key = [string]$processId + ':' + $item.StartTime.Ticks
            $cpu = $item.TotalProcessorTime.TotalSeconds
            $workingSet += $item.WorkingSet64; $privateMemory += $item.PrivateMemorySize64
            if ($previous.ContainsKey($key)) { $deltaCpu += [Math]::Max(0, $cpu - $previous[$key]) }
            $next[$key] = $cpu; $measured++
            if ($item.ProcessName -eq 'msedgewebview2') { $webviewCount++ }
        } catch { }
    }
    $cpuPercent = $null
    if ($sampleIndex -gt 0 -and ($now - $lastTime) -gt 0) { $cpuPercent = $deltaCpu / ($now - $lastTime) / $logicalProcessors * 100 }
    $samples += [PSCustomObject]@{ elapsedSeconds=$now; workingSetBytes=$workingSet; privateBytes=$privateMemory; cpuPercent=$cpuPercent; processCount=$ids.Count; webviewProcessCount=$webviewCount; measuredProcesses=$measured }
    $previous = $next; $lastTime = $now
    if ($sampleIndex -lt [Math]::Ceiling($Seconds / 2)) { Start-Sleep -Seconds 2 }
}
if ($Minimized) { [void][FocusBenchmarkNative]::ShowWindow($window, 9) }
$cpuValues = @($samples | Where-Object { $null -ne $_.cpuPercent })
$report = [ordered]@{
    schema=1; target=$Target; scenario=$Scenario; measuredAt=[DateTime]::UtcNow.ToString('o');
    scope='Launched process and its descendant browser processes; total-machine-normalized CPU';
    authentication='Login-page test unless the operator explicitly signed in';
    windowStartupMs=$startup; startupDefinition='Process launch to MainWindowHandle; excludes page network readiness';
    logicalProcessors=$logicalProcessors; minimized=[bool]$Minimized; durationSeconds=$Seconds;
    summary=@{ meanWorkingSetBytes=($samples | Measure-Object workingSetBytes -Average).Average; meanPrivateBytes=($samples | Measure-Object privateBytes -Average).Average; meanCpuPercent=($cpuValues | Measure-Object cpuPercent -Average).Average; maxProcessCount=($samples | Measure-Object processCount -Maximum).Maximum };
    samples=$samples
}
if (!$Output) { $Output = Join-Path $workspace ('artifacts\benchmarks\' + $Target + '-' + $Scenario + '-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '.json') }
$parent = Split-Path -Parent ([IO.Path]::GetFullPath($Output))
[void](New-Item -ItemType Directory -Force -Path $parent)
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Output -Encoding UTF8
Write-Output ("Benchmark saved: " + $Output)
Write-Output ($report.summary | ConvertTo-Json -Compress)
# Leave the window open for inspection; never terminate a user's active voice call.
