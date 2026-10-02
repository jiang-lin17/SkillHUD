Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlPath = Join-Path $dir "index.html"
if(-not (Test-Path $htmlPath)){ Write-Host "index.html not found"; exit }

$form = New-Object System.Windows.Forms.Form
$form.Text = "SkillHUD"
$form.Size = New-Object System.Drawing.Size(380, 600)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true
$form.FormBorderStyle = "None"
$form.BackColor = [System.Drawing.Color]::FromArgb(244, 245, 247)
$form.ShowInTaskbar = $true
$form.MinimumSize = New-Object System.Drawing.Size(320, 400)

# Title bar
$tb = New-Object System.Windows.Forms.Panel
$tb.Size = New-Object System.Drawing.Size(380, 34)
$tb.BackColor = [System.Drawing.Color]::FromArgb(255, 255, 255)
$tb.Dock = "Top"
$tb.Padding = New-Object System.Windows.Forms.Padding(12, 0, 8, 0)

$tl = New-Object System.Windows.Forms.Label
$tl.Text = "  SkillHUD"
$tl.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$tl.ForeColor = [System.Drawing.Color]::FromArgb(22, 24, 29)
$tl.Size = New-Object System.Drawing.Size(200, 24)
$tl.Location = New-Object System.Drawing.Point(0, 7)
$tb.Controls.Add($tl)

# Close
$bc = New-Object System.Windows.Forms.Button
$bc.Text = "X"
$bc.Size = New-Object System.Drawing.Size(26, 26)
$bc.Location = New-Object System.Drawing.Point(346, 4)
$bc.FlatStyle = "Flat"
$bc.FlatAppearance.BorderSize = 0
$bc.BackColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
$bc.ForeColor = [System.Drawing.Color]::FromArgb(22, 24, 29)
$bc.Add_Click({ $form.Close() })
$tb.Controls.Add($bc)

# Drag
$drag = $null
$tb.Add_MouseDown({ param($s,$e); if($e.Button -eq "Left"){ $script:drag = @{X=$e.X; Y=$e.Y} } })
$tb.Add_MouseMove({ param($s,$e); if($script:drag -ne $null){ $form.Location = New-Object System.Drawing.Point($form.Location.X + $e.X - $script:drag.X, $form.Location.Y + $e.Y - $script:drag.Y) } })
$tb.Add_MouseUp({ $script:drag = $null })

$form.Controls.Add($tb)

# WebBrowser
$wb = New-Object System.Windows.Forms.WebBrowser
$wb.Dock = "Fill"
$wb.ScriptErrorsSuppressed = $true
$wb.Navigate("file:///$($htmlPath -replace '\\','/')")
$form.Controls.Add($wb)

$form.ShowDialog()

