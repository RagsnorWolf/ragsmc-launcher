@echo off
set MCROOT=%APPDATA%\.minecraft
set JAVA="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot\bin\javaw.exe"

echo Building classpath...
set CP=%MCROOT%\versions\fabric-loader-0.19.5-1.21.10\fabric-loader-0.19.5-1.21.10.jar

REM Add all library jars (deduplicated by highest version)
for /r "%MCROOT%\libraries" %%f in (*.jar) do (
    set "CP=!CP!;%%f"
)

echo Starting Minecraft with Fabric...
"%JAVA%" -Xmx4096M -Xms1024M -Djava.net.preferIPv4Stack=true -cp "%CP%" net.fabricmc.loader.impl.launch.knot.KnotClient --username RagsnorWolf --version fabric-loader-0.19.5-1.21.10 --gameDir "%MCROOT%" --assetsDir "%MCROOT%\assets" --assetIndex 14 --uuid 00000000-0000-0000-0000-000000000001 --accessToken 0 --userType legacy --userProperties "{}" --width 1280 --height 720
echo Exit code: %ERRORLEVEL%
