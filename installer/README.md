# RagsMC Launcher - Instalador Profesional

## Estructura del Proyecto

```
installer/
├── assets/
│   └── icon.ico              # Icono del instalador
├── src/
│   ├── main.js               # Proceso principal Electron (backend)
│   └── renderer/
│       ├── index.html        # Interfaz del wizard
│       ├── style.css         # Estilos (tema oscuro + verde neon)
│       └── renderer.js       # Logica del wizard (frontend)
├── install.bat               # Instalador nativo sin Electron (fallback)
├── build.js                  # Script de build alternativo
├── electron-builder.json     # Configuracion de electron-builder
├── package.json              # Dependencias del proyecto
└── README.md                 # Este archivo
```

## Requisitos

- **Node.js** 18+ (para desarrollo)
- **npm** (para instalar dependencias)
- **Electron** (se instala automaticamente via npm)

## Instalacion y Uso

### Opcion 1: Instalador Electron (Recomendado)

```bash
cd installer
npm install
npm start           # Ejecutar en modo desarrollo
npm run build       # Generar .exe instalable
```

El .exe se genera en `dist-installer/RagsMC Launcher Installer Setup 1.0.0.exe`.

### Opcion 2: Instalador Nativo (Sin dependencias)

Simplemente ejecuta `install.bat` como administrador. No requiere Node.js ni Electron.

## Funcionalidades

### Wizard de 5 Pasos

1. **Bienvenida** - Seleccion de accion: Instalar, Reparar o Desinstalar
2. **Opciones** - Seleccion de ruta, accesos directos
3. **Licencia** - EULA con aceptacion obligatoria
4. **Instalacion** - Barra de progreso + log en vivo
5. **Finalizar** - Abrir app, abrir carpeta, finalizar

### Caracteristicas

- Tema oscuro con acentos en verde neon
- Barra lateral con indicador de progreso paso a paso
- Deteccion de instalacion existente
- Creacion de accesos directos (escritorio + Menu de Inicio)
- Registro en Panel de Control (Agregar o quitar programas)
- Soporte para instalacion silenciosa (via bat)
- Desinstalador completo

### Opciones de Instalacion

| Opcion | Ruta Por Defecto | Requiere Admin |
|--------|------------------|----------------|
| Todos los usuarios | `C:\Program Files\RagsMC Launcher` | Si |
| Solo para mi | `%LOCALAPPDATA%\Programs\RagsMC Launcher` | No |
| Personalizada | Usuario elige | No |

## Modo Silencioso

Para instalacion automatizada:

```batch
install.bat
```

El instalador nativo (`.bat`) detecta automaticamente la instalacion existente y ofrece opciones de Instalar/Reparar/Desinstalar.

## Compilacion del Instalador

### Generar .exe con electron-builder

```bash
cd installer
npm install
npm run build
```

### Generar .exe con pkg (alternativa)

```bash
npm install -g pkg
node build.js
```

## Notas Tecnicas

- El instalador usa **Electron 32** para la UI grafica
- **electron-builder** genera el NSIS installer para Windows
- El instalador nativo (`.bat`) usa solo comandos de Windows (copy, mkdir, reg, cscript)
- Los accesos directos se crean via VBScript (WScript.Shell)
- El registro se escribe en `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\RagsMC`
