param([switch]$Development)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'resolve-node.ps1')
$nodeExe=Resolve-ProjectNode
$projectRoot=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath (Join-Path $projectRoot 'frontend')
if(!(Test-Path 'node_modules/@angular/cli/bin/ng.js')){throw 'Run npm ci in frontend/ first, using a compatible Node runtime.'}
$buildConfiguration=if($Development){'development'}else{'production'}
& $nodeExe node_modules/@angular/cli/bin/ng.js serve --configuration $buildConfiguration --host 127.0.0.1 --proxy-config proxy.conf.json
exit $LASTEXITCODE
