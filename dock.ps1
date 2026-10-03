<#
  SkillHUD Dock - follow the TRAE main window.

  Polls the target process' main window geometry and streams one JSON object
  per CHANGED sample to stdout, so Electron can keep SkillHUD snapped onto it.

  Read-only: this script never moves, resizes or closes the target window.

  Usage:
    powershell -NoProfile -ExecutionPolicy Bypass -File dock.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File dock.ps1 -ProcName "TRAE SOLO CN"
    powershell -NoProfile -ExecutionPolicy Bypass -File dock.ps1 -ProcName powershell -ClassName "" -TitleLike FakeTrae   (stand-in test)

  Output (one line per changed sample):
    {"procFound":true,"hwnd":65702,"x":0,"y":0,"w":1600,"h":900,
     "minimized":false,"visible":true,"foreground":true}

  Notes:
    - Pure ASCII only (PowerShell 5 + GBK console breaks on emoji/CJK).
    - Save this file as UTF-8 WITH BOM.
    - Geometry is in PHYSICAL pixels; the caller converts it to DIP.
    - A minimized window reports a -32000 placeholder rect, so we fall back to
      GetWindowPlacement().rcNormalPosition to get the restore geometry.
#>
param(
  [string]$ProcName  = "TRAE SOLO CN",
  [string]$ClassName = "Chrome_WidgetWin_1",
  [string]$TitleLike = "",
  [int]$IntervalMs   = 250
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class SkillHudDock
{
    private delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] private static extern bool GetWindowPlacement(IntPtr hWnd, ref WPL pw);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);

    [StructLayout(LayoutKind.Sequential)] private struct RECT { public int L, T, R, B; }
    [StructLayout(LayoutKind.Sequential)] private struct PT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] private struct WPL {
        public int length; public int flags; public int showCmd;
        public PT ptMin; public PT ptMax; public RECT rcNormal;
    }

    private class Cand { public IntPtr H; public long Area; }

    // A DPI-unaware process gets VIRTUALIZED rects from GetWindowRect; declare
    // awareness first so the numbers below are true physical pixels.
    public static void MakeDpiAware()
    {
        try { SetProcessDPIAware(); } catch { }
    }

    public static IntPtr FindMain(uint[] pids, string cls, string titleLike)
    {
        if (pids == null || pids.Length == 0) return IntPtr.Zero;

        Cand bestVisible = null, bestAny = null;
        EnumWindows(delegate(IntPtr h, IntPtr l)
        {
            uint pid; GetWindowThreadProcessId(h, out pid);
            bool hit = false;
            for (int i = 0; i < pids.Length; i++) { if (pids[i] == pid) { hit = true; break; } }
            if (!hit) return true;

            if (cls != null && cls.Length > 0)
            {
                StringBuilder cb = new StringBuilder(256);
                GetClassName(h, cb, cb.Capacity);
                if (cb.ToString() != cls) return true;
            }
            if (titleLike != null && titleLike.Length > 0)
            {
                StringBuilder tb = new StringBuilder(512);
                GetWindowText(h, tb, tb.Capacity);
                if (tb.ToString().IndexOf(titleLike, StringComparison.OrdinalIgnoreCase) < 0) return true;
            }

            RECT r; GetWindowRect(h, out r);
            long area = (long)(r.R - r.L) * (r.B - r.T);
            if (area < 0) area = 0;
            Cand c = new Cand(); c.H = h; c.Area = area;

            if (IsWindowVisible(h)) { if (bestVisible == null || area > bestVisible.Area) bestVisible = c; }
            if (bestAny == null || area > bestAny.Area) bestAny = c;
            return true;
        }, IntPtr.Zero);

        Cand pick = bestVisible != null ? bestVisible : bestAny;
        return pick == null ? IntPtr.Zero : pick.H;
    }

    // Returns "hwnd,x,y,w,h,minimized,visible,foreground" (comma separated, physical px).
    public static string Sample(uint[] pids, string cls, string titleLike)
    {
        IntPtr h = FindMain(pids, cls, titleLike);
        if (h == IntPtr.Zero) return "0,0,0,0,0,0,0,0";

        bool iconic = IsIconic(h);
        bool visible = IsWindowVisible(h);
        RECT r;
        if (iconic)
        {
            WPL wp = new WPL();
            wp.length = Marshal.SizeOf(typeof(WPL));
            if (!GetWindowPlacement(h, ref wp)) GetWindowRect(h, out r);
            else r = wp.rcNormal;
        }
        else
        {
            GetWindowRect(h, out r);
        }

        bool fg = GetForegroundWindow() == h;
        return string.Join(",", new string[] {
            h.ToInt64().ToString(),
            r.L.ToString(), r.T.ToString(),
            (r.R - r.L).ToString(), (r.B - r.T).ToString(),
            iconic ? "1" : "0", visible ? "1" : "0", fg ? "1" : "0"
        });
    }
}
"@

# "*" (or empty) means "do not filter on this attribute" - handy for stand-in tests
if (-not $ClassName -or $ClassName -eq "*") { $ClassName = $null }
if (-not $TitleLike -or $TitleLike -eq "*") { $TitleLike = $null }

[SkillHudDock]::MakeDpiAware()

$last = ""

while ($true) {
  $raw = "0,0,0,0,0,0,0,0"
  try {
    $pids = @(Get-Process -Name $ProcName -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
    $raw  = [SkillHudDock]::Sample([uint32[]]$pids, $ClassName, $TitleLike)
  } catch {
    break
  }

  if ($raw -ne $last) {
    $last = $raw
    try {
      $p = $raw.Split(",")
      $obj = [ordered]@{
        procFound  = ($p[0] -ne "0")
        hwnd       = [int64]$p[0]
        x          = [int]$p[1]
        y          = [int]$p[2]
        w          = [int]$p[3]
        h          = [int]$p[4]
        minimized  = ($p[5] -eq "1")
        visible    = ($p[6] -eq "1")
        foreground = ($p[7] -eq "1")
      }
      [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress))
      [Console]::Out.Flush()
    } catch {
      # stdout pipe closed -> the Electron parent is gone
      break
    }
  }

  Start-Sleep -Milliseconds $IntervalMs
}