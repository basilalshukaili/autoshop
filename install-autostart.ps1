# Run this as Administrator to make AutoShop Pro start automatically on boot
# (creates a Windows Scheduled Task that launches start.bat at user logon)

$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
$bat = Join-Path $here "start.bat"
$taskName = "AutoShopPro"

if (-not (Test-Path $bat)) {
    Write-Host "ERROR: $bat not found" -ForegroundColor Red
    exit 1
}

$action = New-ScheduledTaskAction -Execute $bat
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Days 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

try {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "AutoShop Pro garage server (Powered by Basil)"
    Write-Host "Scheduled task '$taskName' created. AutoShop Pro will now start automatically when you log into Windows." -ForegroundColor Green
    Write-Host "Test it: schtasks /run /tn $taskName" -ForegroundColor Yellow
} catch {
    Write-Host "Failed to create scheduled task: $_" -ForegroundColor Red
    Write-Host "Tip: Right-click PowerShell and 'Run as Administrator', then run this script." -ForegroundColor Yellow
    exit 1
}
