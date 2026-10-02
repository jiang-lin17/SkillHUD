<#
  SkillHUD Watchdog - Follow TRAE auto-start daemon
#>
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$log = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "watchdog.log"

function Log($msg){
  "[$(Get-Date -Format 'HH:mm:ss')] $msg" | Out-File $log -Append -Encoding UTF8
}

$HUD_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$HUD_EXE = Join-Path $HUD_DIR "node_modules\electron\dist\electron.exe"
$HUD_TITLE = "SkillHUD"

function Get-TraeCount {
  return @(Get-Process -Name "*trae*" -ErrorAction SilentlyContinue).Count
}
function Is-HudOpen {
  return [bool](Get-Process -Name "electron" -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -eq $HUD_TITLE })
}
function Start-Hud {
  Log ">>> Launching SkillHUD..."
  try {
    Start-Process -FilePath $HUD_EXE -ArgumentList "`"$HUD_DIR`"" `
      -WorkingDirectory $HUD_DIR -WindowStyle Normal
    Log "    Start request sent"
  } catch {
    Log "    FAILED: $_"
  }
}

Log "===== Watchdog Started ====="
Log "TRAE initial count: $(Get-TraeCount)"
Log "HUD open: $(Is-HudOpen)"
Log "HUD_EXE: $HUD_EXE exists=$(Test-Path $HUD_EXE)"

$checkInterval = 8
$traeActive = (Get-TraeCount) -gt 0
$hudSeenRunning = Is-HudOpen

while ($true) {
  Start-Sleep -Seconds $checkInterval

  $traeNow = Get-TraeCount
  $hudNow  = Is-HudOpen

  # Scenario A: TRAE running, HUD not running -> launch
  if ($traeNow -gt 0 -and -not $hudNow) {
    Log "TRAE=$traeNow HUD=closed -> launch SkillHUD"
    Start-Hud
    Start-Sleep 3
    continue
  }

  # Scenario B: TRAE just started (was 0, now >0) -> immediate launch
  if (-not $traeActive -and $traeNow -gt 0 -and -not $hudNow) {
    Log "[NEW] TRAE just started -> launch SkillHUD immediately"
    Start-Hud
    Start-Sleep 3
  }

  # Scenario C: HUD was running before, now closed -> relaunch (guardian)
  if ($hudSeenRunning -and -not $hudNow -and $traeNow -gt 0) {
    Log "[GUARD] HUD was running but now closed -> relaunch"
    Start-Hud
    Start-Sleep 3
  }

  if ($hudNow) { $hudSeenRunning = $true }
  $traeActive = ($traeNow -gt 0)
}