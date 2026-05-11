$ErrorActionPreference = "Stop"

$buildDir = Join-Path $PSScriptRoot "build"
if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir -Force | Out-Null }

$x64Url = "https://aka.ms/vs/17/release/vc_redist.x64.exe"
$x86Url = "https://aka.ms/vs/17/release/vc_redist.x86.exe"
$x64Dest = Join-Path $buildDir "vc_redist.x64.exe"
$x86Dest = Join-Path $buildDir "vc_redist.x86.exe"

Write-Host "Downloading VC++ Redistributable x64..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $x64Url -OutFile $x64Dest -UseBasicParsing
Write-Host "  -> vc_redist.x64.exe ($([math]::Round((Get-Item $x64Dest).Length / 1MB, 1)) MB)" -ForegroundColor Green

Write-Host "Downloading VC++ Redistributable x86..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $x86Url -OutFile $x86Dest -UseBasicParsing
Write-Host "  -> vc_redist.x86.exe ($([math]::Round((Get-Item $x86Dest).Length / 1MB, 1)) MB)" -ForegroundColor Green

Write-Host "`nDone! VC++ runtimes ready in build/" -ForegroundColor Green
