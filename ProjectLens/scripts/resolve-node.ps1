# Select a compatible installed Node runtime, falling back to Codex's bundled runtime.
function Resolve-ProjectNode {
    $candidates=@((Get-Command node.exe -ErrorAction SilentlyContinue).Source,(Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'))
    foreach($candidate in $candidates) {
        if($candidate -and (Test-Path -LiteralPath $candidate)) {
            $versionText=(& $candidate --version).Trim().TrimStart('v')
            $version=[Version]$versionText
            if(($version.Major -eq 20 -and $version.Minor -ge 19) -or ($version.Major -eq 22 -and $version.Minor -ge 12) -or $version.Major -ge 24){return $candidate}
        }
    }
    throw 'Angular requires Node 20.19+, 22.12+, or 24+. Install a compatible Node LTS runtime.'
}
