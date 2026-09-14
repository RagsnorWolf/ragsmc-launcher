#!/usr/bin/env pwsh
$ErrorActionPreference = "Continue"
$cp = Get-Content "C:\ragsmc-launcher\cp.txt" -Raw
$mcRoot = "$env:APPDATA\.minecraft"
$java = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\java.exe"
$nativesDir = "$mcRoot\versions\fabric-loader-0.19.5-1.21.10\natives"

Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$args = @(
    "-Xmx4096M",
    "-Xms1024M",
    "-Djava.net.preferIPv4Stack=true",
    "-Djava.library.path=$nativesDir",
    "-cp", $cp,
    "net.fabricmc.loader.impl.launch.knot.KnotClient",
    "--username", "RagsnorWolf",
    "--version", "fabric-loader-0.19.5-1.21.10",
    "--gameDir", $mcRoot,
    "--assetsDir", "$mcRoot\assets",
    "--assetIndex", "14",
    "--uuid", "00000000-0000-0000-0000-000000000001",
    "--accessToken", "0",
    "--userType", "legacy",
    "--userProperties", "{}",
    "--width", "1280",
    "--height", "720"
)

Write-Output "Launching..."
$proc = Start-Process -FilePath $java -ArgumentList $args -WorkingDirectory $mcRoot -PassThru -RedirectStandardError "C:\ragsmc-launcher\stderr.log"
Write-Output "PID: $($proc.Id)"
Write-Output "Waiting 45s..."
Start-Sleep -Seconds 45
if (!$proc.HasExited) {
    Write-Output "STILL RUNNING (good!)"
} else {
    Write-Output "EXITED code=$($proc.ExitCode)"
}
Write-Output "stderr tail:"
Get-Content "C:\ragsmc-launcher\stderr.log" -Tail 20 -ErrorAction SilentlyContinue
Write-Output "latest.log tail:"
Get-Content "$mcRoot\logs\latest.log" -Tail 15 -ErrorAction SilentlyContinue
