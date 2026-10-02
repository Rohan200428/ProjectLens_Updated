param([switch]$Build)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'resolve-node.ps1')
$nodeExe=Resolve-ProjectNode
$localWork=Join-Path $projectRoot 'work'
$configPath=Join-Path $localWork 'local-config.json'
if(!(Test-Path -LiteralPath $configPath)){ & (Join-Path $PSScriptRoot 'setup-local-mysql.ps1') }
$localConfig=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$databaseDir=Join-Path $localWork 'mysql-data'
$processes=@{}
if(!(Test-NetConnection 127.0.0.1 -Port $localConfig.port -WarningAction SilentlyContinue -InformationLevel Quiet)) {
    $dbProcess=Start-Process -FilePath (Join-Path $localConfig.mysqlBin 'mysqld.exe') -ArgumentList @('--no-defaults',"--basedir=`"$(Split-Path $localConfig.mysqlBin -Parent)`"","--datadir=`"$databaseDir`"","--port=$($localConfig.port)",'--bind-address=127.0.0.1','--mysqlx=OFF','--console') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localWork 'mysql.stdout.log') -RedirectStandardError (Join-Path $localWork 'mysql.stderr.log') -PassThru
    $processes['mysql']=$dbProcess.Id
    Start-Sleep -Seconds 3
}
if($Build){ & mvn -B -q -f (Join-Path $projectRoot 'backend/pom.xml') package; if($LASTEXITCODE -ne 0){throw 'Backend build/test failed.'} }
if(!(Test-NetConnection 127.0.0.1 -Port 8080 -WarningAction SilentlyContinue -InformationLevel Quiet)) {
    $backendScript=Join-Path $PSScriptRoot 'run-backend.ps1'
    $backendProcess=Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$backendScript`"") -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localWork 'backend.stdout.log') -RedirectStandardError (Join-Path $localWork 'backend.stderr.log') -PassThru
    $processes['backend']=$backendProcess.Id
}
if(!(Test-NetConnection 127.0.0.1 -Port 4200 -WarningAction SilentlyContinue -InformationLevel Quiet)) {
    $frontendDir=Join-Path $projectRoot 'frontend'
    if(!(Test-Path -LiteralPath (Join-Path $frontendDir 'node_modules'))) {
        $npmCommand=(Get-Command npm.cmd).Source
        $npmCli=Join-Path (Split-Path $npmCommand -Parent) 'node_modules/npm/bin/npm-cli.js'
        if(!(Test-Path -LiteralPath $npmCli)){throw 'Install npm and run npm ci in frontend/ first.'}
        Push-Location $frontendDir
        try { & $nodeExe $npmCli ci --no-fund; if($LASTEXITCODE -ne 0){throw 'Frontend install failed.'} } finally { Pop-Location }
    }
    $frontendProcess=Start-Process -FilePath $nodeExe -ArgumentList @('node_modules/@angular/cli/bin/ng.js','serve','--configuration','production','--host','127.0.0.1','--proxy-config','proxy.conf.json') -WorkingDirectory $frontendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localWork 'frontend.stdout.log') -RedirectStandardError (Join-Path $localWork 'frontend.stderr.log') -PassThru
    $processes['frontend']=$frontendProcess.Id
}
$pidFile=Join-Path $localWork 'demo-processes.json'
if(Test-Path -LiteralPath $pidFile) { $existingProcesses=Get-Content $pidFile -Raw | ConvertFrom-Json; foreach($entry in $existingProcesses.PSObject.Properties){if(!$processes.ContainsKey($entry.Name)){$processes[$entry.Name]=$entry.Value}} }
$processes | ConvertTo-Json | Set-Content -LiteralPath $pidFile
Write-Host 'Demo starting at http://127.0.0.1:4200. Backend: http://127.0.0.1:8080/api/health'
Write-Host 'Startup logs are in work/. Use scripts/stop-demo.ps1 to stop processes started by this script.'
