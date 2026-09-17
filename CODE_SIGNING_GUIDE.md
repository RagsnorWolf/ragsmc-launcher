# Guía de Firma Digital - RagsMC Launcher

## Estado Actual

El instalador está firmado con un certificado **autofirmado** (self-signed). Esto significa:
- La firma es **válida** y verificable
- Pero **no es confiable** para Windows/antivirus porque no viene de una Autoridad de Certificación (CA)
- Resultado en VirusTotal: "invalid-signature"

## Solución: Certificado de Code Signing

### Opción 1: Comprar certificado (Recomendado)

Costo: ~$50-200 USD/año

Proveedores:
- **Sectigo** (antes Comodo): https://www.sectigo.com/codesigning
- **DigiCert**: https://www.digicert.com/code-signing
- **SSL.com**: https://www.ssl.com/code-signing
- **Certum**: https://certum.pl/products/opensource-code-signing/

Pasos:
1. Comprar el certificado
2. Validar identidad (email, empresa, etc.)
3. Recibir el certificado (.pfx o .p12)
4. Firmar con signtool:
```bash
signtool sign /fd SHA256 /a /f certificate.pfx /p PASSWORD RagsMC_Launcher_Setup_v1.0.3.exe
```

### Opción 2: Certificado autofirmado (Actual)

```powershell
# Crear certificado
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=RagsMC, O=RagsMC, C=AR" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(3) `
    -HashAlgorithm SHA256

# Firmar
signtool sign /fd SHA256 /a /sha1 $cert.Thumbprint archivo.exe
```

Limitaciones:
- Windows SmartScreen sigue advirtiendo
- Algunos antivirus marcan como "invalid-signature"
- No elimina falsos positivos

## Recomendación

Para eliminar TODOS los falsos positivos y SmartScreen:
1. Comprar certificado de Sectigo o SSL.com (~$50/año)
2. Firmar el instalador y el launcher
3. Subir a Microsoft para análisis: https://www.microsoft.com/en-us/wdsi/filesubmission
