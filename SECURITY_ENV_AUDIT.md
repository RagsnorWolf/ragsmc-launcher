# Auditoría de Seguridad - Variables de Entorno
## RagsMC Launcher

**Fecha:** 2026-09-16
**Auditor:** OpenCode (automated)

---

## 1. Archivos .env encontrados

| Ubicación | Estado |
|-----------|--------|
| `C:\ragsmc-launcher\.env` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\.env.local` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\.env.production` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\secrets.json` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\credentials.json` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\*.pfx` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\*.pem` | **NO EXISTE** ✅ |
| `C:\ragsmc-launcher\*.key` | **NO EXISTE** ✅ |

**Resultado:** LIMPIO - No hay archivos de credenciales en el proyecto.

---

## 2. Estado del .gitignore

**ANTES (vulnerable):**
```
# Faltaban:
.env
.env.local
.env.production
secrets.json
credentials.json
*.key
*.pem
*.pfx
*.p12
```

**DESPUÉS (corregido):**
```
# Secrets & credentials
.env
.env.local
.env.production
.env.development
secrets.json
credentials.json
*.key
*.pem
*.pfx
*.p12
*.jks
ragsmc-signing.pfx
```

**Resultado:** CORREGIDO ✅

---

## 3. Contenido del instalador

Se extrajo `RagsMC_Launcher_Setup_v1.0.3.exe` con 7-Zip:

```
$ragsmc-launcher.exe              (10.7 MB)  ← Launcher compilado
$icon.ico                         (362 KB)   ← Icono
Uninstall RagsMC Launcher.exe     (402 KB)   ← Desinstalador
$PLUGINSDIR\*.dll                 (NSIS)     ← Plugins del instalador
```

**Resultado:** LIMPIO - No hay .env ni archivos de credenciales dentro del instalador ✅

---

## 4. Historial de Git

Comando ejecutado:
```bash
git log --all --full-history -- .env .env.local .env.production secrets.json credentials.json
```

**Resultado:** SIN HISTORIAL - El .env nunca estuvo en el repositorio ✅

---

## 5. Claves hardcodeadas en el código

Búsqueda realizada en:
- `src/**/*.ts` y `src/**/*.tsx` → **0 resultados** ✅
- `src-tauri/**/*.rs` → **0 resultados** ✅

Único uso de `std::env::var` en Rust:
- `APPDATA` → Variable del sistema Windows
- `HOME` → Variable del sistema
- `JAVA_HOME` → Variable del sistema

**Resultado:** LIMPIO - No hay claves hardcodeadas ✅

---

## 6. Variables de entorno del proyecto

El proyecto NO usa variables de entorno custom. Toda la comunicación es:
- **Microsoft OAuth2**: Flujo estándar de autenticación (sin API key estática)
- **Modrinth API**: Endpoint público (sin key)
- **Minecraft API**: Endpoint oficial de Mojang/Microsoft

Se creó `.env.example` como referencia para futuras necesidades.

---

## 7. Resumen de seguridad

| Aspecto | Estado |
|---------|--------|
| Archivos .env | ✅ No existen |
| .gitignore | ✅ Actualizado |
| Instalador | ✅ Limpio |
| Historial Git | ✅ Sin exposiciones |
| Claves hardcodeadas | ✅ No encontradas |
| API keys estáticas | ✅ No se usan |

**Nivel de riesgo: BAJO** - El proyecto no maneja secrets estáticos.

---

## 8. Recomendaciones

1. **Nunca crear .env con claves reales** - El proyecto no las necesita
2. **Si en el futuro se necesitan API keys**, usar un backend propio que las gestione
3. **El certificado de firma** (`ragsmc-signing.pfx`) NO debe subirse al repo (ya está en .gitignore)
4. **Auditar periódicamente** con `git log --all --full-history -- '*.env*' '*secret*'`
