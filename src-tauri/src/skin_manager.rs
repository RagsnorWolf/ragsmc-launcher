//! Gestión de skins offline (Minecraft Java).
//!
//! Almacenamiento 100% local en `<game_dir>/ragmc_skins/`:
//! ```text
//! ragmc_skins/
//! ├── skins/<uuid>.png        (skin subida por el usuario)
//! ├── skins/<uuid>.png.mcmeta (metadata opcional)
//! ├── capes/<uuid>.png        (capa opcional)
//! └── index.json              (mapa uuid -> {name, model, updated_at})
//! ```
//! Nunca se sube ni se descarga nada de internet.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const SKINS_DIR_NAME: &str = "ragmc_skins";
/// Tamaño máximo aceptado para un PNG de skin (1 MB).
pub const MAX_SKIN_BYTES: u64 = 1024 * 1024;

// ---------------------------------------------------------------------------
// Tipos (formato de index.json)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SkinModel {
    Classic,
    Slim,
}

impl SkinModel {
    pub fn parse(s: &str) -> Result<SkinModel, String> {
        match s.trim().to_lowercase().as_str() {
            "classic" | "steve" => Ok(SkinModel::Classic),
            "slim" | "alex" => Ok(SkinModel::Slim),
            other => Err(format!(
                "Modelo de skin inválido: '{}' (usá classic o slim)",
                other
            )),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            SkinModel::Classic => "classic",
            SkinModel::Slim => "slim",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkinEntry {
    pub uuid: String,
    pub name: String,
    pub model: SkinModel,
    pub file: String,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkinConfig {
    #[serde(default)]
    pub active_skin: Option<String>,
    #[serde(default)]
    pub skins: Vec<SkinEntry>,
}

// ---------------------------------------------------------------------------
// Rutas y utilidades
// ---------------------------------------------------------------------------

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn skins_root(game_dir: &Path) -> PathBuf {
    game_dir.join(SKINS_DIR_NAME)
}

fn ensure_dir(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| format!("No se pudo crear {}: {}", path.display(), e))
}

pub fn ensure_skins_dirs(game_dir: &Path) -> Result<(), String> {
    let root = skins_root(game_dir);
    ensure_dir(&root)?;
    ensure_dir(&root.join("skins"))?;
    ensure_dir(&root.join("capes"))?;
    Ok(())
}

/// Solo hex/guiones: evita path traversal en endpoints y comandos.
pub fn is_safe_uuid(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn skin_png_path(game_dir: &Path, uuid: &str) -> PathBuf {
    skins_root(game_dir).join("skins").join(format!("{}.png", uuid))
}

fn index_path(game_dir: &Path) -> PathBuf {
    skins_root(game_dir).join("index.json")
}

// ---------------------------------------------------------------------------
// index.json
// ---------------------------------------------------------------------------

pub fn load_skin_config(game_dir: &Path) -> SkinConfig {
    let path = index_path(game_dir);
    let Ok(content) = fs::read_to_string(&path) else {
        return SkinConfig::default();
    };
    serde_json::from_str(&content).unwrap_or_default()
}

pub fn save_skin_config(game_dir: &Path, config: &SkinConfig) -> Result<(), String> {
    ensure_skins_dirs(game_dir)?;
    let path = index_path(game_dir);
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("No se pudo serializar index.json: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("No se pudo escribir {}: {}", path.display(), e))
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/// Lista las skins cuyo PNG existe en disco.
pub fn list_skins(game_dir: &Path) -> Vec<SkinEntry> {
    load_skin_config(game_dir)
        .skins
        .into_iter()
        .filter(|e| is_safe_uuid(&e.uuid) && skin_png_path(game_dir, &e.uuid).is_file())
        .collect()
}

pub fn get_active_skin(game_dir: &Path) -> Option<SkinEntry> {
    let config = load_skin_config(game_dir);
    let active = config.active_skin?;
    config.skins.into_iter().find(|e| {
        e.uuid == active && is_safe_uuid(&e.uuid) && skin_png_path(game_dir, &e.uuid).is_file()
    })
}

/// Valida bytes de PNG: formato PNG, 64x64 o 64x32, máximo 1 MB.
/// Devuelve (ancho, alto) si es válido.
pub fn validate_skin_png_bytes(bytes: &[u8]) -> Result<(u32, u32), String> {
    if bytes.len() as u64 > MAX_SKIN_BYTES {
        return Err(format!(
            "La skin supera 1 MB ({} bytes)",
            bytes.len()
        ));
    }
    if bytes.len() < 8 {
        return Err("Archivo vacío o demasiado chico para ser PNG.".to_string());
    }
    let format =
        image::guess_format(bytes).map_err(|_| "No es un PNG válido.".to_string())?;
    if format != image::ImageFormat::Png {
        return Err("La skin debe ser un archivo PNG.".to_string());
    }
    let img =
        image::load_from_memory(bytes).map_err(|e| format!("PNG inválido: {}", e))?;
    let (w, h) = (img.width(), img.height());
    if !((w == 64 && h == 64) || (w == 64 && h == 32)) {
        return Err(format!(
            "Dimensiones inválidas: {}x{} (usá 64x64 o 64x32)",
            w, h
        ));
    }
    Ok((w, h))
}

fn new_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Guarda una skin desde sus bytes. Genera un uuid nuevo, escribe el PNG
/// y actualiza index.json (la marca activa si es la primera).
pub fn upload_skin_bytes(
    game_dir: &Path,
    name: &str,
    model_str: &str,
    bytes: &[u8],
) -> Result<SkinEntry, String> {
    let model = SkinModel::parse(model_str)?;
    validate_skin_png_bytes(bytes)?;
    ensure_skins_dirs(game_dir)?;

    let uuid = new_uuid();
    let dest = skin_png_path(game_dir, &uuid);
    fs::write(&dest, bytes).map_err(|e| format!("No se pudo guardar {}: {}", dest.display(), e))?;

    let name = {
        let n = name.trim();
        if n.is_empty() {
            "Mi skin".to_string()
        } else {
            n.chars().take(48).collect()
        }
    };
    let entry = SkinEntry {
        uuid: uuid.clone(),
        name,
        model,
        file: format!("skins/{}.png", uuid),
        created_at: now_millis(),
    };
    let mut config = load_skin_config(game_dir);
    config.skins.retain(|e| e.uuid != uuid);
    config.skins.push(entry.clone());
    if config.active_skin.is_none() {
        config.active_skin = Some(uuid);
    }
    save_skin_config(game_dir, &config)?;
    Ok(entry)
}

pub fn delete_skin(game_dir: &Path, uuid: &str) -> Result<(), String> {
    if !is_safe_uuid(uuid) {
        return Err("UUID de skin inválido.".to_string());
    }
    let png = skin_png_path(game_dir, uuid);
    if png.exists() {
        fs::remove_file(&png).map_err(|e| format!("No se pudo borrar {}: {}", png.display(), e))?;
    }
    let mcmeta = skins_root(game_dir)
        .join("skins")
        .join(format!("{}.png.mcmeta", uuid));
    if mcmeta.exists() {
        let _ = fs::remove_file(&mcmeta);
    }
    let mut config = load_skin_config(game_dir);
    config.skins.retain(|e| e.uuid != uuid);
    if config.active_skin.as_deref() == Some(uuid) {
        config.active_skin = None;
    }
    save_skin_config(game_dir, &config)?;
    Ok(())
}

pub fn set_active_skin(game_dir: &Path, uuid: &str) -> Result<(), String> {
    if !is_safe_uuid(uuid) {
        return Err("UUID de skin inválido.".to_string());
    }
    let mut config = load_skin_config(game_dir);
    if !config.skins.iter().any(|e| e.uuid == uuid) {
        return Err("Esa skin no existe en index.json.".to_string());
    }
    if !skin_png_path(game_dir, uuid).is_file() {
        return Err("El PNG de esa skin no existe en disco.".to_string());
    }
    config.active_skin = Some(uuid.to_string());
    save_skin_config(game_dir, &config)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};
    use std::io::Cursor;

    pub(crate) fn test_png_bytes(w: u32, h: u32) -> Vec<u8> {
        let img = ImageBuffer::from_fn(w, h, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, 128, 255])
        });
        let mut buf = Vec::new();
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
            .unwrap();
        buf
    }

    pub(crate) fn test_jpeg_bytes() -> Vec<u8> {
        let img = ImageBuffer::from_pixel(64, 64, Rgba([200, 100, 50, 255]));
        let mut buf = Vec::new();
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Jpeg)
            .unwrap();
        buf
    }

    #[test]
    fn test_validate_skin_png_valid() {
        assert_eq!(validate_skin_png_bytes(&test_png_bytes(64, 64)), Ok((64, 64)));
        assert_eq!(validate_skin_png_bytes(&test_png_bytes(64, 32)), Ok((64, 32)));
    }

    #[test]
    fn test_validate_skin_png_invalid_size() {
        let err = validate_skin_png_bytes(&test_png_bytes(128, 128)).unwrap_err();
        assert!(err.contains("128x128"), "inesperado: {}", err);
    }

    #[test]
    fn test_validate_skin_png_invalid_format() {
        let err = validate_skin_png_bytes(&test_jpeg_bytes()).unwrap_err();
        assert!(err.contains("PNG"), "inesperado: {}", err);
    }

    #[test]
    fn test_upload_skin_copies_file() {
        let dir = tempfile::tempdir().unwrap();
        let entry = upload_skin_bytes(dir.path(), "Steve", "classic", &test_png_bytes(64, 64))
            .expect("upload debe funcionar");
        assert!(skin_png_path(dir.path(), &entry.uuid).is_file());
        assert_eq!(entry.model, SkinModel::Classic);
        // Primera subida queda activa
        assert_eq!(
            get_active_skin(dir.path()).map(|e| e.uuid),
            Some(entry.uuid.clone())
        );
        // Y figura en el listado
        assert_eq!(list_skins(dir.path()).len(), 1);
    }

    #[test]
    fn test_set_active_skin() {
        let dir = tempfile::tempdir().unwrap();
        let a = upload_skin_bytes(dir.path(), "A", "classic", &test_png_bytes(64, 64)).unwrap();
        let b = upload_skin_bytes(dir.path(), "B", "slim", &test_png_bytes(64, 64)).unwrap();
        assert_ne!(a.uuid, b.uuid);
        set_active_skin(dir.path(), &b.uuid).unwrap();
        assert_eq!(
            get_active_skin(dir.path()).map(|e| e.uuid),
            Some(b.uuid)
        );
        // uuid inexistente -> error
        assert!(set_active_skin(dir.path(), "no-existe").is_err());
    }

    #[test]
    fn test_delete_skin() {
        let dir = tempfile::tempdir().unwrap();
        let a = upload_skin_bytes(dir.path(), "A", "classic", &test_png_bytes(64, 64)).unwrap();
        let png = skin_png_path(dir.path(), &a.uuid);
        assert!(png.is_file());
        delete_skin(dir.path(), &a.uuid).unwrap();
        assert!(!png.exists());
        assert!(list_skins(dir.path()).is_empty());
        assert!(get_active_skin(dir.path()).is_none());
    }
}
