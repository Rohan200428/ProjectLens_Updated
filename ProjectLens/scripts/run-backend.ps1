param([switch]$UseMaven)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$configPath=Join-Path $projectRoot 'work/local-config.json'
if(Test-Path -LiteralPath $configPath) {
    $localConfig=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    $env:DB_URL="jdbc:mysql://127.0.0.1:$($localConfig.port)/projectlens_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
    $env:DB_USERNAME=$localConfig.dbUsername
    $env:DB_PASSWORD=$localConfig.dbPassword
    $env:JWT_SECRET=$localConfig.jwtSecret
}
Set-Location -LiteralPath (Join-Path $projectRoot 'backend')
if($UseMaven) { & mvn spring-boot:run; exit $LASTEXITCODE }
$jarPath=Join-Path $projectRoot 'backend/target/projectlens-1.0.0.jar'
if(!(Test-Path -LiteralPath $jarPath)) { & mvn -B -q -DskipTests package; if($LASTEXITCODE -ne 0){throw 'Backend build failed.'} }
& java -jar $jarPath
exit $LASTEXITCODE
