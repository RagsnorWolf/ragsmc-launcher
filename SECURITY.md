# Seguridad - RagsMC Launcher

## Declaración

RagsMC Launcher es un software **legítimo, seguro y de código abierto**. No contiene malware, spyware, ni código malicioso de ningún tipo.

## Falsos Positivos

El instalador (`RagsMC-Installer.exe`) puede ser marcado por algunos antivirus como sospechoso. Esto es un **falso positivo** causado por:

1. **NSIS (Nullsoft Scriptable Install System)** — El empaquetador usado para crear el instalador. Los creadores de malware también usan NSIS, por lo que algunos antivirus heurísticos marcan TODOS los instaladores NSIS como sospechosos.

2. **Certificado de firma autofirmado** — No contamos con un certificado de una Autoridad de Certificación (CA) de confianza, lo que algunos antivirus consideran sospechoso.

3. **Software nuevo** — Nuestro dominio y ejecutable no tienen historial de reputación aún.

### Soluciones aplicadas

- [x] Metadatos PE completos (CompanyName, FileDescription, Copyright, Version)
- [x] Firma digital con certificado SHA-256
- [x] Hash SHA-256 publicado en la página web
- [x] Código fuente público en GitHub
- [x] Sin UPX ni ofuscación
- [x] README.txt incluido en el instalador

### Verificar que el instalador es seguro

1. **VirusTotal**: https://www.virustotal.com/gui/search/[SHA256]
2. **Código fuente**: https://github.com/RagsnorWolf/ragsmc-launcher
3. **Página web**: https://ragslaunchermc.dpdns.org

### Reportar falsos positivos

Si tu antivirus marca el instalador como sospechoso:

1. Sube el archivo a https://www.virustotal.com para verificar que es seguro
2. Descarga solo desde nuestras fuentes oficiales
3. Verifica el hash SHA-256 en nuestra página web
4. Contactanos en https://ragslaunchermc.dpdns.org para reportar el falso positivo

## Dependencias

Todas las dependencias del proyecto son legítimas y están en registros públicos:

- **Rust crates**: https://crates.io (verificadas por la comunidad)
- **npm packages**: https://www.npmjs.com (verificados por la comunidad)
- **URLs de descarga**: Solo de servidores oficiales (Mojang, Fabric, Forge, Adoptium, Modrinth)

## Contacto

- GitHub: https://github.com/RagsnorWolf/ragsmc-launcher/issues
- Web: https://ragslaunchermc.dpdns.org
