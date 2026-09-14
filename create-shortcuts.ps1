$iconPath = "$env:APPDATA\.minecraft\RagsMC-Icon.ico"
$exePath = "$env:APPDATA\.minecraft\RagsMC-Launcher.exe"
$desktopPath = "$env:USERPROFILE\Desktop\RagsMC Launcher.lnk"
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\RagsMC Launcher\RagsMC Launcher.lnk"

$ws = New-Object -ComObject WScript.Shell

$sc = $ws.CreateShortcut($desktopPath)
$sc.TargetPath = $exePath
$sc.WorkingDirectory = "$env:APPDATA\.minecraft"
$sc.IconLocation = "$iconPath,0"
$sc.Description = "RagsMC Launcher"
$sc.Save()

$sc2 = $ws.CreateShortcut($startMenuPath)
$sc2.TargetPath = $exePath
$sc2.WorkingDirectory = "$env:APPDATA\.minecraft"
$sc2.IconLocation = "$iconPath,0"
$sc2.Description = "RagsMC Launcher"
$sc2.Save()
