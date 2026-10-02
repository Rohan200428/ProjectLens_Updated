param([int]$Port=3307, [string]$MySqlBin='C:\Program Files\MySQL\MySQL Server 8.0\bin')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$localWork=Join-Path $projectRoot 'work'
New-Item -ItemType Directory -Force $localWork | Out-Null
$configPath=Join-Path $localWork 'local-config.json'
if(Test-Path -LiteralPath $configPath) { Write-Host 'Local database is already configured. Use scripts/start-demo.ps1.'; exit 0 }
$databaseDir=Join-Path $localWork 'mysql-data'
if(!(Test-Path -LiteralPath $databaseDir)) {
    New-Item -ItemType Directory $databaseDir | Out-Null
    & (Join-Path $MySqlBin 'mysqld.exe') --no-defaults --initialize-insecure "--basedir=$(Split-Path $MySqlBin -Parent)" "--datadir=$databaseDir" --console
    if($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed.' }
}
if(!(Test-NetConnection 127.0.0.1 -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet)) {
    Start-Process -FilePath (Join-Path $MySqlBin 'mysqld.exe') -ArgumentList @('--no-defaults',"--basedir=`"$(Split-Path $MySqlBin -Parent)`"","--datadir=`"$databaseDir`"","--port=$Port",'--bind-address=127.0.0.1','--mysqlx=OFF','--console') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localWork 'mysql.stdout.log') -RedirectStandardError (Join-Path $localWork 'mysql.stderr.log') | Out-Null
    Start-Sleep -Seconds 3
}
function New-LocalSecret { $secretBytes=New-Object byte[] 40; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes); return [Convert]::ToBase64String($secretBytes) }
$dbSecret=New-LocalSecret
$rootSecret=New-LocalSecret
$jwtSecret=New-LocalSecret
$sql="CREATE DATABASE IF NOT EXISTS projectlens_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'projectlens'@'localhost' IDENTIFIED BY '$dbSecret'; GRANT ALL PRIVILEGES ON projectlens_db.* TO 'projectlens'@'localhost'; ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootSecret';"
$sql | & (Join-Path $MySqlBin 'mysql.exe') --no-defaults --host=127.0.0.1 "--port=$Port" --user=root
if($LASTEXITCODE -ne 0) { throw 'Database setup failed. See work/mysql.stderr.log.' }
@{port=$Port;dbUsername='projectlens';dbPassword=$dbSecret;rootPassword=$rootSecret;jwtSecret=$jwtSecret;mysqlBin=$MySqlBin} | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8
# Keep generated local credentials available only to this Windows user.
& icacls.exe $configPath /inheritance:r /grant:r "$($env:USERNAME):(F)" | Out-Null
Write-Host "Local MySQL configured on 127.0.0.1:$Port. Generated credentials are in ignored work/local-config.json."
