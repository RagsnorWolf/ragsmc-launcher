# REPORTE_MODS.md - RagsMC Launcher v1.0.0
## Fecha: 2026-09-12 (Actualizado)

---

## Resumen de Cambios

### FIX CRITICO: Ruta `game_dir_of`
- **Problema**: `game_dir_of()` retornaba `.minecraft/instances/{version_id}` cuando `game_dir` estaba vacio.
- **Solucion**: Cambiado para retornar `data_root()` (.minecraft/) directamente.
- **Impacto**: Corregido deteccion de mods, logs, shaders, resourcepacks y backups.

---

### FASE 1: GESTOR DE JAVA (NUEVO)

#### 1.1 Deteccion automatica de Java
- **Backend Rust**: `detect_java_versions()` escanea rutas del sistema:
  - JAVA_HOME, PATH
  - `C:\Program Files\Eclipse Adoptium`
  - `C:\Program Files\Java`
  - `C:\Program Files\Microsoft`
  - `C:\Program Files\Zulu`
  - `C:\Program Files\BellSoft`
  - Runtimes de Mojang en `.minecraft/runtime`
  - Runtimes propios de RagsMC en `.minecraft/runtimes`
- Retorna: path, majorVersion, fullVersion, vendor, recommendedFor
- **Frontend**: `detect_java_versions` Tauri command registrado

#### 1.2 Recomendacion por version
- `heuristic_min_java()` retorna Java minimo por MC version
- `get_recommended_java()` retorna Java recomendado
- **UI**: Tags "Recomendada" en cada Java detectado

#### 1.3 Interfaz en Settings
- **Tabs**: Java, Memoria, Pantalla, Avanzado
- **Tab Java**: Lista de Java detectada con:
  - Version mayor (badge coloreado: 21=verde, 17=azul, 8=amarillo)
  - Vendor (Temurin, Microsoft, Zulu, etc.)
  - Version completa
  - Ruta completa
  - Tag "Recomendada" si es compatible con alguna version MC
  - Click para seleccionar
- **Boton Refrescar** para re-detectar
- **Campo de ruta personalizada**

#### 1.4 Botones rapidos de memoria
- Presets de 2GB, 4GB, 6GB, 8GB en el tab de Memoria
- Presets de resolucion HD, FHD, QHD en el tab de Pantalla

---

### FASE 2: MODAL DE DESCARGA MEJORADO

#### 2.1 Velocidad y tiempo
- Muestra velocidad de descarga en MB/s o KB/s
- Muestra tiempo restante estimado
- Muestra bytes descargados / total

#### 2.2 Logs en vivo
- Panel expandible "Mostrar logs (N)" con todas las lineas de progreso
- Colores por nivel: verde=OK, amarillo=warn, rojo=error
- Auto-scroll con boton de copiar

#### 2.3 Etapas de progreso
- Etiquetas de fase: Verificando, Localizando Java, Instalando, Descargando, Extrayendo, Iniciando
- Barra de progreso con gradiente verde neón

---

### FASE 3: GESTOR DE MODS, SHADERS Y RESOURCE PACKS

#### 3.1 Tabs de contenido
- **Mods** (44 detectados en `.minecraft/mods/`)
- **Shaders** (7 detectados en `.minecraft/shaderpacks/`)
- **Resource Packs** (0 en `.minecraft/resourcepacks/`)
- **Explorar Mods** (busqueda Modrinth integrada)

#### 3.2 Metadata de mods desde JAR
- `read_mod_metadata()` lee `fabric.mod.json`, `META-INF/mods.toml`, `quilt.mod.json`
- Extrae: nombre real, version, descripcion, versiones de MC compatibles

#### 3.3 Advertencia de mods incompatibles
- Badge rojo "Incompatible" si el mod no soporta la version de MC

#### 3.4 Toggle activar/desactivar
- Renombra `.jar` <-> `.jar.disabled`
- Refresca metadata al toggle

---

### FASE 4: CONSOLA DE LOGS EN VIVO

#### 4.1 Comando Java y mainClass en log
- `ragsmc-launch.log` guarda: Java path, mainClass, JVM args, game args
- Panel "Comando de lanzamiento" en color cyan

#### 4.2 Tabs de log
- **Log del juego** (latest.log)
- **Log del launcher** (ragsmc-launch.log)
- Streaming en tiempo real via eventos `ragsmc-log`

#### 4.3 Funcionalidades
- Filtrado por nivel (error=rojo, warn=amarillo, command=cyan, debug=gris)
- Auto-scroll con toggle
- Boton limpiar, copiar, abrir carpeta de logs
- Indicador "EN VIVO" con animacion
- Errores/warnings count badges

---

### FASE 5: SOPORTE MULTI-CARGADOR

#### 5.1 Loaders soportados
- Vanilla, Fabric, **Forge**, **NeoForge**, **Quilt**, **Paper**, **Purpur**, **Spigot**, **Bukkit**
- Labels/colores via `LOADER_INFO` en types.ts

---

### FASE 6: GESTOR DE INSTANCIAS MEJORADO

#### 6.1 Visual mejorado
- Icono de loader por instancia (emoji + color de fondo)
- Loader name coloreado
- Ruta de juego personalizada visible
- Hover para mostrar boton eliminar

#### 6.2 Importar modpack
- Boton "Importar" en la barra de acciones
- Selector de archivo .zip
- Placeholder para futura implementacion de instalacion de modpacks

---

### FASE 7: INTEGRACION MODRINTH

#### 7.1 Busqueda de mods
- API Modrinth v2 con facets (version + loader)
- Muestra icono, nombre, descripcion, descargas
- Boton "Instalar" descarga archivo compatible

---

### FASE 8: GESTION DE CUENTAS

#### 8.1 Multi-cuenta
- Agregar cuentas offline con nombre personalizado
- Seleccionar cuenta activa con un clic
- Eliminar cuentas
- Persistencia en `accounts.json`

---

### FASE 9: PANEL DE NOTICIAS

#### 9.1 Noticias
- 4 noticias del launcher en `news.json`
- Panel flotante en esquina inferior izquierda de PlayView
- Badges de tipo (UPDATE, NEW, FEATURE)

---

### FASE 10: MENU CONTEXTUAL

#### 10.1 Menu de usuario
- Click en avatar del usuario (esquina inferior izquierda)
- Opciones: Mi RagsMC, Ajustes, Abrir .minecraft, Discord
- Click fuera para cerrar
- Animacion de entrada suave

---

### FASE 11: RESUMEN DE INSTALACION

#### 11.1 Panel flotante en PlayView
- Muestra: version, loader (con color), RAM, mods activos/total, shaders
- Se actualiza al cambiar de instalacion

---

### FASE 12: AJUSTES AVANZADOS

#### 12.1 Tabs organizados
- Java (deteccion + seleccion)
- Memoria (slider + presets rapidos)
- Pantalla (resolucion + fullscreen + presets HD/FHD/QHD)
- Avanzado (Discord, GPU, DNS)

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src-tauri/src/minecraft.rs` | `detect_java_versions`, `get_recommended_java`, `recommended_java_for_version` |
| `src-tauri/src/lib.rs` | Nuevos comandos registrados |
| `src/types.ts` | `JavaInfo` (nuevo), `LoaderType` ampliado |
| `src/App.tsx` | `LaunchPayload` con speed/eta/logs/stage |
| `src/components/ProgressModal.tsx` | Velocidad, ETA, logs en vivo, etapas, barra de progreso mejorada |
| `src/components/Sidebar.tsx` | Menu contextual de usuario |
| `src/views/SettingsView.tsx` | Tabs (Java/Memoria/Pantalla/Avanzado), deteccion Java, presets |
| `src/views/InstallationsView.tsx` | Iconos de loader, boton importar modpack, hover effects |
| `src/views/PlayView.tsx` | Panel de instalacion (ya existia) |

---

## Verificacion

| Test | Resultado |
|------|-----------|
| TypeScript compile | OK (sin errores) |
| Rust compile | OK (solo warnings pre-existentes) |
| Frontend build | OK (291KB gzip 84KB) |
| Tauri release build | OK (exe 7.7MB) |
| Launch test 1/3 | OK (PID 11276, 8s+ stable) |
| Launch test 2/3 | OK (PID 7436, 8s+ stable) |
| Launch test 3/3 | OK (PID 12124, 8s+ stable) |
| Java detection | 1 Java detectada (Temurin 21.0.12.101) |
| Mods detectados | 44 JARs con metadata real |
| Shaders detectados | 7 items |

---

## Binarios Generados

- `C:\Users\Administrator\Desktop\RagsMC-Launcher.exe` (7.7MB)
- `RagsMC-Launcher_1.0.0_x64-setup.exe` (NSIS)
- `RagsMC-Launcher_1.0.0_x64_en-US.msi`
