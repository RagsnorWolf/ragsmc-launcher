$mcRoot = "$env:APPDATA\.minecraft"
$java = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\javaw.exe"

$fabricJson = Get-Content "$mcRoot\versions\fabric-loader-0.19.5-1.21.10\fabric-loader-0.19.5-1.21.10.json" | ConvertFrom-Json
$vanillaJson = Get-Content "$mcRoot\versions\1.21.10\1.21.10.json" | ConvertFrom-Json

$allEntries = @()
$allEntries += $fabricJson.libraries
$allEntries += $vanillaJson.libraries

$libMap = @{}
foreach ($lib in $allEntries) {
    $parts = $lib.name -split ":"
    if ($parts.Count -ge 3) {
        $key = "$($parts[0]):$($parts[1])"
        $ver = $parts[2]
        if (-not $libMap.ContainsKey($key) -or ($ver -gt $libMap[$key].version)) {
            $libMap[$key] = @{ version = $ver; lib = $lib }
        }
    }
}

$clientJar = "$mcRoot\versions\fabric-loader-0.19.5-1.21.10\fabric-loader-0.19.5-1.21.10.jar"
$cpEntries = @($clientJar)

foreach ($entry in $libMap.Values) {
    $lib = $entry.lib
    $parts = $lib.name -split ":"
    $group = $parts[0] -replace "\.", "\"
    $artifact = $parts[1]
    $version = $parts[2]
    $jarPath = "$mcRoot\libraries\$group\$artifact\$version\$artifact-$version.jar"
    if (Test-Path $jarPath) {
        $cpEntries += $jarPath
    }
}

$classpath = $cpEntries -join ";"
Write-Output "Classpath: $($cpEntries.Count) entries"

$asmJars = $cpEntries | Where-Object { $_ -like "*\asm\*" }
Write-Output "ASM jars: $($asmJars.Count)"

$args = @(
    "-Xmx4096M",
    "-Xms1024M",
    "-Djava.net.preferIPv4Stack=true",
    "-cp",
    $classpath,
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

Write-Output "Launching Minecraft..."
$proc = Start-Process -FilePath $java -ArgumentList $args -WorkingDirectory $mcRoot -PassThru
Write-Output "PID: $($proc.Id)"
