$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$env:USERPROFILE\Desktop\RagsMC Launcher.lnk")
$sc.TargetPath = "$env:APPDATA\.minecraft\RagsMC-Launcher.exe"
$sc.WorkingDirectory = "$env:APPDATA\.minecraft"
$sc.IconLocation = "$env:APPDATA\.minecraft\RagsMC-Launcher.exe,0"
$sc.Description = "RagsMC Launcher"
$sc.Save()

$sc2 = $ws.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\RagsMC Launcher\RagsMC Launcher.lnk")
$sc2.TargetPath = "$env:APPDATA\.minecraft\RagsMC-Launcher.exe"
$sc2.WorkingDirectory = "$env:APPDATA\.minecraft"
$sc2.IconLocation = "$env:APPDATA\.minecraft\RagsMC-Launcher.exe,0"
$sc2.Description = "RagsMC Launcher"
$sc2.Save()
