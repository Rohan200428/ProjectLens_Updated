$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$pidFile=Join-Path $projectRoot 'work/demo-processes.json'
if(!(Test-Path -LiteralPath $pidFile)){Write-Host 'No managed demo processes recorded.';exit 0}
$managedProcesses=Get-Content $pidFile -Raw | ConvertFrom-Json
function Stop-ManagedTree([int]$processId) {
    $managedProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if(!$managedProcess){return}
    $childProcesses=Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId"
    foreach($child in $childProcesses){Stop-ManagedTree $child.ProcessId}
    Stop-Process -Id $processId -ErrorAction SilentlyContinue
}
foreach($entry in $managedProcesses.PSObject.Properties) {
    $managedProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.Value)" -ErrorAction SilentlyContinue
    if($managedProcess -and $managedProcess.CommandLine -and ($managedProcess.CommandLine.Contains($projectRoot) -or ($entry.Name -eq 'frontend' -and $managedProcess.CommandLine.Contains('node_modules/@angular/cli/bin/ng.js')))) { Stop-ManagedTree $managedProcess.ProcessId }
}
# Resolve task-owned listeners as well, in case a launching shell has exited.
$backendJar=(Join-Path $projectRoot 'backend/target/projectlens-1.0.0.jar').Replace('/','\')
Get-NetTCPConnection -State Listen -LocalPort 8080,4200 -ErrorAction SilentlyContinue | ForEach-Object {
    $listenerProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
    if($listenerProcess -and $listenerProcess.CommandLine) {
        if(($_.LocalPort -eq 8080 -and $listenerProcess.CommandLine.Contains($backendJar)) -or ($_.LocalPort -eq 4200 -and $listenerProcess.CommandLine.Contains('node_modules/@angular/cli/bin/ng.js'))) { Stop-ManagedTree $listenerProcess.ProcessId }
    }
}
Remove-Item -LiteralPath $pidFile
Write-Host 'Managed application processes stopped. Database files have been preserved.'
