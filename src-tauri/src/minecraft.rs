//! RagsMC Launcher backend: versiones reales de Minecraft (Mojang + Fabric),
//! descarga/instalación de versiones, detección/descarga de Java y lanzamiento offline.
//!
//! Sin dependencias del sistema: solo crates puros de Rust.

use serde::{Deserialize, Serialize};
use sha1::Digest;
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command as StdCommand, Stdio};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MOJANG_MANIFEST_URL: &str =
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const FABRIC_META_BASE: &str = "https://meta.fabricmc.net/v2";
const ADOPTIUM_API: &str = "https://api.adoptium.net/v3/binary/latest";
const USER_AGENT: &str = "RagsMC-Launcher/0.1.0";
const LAUNCHER_NAME: &str = "RagsMC-Launcher";
const LAUNCHER_VERSION: &str = "1.0.2";

// ---------------------------------------------------------------------------
// Tipos que viajan al frontend (deben coincidir con src/types.ts, camelCase)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftVersion {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub version_type: String,
    pub release_date: String,
    pub icon: String,
    pub description: String,
    pub changelog: String,
    pub size: u64,
    pub supported_loaders: Vec<String>,
    pub edition: String,
    pub min_java_version: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Resolution {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Installation {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub version_id: String,
    pub loader: String,
    pub loader_version: Option<String>,
    pub java_path: String,
    pub java_version: Option<u32>,
    pub memory: u32,
    pub jvm_args: String,
    pub game_args: String,
    pub game_dir: String,
    pub resolution: Resolution,
    pub fullscreen: bool,
    pub mods: Vec<String>,
    pub resource_packs: Vec<String>,
    pub shaders: Vec<String>,
    pub last_played: String,
    pub play_time: u64,
    pub created_at: String,
    pub tags: Vec<String>,
    pub edition: String,
    pub server: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchConfig {
    pub version: String,
    pub loader: String,
    pub loader_version: Option<String>,
    pub java_path: String,
    pub java_version: Option<u32>,
    pub memory: u32,
    pub width: u32,
    pub height: u32,
    pub fullscreen: bool,
    pub server: Option<String>,
    pub username: Option<String>,
    pub access_token: Option<String>,
    pub uuid: Option<String>,
    pub user_type: Option<String>,
    pub jvm_args: Option<String>,
    pub game_args: Option<String>,
    pub game_dir: Option<String>,
    pub resolution: Option<Resolution>,
}

// ---------------------------------------------------------------------------
// Tipos del manifiesto y JSON de versión de Mojang
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct Manifest {
    versions: Vec<ManifestEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestEntry {
    id: String,
    #[serde(rename = "type")]
    version_type: String,
    url: String,
    release_time: String,
}

#[derive(Debug, Clone, Deserialize)]
struct ArtifactInfo {
    path: Option<String>,
    url: String,
    sha1: String,
    size: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct OsRule {
    name: Option<String>,
    arch: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct Rule {
    action: String,
    os: Option<OsRule>,
    features: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum ArgValue {
    Simple(String),
    List(Vec<String>),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum Argument {
    Plain(String),
    Ruled {
        rules: Vec<Rule>,
        value: ArgValue,
    },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VersionArguments {
    game: Vec<Argument>,
    jvm: Vec<Argument>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LibraryDownloads {
    artifact: Option<ArtifactInfo>,
    classifiers: Option<HashMap<String, ArtifactInfo>>,
}

#[derive(Debug, Clone, Deserialize)]
struct LibraryExtract {
    exclude: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct Library {
    name: String,
    url: Option<String>,
    downloads: Option<LibraryDownloads>,
    natives: Option<HashMap<String, String>>,
    rules: Option<Vec<Rule>>,
    extract: Option<LibraryExtract>,
}

#[derive(Debug, Clone, Deserialize)]
struct AssetIndexRef {
    id: String,
    url: String,
    sha1: String,
    size: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct ClientDownload {
    url: String,
    sha1: String,
    size: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct VersionDownloads {
    client: ClientDownload,
    #[serde(rename = "client_mappings")]
    #[serde(default)]
    client_mappings: Option<ClientDownload>,
}

#[derive(Debug, Clone, Deserialize)]
struct LoggingFile {
    url: String,
    sha1: String,
    size: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct LoggingClient {
    argument: String,
    file: LoggingFile,
}

#[derive(Debug, Clone, Deserialize)]
struct LoggingConfig {
    client: LoggingClient,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JavaVersionInfo {
    major_version: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VersionJson {
    id: String,
    #[serde(default)]
    inherits_from: Option<String>,
    #[serde(default)]
    main_class: String,
    #[serde(default)]
    minecraft_arguments: Option<String>,
    #[serde(default)]
    arguments: Option<VersionArguments>,
    #[serde(default)]
    asset_index: Option<AssetIndexRef>,
    #[serde(default)]
    assets: Option<String>,
    #[serde(default)]
    downloads: Option<VersionDownloads>,
    #[serde(default)]
    libraries: Vec<Library>,
    #[serde(default)]
    logging: Option<LoggingConfig>,
    #[serde(default)]
    java_version: Option<JavaVersionInfo>,
}

#[derive(Debug, Deserialize)]
struct AssetIndex {
    objects: HashMap<String, AssetObject>,
}

#[derive(Debug, Clone, Deserialize)]
struct AssetObject {
    hash: String,
    size: u64,
}

// Tipos de Fabric Meta
#[derive(Debug, Deserialize)]
struct FabricLoaderEntry {
    loader: FabricLoaderInfo,
}

#[derive(Debug, Deserialize)]
struct FabricLoaderInfo {
    version: String,
    #[serde(default)]
    stable: bool,
}

#[derive(Debug, Deserialize)]
struct FabricMavenLib {
    name: String,
    #[serde(default)]
    url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FabricProfile {
    id: String,
    #[serde(default)]
    main_class: Option<String>,
    #[serde(default)]
    libraries: Vec<FabricMavenLib>,
    #[serde(default)]
    arguments: Option<VersionArguments>,
}

// ---------------------------------------------------------------------------
// Utilidades: rutas, HTTP, descargas
// ---------------------------------------------------------------------------

pub fn data_root() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let base = std::env::var("APPDATA")
            .map(PathBuf::from)
            .map_err(|_| "No se pudo determinar APPDATA".to_string())?;
        Ok(base.join(".minecraft"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").map_err(|_| "No HOME".to_string())?;
        Ok(PathBuf::from(home).join(".minecraft"))
    }
}

fn ensure_dir(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path)
        .map_err(|e| format!("No se pudo crear {}: {}", path.display(), e))
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Error HTTP: {}", e))
}

fn sha1_of_file(path: &Path) -> Result<String, String> {
    let mut file =
        fs::File::open(path).map_err(|e| format!("No se pudo leer {}: {}", path.display(), e))?;
    let mut hasher = sha1::Sha1::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file
            .read(&mut buf)
            .map_err(|e| format!("Error leyendo {}: {}", path.display(), e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// Descarga un archivo si no existe o si el sha1 no coincide. Reintenta 3 veces.
fn download_file(url: &str, dest: &Path, expected_sha1: Option<&str>) -> Result<(), String> {
    if dest.exists() {
        if let Some(sha1) = expected_sha1 {
            if let Ok(actual) = sha1_of_file(dest) {
                if actual.eq_ignore_ascii_case(sha1) {
                    return Ok(());
                }
            }
            let _ = fs::remove_file(dest);
        } else if dest.metadata().map(|m| m.len()).unwrap_or(0) > 0 {
            return Ok(());
        } else {
            let _ = fs::remove_file(dest);
        }
    }
    if let Some(parent) = dest.parent() {
        ensure_dir(parent)?;
    }
    let client = http_client()?;
    let mut last_err = String::new();
    for attempt in 1..=3 {
        match client.get(url).send() {
            Ok(resp) => {
                if !resp.status().is_success() {
                    last_err = format!("HTTP {} al descargar {}", resp.status(), url);
                } else {
                    match resp.bytes() {
                        Ok(bytes) => {
                            if let Err(e) = fs::write(dest, &bytes) {
                                last_err = format!("No se pudo guardar {}: {}", dest.display(), e);
                            } else if let Some(sha1) = expected_sha1 {
                                match sha1_of_file(dest) {
                                    Ok(actual) if actual.eq_ignore_ascii_case(sha1) => {
                                        return Ok(())
                                    }
                                    _ => {
                                        let _ = fs::remove_file(dest);
                                        last_err = format!(
                                            "SHA1 inválido en {} (intento {}/3)",
                                            dest.display(),
                                            attempt
                                        );
                                        continue;
                                    }
                                }
                            } else {
                                return Ok(());
                            }
                        }
                        Err(e) => last_err = format!("Error descargando {}: {}", url, e),
                    }
                }
            }
            Err(e) => last_err = format!("Error de red (intento {}/3): {}", attempt, e),
        }
        std::thread::sleep(Duration::from_millis(800 * attempt as u64));
    }
    Err(last_err)
}

fn fetch_json<T: for<'de> Deserialize<'de>>(url: &str) -> Result<T, String> {
    let client = http_client()?;
    let mut last_err = String::new();
    for attempt in 1..=3 {
        match client.get(url).send() {
            Ok(resp) => {
                if !resp.status().is_success() {
                    last_err = format!("HTTP {} en {}", resp.status(), url);
                } else {
                    match resp.json::<T>() {
                        Ok(v) => return Ok(v),
                        Err(e) => last_err = format!("JSON inválido en {}: {}", url, e),
                    }
                }
            }
            Err(e) => last_err = format!("Error de red (intento {}/3): {}", attempt, e),
        }
        std::thread::sleep(Duration::from_millis(800 * attempt as u64));
    }
    Err(last_err)
}

// ---------------------------------------------------------------------------
// Versiones: manifiesto de Mojang
// ---------------------------------------------------------------------------

fn manifest_entries() -> Result<Vec<ManifestEntry>, String> {
    let manifest: Manifest = fetch_json(MOJANG_MANIFEST_URL)?;
    Ok(manifest.versions)
}

fn heuristic_min_java(version_id: &str) -> u32 {
    // 1.20.5+ y 1.21+ -> 21, 1.18-1.20.4 -> 17, 1.17.x -> 16, resto -> 8
    let parts: Vec<&str> = version_id.split('.').collect();
    if parts.len() >= 2 {
        if let (Ok(minor), Ok(patch)) = (
            parts[1].parse::<u32>(),
            parts.get(2).unwrap_or(&"0").parse::<u32>(),
        ) {
            if minor > 20 || (minor == 20 && patch >= 5) {
                return 21;
            }
            if minor >= 18 {
                return 17;
            }
            if minor == 17 {
                return 16;
            }
            return 8;
        }
        // Formatos nuevos tipo "24w14a" (snapshots) -> Java 21
        return 21;
    }
    8
}

fn mc_minor_patch(version_id: &str) -> Option<(u32, u32)> {
    let mut parts = version_id.split('.');
    parts.next()?;
    let minor = parts.next()?.parse::<u32>().ok()?;
    let patch = parts.next().unwrap_or("0").parse::<u32>().unwrap_or(0);
    Some((minor, patch))
}

fn loaders_for(entry_type: &str, version_id: &str) -> Vec<String> {
    let mut loaders = vec!["vanilla".to_string()];
    if entry_type != "release" {
        return loaders;
    }
    let (minor, patch) = match mc_minor_patch(version_id) {
        Some(v) => v,
        None => return loaders,
    };
    // Fabric y Quilt: 1.14+
    if minor >= 14 {
        loaders.push("fabric".to_string());
        loaders.push("quilt".to_string());
    }
    // Forge: 1.7+
    if minor >= 7 {
        loaders.push("forge".to_string());
    }
    // NeoForge: 1.20.2+ y 1.21+
    if minor > 20 || (minor == 20 && patch >= 2) {
        loaders.push("neoforge".to_string());
    }
    loaders
}

fn version_icon(version_id: &str) -> String {
    let block = if version_id.starts_with("1.21") || version_id.starts_with("1.20") {
        "grass_block"
    } else if version_id.starts_with("1.19") || version_id.starts_with("1.18") {
        "deepslate"
    } else if version_id.starts_with("1.17") || version_id.starts_with("1.16") {
        "netherrack"
    } else if version_id.starts_with("1.12") {
        "diamond_ore"
    } else {
        "stone"
    };
    format!(
        "https://cdn.jsdelivr.net/npm/@minecraft/icons@latest/blocks/{}.png",
        block
    )
}

fn map_manifest(entries: Vec<ManifestEntry>) -> Vec<MinecraftVersion> {
    entries
        .into_iter()
        .map(|e| {
            let release_date = e.release_time.get(..10).unwrap_or("").to_string();
            MinecraftVersion {
                name: e.id.clone(),
                supported_loaders: loaders_for(&e.version_type, &e.id),
                min_java_version: heuristic_min_java(&e.id),
                icon: version_icon(&e.id),
                description: format!("Minecraft {}", e.id),
                changelog: String::new(),
                size: 0,
                edition: "java".to_string(),
                id: e.id,
                version_type: e.version_type,
                release_date,
            }
        })
        .collect()
}

fn read_versions_cache(path: &Path) -> Option<Vec<MinecraftVersion>> {
    let content = fs::read_to_string(path).ok()?;
    let cached: Vec<MinecraftVersion> = serde_json::from_str(&content).ok()?;
    if cached.is_empty() {
        None
    } else {
        Some(cached)
    }
}

fn cache_is_fresh(path: &Path) -> bool {
    path.metadata()
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.elapsed().ok())
        .map(|e| e.as_secs() < 24 * 3600)
        .unwrap_or(false)
}

/// Lista de versiones con caché local de 24h para un arranque instantáneo.
/// `refresh=true` fuerza la descarga del manifiesto de Mojang.
#[tauri::command]
pub fn get_minecraft_versions(refresh: Option<bool>) -> Result<Vec<MinecraftVersion>, String> {
    let cache_path = data_root()?.join("versions_cache.json");
    if !refresh.unwrap_or(false) && cache_is_fresh(&cache_path) {
        if let Some(cached) = read_versions_cache(&cache_path) {
            return Ok(cached);
        }
    }
    match manifest_entries() {
        Ok(entries) => {
            let versions = map_manifest(entries);
            if !versions.is_empty() {
                if let Some(parent) = cache_path.parent() {
                    let _ = ensure_dir(parent);
                }
                if let Ok(json) = serde_json::to_string(&versions) {
                    let _ = fs::write(&cache_path, json);
                }
            }
            Ok(versions)
        }
        Err(e) => {
            // Sin red: sirve la caché aunque esté vencida antes de fallar.
            if let Some(cached) = read_versions_cache(&cache_path) {
                return Ok(cached);
            }
            Err(e)
        }
    }
}

// ---------------------------------------------------------------------------
// Instalaciones persistidas
// ---------------------------------------------------------------------------

fn installations_path() -> Result<PathBuf, String> {
    Ok(data_root()?.join("installations.json"))
}

fn load_installations() -> Result<Vec<Installation>, String> {
    let path = installations_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("No se pudo leer instalaciones: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("instalaciones corruptas: {}", e))
}

fn store_installations(list: &[Installation]) -> Result<(), String> {
    let path = installations_path()?;
    if let Some(parent) = path.parent() {
        ensure_dir(parent)?;
    }
    let content =
        serde_json::to_string_pretty(list).map_err(|e| format!("No se pudo serializar: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("No se pudo guardar: {}", e))
}

#[tauri::command]
pub fn get_installations() -> Result<Vec<Installation>, String> {
    load_installations()
}

#[tauri::command]
pub fn save_installation(installation: Installation) -> Result<(), String> {
    let mut list = load_installations()?;
    if let Some(pos) = list.iter().position(|i| i.id == installation.id) {
        list[pos] = installation;
    } else {
        list.push(installation);
    }
    store_installations(&list)
}

#[tauri::command]
pub fn delete_installation(id: String) -> Result<(), String> {
    let mut list = load_installations()?;
    list.retain(|i| i.id != id);
    store_installations(&list)
}

// ---------------------------------------------------------------------------
// Reglas (rules) de Mojang
// ---------------------------------------------------------------------------

fn current_os_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "windows"
    }
    #[cfg(target_os = "macos")]
    {
        "osx"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        "unknown"
    }
}

fn rule_matches(rule: &Rule, features: &HashMap<String, bool>) -> bool {
    if let Some(os) = &rule.os {
        if let Some(name) = &os.name {
            if name != current_os_name() {
                return false;
            }
        }
        if let Some(_arch) = &os.arch {
            // Mojang usa "x86" para 32 bits; en 64 bits casi nunca restringen por arch.
            #[cfg(target_arch = "x86")]
            {
                if _arch != "x86" {
                    return false;
                }
            }
        }
    }
    if let Some(feats) = &rule.features {
        for (k, v) in feats {
            let expected = v.as_bool().unwrap_or(false);
            let actual = features.get(k).copied().unwrap_or(false);
            if expected != actual {
                return false;
            }
        }
    }
    true
}

/// Semántica exacta de Mojang:
/// - Sin reglas (o lista vacía) => permitido.
/// - Con reglas => DENEGADO por defecto; la última regla que coincida decide.
/// Mojang siempre escribe pares como [{allow}, {disallow, os}] o [{allow, os}],
/// por lo que este es el único algoritmo que excluye flags de otro SO
/// (p.ej. -XstartOnFirstThread solo existe en macOS).
fn allowed_by_rules(rules: &Option<Vec<Rule>>, features: &HashMap<String, bool>) -> bool {
    match rules {
        None => true,
        Some(list) if list.is_empty() => true,
        Some(list) => {
            let mut allowed = false;
            for rule in list {
                if rule_matches(rule, features) {
                    allowed = rule.action == "allow";
                }
            }
            allowed
        }
    }
}

// ---------------------------------------------------------------------------
// Resolución e instalación de versiones
// ---------------------------------------------------------------------------

struct ResolvedVersion {
    /// Id de carpeta en versions/ (p.ej. "1.21.1" o "fabric-loader-0.16.9-1.21.1")
    dir_id: String,
    json: VersionJson,
    /// Librerías extra (p.ej. Fabric) con su repo maven base.
    extra_libs: Vec<(String, String)>,
}

fn maven_path_of(name: &str) -> Option<String> {
    // grupo:artefacto:version[:clasificador]
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return None;
    }
    let group_path = parts[0].replace('.', "/");
    let (version, classifier) = if parts.len() > 3 {
        (parts[2], Some(parts[3]))
    } else {
        (parts[2], None)
    };
    let file_name = match classifier {
        Some(c) => format!("{}-{}-{}.jar", parts[1], version, c),
        None => format!("{}-{}.jar", parts[1], version),
    };
    Some(format!("{}/{}/{}/{}", group_path, parts[1], version, file_name))
}

fn fetch_version_json(version_id: &str) -> Result<VersionJson, String> {
    let entries = manifest_entries()?;
    let entry = entries
        .iter()
        .find(|e| e.id == version_id)
        .ok_or_else(|| format!("Versión {} no encontrada en Mojang", version_id))?;
    let root = data_root()?;
    let dest = root
        .join("versions")
        .join(version_id)
        .join(format!("{}.json", version_id));
    download_file(&entry.url, &dest, None)?;
    let content =
        fs::read_to_string(&dest).map_err(|e| format!("No se pudo leer {}: {}", dest.display(), e))?;
    serde_json::from_str(&content).map_err(|e| format!("JSON de versión inválido: {}", e))
}

fn fetch_fabric_profile(mc_version: &str, loader_version: Option<&str>) -> Result<ResolvedVersion, String> {
    // 1. Lista de loaders estables para esta versión de MC
    let list_url = format!("{}/versions/loader/{}", FABRIC_META_BASE, mc_version);
    let loaders: Vec<FabricLoaderEntry> = fetch_json(&list_url)?;
    let chosen = match loader_version {
        Some(v) => loaders
            .iter()
            .find(|l| l.loader.version == v)
            .ok_or_else(|| format!("Fabric {} no disponible para {}", v, mc_version))?,
        None => loaders
            .iter()
            .find(|l| l.loader.stable)
            .or(loaders.first())
            .ok_or_else(|| format!("Sin loaders Fabric para {}", mc_version))?,
    };
    // 2. Perfil (libraries + mainClass) y base vanilla
    let profile_url = format!(
        "{}/versions/loader/{}/{}/profile/json",
        FABRIC_META_BASE, mc_version, chosen.loader.version
    );
    let profile: FabricProfile = fetch_json(&profile_url)?;
    let mut base = fetch_version_json(mc_version)?;
    if let Some(mc) = profile.main_class {
        base.main_class = mc;
    }
    // Merge Fabric JVM arguments (e.g. -DFabricMcEmu) into base
    if let Some(profile_args) = &profile.arguments {
        match &mut base.arguments {
            Some(base_args) => {
                base_args.jvm.extend(profile_args.jvm.iter().cloned());
                base_args.game.extend(profile_args.game.iter().cloned());
            }
            None => {
                base.arguments = Some(VersionArguments {
                    game: profile_args.game.clone(),
                    jvm: profile_args.jvm.clone(),
                });
            }
        }
    }
    // Merge Fabric libraries INTO the base library list so dedup handles
    // version conflicts (e.g. ASM 9.6 from vanilla vs ASM 9.10.1 from Fabric).
    for fl in profile.libraries {
        base.libraries.push(Library {
            name: fl.name,
            url: Some(fl.url),
            downloads: None,
            natives: None,
            extract: None,
            rules: None,
        });
    }
    Ok(ResolvedVersion {
        dir_id: profile.id.clone(),
        json: base,
        extra_libs: Vec::new(),
    })
}

/// Fusiona un JSON de versión que hereda de otro (forge/neoforge: inheritsFrom).
fn merge_inherits(base: VersionJson, over: VersionJson) -> VersionJson {
    let pick_str = |o: String, b: String| if o.is_empty() { b } else { o };
    VersionJson {
        id: over.id,
        inherits_from: None,
        main_class: pick_str(over.main_class, base.main_class),
        minecraft_arguments: over.minecraft_arguments.or(base.minecraft_arguments),
        arguments: over.arguments.or(base.arguments),
        asset_index: over.asset_index.or(base.asset_index),
        assets: over.assets.or(base.assets),
        downloads: over.downloads.or(base.downloads),
        libraries: {
            let mut libs = base.libraries;
            libs.extend(over.libraries);
            libs
        },
        logging: over.logging.or(base.logging),
        java_version: over.java_version.or(base.java_version),
    }
}

fn read_version_json_file(path: &Path) -> Result<VersionJson, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("No se pudo leer {}: {}", path.display(), e))?;
    serde_json::from_str(&content).map_err(|e| format!("JSON inválido en {}: {}", path.display(), e))
}

fn fetch_quilt_profile(mc_version: &str, loader_version: Option<&str>) -> Result<ResolvedVersion, String> {
    let list_url = format!("https://meta.quiltmc.org/v3/versions/loader/{}", mc_version);
    let loaders: Vec<FabricLoaderEntry> = fetch_json(&list_url)?;
    let chosen = match loader_version {
        Some(v) if !v.is_empty() => loaders
            .iter()
            .find(|l| l.loader.version == v)
            .ok_or_else(|| format!("Quilt {} no disponible para {}", v, mc_version))?,
        _ => loaders
            .iter()
            .find(|l| l.loader.stable)
            .or(loaders.first())
            .ok_or_else(|| format!("Sin loaders Quilt para {}", mc_version))?,
    };
    let profile_url = format!(
        "https://meta.quiltmc.org/v3/versions/loader/{}/{}/profile/json",
        mc_version, chosen.loader.version
    );
    let profile: FabricProfile = fetch_json(&profile_url)?;
    let mut base = fetch_version_json(mc_version)?;
    if let Some(mc) = profile.main_class {
        if !mc.is_empty() {
            base.main_class = mc;
        }
    }
    // Merge Quilt libraries into base (same approach as Fabric)
    for fl in profile.libraries {
        if fl.url.is_empty() {
            continue;
        }
        base.libraries.push(Library {
            name: fl.name,
            url: Some(fl.url),
            downloads: None,
            natives: None,
            extract: None,
            rules: None,
        });
    }
    Ok(ResolvedVersion {
        dir_id: profile.id.clone(),
        json: base,
        extra_libs: Vec::new(),
    })
}

// ---- Forge / NeoForge: resolución de versión del instalador ----

#[derive(Debug, Deserialize)]
struct ForgePromotions {
    #[serde(default)]
    promos: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct NeoForgeVersions {
    #[serde(default)]
    versions: Vec<String>,
}

fn resolve_forge_version(mc: &str, wanted: Option<&str>) -> Result<String, String> {
    if let Some(v) = wanted {
        if !v.is_empty() {
            return Ok(v.to_string());
        }
    }
    let promos: ForgePromotions = fetch_json(
        "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json",
    )?;
    let key_rec = format!("{}-recommended", mc);
    let key_lat = format!("{}-latest", mc);
    promos
        .promos
        .get(&key_rec)
        .or_else(|| promos.promos.get(&key_lat))
        .cloned()
        .ok_or_else(|| format!("Sin Forge publicado para Minecraft {}", mc))
}

fn neoforge_prefix(mc: &str) -> Option<String> {
    // NeoForge versiona como "<mcMajor>.<mcMinor>.<patch>" (21.1.x = MC 1.21.x).
    let parts: Vec<&str> = mc.split('.').collect();
    if parts.len() >= 3 {
        Some(format!("{}.{}.", parts[1], parts[2]))
    } else if parts.len() == 2 {
        Some(format!("{}.0.", parts[1]))
    } else {
        None
    }
}

fn resolve_neoforge_version(mc: &str, wanted: Option<&str>) -> Result<String, String> {
    if let Some(v) = wanted {
        if !v.is_empty() {
            return Ok(v.to_string());
        }
    }
    let prefix = neoforge_prefix(mc).ok_or_else(|| format!("Versión de Minecraft inválida: {}", mc))?;
    let list: NeoForgeVersions = fetch_json(
        "https://maven.neoforged.net/api/maven/versions/releases/net%2Fneoforged%2Fneoforge",
    )?;
    list.versions
        .into_iter()
        .filter(|v| v.starts_with(&prefix))
        .next_back()
        .ok_or_else(|| format!("Sin NeoForge publicado para Minecraft {}", mc))
}

fn snapshot_version_dirs(root: &Path) -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(entries) = fs::read_dir(root.join("versions")) {
        for e in entries.flatten() {
            if e.path().is_dir() {
                if let Some(n) = e.file_name().to_str() {
                    out.push(n.to_string());
                }
            }
        }
    }
    out
}

/// Ejecuta el instalador oficial (Forge/NeoForge) en modo headless.
/// Retorna el id de la carpeta de versión creada.
fn run_modded_installer(
    app: &AppHandle,
    java: &Path,
    installer_jar: &Path,
    target_root: &Path,
    label: &str,
) -> Result<String, String> {
    let before = snapshot_version_dirs(target_root);
    let log_dir = target_root.join("versions").join(".installers");
    ensure_dir(&log_dir)?;
    let safe_label: String = label
        .chars()
        .map(|c| if c == '/' || c == '\\' || c == ':' { '_' } else { c })
        .collect();
    let log_path = log_dir.join(format!("{}-installer.log", safe_label));
    let header = format!(
        "RagsMC {} — instalador {}\nJar: {}\nDestino: {}\n",
        LAUNCHER_VERSION,
        label,
        installer_jar.display(),
        target_root.display()
    );
    let _ = fs::write(&log_path, header);

    emit_launch(
        app,
        "installing",
        format!("Ejecutando instalador de {} (puede tardar varios minutos)...", label),
        0,
        0,
    );
    let mut cmd = StdCommand::new(java);
    cmd.arg("-jar")
        .arg(installer_jar)
        .arg("--install-client")
        .arg(target_root)
        .current_dir(target_root);
    match fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(out) => match out.try_clone() {
            Ok(err) => {
                cmd.stdout(Stdio::from(out)).stderr(Stdio::from(err));
            }
            Err(_) => {
                cmd.stdout(Stdio::null()).stderr(Stdio::null());
            }
        },
        Err(_) => {
            cmd.stdout(Stdio::null()).stderr(Stdio::null());
        }
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("No se pudo ejecutar el instalador ({}): {}", java.display(), e))?;

    // Espera hasta 10 minutos con progreso periódico.
    let mut exit_status = None;
    for elapsed in 0..600u32 {
        std::thread::sleep(Duration::from_secs(1));
        if install_cancelled() {
            let _ = child.kill();
            return Err("Instalación cancelada por el usuario".to_string());
        }
        match child.try_wait() {
            Ok(Some(status)) => {
                exit_status = Some(status);
                break;
            }
            Ok(None) => {
                if elapsed > 0 && elapsed % 30 == 0 {
                    emit_launch(
                        app,
                        "installing",
                        format!("Instalando {}... ({}s)", label, elapsed),
                        0,
                        0,
                    );
                }
            }
            Err(_) => break,
        }
    }
    if exit_status.is_none() {
        let _ = child.kill();
        return Err(format!(
            "El instalador de {} tardó demasiado (>10 min). Log: {}",
            label,
            log_path.display()
        ));
    }
    let status = exit_status.unwrap();
    if !status.success() {
        let tail = read_log_tail(&log_path, 20, 1200);
        return Err(format!(
            "El instalador de {} falló (código {:?}).\n{}\nLog: {}",
            label,
            status.code(),
            tail,
            log_path.display()
        ));
    }
    // Detecta la carpeta de versión creada.
    let after = snapshot_version_dirs(target_root);
    let mut created: Vec<String> = after
        .into_iter()
        .filter(|d| {
            !before.contains(d)
                && target_root
                    .join("versions")
                    .join(d)
                    .join(format!("{}.json", d))
                    .exists()
        })
        .collect();
    created.sort();
    created.pop().ok_or_else(|| {
        format!(
            "El instalador terminó pero no creó versión. Log: {}",
            log_path.display()
        )
    })
}

fn fetch_modded_installer_profile(
    app: &AppHandle,
    config: &LaunchConfig,
    loader: &str,
) -> Result<ResolvedVersion, String> {
    let root = data_root()?;
    // 1. Base vanilla instalada primero (el instalador la necesita).
    let base_json = fetch_version_json(&config.version)?;
    let required = base_json
        .java_version
        .as_ref()
        .map(|j| j.major_version)
        .unwrap_or_else(|| heuristic_min_java(&config.version))
        .max(8);
    let java = ensure_java(required, "")?;
    emit_launch(app, "downloading", format!("Preparando base vanilla {}...", config.version), 0, 0);
    let base_resolved = ResolvedVersion {
        dir_id: config.version.clone(),
        json: base_json.clone(),
        extra_libs: Vec::new(),
    };
    let _ = ensure_version_installed(&base_resolved, app)?;

    // 2. Resuelve versión del loader + descarga instalador.
    let (installer_url, label) = match loader {
        "forge" => {
            let fv = resolve_forge_version(&config.version, config.loader_version.as_deref())?;
            let url = format!(
                "https://maven.minecraftforge.net/net/minecraftforge/forge/{}-{}/forge-{}-{}-installer.jar",
                config.version, fv, config.version, fv
            );
            (url, format!("Forge {} para {}", fv, config.version))
        }
        "neoforge" => {
            let nv = resolve_neoforge_version(&config.version, config.loader_version.as_deref())?;
            let url = format!(
                "https://maven.neoforged.net/releases/net/neoforged/neoforge/{}/neoforge-{}-installer.jar",
                nv, nv
            );
            (url, format!("NeoForge {} para {}", nv, config.version))
        }
        _ => return Err(format!("Loader desconocido: {}", loader)),
    };
    let installer_dir = root.join("versions").join(".installers");
    ensure_dir(&installer_dir)?;
    let file_name = installer_url
        .rsplit('/')
        .next()
        .unwrap_or("installer.jar");
    let installer_jar = installer_dir.join(file_name);
    emit_launch(app, "downloading", format!("Descargando instalador de {}...", label), 0, 0);
    download_file(&installer_url, &installer_jar, None)?;

    // 3. Ejecuta instalador y fusiona el JSON resultante con la base.
    let dir_id = run_modded_installer(app, &java, &installer_jar, &root, &label)?;
    let json_path = root.join("versions").join(&dir_id).join(format!("{}.json", dir_id));
    let over = read_version_json_file(&json_path)?;
    let merged = merge_inherits(base_json, over);
    Ok(ResolvedVersion {
        dir_id,
        json: merged,
        extra_libs: Vec::new(),
    })
}

fn resolve_version(app: &AppHandle, config: &LaunchConfig) -> Result<ResolvedVersion, String> {
    match config.loader.as_str() {
        "fabric" => fetch_fabric_profile(&config.version, config.loader_version.as_deref()),
        "quilt" => fetch_quilt_profile(&config.version, config.loader_version.as_deref()),
        "forge" => fetch_modded_installer_profile(app, config, "forge"),
        "neoforge" => fetch_modded_installer_profile(app, config, "neoforge"),
        "vanilla" => {
            let json = fetch_version_json(&config.version)?;
            Ok(ResolvedVersion {
                dir_id: config.version.clone(),
                json,
                extra_libs: Vec::new(),
            })
        }
        other => Err(format!(
            "El loader '{}' no está soportado. Usa vanilla, fabric, quilt, forge o neoforge.",
            other
        )),
    }
}

fn library_jar_path(root: &Path, lib: &Library) -> Result<Option<PathBuf>, String> {
    // classifiers nativos no van al classpath
    if let Some(dl) = &lib.downloads {
        if let Some(artifact) = &dl.artifact {
            let rel = artifact.path.clone().unwrap_or_else(|| {
                maven_path_of(&lib.name).unwrap_or_else(|| {
                    format!("missing/{}.jar", lib.name.replace(':', "_"))
                })
            });
            return Ok(Some(root.join("libraries").join(rel)));
        }
    }
    if let Some(base) = &lib.url {
        if let Some(rel) = maven_path_of(&lib.name) {
            let _ = base;
            return Ok(Some(root.join("libraries").join(rel)));
        }
    }
    Ok(None)
}

fn library_download_url(lib: &Library, jar_path: &Path, root: &Path) -> Option<(String, Option<String>, u64)> {
    if let Some(dl) = &lib.downloads {
        if let Some(artifact) = &dl.artifact {
            return Some((artifact.url.clone(), Some(artifact.sha1.clone()), artifact.size));
        }
    }
    // Maven clásico: base url + ruta maven
    let base = lib
        .url
        .clone()
        .unwrap_or_else(|| "https://libraries.minecraft.net/".to_string());
    if let Some(rel) = maven_path_of(&lib.name) {
        let _ = (jar_path, root);
        return Some((format!("{}{}", base, rel), None, 0));
    }
    None
}

fn native_classifier_key(lib: &Library) -> Option<String> {
    // Formato nuevo: classifiers { "natives-windows": {...}, "natives-windows-arm64": ... }
    if let Some(dl) = &lib.downloads {
        if let Some(classifiers) = &dl.classifiers {
            #[cfg(target_arch = "aarch64")]
            {
                if classifiers.contains_key("natives-windows-arm64") {
                    return Some("natives-windows-arm64".to_string());
                }
            }
            for key in ["natives-windows", "natives-windows-64", "natives-windows-32"] {
                if classifiers.contains_key(key) {
                    return Some(key.to_string());
                }
            }
        }
    }
    // Formato viejo: natives { "windows": "natives-windows-${arch}" }
    if let Some(natives) = &lib.natives {
        if let Some(tpl) = natives.get("windows") {
            #[cfg(target_arch = "x86_64")]
            let arch = "64";
            #[cfg(target_arch = "x86")]
            let arch = "32";
            #[cfg(target_arch = "aarch64")]
            let arch = "arm64";
            #[cfg(not(any(target_arch = "x86_64", target_arch = "x86", target_arch = "aarch64")))]
            let arch = "64";
            return Some(tpl.replace("${arch}", arch));
        }
    }
    None
}

fn extract_natives(jar: &Path, dest_dir: &Path, exclude: &[String]) -> Result<(), String> {
    let file =
        fs::File::open(jar).map_err(|e| format!("No se pudo abrir {}: {}", jar.display(), e))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("ZIP inválido {}: {}", jar.display(), e))?;
    ensure_dir(dest_dir)?;
    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Error en ZIP: {}", e))?;
        let name = entry.name().to_string();
        if entry.is_dir() {
            continue;
        }
        if name.starts_with("META-INF/") {
            continue;
        }
        if exclude.iter().any(|ex| {
            if ex.ends_with('/') {
                name.starts_with(ex)
            } else {
                name == *ex
            }
        }) {
            continue;
        }
        let out_path = dest_dir.join(name);
        if let Some(parent) = out_path.parent() {
            ensure_dir(parent)?;
        }
        let mut out = fs::File::create(&out_path)
            .map_err(|e| format!("No se pudo extraer {}: {}", out_path.display(), e))?;
        std::io::copy(&mut entry, &mut out)
            .map_err(|e| format!("Error extrayendo {}: {}", out_path.display(), e))?;
    }
    Ok(())
}

fn ensure_assets(
    root: &Path,
    vjson: &VersionJson,
    app: &AppHandle,
) -> Result<(String, PathBuf), String> {
    let assets_dir = root.join("assets");
    let index_name: String;
    if let Some(index_ref) = &vjson.asset_index {
        index_name = index_ref.id.clone();
        let indexes_dir = assets_dir.join("indexes");
        ensure_dir(&indexes_dir)?;
        let index_dest = indexes_dir.join(format!("{}.json", index_ref.id));
        emit_launch(app, "downloading", "Descargando índice de recursos...".to_string(), 0, 1);
        download_file(&index_ref.url, &index_dest, Some(&index_ref.sha1))?;
        let content = fs::read_to_string(&index_dest)
            .map_err(|e| format!("No se pudo leer índice de assets: {}", e))?;
        let index: AssetIndex =
            serde_json::from_str(&content).map_err(|e| format!("Índice de assets inválido: {}", e))?;
        let objects_dir = assets_dir.join("objects");
        ensure_dir(&objects_dir)?;

        // Solo los que faltan o están incompletos (verifica tamaño para
        // reanudar instalaciones parciales o corruptas).
        let mut missing: Vec<(String, u64)> = Vec::new();
        for obj in index.objects.values() {
            let dest = objects_dir.join(&obj.hash[..2]).join(&obj.hash);
            let ok = dest
                .metadata()
                .map(|m| m.len() == obj.size)
                .unwrap_or(false);
            if !ok {
                if dest.exists() {
                    let _ = fs::remove_file(&dest);
                }
                missing.push((obj.hash.clone(), obj.size));
            }
        }
        let total = missing.len() as u64;
        if total == 0 {
            emit_launch(app, "downloading", "Recursos verificados.".to_string(), 1, 1);
        } else {
            let bytes_total: u64 = missing.iter().map(|(_, s)| *s).sum();
            let queue: Arc<Mutex<VecDeque<(String, u64)>>> =
                Arc::new(Mutex::new(missing.into_iter().collect()));
            let done = Arc::new(AtomicU64::new(0));
            let bytes_done = Arc::new(AtomicU64::new(0));
            const WORKERS: usize = 8;
            let mut first_error: Option<String> = None;

            std::thread::scope(|s| {
                let mut handles = Vec::new();
                for _ in 0..WORKERS {
                    let queue = Arc::clone(&queue);
                    let done = Arc::clone(&done);
                    let bytes_done = Arc::clone(&bytes_done);
                    let objects_dir = objects_dir.clone();
                    let app = app.clone();
                    handles.push(s.spawn(move || -> Result<(), String> {
                        let client = http_client()?;
                        loop {
                            if install_cancelled() {
                                return Err("Instalación cancelada por el usuario".to_string());
                            }
                            let (hash, expected_size) = {
                                let mut q = queue.lock().map_err(|e| format!("Error interno: {}", e))?;
                                match q.pop_front() {
                                    Some(h) => h,
                                    None => break,
                                }
                            };
                            let dest = objects_dir.join(&hash[..2]).join(&hash);
                            let url = format!(
                                "https://resources.download.minecraft.net/{}/{}",
                                &hash[..2],
                                hash
                            );
                            // Descarga directa con el cliente compartido del hilo.
                            let bytes = client
                                .get(&url)
                                .send()
                                .map_err(|e| format!("Error de red con {}: {}", url, e))?
                                .bytes()
                                .map_err(|e| format!("Error descargando {}: {}", url, e))?;
                            if bytes.len() as u64 != expected_size {
                                return Err(format!(
                                    "Tamaño inválido en recurso {} (esperado {}, recibido {})",
                                    hash,
                                    expected_size,
                                    bytes.len()
                                ));
                            }
                            if let Some(parent) = dest.parent() {
                                ensure_dir(parent)?;
                            }
                            fs::write(&dest, &bytes)
                                .map_err(|e| format!("No se pudo guardar {}: {}", dest.display(), e))?;
                            let n = done.fetch_add(1, Ordering::Relaxed) + 1;
                            let b = bytes_done.fetch_add(bytes.len() as u64, Ordering::Relaxed)
                                + bytes.len() as u64;
                            if n % 10 == 0 || n == total {
                                let mb_done = b as f64 / 1048576.0;
                                let mb_total = bytes_total as f64 / 1048576.0;
                                emit_bytes(
                                    &app,
                                    "downloading",
                                    format!(
                                        "Descargando recursos: {}/{} archivos ({:.1}/{:.1} MB)",
                                        n, total, mb_done, mb_total
                                    ),
                                    n,
                                    total,
                                    b,
                                    bytes_total,
                                );
                            }
                        }
                        Ok(())
                    }));
                }
                for h in handles {
                    if let Err(e) = h.join().unwrap_or(Err("Hilo interrumpido".to_string())) {
                        if first_error.is_none() {
                            first_error = Some(e);
                        }
                    }
                }
            });
            if install_cancelled() && first_error.is_none() {
                return Err("Instalación cancelada por el usuario".to_string());
            }
            if let Some(e) = first_error {
                return Err(e);
            }
            emit_launch(app, "downloading", "Recursos completos.".to_string(), total, total);
        }
    } else {
        // Versiones muy antiguas: carpeta virtual legacy (se omite descarga masiva)
        index_name = vjson.assets.clone().unwrap_or_else(|| "legacy".to_string());
    }
    Ok((index_name, assets_dir))
}

fn ensure_version_installed(
    resolved: &ResolvedVersion,
    app: &AppHandle,
) -> Result<InstallPaths, String> {
    let root = data_root()?;
    let features: HashMap<String, bool> = HashMap::new();
    let vjson = &resolved.json;
    let versions_dir = root.join("versions").join(&resolved.dir_id);
    ensure_dir(&versions_dir)?;

    // 1. Client JAR
    let client_jar = versions_dir.join(format!("{}.jar", resolved.dir_id));
    if let Some(dl) = &vjson.downloads {
        emit_launch(app, "downloading", format!("Descargando cliente {}...", resolved.dir_id), 0, 3);
        download_file(&dl.client.url, &client_jar, Some(&dl.client.sha1))?;
    } else {
        return Err(format!(
            "La versión {} no trae cliente descargable",
            resolved.dir_id
        ));
    }

    // 2. Librerías + classpath
    let mut classpath_jars: Vec<PathBuf> = vec![client_jar.clone()];
    // Limpia y regenera natives
    let natives_dir = versions_dir.join("natives");
    if natives_dir.exists() {
        let _ = fs::remove_dir_all(&natives_dir);
    }
    ensure_dir(&natives_dir)?;

    // Deduplicate libraries by group:artifact, keeping the highest version.
    // Native classifier entries (e.g. "org.lwjgl:lwjgl:3.3.3:natives-windows") are NEVER
    // deduped against the base entry — they must be kept separately for native extraction.
    let mut seen_libs: HashMap<String, (usize, &Library)> = HashMap::new();
    for (idx, lib) in vjson.libraries.iter().enumerate() {
        let parts: Vec<&str> = lib.name.split(':').collect();
        let key = if parts.len() > 3 && parts[3].starts_with("natives-") {
            // Native entry: use full name so it's never deduped with the base
            lib.name.clone()
        } else if parts.len() >= 2 {
            // Regular entry: dedup by group:artifact
            format!("{}:{}", parts[0], parts[1])
        } else {
            lib.name.clone()
        };
        if let Some((_, prev_lib)) = seen_libs.get(&key) {
            let prev_ver = lib.name.split(':').nth(2).unwrap_or("0");
            let curr_ver = prev_lib.name.split(':').nth(2).unwrap_or("0");
            if prev_ver > curr_ver {
                seen_libs.insert(key, (idx, lib));
            }
        } else {
            seen_libs.insert(key, (idx, lib));
        }
    }
    let deduplicated_indices: std::collections::HashSet<usize> =
        seen_libs.values().map(|(idx, _)| *idx).collect();

    let total_libs = vjson.libraries.len() as u64;
    let mut lib_done: u64 = 0;
    for (idx, lib) in vjson.libraries.iter().enumerate() {
        if install_cancelled() {
            return Err("Instalación cancelada por el usuario".to_string());
        }
        if !allowed_by_rules(&lib.rules, &features) {
            lib_done += 1;
            continue;
        }
        // Skip duplicate libraries (keep highest version)
        if !deduplicated_indices.contains(&idx) {
            lib_done += 1;
            continue;
        }
        // Skip native classifier JARs for classpath (they should only be extracted)
        let is_native_classifier = lib.name.split(':').nth(3)
            .map(|c| c.starts_with("natives-"))
            .unwrap_or(false);
        if !is_native_classifier {
            if let Some(jar_path) = library_jar_path(&root, lib)? {
                if let Some((url, sha1, _size)) = library_download_url(lib, &jar_path, &root) {
                    download_file(&url, &jar_path, sha1.as_deref())?;
                    classpath_jars.push(jar_path);
                }
            }
        }
        lib_done += 1;
        if lib_done % 5 == 0 || lib_done == total_libs {
            emit_launch(
                app,
                "downloading",
                format!("Descargando librerías: {}/{}", lib_done, total_libs),
                lib_done,
                total_libs,
            );
        }
        // Nativos
        if let Some(key) = native_classifier_key(lib) {
            let classifiers = lib
                .downloads
                .as_ref()
                .and_then(|d| d.classifiers.as_ref());
            if let Some(info) = classifiers.and_then(|c| c.get(&key)) {
                let rel = info.path.clone().unwrap_or_else(|| {
                    format!("natives/{}_{}.jar", lib.name.replace(':', "_"), key)
                });
                let dest = root.join("libraries").join(rel);
                download_file(&info.url, &dest, Some(&info.sha1))?;
                let exclude = lib
                    .extract
                    .as_ref()
                    .map(|e| e.exclude.clone())
                    .unwrap_or_default();
                extract_natives(&dest, &natives_dir, &exclude)?;
            }
        }
        // New format: separate native library entries (e.g. "org.lwjgl:lwjgl:3.3.3:natives-windows")
        // These have artifact downloads. Extract to natives dir but DON'T add to classpath.
        if is_native_classifier {
            if let Some(dl) = &lib.downloads {
                if let Some(artifact) = &dl.artifact {
                    let rel = artifact.path.clone().unwrap_or_else(|| {
                        maven_path_of(&lib.name).unwrap_or_else(|| {
                            format!("missing/{}.jar", lib.name.replace(':', "_"))
                        })
                    });
                    let dest = root.join("libraries").join(&rel);
                    if !dest.exists() {
                        download_file(&artifact.url, &dest, Some(&artifact.sha1))?;
                    }
                    let exclude = lib
                        .extract
                        .as_ref()
                        .map(|e| e.exclude.clone())
                        .unwrap_or_default();
                    extract_natives(&dest, &natives_dir, &exclude)?;
                }
            }
        }
    }

    // 2b. Librerías extra (Fabric desde maven)
    let total_extra = resolved.extra_libs.len() as u64;
    for (i, (name, base_url)) in resolved.extra_libs.iter().enumerate() {
        let rel = maven_path_of(name)
            .ok_or_else(|| format!("Librería inválida: {}", name))?;
        let dest = root.join("libraries").join(&rel);
        let url = format!("{}{}", base_url, rel);
        download_file(&url, &dest, None)?;
        classpath_jars.push(dest);
        emit_launch(
            app,
            "downloading",
            format!("Descargando {}: {}/{}", name, i + 1, total_extra),
            (i + 1) as u64,
            total_extra,
        );
    }

    // 3. Assets
    let (assets_index_name, assets_dir) = ensure_assets(&root, vjson, app)?;

    // 4. Logging config (log4j)
    let mut log4j_path: Option<PathBuf> = None;
    if let Some(logging) = &vjson.logging {
        let dest = assets_dir
            .join("log_configs")
            .join(format!("{}.xml", logging.client.file.url.rsplit('/').next().unwrap_or("client")));
        download_file(&logging.client.file.url, &dest, Some(&logging.client.file.sha1))?;
        log4j_path = Some(dest);
    }

    Ok(InstallPaths {
        dir_id: resolved.dir_id.clone(),
        client_jar,
        natives_dir,
        assets_dir,
        assets_index_name,
        classpath_jars,
        log4j_path,
        main_class: vjson.main_class.clone(),
        vjson: vjson.clone(),
    })
}

struct InstallPaths {
    dir_id: String,
    client_jar: PathBuf,
    natives_dir: PathBuf,
    assets_dir: PathBuf,
    assets_index_name: String,
    classpath_jars: Vec<PathBuf>,
    log4j_path: Option<PathBuf>,
    main_class: String,
    vjson: VersionJson,
}

// ---------------------------------------------------------------------------
// Java: detección y descarga automática (Temurin)
// ---------------------------------------------------------------------------

fn recommended_java_for_version(version_id: &str) -> Vec<u32> {
    let map: std::collections::HashMap<&str, Vec<u32>> = [
        ("1.21.1", vec![21]), ("1.21", vec![21]),
        ("1.20.6", vec![21]), ("1.20.4", vec![21]),
        ("1.20.1", vec![17, 21]), ("1.20", vec![17, 21]),
        ("1.19.4", vec![17, 21]), ("1.19.2", vec![17]),
        ("1.19", vec![17]), ("1.18.2", vec![17]), ("1.18", vec![17]),
        ("1.17.1", vec![16, 17]), ("1.17", vec![16]),
        ("1.16.5", vec![8, 11, 16]),
        ("1.12.2", vec![8]), ("1.8.9", vec![8]), ("1.7.10", vec![8]),
    ].iter().cloned().collect();
    map.get(version_id).cloned().unwrap_or_default()
}

fn parse_java_major(version_output: &str) -> Option<u32> {
    // 'openjdk version "21.0.3" ...' o 'java version "1.8.0_391"'
    for line in version_output.lines().take(3) {
        if let Some(start) = line.find('"') {
            let rest = &line[start + 1..];
            if let Some(end) = rest.find('"') {
                let v = &rest[..end];
                let parts: Vec<&str> = v.split('.').collect();
                if parts.first() == Some(&"1") {
                    return parts.get(1).and_then(|s| s.parse::<u32>().ok());
                }
                // 21.0.3 / 17 / 9-ea -> primer número
                let first: String = parts[0].chars().take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(n) = first.parse::<u32>() {
                    return Some(n);
                }
            }
        }
    }
    None
}

fn java_major_of(java_bin: &Path) -> Option<u32> {
    let out = StdCommand::new(java_bin).arg("-version").output().ok()?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    parse_java_major(&text)
}

fn candidate_java_bins() -> Vec<PathBuf> {
    let mut out = Vec::new();
    // JAVA_HOME
    if let Ok(home) = std::env::var("JAVA_HOME") {
        out.push(PathBuf::from(home).join("bin").join("java.exe"));
    }
    // PATH
    out.push(PathBuf::from("java.exe"));
    // Rutas comunes en Windows
    for base in [
        "C:\\Program Files\\Eclipse Adoptium",
        "C:\\Program Files\\Java",
        "C:\\Program Files\\Microsoft",
        "C:\\Program Files\\Zulu",
        "C:\\Program Files\\BellSoft",
    ] {
        let base_path = Path::new(base);
        if let Ok(entries) = fs::read_dir(base_path) {
            for entry in entries.flatten() {
                let bin = entry.path().join("bin").join("java.exe");
                out.push(bin.clone());
                // jdk-XX subcarpetas (Microsoft)
                if let Ok(sub) = fs::read_dir(entry.path()) {
                    for s in sub.flatten() {
                        out.push(s.path().join("bin").join("java.exe"));
                    }
                }
            }
        }
    }
    // Runtimes de Mojang (minecraft runtime) en %APPDATA%/.minecraft
    if let Ok(appdata) = std::env::var("APPDATA") {
        let runtimes = PathBuf::from(appdata)
            .join(".minecraft")
            .join("runtime");
        if let Ok(groups) = fs::read_dir(&runtimes) {
            for g in groups.flatten() {
                // runtime/<grupo>/<so>-<arch>/<component>/bin/java.exe
                if let Ok(os_dirs) = fs::read_dir(g.path()) {
                    for os in os_dirs.flatten() {
                        if let Ok(comps) = fs::read_dir(os.path()) {
                            for c in comps.flatten() {
                                out.push(c.path().join("bin").join("java.exe"));
                            }
                        }
                    }
                }
            }
        }
    }
    // Runtimes propios de RagsMC
    if let Ok(root) = data_root() {
        let runtimes = root.join("runtimes");
        if let Ok(entries) = fs::read_dir(&runtimes) {
            for e in entries.flatten() {
                // bin/java.exe directo o con un nivel intermedio (zip de Temurin)
                let direct = e.path().join("bin").join("java.exe");
                out.push(direct);
                if let Ok(sub) = fs::read_dir(e.path()) {
                    for s in sub.flatten() {
                        out.push(s.path().join("bin").join("java.exe"));
                    }
                }
            }
        }
    }
    out
}

fn find_java(required_major: u32) -> Option<PathBuf> {
    let mut fallback: Option<PathBuf> = None;
    for bin in candidate_java_bins() {
        // "java.exe" del PATH siempre "existe" como comando; el resto debe existir
        if bin.components().count() > 1 && !bin.exists() {
            continue;
        }
        if let Some(major) = java_major_of(&bin) {
            if major >= required_major {
                return Some(bin);
            }
            if fallback.is_none() {
                fallback = Some(bin);
            }
        }
    }
    // Si nada cumple el mínimo pero hay algún java, úsalo igual (mejor que nada)
    fallback
}

fn download_temurin(major: u32) -> Result<PathBuf, String> {
    let root = data_root()?;
    let runtimes = root.join("runtimes");
    ensure_dir(&runtimes)?;
    let dest_dir = runtimes.join(format!("temurin-{}", major));
    let probe = dest_dir.join("bin").join("java.exe");
    if probe.exists() {
        return Ok(probe);
    }
    let url = format!(
        "{}/latest/{}/ga/windows/x64/jre/hotspot/normal/eclipse",
        ADOPTIUM_API, major
    );
    let zip_path = runtimes.join(format!("temurin-{}-jre.zip", major));
    download_file(&url, &zip_path, None)?;
    // Extrae a carpeta temporal y mueve el contenido (el zip trae 1 nivel raíz)
    let tmp = runtimes.join(format!(".tmp-temurin-{}", major));
    if tmp.exists() {
        let _ = fs::remove_dir_all(&tmp);
    }
    ensure_dir(&tmp)?;
    let file =
        fs::File::open(&zip_path).map_err(|e| format!("No se pudo abrir JRE: {}", e))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("JRE corrupto: {}", e))?;
    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Error en JRE: {}", e))?;
        let Some(out_path) = entry.enclosed_name() else {
            continue;
        };
        let out_path = tmp.join(out_path);
        if entry.is_dir() {
            ensure_dir(&out_path)?;
            continue;
        }
        if let Some(parent) = out_path.parent() {
            ensure_dir(parent)?;
        }
        let mut out = fs::File::create(&out_path)
            .map_err(|e| format!("No se pudo extraer JRE: {}", e))?;
        std::io::copy(&mut entry, &mut out)
            .map_err(|e| format!("Error extrayendo JRE: {}", e))?;
    }
    // El zip de Temurin contiene una sola carpeta raíz: muévela a dest_dir
    let mut moved = false;
    if let Ok(entries) = fs::read_dir(&tmp) {
        for e in entries.flatten() {
            if e.path().is_dir() {
                if dest_dir.exists() {
                    let _ = fs::remove_dir_all(&dest_dir);
                }
                fs::rename(e.path(), &dest_dir)
                    .map_err(|e| format!("No se pudo instalar JRE: {}", e))?;
                moved = true;
                break;
            }
        }
    }
    let _ = fs::remove_dir_all(&tmp);
    let _ = fs::remove_file(&zip_path);
    if !moved {
        return Err("No se pudo instalar el JRE descargado".to_string());
    }
    let bin = dest_dir.join("bin").join("java.exe");
    if bin.exists() {
        Ok(bin)
    } else {
        Err("JRE descargado pero sin java.exe".to_string())
    }
}

fn ensure_java(required_major: u32, preferred: &str) -> Result<PathBuf, String> {
    if !preferred.is_empty() {
        let p = PathBuf::from(preferred);
        if p.exists() {
            if let Some(major) = java_major_of(&p) {
                if major >= required_major {
                    return Ok(p);
                }
            } else {
                // No se pudo verificar; inténtalo igual
                return Ok(p);
            }
        }
    }
    if let Some(bin) = find_java(required_major) {
        // Si el encontrado es viejo pero existe, igual intenta descargar el correcto
        if let Some(major) = java_major_of(&bin) {
            if major >= required_major {
                return Ok(bin);
            }
        }
    }
    // Descarga automática de Temurin como último recurso
    match download_temurin(required_major) {
        Ok(bin) => Ok(bin),
        Err(e) => Err(format!(
            "No se encontró Java {} ni se pudo descargar automáticamente ({}). Instala Java {} (Temurin/Adoptium) y vuelve a intentarlo.",
            required_major, e, required_major
        )),
    }
}

// ---------------------------------------------------------------------------
// Construcción del comando de lanzamiento
// ---------------------------------------------------------------------------

fn offline_uuid(username: &str) -> String {
    // UUID v3 offline: MD5("OfflinePlayer:" + name) con bits de versión/variante
    let digest = md5::compute(format!("OfflinePlayer:{}", username));
    let mut b = digest.0;
    b[6] = (b[6] & 0x0f) | 0x30;
    b[8] = (b[8] & 0x3f) | 0x80;
    format!(
        "{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11],
        b[12], b[13], b[14], b[15]
    )
}

fn substitute_vars(text: &str, vars: &HashMap<String, String>) -> String {
    let mut out = text.to_string();
    for (k, v) in vars {
        out = out.replace(&format!("${{{}}}", k), v);
    }
    out
}

fn process_arguments(
    args: &[Argument],
    features: &HashMap<String, bool>,
    vars: &HashMap<String, String>,
) -> Vec<String> {
    let mut out = Vec::new();
    for arg in args {
        match arg {
            Argument::Plain(s) => out.push(substitute_vars(s, vars)),
            Argument::Ruled { rules, value } => {
                if !allowed_by_rules(&Some(rules.clone()), features) {
                    continue;
                }
                match value {
                    ArgValue::Simple(s) => out.push(substitute_vars(s, vars)),
                    ArgValue::List(list) => {
                        for s in list {
                            out.push(substitute_vars(s, vars));
                        }
                    }
                }
            }
        }
    }
    out
}

/// Evento de progreso hacia el frontend (canal "ragsmc-launch").
/// stages: "downloading" | "installing" | "launching" | "done" | "error"
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LaunchEvent {
    stage: String,
    message: String,
    current: u64,
    total: u64,
    #[serde(default)]
    bytes_done: u64,
    #[serde(default)]
    bytes_total: u64,
}

fn emit_launch(app: &AppHandle, stage: &str, message: String, current: u64, total: u64) {
    let _ = app.emit(
        "ragsmc-launch",
        LaunchEvent {
            stage: stage.to_string(),
            message,
            current,
            total,
            bytes_done: 0,
            bytes_total: 0,
        },
    );
}

fn emit_bytes(
    app: &AppHandle,
    stage: &str,
    message: String,
    current: u64,
    total: u64,
    bytes_done: u64,
    bytes_total: u64,
) {
    let _ = app.emit(
        "ragsmc-launch",
        LaunchEvent {
            stage: stage.to_string(),
            message,
            current,
            total,
            bytes_done,
            bytes_total,
        },
    );
}

// ---- Cancelación de instalaciones (botón Cancelar del modal) ----

static CANCEL_INSTALL: std::sync::OnceLock<AtomicBool> = std::sync::OnceLock::new();

fn cancel_flag() -> &'static AtomicBool {
    CANCEL_INSTALL.get_or_init(|| AtomicBool::new(false))
}

fn install_cancelled() -> bool {
    cancel_flag().load(Ordering::Relaxed)
}

#[tauri::command]
pub fn cancel_install() -> Result<(), String> {
    cancel_flag().store(true, Ordering::Relaxed);
    Ok(())
}

struct LaunchPlan {
    java_bin: PathBuf,
    jvm_args: Vec<String>,
    classpath: String,
    main_class: String,
    game_args: Vec<String>,
    game_dir: PathBuf,
}

fn build_launch_plan(config: &LaunchConfig, paths: &InstallPaths) -> Result<LaunchPlan, String> {
    let root = data_root()?;
    let required_java = config.java_version.unwrap_or(0).max(
        paths
            .vjson
            .java_version
            .as_ref()
            .map(|j| j.major_version)
            .unwrap_or_else(|| heuristic_min_java(&config.version)),
    );
    let java_bin = ensure_java(required_java.max(8), &config.java_path)?;

    let width = config.resolution.as_ref().map(|r| r.width).unwrap_or(config.width);
    let height = config.resolution.as_ref().map(|r| r.height).unwrap_or(config.height);
    let game_dir = if let Some(gd) = &config.game_dir {
        if !gd.is_empty() {
            PathBuf::from(gd)
        } else {
            root.clone()
        }
    } else {
        root.clone()
    };
    ensure_dir(&game_dir)?;

    let username = config
        .username
        .clone()
        .filter(|u| !u.is_empty())
        .unwrap_or_else(|| "RagsPlayer".to_string());
    let uuid = config
        .uuid
        .clone()
        .filter(|u| !u.is_empty())
        .unwrap_or_else(|| offline_uuid(&username));
    let token = config
        .access_token
        .clone()
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "0".to_string());
    let user_type = config
        .user_type
        .clone()
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "legacy".to_string());

    let classpath = paths
        .classpath_jars
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join(";");

    let natives_str = paths.natives_dir.to_string_lossy().to_string();
    let client_str = paths.client_jar.to_string_lossy().to_string();
    let assets_root = paths.assets_dir.to_string_lossy().to_string();
    let game_dir_str = game_dir.to_string_lossy().to_string();
    let libs_dir = root.join("libraries").to_string_lossy().to_string();

    let mut vars = HashMap::new();
    vars.insert("auth_player_name".into(), username.clone());
    vars.insert("version_name".into(), paths.dir_id.clone());
    vars.insert("game_directory".into(), game_dir_str.clone());
    vars.insert("assets_root".into(), assets_root.clone());
    vars.insert("assets_index_name".into(), paths.assets_index_name.clone());
    vars.insert("auth_uuid".into(), uuid.clone());
    vars.insert("auth_access_token".into(), token.clone());
    vars.insert("clientid".into(), "-".into());
    vars.insert("auth_xuid".into(), "-".into());
    vars.insert("auth_session".into(), "-".into());
    vars.insert("user_type".into(), user_type.clone());
    vars.insert("user_properties".into(), "{}".into());
    vars.insert("version_type".into(), "release".into());
    vars.insert("natives_directory".into(), natives_str.clone());
    vars.insert("launcher_name".into(), LAUNCHER_NAME.into());
    vars.insert("launcher_version".into(), LAUNCHER_VERSION.into());
    vars.insert("classpath".into(), classpath.clone());
    vars.insert("classpath_separator".into(), ";".into());
    vars.insert("library_directory".into(), libs_dir);
    vars.insert("primary_jar".into(), client_str.clone());
    vars.insert("resolution_width".into(), width.max(1).to_string());
    vars.insert("resolution_height".into(), height.max(1).to_string());
    vars.insert("game_assets".into(), assets_root.clone());
    if let Some(log4j) = &paths.log4j_path {
        vars.insert(
            "log4j_configurationFile".into(),
            log4j.to_string_lossy().to_string(),
        );
    }

    let mut features: HashMap<String, bool> = HashMap::new();
    features.insert("is_demo_user".into(), false);
    features.insert("has_custom_resolution".into(), true);
    features.insert("has_quick_plays_support".into(), false);
    features.insert("is_quick_play_singleplayer".into(), false);
    features.insert("is_quick_play_multiplayer".into(), false);
    features.insert("is_quick_play_realms".into(), false);

    // --- JVM args ---
    let mut jvm_args: Vec<String> = vec![
        format!("-Xmx{}M", config.memory.max(512)),
        format!("-Xms{}M", config.memory.max(512) / 4),
    ];
    if let Some(vargs) = &paths.vjson.arguments {
        jvm_args.extend(process_arguments(&vargs.jvm, &features, &vars));
    } else {
        jvm_args.push(format!("-Djava.library.path={}", natives_str));
        jvm_args.push(format!("-Dminecraft.client.jar={}", client_str));
        jvm_args.push(format!("-Dminecraft.launcher.brand={}", LAUNCHER_NAME));
        jvm_args.push(format!(
            "-Dminecraft.launcher.version={}",
            LAUNCHER_VERSION
        ));
    }
    if let Some(extra) = &config.jvm_args {
        for part in extra.split_whitespace() {
            if !part.is_empty() {
                jvm_args.push(substitute_vars(part, &vars));
            }
        }
    }
    // Configuración de logging oficial de Mojang (log4j), si la versión la trae.
    if let Some(logging) = &paths.vjson.logging {
        if !jvm_args.iter().any(|a| a.contains("log4j.configurationFile")) {
            if let Some(log4j) = &paths.log4j_path {
                let mut log_vars = vars.clone();
                log_vars.insert("path".into(), log4j.to_string_lossy().to_string());
                jvm_args.push(substitute_vars(&logging.client.argument, &log_vars));
            }
        }
    }
    // Garantiza classpath explícito
    if !jvm_args.iter().any(|a| a == "-cp" || a == "-classpath") {
        jvm_args.push("-cp".to_string());
        jvm_args.push(classpath.clone());
    }

    // --- Game args ---
    let mut game_args: Vec<String>;
    if let Some(vargs) = &paths.vjson.arguments {
        game_args = process_arguments(&vargs.game, &features, &vars);
    } else if let Some(old) = &paths.vjson.minecraft_arguments {
        game_args = substitute_vars(old, &vars)
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();
    } else {
        game_args = vec![
            "--username".into(),
            username.clone(),
            "--version".into(),
            paths.dir_id.clone(),
            "--gameDir".into(),
            game_dir_str.clone(),
            "--assetsDir".into(),
            assets_root.clone(),
            "--assetIndex".into(),
            paths.assets_index_name.clone(),
            "--uuid".into(),
            uuid.clone(),
            "--accessToken".into(),
            token.clone(),
            "--userType".into(),
            user_type.clone(),
        ];
    }
    if let Some(extra) = &config.game_args {
        for part in extra.split_whitespace() {
            if !part.is_empty() {
                game_args.push(substitute_vars(part, &vars));
            }
        }
    }
    // Servidor directo
    if let Some(server) = &config.server {
        if !server.is_empty() {
            let (host, port) = match server.rsplit_once(':') {
                Some((h, p)) => (h.to_string(), p.to_string()),
                None => (server.clone(), "25565".to_string()),
            };
            game_args.push("--server".to_string());
            game_args.push(host);
            game_args.push("--port".to_string());
            game_args.push(port);
        }
    }
    if config.fullscreen && !game_args.iter().any(|a| a == "--fullscreen") {
        game_args.push("--fullscreen".to_string());
    }

    Ok(LaunchPlan {
        java_bin,
        jvm_args,
        classpath,
        main_class: paths.main_class.clone(),
        game_args,
        game_dir,
    })
}

/// Lanza Minecraft en un hilo de fondo para no congelar la ventana.
/// Retorna de inmediato; el progreso llega por eventos "ragsmc-launch".
#[tauri::command]
pub fn launch_minecraft(app: AppHandle, config: LaunchConfig) -> Result<String, String> {
    match config.loader.as_str() {
        "vanilla" | "fabric" | "quilt" | "forge" | "neoforge" => {}
        other => {
            return Err(format!(
                "El loader '{}' no está soportado. Usa vanilla, fabric, quilt, forge o neoforge.",
                other
            ))
        }
    }
    std::thread::spawn(move || {
        background_launch(&app, &config);
    });
    Ok("Instalación iniciada en segundo plano".to_string())
}

/// Emite "cancelled" si fue cancelación del usuario, "error" en otro caso.
fn emit_failure(app: &AppHandle, e: String) {
    if install_cancelled() || e.contains("cancelada") {
        emit_launch(
            app,
            "cancelled",
            "Descarga cancelada. Pulsa JUGAR para reanudar donde quedó.".to_string(),
            0,
            0,
        );
    } else {
        emit_launch(app, "error", e, 0, 0);
    }
}

fn background_launch(app: &AppHandle, config: &LaunchConfig) {
    cancel_flag().store(false, Ordering::Relaxed);
    emit_launch(
        app,
        "downloading",
        format!("Resolviendo Minecraft {}...", config.version),
        0,
        0,
    );
    let resolved = match resolve_version(app, config) {
        Ok(r) => r,
        Err(e) => {
            emit_failure(app, e);
            return;
        }
    };
    let paths = match ensure_version_installed(&resolved, app) {
        Ok(p) => p,
        Err(e) => {
            emit_failure(app, e);
            return;
        }
    };
    if paths.main_class.is_empty() {
        emit_failure(app, "La versión no declara clase principal".to_string());
        return;
    }
    emit_launch(app, "installing", "Localizando Java...".to_string(), 0, 0);
    let plan = match build_launch_plan(config, &paths) {
        Ok(p) => p,
        Err(e) => {
            emit_failure(app, e);
            return;
        }
    };
    emit_launch(app, "launching", "Iniciando Minecraft...".to_string(), 0, 0);

    // Log del lanzamiento
    let log_path = plan.game_dir.join("ragsmc-launch.log");
    let mut log_text = format!(
        "RagsMC Launcher {}\nJava: {}\nMain: {}\nJVM: {}\nGame: {}\n",
        LAUNCHER_VERSION,
        plan.java_bin.display(),
        plan.main_class,
        plan.jvm_args.join(" "),
        plan.game_args.join(" ")
    );

    // Prefiere javaw.exe (sin consola) si existe junto al java detectado.
    let java_bin = {
        let javaw = plan.java_bin.with_file_name("javaw.exe");
        if javaw.exists() {
            javaw
        } else {
            plan.java_bin.clone()
        }
    };
    let java_note = java_major_of(&java_bin)
        .map(|m| format!("Java {}", m))
        .unwrap_or_else(|| "Java".to_string());
    emit_launch(
        app,
        "launching",
        format!("Iniciando Minecraft con {}...", java_note),
        0,
        0,
    );
    log_text.push_str(&format!("Java usado: {}\n", java_bin.display()));
    // Guarda la cabecera primero; la salida del juego se anexa después.
    let _ = fs::write(&log_path, &log_text);

    let mut cmd = StdCommand::new(&java_bin);
    cmd.args(&plan.jvm_args)
        .arg(&plan.main_class)
        .args(&plan.game_args)
        .current_dir(&plan.game_dir)
        .env("APPDATA", std::env::var("APPDATA").unwrap_or_default());
    // Toda la salida del juego va al log: sin esto los fallos son invisibles.
    match fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(out) => match out.try_clone() {
            Ok(err) => {
                cmd.stdout(Stdio::from(out)).stderr(Stdio::from(err));
            }
            Err(_) => {
                cmd.stdout(Stdio::null()).stderr(Stdio::null());
            }
        },
        Err(_) => {
            cmd.stdout(Stdio::null()).stderr(Stdio::null());
        }
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // DETACHED_PROCESS (0x08) + CREATE_NEW_PROCESS_GROUP (0x200): el juego
        // sobrevive aunque se cierre el launcher y no hereda su consola.
        cmd.creation_flags(0x00000008 | 0x00000200);
    }
    match cmd.spawn() {
        Ok(mut child) => {
            let pid = child.id();
            // Verificación de vida: si el juego muere en los primeros 15 segundos,
            // es un fallo de arranque y se reporta la causa REAL en vez de éxito.
            let mut dead_code: Option<Option<i32>> = None;
            for _ in 0..30 {
                std::thread::sleep(Duration::from_millis(500));
                match child.try_wait() {
                    Ok(Some(status)) => {
                        dead_code = Some(status.code());
                        break;
                    }
                    Ok(None) => {}
                    Err(_) => break,
                }
            }
            match dead_code {
                Some(code) => {
                    let tail = read_log_tail(&log_path, 25, 1500);
                    emit_launch(
                        app,
                        "error",
                        format!(
                            "Minecraft se cerró al iniciar (código {:?}).\n\nÚltimas líneas del juego:\n{}\n\nLog completo en:\n{}",
                            code,
                            tail,
                            log_path.display()
                        ),
                        0,
                        0,
                    );
                }
                None => {
                    emit_launch(
                        app,
                        "done",
                        format!(
                            "Minecraft {} iniciado correctamente (PID {})",
                            config.version, pid
                        ),
                        1,
                        1,
                    );
                }
            }
        }
        Err(e) => {
            emit_launch(
                app,
                "error",
                format!(
                    "No se pudo iniciar Java ({}): {}. Revisa que Java {} esté instalado.",
                    java_bin.display(),
                    e,
                    heuristic_min_java(&config.version)
                ),
                0,
                0,
            );
        }
    }
}

/// Últimas `max_lines` líneas del log (máx `max_chars` caracteres).
fn read_log_tail(path: &Path, max_lines: usize, max_chars: usize) -> String {
    let content = fs::read_to_string(path).unwrap_or_else(|_| "(sin log disponible)".to_string());
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    let tail = lines[start..].join("\n");
    let chars: Vec<char> = tail.chars().collect();
    if chars.len() > max_chars {
        chars[chars.len() - max_chars..].iter().collect()
    } else {
        tail
    }
}

// ---------------------------------------------------------------------------
// Sistema, estado, mods, respaldos, logs y cuentas Microsoft
// ---------------------------------------------------------------------------

/// Memoria RAM total del equipo en GB (para recomendar asignación).
#[tauri::command]
pub fn get_total_memory_gb() -> Result<u64, String> {
    #[cfg(target_os = "windows")]
    {
        let out = StdCommand::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory",
            ])
            .output()
            .map_err(|e| format!("No se pudo consultar la RAM: {}", e))?;
        let text = String::from_utf8_lossy(&out.stdout);
        let bytes: u64 = text
            .trim()
            .parse()
            .map_err(|_| "Respuesta inesperada al consultar la RAM".to_string())?;
        Ok(bytes / 1073741824)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(8)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub service: String,
    pub status: String,
}

/// Estado en vivo de los servicios de Mojang/Microsoft.
#[tauri::command]
pub fn get_service_status() -> Result<Vec<ServiceStatus>, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Error HTTP: {}", e))?;
    let list: Vec<HashMap<String, String>> = client
        .get("https://status.mojang.com/check")
        .send()
        .map_err(|e| format!("Sin conexión a Mojang: {}", e))?
        .json()
        .map_err(|e| format!("Respuesta inválida: {}", e))?;
    Ok(list
        .into_iter()
        .flat_map(|m| m.into_iter())
        .map(|(service, status)| ServiceStatus { service, status })
        .collect())
}

// ---- Modrinth: buscador e instalador de mods ----

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModResult {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub icon_url: String,
    pub downloads: u64,
}

#[derive(Debug, Deserialize)]
struct ModrinthSearch {
    #[serde(default)]
    hits: Vec<ModrinthHit>,
}

#[derive(Debug, Deserialize)]
struct ModrinthHit {
    project_id: String,
    slug: String,
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    icon_url: Option<String>,
    #[serde(default)]
    downloads: u64,
}

#[derive(Debug, Deserialize)]
struct ModrinthVersionFile {
    url: String,
    filename: String,
    #[serde(default)]
    primary: bool,
}

#[derive(Debug, Deserialize)]
struct ModrinthVersion {
    #[serde(default)]
    files: Vec<ModrinthVersionFile>,
}

/// Busca mods en Modrinth compatibles con versión + loader.
#[tauri::command]
pub fn search_mods(
    query: String,
    mc_version: String,
    loader: String,
) -> Result<Vec<ModResult>, String> {
    let facets = format!(
        "[[\"project_type:mod\"],[\"versions:{}\"],[\"categories:{}\"]]",
        mc_version,
        loader.to_lowercase()
    );
    let client = http_client()?;
    let resp: ModrinthSearch = client
        .get("https://api.modrinth.com/v2/search")
        .query(&[
            ("query", query.as_str()),
            ("limit", "20"),
            ("facets", facets.as_str()),
        ])
        .send()
        .map_err(|e| format!("Error buscando mods: {}", e))?
        .json()
        .map_err(|e| format!("Respuesta inválida de Modrinth: {}", e))?;
    Ok(resp
        .hits
        .into_iter()
        .map(|h| ModResult {
            id: h.project_id,
            slug: h.slug,
            title: h.title,
            description: h.description,
            icon_url: h.icon_url.unwrap_or_default(),
            downloads: h.downloads,
        })
        .collect())
}

/// Descarga la última versión compatible de un mod a la carpeta mods/ de la instalación.
#[tauri::command]
pub fn install_mod(
    project_id: String,
    mc_version: String,
    loader: String,
    installation_id: String,
) -> Result<String, String> {
    let list = load_installations()?;
    let inst = list
        .iter()
        .find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let game_dir = game_dir_of(inst)?;
    let mods_dir = game_dir.join("mods");
    ensure_dir(&mods_dir)?;
    let client = http_client()?;
    let versions: Vec<ModrinthVersion> = client
        .get(format!(
            "https://api.modrinth.com/v2/project/{}/version",
            project_id
        ))
        .query(&[
            ("game_versions", format!("[\"{}\"]", mc_version).as_str()),
            ("loaders", format!("[\"{}\"]", loader.to_lowercase()).as_str()),
        ])
        .send()
        .map_err(|e| format!("Error consultando versiones del mod: {}", e))?
        .json()
        .map_err(|e| format!("Respuesta inválida de Modrinth: {}", e))?;
    let ver = versions
        .first()
        .ok_or_else(|| "El mod no tiene versiones compatibles".to_string())?;
    let file = ver
        .files
        .iter()
        .find(|f| f.primary)
        .or(ver.files.first())
        .ok_or_else(|| "El mod no trae archivos descargables".to_string())?;
    let dest = mods_dir.join(&file.filename);
    download_file(&file.url, &dest, None)?;
    Ok(file.filename.clone())
}

// ---- Respaldos de mundos (zip de saves/) ----

fn game_dir_of(inst: &Installation) -> Result<PathBuf, String> {
    let root = data_root()?;
    Ok(if inst.game_dir.is_empty() {
        root
    } else {
        PathBuf::from(&inst.game_dir)
    })
}

fn backups_dir_of(instance_id: &str) -> Result<PathBuf, String> {
    Ok(data_root()?.join("backups").join(instance_id))
}

fn zip_dir_recursive(src_dir: &Path, zip_path: &Path, base: &Path) -> Result<(), String> {
    let file =
        fs::File::create(zip_path).map_err(|e| format!("No se pudo crear {}: {}", zip_path.display(), e))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default();
    let mut stack = vec![src_dir.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries =
            fs::read_dir(&dir).map_err(|e| format!("No se pudo leer {}: {}", dir.display(), e))?;
        for entry in entries.flatten() {
            let path = entry.path();
            let rel = path
                .strip_prefix(base)
                .map_err(|e| format!("Ruta inválida: {}", e))?;
            let name = rel.to_string_lossy().replace('\\', "/");
            if path.is_dir() {
                zip.add_directory(format!("{}/", name), options)
                    .map_err(|e| format!("Error en zip: {}", e))?;
                stack.push(path);
            } else {
                zip.start_file(name, options)
                    .map_err(|e| format!("Error en zip: {}", e))?;
                let mut f = fs::File::open(&path)
                    .map_err(|e| format!("No se pudo leer {}: {}", path.display(), e))?;
                std::io::copy(&mut f, &mut zip)
                    .map_err(|e| format!("Error en zip: {}", e))?;
            }
        }
    }
    zip.finish()
        .map_err(|e| format!("No se pudo cerrar el zip: {}", e))?;
    Ok(())
}

/// Crea un respaldo .zip de los mundos (saves/) de una instalación.
#[tauri::command]
pub fn backup_instance(installation_id: String) -> Result<String, String> {
    let list = load_installations()?;
    let inst = list
        .iter()
        .find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let game_dir = game_dir_of(inst)?;
    let saves = game_dir.join("saves");
    let has_worlds = saves.exists()
        && fs::read_dir(&saves)
            .map(|mut r| r.any(|e| e.map(|x| x.path().is_dir()).unwrap_or(false)))
            .unwrap_or(false);
    if !has_worlds {
        return Err("La instalación no tiene mundos todavía (carpeta saves vacía).".to_string());
    }
    let dir = backups_dir_of(&installation_id)?;
    ensure_dir(&dir)?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let dest = dir.join(format!("mundos-{}.zip", stamp));
    zip_dir_recursive(&saves, &dest, &game_dir)?;
    Ok(dest.to_string_lossy().to_string())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub name: String,
    pub size: u64,
    pub modified: u64,
}

#[tauri::command]
pub fn list_backups(installation_id: String) -> Result<Vec<BackupInfo>, String> {
    let dir = backups_dir_of(&installation_id)?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for e in entries.flatten() {
            let p = e.path();
            if p.extension().and_then(|x| x.to_str()) != Some("zip") {
                continue;
            }
            if let (Some(name), Ok(meta)) = (p.file_name().and_then(|x| x.to_str()), p.metadata()) {
                out.push(BackupInfo {
                    name: name.to_string(),
                    size: meta.len(),
                    modified: meta
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                });
            }
        }
    }
    out.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(out)
}

/// Restaura un respaldo sobre saves/ (sobrescribe).
#[tauri::command]
pub fn restore_backup(installation_id: String, name: String) -> Result<String, String> {
    let list = load_installations()?;
    let inst = list
        .iter()
        .find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let game_dir = game_dir_of(inst)?;
    let zip_path = backups_dir_of(&installation_id)?.join(&name);
    if !zip_path.exists() {
        return Err("Respaldo no encontrado".to_string());
    }
    let file =
        fs::File::open(&zip_path).map_err(|e| format!("No se pudo abrir: {}", e))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Zip inválido: {}", e))?;
    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Error en zip: {}", e))?;
        let Some(out_path) = entry.enclosed_name() else {
            continue;
        };
        let out_path = game_dir.join(out_path);
        if entry.is_dir() {
            ensure_dir(&out_path)?;
            continue;
        }
        if let Some(parent) = out_path.parent() {
            ensure_dir(parent)?;
        }
        let mut out = fs::File::create(&out_path)
            .map_err(|e| format!("No se pudo restaurar {}: {}", out_path.display(), e))?;
        std::io::copy(&mut entry, &mut out)
            .map_err(|e| format!("Error restaurando: {}", e))?;
    }
    Ok(format!("Respaldo '{}' restaurado", name))
}

// ---- Visor de logs ----

/// Últimas 200 líneas del log del juego (latest.log) o del launcher.
#[tauri::command]
pub fn read_instance_log(installation_id: String, kind: String) -> Result<String, String> {
    let list = load_installations()?;
    let inst = list
        .iter()
        .find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let game_dir = game_dir_of(inst)?;
    let path = if kind == "game" {
        game_dir.join("logs").join("latest.log")
    } else {
        game_dir.join("ragsmc-launch.log")
    };
    let content = fs::read_to_string(&path)
        .map_err(|_| format!("Todavía no hay log ({})", path.display()))?;
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(200);
    Ok(lines[start..].join("\n"))
}

// ---- Microsoft OAuth2 (flujo de código de dispositivo) ----

fn ms_emit(app: &AppHandle, stage: &str, message: String, extra: serde_json::Value) {
    let mut obj = serde_json::Map::new();
    obj.insert("stage".to_string(), serde_json::Value::String(stage.to_string()));
    obj.insert("message".to_string(), serde_json::Value::String(message.to_string()));
    if let serde_json::Value::Object(map) = extra {
        for (k, v) in map {
            obj.insert(k, v);
        }
    }
    let _ = app.emit("ragsmc-ms", serde_json::Value::Object(obj));
}

#[derive(Debug, Deserialize)]
struct MsDeviceCode {
    #[serde(default)]
    user_code: String,
    #[serde(default)]
    device_code: String,
    #[serde(default)]
    verification_uri: String,
    #[serde(default)]
    expires_in: u64,
    #[serde(default)]
    interval: u64,
}

#[derive(Debug, Deserialize)]
struct MsToken {
    #[serde(default)]
    access_token: String,
    #[serde(default)]
    error: String,
}

#[derive(Debug, Deserialize)]
struct XblResponse {
    #[serde(default)]
    #[serde(rename = "Token")]
    token: String,
}

#[derive(Debug, Deserialize, Default)]
struct XstsClaims {
    #[serde(default)]
    xui: Vec<XstsXui>,
}

#[derive(Debug, Deserialize)]
struct XstsXui {
    #[serde(default)]
    uhs: String,
}

#[derive(Debug, Deserialize)]
struct XstsResponse {
    #[serde(default)]
    #[serde(rename = "Token")]
    token: String,
    #[serde(default)]
    #[serde(rename = "DisplayClaims")]
    display_claims: XstsClaims,
}

#[derive(Debug, Deserialize)]
struct McLoginResponse {
    #[serde(default)]
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct McProfile {
    #[serde(default)]
    id: String,
    #[serde(default)]
    name: String,
}

/// Inicia sesión con Microsoft (requiere tu Client ID de Azure en Ajustes).
/// Emite eventos "ragsmc-ms": code -> done/error.
#[tauri::command]
pub fn microsoft_login(app: AppHandle, client_id: String) -> Result<String, String> {
    if client_id.trim().is_empty() {
        return Err("Configura tu Client ID de Azure en Ajustes primero.".to_string());
    }
    std::thread::spawn(move || {
        ms_device_flow(&app, client_id.trim());
    });
    Ok("Login iniciado".to_string())
}

fn ms_device_flow(app: &AppHandle, client_id: &str) {
    let fail = |msg: String| {
        ms_emit(app, "error", msg, serde_json::Value::Null);
    };
    let client = match http_client() {
        Ok(c) => c,
        Err(e) => {
            fail(e);
            return;
        }
    };
    // 1. Código de dispositivo.
    let dc: MsDeviceCode = match client
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode")
        .form(&[
            ("client_id", client_id),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
    {
        Ok(r) => match r.json() {
            Ok(v) => v,
            Err(e) => {
                fail(format!("Respuesta inválida de Microsoft: {}", e));
                return;
            }
        },
        Err(e) => {
            fail(format!("Sin conexión a Microsoft: {}", e));
            return;
        }
    };
    if dc.device_code.is_empty() || dc.user_code.is_empty() {
        fail("Microsoft rechazó el Client ID. Revisa el valor en Ajustes.".to_string());
        return;
    }
    ms_emit(
        app,
        "code",
        "Autoriza en el navegador".to_string(),
        serde_json::json!({ "userCode": dc.user_code, "url": dc.verification_uri }),
    );
    // 2. Sondeo del token.
    let interval = dc.interval.max(5);
    let deadline = std::time::Instant::now() + Duration::from_secs(dc.expires_in.max(60).min(900));
    let ms_token: MsToken = loop {
        if std::time::Instant::now() > deadline {
            fail("Tiempo agotado esperando autorización.".to_string());
            return;
        }
        std::thread::sleep(Duration::from_secs(interval));
        let r: MsToken = match client
            .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                ("client_id", client_id),
                ("device_code", dc.device_code.as_str()),
            ])
            .send()
        {
            Ok(r) => match r.json() {
                Ok(v) => v,
                Err(_) => continue,
            },
            Err(_) => continue,
        };
        if !r.access_token.is_empty() {
            break r;
        }
        if r.error == "authorization_declined" || r.error == "expired_token" || r.error == "bad_verification_code" {
            fail("Autorización denegada o expirada.".to_string());
            return;
        }
        // authorization_pending u otros: sigue sondeando.
    };
    // 3. Xbox Live.
    let xbl: XblResponse = match client
        .post("https://user.auth.xboxlive.com/user/authenticate")
        .json(&serde_json::json!({
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={}", ms_token.access_token)
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT"
        }))
        .send()
    {
        Ok(r) => match r.json() {
            Ok(v) => v,
            Err(e) => {
                fail(format!("Error Xbox Live: {}", e));
                return;
            }
        },
        Err(e) => {
            fail(format!("Error Xbox Live: {}", e));
            return;
        }
    };
    if xbl.token.is_empty() {
        fail("Xbox Live no devolvió token.".to_string());
        return;
    }
    // 4. XSTS.
    let xsts: XstsResponse = match client
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
        .json(&serde_json::json!({
            "Properties": { "SandboxId": "RETAIL", "UserTokens": [xbl.token] },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT"
        }))
        .send()
    {
        Ok(r) => match r.json() {
            Ok(v) => v,
            Err(e) => {
                fail(format!("Error XSTS: {}", e));
                return;
            }
        },
        Err(e) => {
            fail(format!("Error XSTS: {}", e));
            return;
        }
    };
    let uhs = xsts
        .display_claims
        .xui
        .first()
        .map(|x| x.uhs.clone())
        .unwrap_or_default();
    if xsts.token.is_empty() || uhs.is_empty() {
        fail("XSTS no autorizó la cuenta.".to_string());
        return;
    }
    // 5. Login en Minecraft.
    let mc: McLoginResponse = match client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .json(&serde_json::json!({
            "identityToken": format!("XBL3.0 x={};{}", uhs, xsts.token)
        }))
        .send()
    {
        Ok(r) => match r.json() {
            Ok(v) => v,
            Err(e) => {
                fail(format!("Error login Minecraft: {}", e));
                return;
            }
        },
        Err(e) => {
            fail(format!("Error login Minecraft: {}", e));
            return;
        }
    };
    if mc.access_token.is_empty() {
        fail("Minecraft no aceptó la sesión.".to_string());
        return;
    }
    // 6. Perfil.
    let profile: McProfile = match client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&mc.access_token)
        .send()
    {
        Ok(r) => match r.json() {
            Ok(v) => v,
            Err(e) => {
                fail(format!("Error obteniendo perfil: {}", e));
                return;
            }
        },
        Err(e) => {
            fail(format!("Error obteniendo perfil: {}", e));
            return;
        }
    };
    if profile.name.is_empty() {
        fail("La cuenta Microsoft no tiene perfil de Minecraft (¿sin juego comprado?).".to_string());
        return;
    }
    ms_emit(
        app,
        "done",
        format!("Sesión iniciada como {}", profile.name),
        serde_json::json!({ "name": profile.name, "uuid": profile.id }),
    );
}

// ---- Gestor de mods / shaders / resource packs ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentItem {
    pub filename: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub mc_versions: Vec<String>,
    pub size: u64,
    pub enabled: bool,
    pub path: String,
}

fn content_dir(subfolder: &str, installation_id: Option<String>) -> Result<PathBuf, String> {
    if let Some(ref iid) = installation_id {
        let list = load_installations()?;
        let inst = list.iter().find(|i| i.id == *iid)
            .ok_or_else(|| "Instalación no encontrada".to_string())?;
        Ok(game_dir_of(inst)?.join(subfolder))
    } else {
        Ok(data_root()?.join(subfolder))
    }
}

fn read_mod_metadata(jar_path: &Path) -> (String, String, String, Vec<String>) {
    let file = match fs::File::open(jar_path) {
        Ok(f) => f,
        Err(_) => return (String::new(), String::new(), String::new(), Vec::new()),
    };
    let mut archive = match zip::ZipArchive::new(file) {
        Ok(a) => a,
        Err(_) => return (String::new(), String::new(), String::new(), Vec::new()),
    };
    // Try fabric.mod.json (Fabric/Quilt)
    if let Ok(mut entry) = archive.by_name("fabric.mod.json") {
        let mut content = String::new();
        if entry.read_to_string(&mut content).is_ok() {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                let name = json.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let version = json.get("version").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let desc = json.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let mc_versions: Vec<String> = json.get("depends")
                    .and_then(|d| d.get("minecraft"))
                    .and_then(|v| {
                        if let Some(s) = v.as_str() { return Some(vec![s.to_string()]); }
                        if let Some(arr) = v.as_array() {
                            return Some(arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());
                        }
                        None
                    }).unwrap_or_default();
                return (name, version, desc, mc_versions);
            }
        }
    }
    // Try META-INF/mods.toml (Forge/NeoForge)
    if let Ok(mut entry) = archive.by_name("META-INF/mods.toml") {
        let mut content = String::new();
        if entry.read_to_string(&mut content).is_ok() {
            let mut name = String::new();
            let mut version = String::new();
            let mut desc = String::new();
            let mut mc_versions = Vec::new();
            let mut in_mod = false;
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("[[mods]]") { in_mod = true; continue; }
                if trimmed.starts_with('[') && !trimmed.starts_with("[[") { in_mod = false; }
                if in_mod || (!trimmed.is_empty() && !trimmed.starts_with('#') && !trimmed.starts_with('[')) {
                    if let Some((k, v)) = trimmed.split_once('=') {
                        let k = k.trim();
                        let v = v.trim().trim_matches('"').trim_matches('\'');
                        match k {
                            "modId" | "mod_id" => { if name.is_empty() { name = v.to_string(); } }
                            "displayName" | "display_name" => { name = v.to_string(); }
                            "version" => { if version.is_empty() { version = v.to_string(); } }
                            "description" => { desc = v.to_string(); }
                            _ => {}
                        }
                    }
                }
                if let Some(v) = trimmed.strip_prefix("mcVersion") {
                    let v = v.trim().trim_matches('"').trim_matches('\'');
                    if !v.is_empty() { mc_versions.push(v.to_string()); }
                }
            }
            return (name, version, desc, mc_versions);
        }
    }
    // Try quilt.mod.json (Quilt)
    if let Ok(mut entry) = archive.by_name("quilt.mod.json") {
        let mut content = String::new();
        if entry.read_to_string(&mut content).is_ok() {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                let name = json.get("quilt_loader").and_then(|q| q.get("metadata"))
                    .and_then(|m| m.get("name")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                let version = json.get("quilt_loader").and_then(|q| q.get("version"))
                    .and_then(|v| v.as_str()).unwrap_or("").to_string();
                let desc = json.get("quilt_loader").and_then(|q| q.get("metadata"))
                    .and_then(|m| m.get("description")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                return (name, version, desc, Vec::new());
            }
        }
    }
    (String::new(), String::new(), String::new(), Vec::new())
}

fn list_content_folder(subfolder: &str, installation_id: Option<String>) -> Result<Vec<ContentItem>, String> {
    let dir = content_dir(subfolder, installation_id)?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut items = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("Error leyendo {}: {}", dir.display(), e))?.flatten() {
        let path = entry.path();
        let fname = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let is_disabled = fname.ends_with(".disabled");
        let display_name = if is_disabled {
            fname.trim_end_matches(".disabled").to_string()
        } else {
            fname.clone()
        };
        let size = path.metadata().map(|m| m.len()).unwrap_or(0);
        if path.is_file() && (fname.ends_with(".jar") || fname.ends_with(".disabled")) {
            let (mod_name, mod_version, mod_desc, mc_versions) = if subfolder == "mods" {
                read_mod_metadata(&path)
            } else {
                (String::new(), String::new(), String::new(), Vec::new())
            };
            let name = if !mod_name.is_empty() { mod_name } else { display_name };
            items.push(ContentItem {
                filename: fname,
                name,
                version: mod_version,
                description: mod_desc,
                mc_versions,
                size,
                enabled: !is_disabled,
                path: path.to_string_lossy().to_string(),
            });
        }
    }
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

#[tauri::command]
pub fn list_mods(installation_id: Option<String>) -> Result<Vec<ContentItem>, String> {
    list_content_folder("mods", installation_id)
}

#[tauri::command]
pub fn list_shaders(installation_id: Option<String>) -> Result<Vec<ContentItem>, String> {
    list_content_folder("shaderpacks", installation_id)
}

#[tauri::command]
pub fn list_resource_packs(installation_id: Option<String>) -> Result<Vec<ContentItem>, String> {
    list_content_folder("resourcepacks", installation_id)
}

#[tauri::command]
pub fn toggle_content(subfolder: String, filename: String, installation_id: Option<String>) -> Result<ContentItem, String> {
    let dir = content_dir(&subfolder, installation_id)?;
    let path = dir.join(&filename);
    if !path.exists() {
        return Err(format!("Archivo no encontrado: {}", filename));
    }
    let new_name = if filename.ends_with(".disabled") {
        filename.trim_end_matches(".disabled").to_string()
    } else {
        format!("{}.disabled", filename)
    };
    let new_path = dir.join(&new_name);
    fs::rename(&path, &new_path).map_err(|e| format!("Error renombrando: {}", e))?;
    let meta = new_path.metadata().map(|m| m.len()).unwrap_or(0);
    let is_disabled = new_name.ends_with(".disabled");
    let display_name = if is_disabled {
        new_name.trim_end_matches(".disabled").to_string()
    } else {
        new_name.clone()
    };
    let (mod_name, mod_version, mod_desc, mc_versions) = if subfolder == "mods" {
        read_mod_metadata(&new_path)
    } else {
        (String::new(), String::new(), String::new(), Vec::new())
    };
    let name = if !mod_name.is_empty() { mod_name } else { display_name };
    Ok(ContentItem {
        filename: new_name,
        name,
        version: mod_version,
        description: mod_desc,
        mc_versions,
        size: meta,
        enabled: !is_disabled,
        path: new_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn delete_content(subfolder: String, filename: String, installation_id: Option<String>) -> Result<String, String> {
    let dir = content_dir(&subfolder, installation_id)?;
    let path = dir.join(&filename);
    if !path.exists() {
        return Err(format!("Archivo no encontrado: {}", filename));
    }
    fs::remove_file(&path).map_err(|e| format!("Error eliminando: {}", e))?;
    Ok(format!("Eliminado: {}", filename))
}

#[tauri::command]
pub fn open_game_folder(subfolder: Option<String>, installation_id: Option<String>) -> Result<String, String> {
    let dir = if let Some(ref sf) = subfolder {
        content_dir(sf, installation_id)?
    } else if let Some(ref iid) = installation_id {
        let list = load_installations()?;
        let inst = list.iter().find(|i| i.id == *iid)
            .ok_or_else(|| "Instalación no encontrada".to_string())?;
        game_dir_of(inst)?
    } else {
        data_root()?
    };
    ensure_dir(&dir)?;
    #[cfg(target_os = "windows")]
    { let _ = StdCommand::new("explorer").arg(dir.to_string_lossy().to_string()).spawn(); }
    #[cfg(target_os = "macos")]
    { let _ = StdCommand::new("open").arg(dir.to_string_lossy().to_string()).spawn(); }
    #[cfg(target_os = "linux")]
    { let _ = StdCommand::new("xdg-open").arg(dir.to_string_lossy().to_string()).spawn(); }
    Ok(dir.to_string_lossy().to_string())
}

// ---- Multi-account management ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountEntry {
    pub id: String,
    pub username: String,
    pub uuid: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub skin_url: Option<String>,
    pub selected: bool,
}

fn accounts_path() -> Result<PathBuf, String> {
    let root = data_root()?;
    Ok(root.join("accounts.json"))
}

fn load_accounts() -> Result<Vec<AccountEntry>, String> {
    let p = accounts_path()?;
    if !p.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&p).map_err(|e| format!("Error leyendo cuentas: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("JSON de cuentas inválido: {}", e))
}

fn save_accounts(list: &[AccountEntry]) -> Result<(), String> {
    let p = accounts_path()?;
    if let Some(parent) = p.parent() { ensure_dir(parent)?; }
    let json = serde_json::to_string_pretty(list).map_err(|e| format!("Error serializando: {}", e))?;
    fs::write(&p, json).map_err(|e| format!("Error guardando cuentas: {}", e))
}

#[tauri::command]
pub fn get_accounts() -> Result<Vec<AccountEntry>, String> {
    load_accounts()
}

#[tauri::command]
pub fn add_account(username: String) -> Result<AccountEntry, String> {
    let mut list = load_accounts()?;
    let id = format!("{}-{}", username.to_lowercase().replace(' ', "_"), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis());
    let uuid = offline_uuid(&username);
    for a in list.iter_mut() { a.selected = false; }
    let entry = AccountEntry {
        id,
        username,
        uuid,
        account_type: "offline".to_string(),
        skin_url: None,
        selected: true,
    };
    list.push(entry.clone());
    save_accounts(&list)?;
    Ok(entry)
}

#[tauri::command]
pub fn select_account(id: String) -> Result<Vec<AccountEntry>, String> {
    let mut list = load_accounts()?;
    for a in list.iter_mut() { a.selected = a.id == id; }
    save_accounts(&list)?;
    Ok(list)
}

#[tauri::command]
pub fn delete_account(id: String) -> Result<Vec<AccountEntry>, String> {
    let mut list = load_accounts()?;
    list.retain(|a| a.id != id);
    if list.iter().any(|a| a.selected) == false {
        if let Some(first) = list.first_mut() { first.selected = true; }
    }
    save_accounts(&list)?;
    Ok(list)
}

// ---- Log streaming (live console via Tauri events) ----

#[tauri::command]
pub fn start_log_stream(app: AppHandle, installation_id: String) -> Result<String, String> {
    let list = load_installations()?;
    let inst = list.iter().find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let game_dir = game_dir_of(inst)?;
    let log_path = game_dir.join("logs").join("latest.log");
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut last_size: u64 = 0;
        loop {
            std::thread::sleep(Duration::from_millis(500));
            if !log_path.exists() { continue; }
            if let Ok(meta) = log_path.metadata() {
                let size = meta.len();
                if size > last_size {
                    if let Ok(content) = fs::read_to_string(&log_path) {
                        let lines: Vec<&str> = content.lines().collect();
                        let start = lines.len().saturating_sub(50);
                        let new_lines: Vec<String> = lines[start..].iter().map(|l| l.to_string()).collect();
                        let _ = app_handle.emit("ragsmc-log", serde_json::json!({
                            "lines": new_lines
                        }));
                    }
                    last_size = size;
                }
            }
        }
    });
    Ok("Log streaming iniciado".to_string())
}

// ---- Java Manager: detect all Java installations ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaInfo {
    pub path: String,
    pub major_version: u32,
    pub full_version: String,
    pub vendor: String,
    pub recommended_for: Vec<String>,
}

#[tauri::command]
pub fn detect_java_versions() -> Vec<JavaInfo> {
    let mut results: Vec<JavaInfo> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for bin in candidate_java_bins() {
        if bin.components().count() > 1 && !bin.exists() {
            continue;
        }
        let path_str = bin.to_string_lossy().to_string();
        if seen.contains(&path_str) {
            continue;
        }
        if let Some(major) = java_major_of(&bin) {
            let out = StdCommand::new(&bin)
                .arg("-version")
                .output()
                .ok();
            let full_version = out.as_ref().map(|o| {
                let text = format!(
                    "{}{}",
                    String::from_utf8_lossy(&o.stdout),
                    String::from_utf8_lossy(&o.stderr)
                );
                for line in text.lines().take(1) {
                    if let Some(start) = line.find('"') {
                        let rest = &line[start + 1..];
                        if let Some(end) = rest.find('"') {
                            return rest[..end].to_string();
                        }
                    }
                }
                format!("{}.0.0", major)
            }).unwrap_or_else(|| format!("{}.0.0", major));

            let vendor = if path_str.contains("Eclipse Adoptium") || path_str.contains("temurin") {
                "Eclipse Temurin".to_string()
            } else if path_str.contains("Microsoft") {
                "Microsoft".to_string()
            } else if path_str.contains("Zulu") {
                "Azul Zulu".to_string()
            } else if path_str.contains("BellSoft") {
                "BellSoft Liberica".to_string()
            } else if path_str.contains(".minecraft") {
                "Minecraft Runtime".to_string()
            } else {
                "System".to_string()
            };

            let mc_versions = vec![
                "1.21.1", "1.21", "1.20.6", "1.20.4", "1.20.1", "1.20",
                "1.19.4", "1.19.2", "1.19", "1.18.2", "1.18", "1.17.1",
                "1.17", "1.16.5", "1.12.2", "1.8.9", "1.7.10",
            ];
            let recommended_for: Vec<String> = mc_versions.iter()
                .filter(|&&ver| heuristic_min_java(ver) == major)
                .map(|ver| ver.to_string())
                .collect();

            results.push(JavaInfo {
                path: path_str.clone(),
                major_version: major,
                full_version,
                vendor,
                recommended_for,
            });
            seen.insert(path_str);
        }
    }
    results.sort_by(|a, b| b.major_version.cmp(&a.major_version));
    results
}

#[tauri::command]
pub fn get_recommended_java(version_id: String) -> Option<u32> {
    Some(heuristic_min_java(&version_id))
}

// ---- Resumen de instalacion y log de lanzamiento ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallSummary {
    pub version: String,
    pub loader: String,
    pub loader_version: String,
    pub memory_mb: u32,
    pub mods_count: usize,
    pub mods_enabled: usize,
    pub shaders_count: usize,
    pub resource_packs_count: usize,
    pub java_path: String,
    pub game_dir: String,
    pub resolution: String,
}

#[tauri::command]
pub fn get_installation_summary(installation_id: String) -> Result<InstallSummary, String> {
    let list = load_installations()?;
    let inst = list.iter().find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let gd = game_dir_of(inst)?;
    let mods = list_content_folder("mods", Some(installation_id.clone())).unwrap_or_default();
    let mods_enabled = mods.iter().filter(|m| m.enabled).count();
    let shaders = list_content_folder("shaderpacks", Some(installation_id.clone())).unwrap_or_default();
    let rps = list_content_folder("resourcepacks", Some(installation_id.clone())).unwrap_or_default();
    Ok(InstallSummary {
        version: inst.version_id.clone(),
        loader: inst.loader.clone(),
        loader_version: inst.loader_version.clone().unwrap_or_default(),
        memory_mb: inst.memory,
        mods_count: mods.len(),
        mods_enabled,
        shaders_count: shaders.len(),
        resource_packs_count: rps.len(),
        java_path: inst.java_path.clone(),
        game_dir: gd.to_string_lossy().to_string(),
        resolution: format!("{}x{}", inst.resolution.width, inst.resolution.height),
    })
}

#[tauri::command]
pub fn get_launch_log(installation_id: String) -> Result<String, String> {
    let list = load_installations()?;
    let inst = list.iter().find(|i| i.id == installation_id)
        .ok_or_else(|| "Instalación no encontrada".to_string())?;
    let gd = game_dir_of(inst)?;
    let log_path = gd.join("ragsmc-launch.log");
    fs::read_to_string(&log_path)
        .map_err(|_| format!("No hay log de lanzamiento en {}", log_path.display()))
}

// ---------------------------------------------------------------------------
// Tests (verificación autónoma sin GUI)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
    pub release_date: Option<String>,
}

#[tauri::command]
pub fn check_for_updates() -> Result<UpdateInfo, String> {
    let current = LAUNCHER_VERSION.to_string();

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;

    let resp = client
        .get("https://api.github.com/repos/RagsnorWolf/ragsmc-launcher/releases/latest")
        .header("User-Agent", "RagsMC-Launcher")
        .send()
        .map_err(|e| format!("Error consultando actualizaciones: {}", e))?;

    if !resp.status().is_success() {
        return Ok(UpdateInfo {
            current_version: current.clone(),
            latest_version: current.clone(),
            update_available: false,
            download_url: None,
            release_notes: None,
            release_date: None,
        });
    }

    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Error parseando respuesta: {}", e))?;

    let tag = json["tag_name"].as_str().unwrap_or("0.0.0").trim_start_matches('v').to_string();
    let body = json["body"].as_str().map(|s| s.to_string());
    let date = json["published_at"].as_str().map(|s| s.to_string());

    let mut download_url = None;
    if let Some(assets) = json["assets"].as_array() {
        for asset in assets {
            let name = asset["name"].as_str().unwrap_or("");
            if name.ends_with(".exe") && name.to_lowercase().contains("setup") {
                download_url = asset["browser_download_url"].as_str().map(|s| s.to_string());
                break;
            }
        }
        if download_url.is_none() {
            for asset in assets {
                let name = asset["name"].as_str().unwrap_or("");
                if name.ends_with(".exe") && !name.contains("blockmap") {
                    download_url = asset["browser_download_url"].as_str().map(|s| s.to_string());
                    break;
                }
            }
        }
    }

    let update_available = compare_versions(&tag, &current) > 0;

    Ok(UpdateInfo {
        current_version: current,
        latest_version: tag,
        update_available,
        download_url,
        release_notes: body,
        release_date: date,
    })
}

fn compare_versions(a: &str, b: &str) -> i32 {
    let pa: Vec<u32> = a.split('.').filter_map(|s| s.parse().ok()).collect();
    let pb: Vec<u32> = b.split('.').filter_map(|s| s.parse().ok()).collect();
    let len = pa.len().max(pb.len());
    for i in 0..len {
        let va = pa.get(i).unwrap_or(&0);
        let vb = pb.get(i).unwrap_or(&0);
        if va > vb { return 1; }
        if va < vb { return -1; }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn offline_uuid_is_stable_and_v3() {
        let a = offline_uuid("RagsPlayer");
        let b = offline_uuid("RagsPlayer");
        assert_eq!(a, b);
        assert_eq!(a.len(), 32);
        assert_eq!(&a[12..13], "3", "UUID debe ser versión 3");
        assert!(matches!(&a[16..17], "8" | "9" | "a" | "b"));
    }

    #[test]
    fn rules_allow_by_default_and_disallow_windows() {
        let feats = HashMap::new();
        assert!(allowed_by_rules(&None, &feats));
        assert!(allowed_by_rules(&Some(vec![]), &feats));
        // Par realista de Mojang: [{allow}, {disallow windows}]
        let pair = Some(vec![
            Rule {
                action: "allow".into(),
                os: None,
                features: None,
            },
            Rule {
                action: "disallow".into(),
                os: Some(OsRule {
                    name: Some("windows".into()),
                    arch: None,
                }),
                features: None,
            },
        ]);
        #[cfg(target_os = "windows")]
        assert!(!allowed_by_rules(&pair, &feats));
        #[cfg(not(target_os = "windows"))]
        assert!(allowed_by_rules(&pair, &feats));
        // Flag solo-mac (caso -XstartOnFirstThread): excluido fuera de macOS
        let osx_only = Some(vec![Rule {
            action: "allow".into(),
            os: Some(OsRule {
                name: Some("osx".into()),
                arch: None,
            }),
            features: None,
        }]);
        #[cfg(target_os = "macos")]
        assert!(allowed_by_rules(&osx_only, &feats));
        #[cfg(not(target_os = "macos"))]
        assert!(!allowed_by_rules(&osx_only, &feats));
    }

    #[test]
    fn maven_path_parsing() {
        assert_eq!(
            maven_path_of("com.google.guava:guava:21.0").as_deref(),
            Some("com/google/guava/guava/21.0/guava-21.0.jar")
        );
        assert_eq!(
            maven_path_of("org.lwjgl:lwjgl:3.3.3:natives-windows").as_deref(),
            Some("org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-windows.jar")
        );
    }

    #[test]
    fn parses_java_version_strings() {
        assert_eq!(
            parse_java_major("openjdk version \"21.0.3\" 2024-04-16"),
            Some(21)
        );
        assert_eq!(parse_java_major("java version \"1.8.0_391\""), Some(8));
        assert_eq!(parse_java_major("openjdk version \"17.0.10\""), Some(17));
    }

    #[test]
    fn mojang_manifest_is_reachable() {
        let entries = manifest_entries().expect("Manifiesto Mojang inalcanzable");
        assert!(entries.len() > 500, "Muy pocas versiones");
        assert!(entries.iter().any(|e| e.id == "1.21.1"));
    }

    #[test]
    fn version_json_parses() {
        let entries = manifest_entries().expect("manifiesto");
        let entry = entries.iter().find(|e| e.id == "1.20.4").unwrap();
        let vjson: VersionJson =
            fetch_json(&entry.url).expect("JSON de versión 1.20.4");
        assert!(!vjson.main_class.is_empty());
        assert!(!vjson.libraries.is_empty());
        assert!(vjson.downloads.is_some());
    }

    #[test]
    fn java_detection_runs() {
        // Solo verifica que la detección no entra en pánico; puede no haber Java.
        let _ = find_java(8);
        let _ = candidate_java_bins();
    }

    #[test]
    fn neoforge_prefix_mapping() {
        assert_eq!(neoforge_prefix("1.21.1").as_deref(), Some("21.1."));
        assert_eq!(neoforge_prefix("1.20.4").as_deref(), Some("20.4."));
        assert_eq!(neoforge_prefix("1.20").as_deref(), Some("20.0."));
        assert_eq!(neoforge_prefix("x"), None);
    }

    #[test]
    fn forge_promotions_parse() {
        let json = r#"{"homepage":"x","promos":{"1.20.4-latest":"49.2.0","1.20.4-recommended":"49.0.19"}}"#;
        let p: ForgePromotions = serde_json::from_str(json).unwrap();
        assert_eq!(p.promos.get("1.20.4-recommended").map(|s| s.as_str()), Some("49.0.19"));
    }

    #[test]
    fn merge_inherits_prefers_overlay() {
        let base = VersionJson {
            id: "1.20.4".into(),
            inherits_from: None,
            main_class: "net.minecraft.client.main.Main".into(),
            minecraft_arguments: None,
            arguments: None,
            asset_index: None,
            assets: None,
            downloads: None,
            libraries: vec![],
            logging: None,
            java_version: None,
        };
        let mut over = base.clone();
        over.id = "1.20.4-forge-49.0.19".into();
        over.main_class = "cpw.mods.bootstraplauncher.BootstrapLauncher".into();
        let merged = merge_inherits(base, over);
        assert_eq!(merged.id, "1.20.4-forge-49.0.19");
        assert_eq!(merged.main_class, "cpw.mods.bootstraplauncher.BootstrapLauncher");
        assert!(merged.inherits_from.is_none());
    }

    #[test]
    fn mojang_status_is_reachable() {
        // Red real; si no hay internet el test falla con mensaje claro.
        let st = get_service_status().expect("status.mojang.com inalcanzable");
        assert!(!st.is_empty());
    }
}
