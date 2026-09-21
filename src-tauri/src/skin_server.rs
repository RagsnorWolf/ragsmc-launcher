//! OfflineSkinServer: servidor HTTP local (solo 127.0.0.1) que sirve las
//! skins de `<game_dir>/ragmc_skins/` al cliente de Minecraft.
//!
//! Endpoints:
//! ```text
//! GET  /skins/{uuid}.png        -> PNG de la skin
//! GET  /skins/{uuid}.png.mcmeta -> metadata opcional (404 si no existe)
//! GET  /capes/{uuid}.png        -> capa opcional (404 si no existe)
//! GET  /profile/{username}      -> perfil estilo Yggdrasil con textures en base64
//! POST /upload?uuid=&model=     -> guarda PNG (cuerpo = bytes del PNG)
//! ```
//! Puerto aleatorio entre 40000-50000 elegido al arrancar. Corre en un
//! thread separado; muere con el proceso (sin cleanup manual).

use crate::skin_manager::{self, is_safe_uuid, skin_png_path, skins_root};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tiny_http::{Header, Method, Response, Server, StatusCode};

/// Puerto del servidor, compartido vía `tauri::manage`.
pub struct SkinServerState {
    pub port: u16,
}

const PORT_MIN: u16 = 40000;
const PORT_SPAN: u64 = 10001;

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn pick_start_port() -> u16 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64 ^ (d.as_secs() << 32))
        .unwrap_or(12345);
    PORT_MIN + (nanos % PORT_SPAN) as u16
}

fn content_type_png() -> Header {
    Header::from_bytes(&b"Content-Type"[..], &b"image/png"[..]).unwrap()
}

fn content_type_json() -> Header {
    Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap()
}

fn json_body(body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_data(body.into_bytes()).with_header(content_type_json())
}

fn json_404(message: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    json_body(format!("{{\"error\":\"{}\"}}", message)).with_status_code(StatusCode(404))
}

fn json_400(message: String) -> Response<std::io::Cursor<Vec<u8>>> {
    json_body(format!("{{\"error\":\"{}\"}}", message))
        .with_status_code(StatusCode(400))
        .with_header(content_type_json())
}

fn json_500(message: String) -> Response<std::io::Cursor<Vec<u8>>> {
    json_body(format!("{{\"error\":\"{}\"}}", message))
        .with_status_code(StatusCode(500))
        .with_header(content_type_json())
}

/// Perfil estilo Yggdrasil para `{username}`.
/// Sin firma: las respuestas locales no están firmadas por Mojang
/// (el campo `signature` se omite, como en respuestas sin firma).
pub fn profile_json(game_dir: &std::path::Path, username: &str, port: u16) -> serde_json::Value {
    let uuid = crate::minecraft::offline_uuid(username);
    ygg_profile_json(game_dir, username, &uuid, port)
}

/// Variante con uuid explícito (32 hex sin guiones) para los endpoints
/// de sesión, donde el perfil llega por uuid y no por nombre.
pub fn ygg_profile_json(
    game_dir: &std::path::Path,
    username: &str,
    uuid_nodash: &str,
    port: u16,
) -> serde_json::Value {
    // La URL apunta al PNG de la skin activa (uuid de almacenamiento);
    // el id sigue siendo el del jugador (semántica Yggdrasil).
    let active = skin_manager::get_active_skin(game_dir);
    let model = active
        .as_ref()
        .map(|e| e.model.as_str().to_string())
        .unwrap_or_else(|| "classic".to_string());
    let skin_uuid = active
        .map(|e| e.uuid)
        .unwrap_or_else(|| uuid_nodash.to_string());
    let inner = serde_json::json!({
        "timestamp": now_millis(),
        "profileId": uuid_nodash,
        "profileName": username,
        "textures": {
            "SKIN": {
                "url": format!("http://localhost:{}/skins/{}.png", port, skin_uuid),
                "metadata": { "model": model }
            }
        }
    });
    let value = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        inner.to_string().as_bytes(),
    );
    serde_json::json!({
        "id": uuid_nodash,
        "name": username,
        "properties": [{ "name": "textures", "value": value }]
    })
}

// ---------------------------------------------------------------------------
// API Yggdrasil local (authlib-injector como javaagent)
// ---------------------------------------------------------------------------
// Sesiones en memoria: accessToken -> username, serverId -> (username, id).
// Todo es local y offline; cualquier usuario/contraseña es aceptado porque
// no hay nada que validar contra Mojang (modo no-premium).

pub const INJECTOR_VERSION: &str = "1.2.8";
const INJECTOR_URL: &str = "https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar";
/// authlib-injector es AGPLv3 con excepción: empaquetar el binario SIN
/// modificar (o cargarlo como javaagent) no contamina este código.

#[derive(Default)]
struct YggSession {
    tokens: std::collections::HashMap<String, String>,
    joins: std::collections::HashMap<String, (String, String)>,
}

static SESSIONS: std::sync::OnceLock<std::sync::Mutex<YggSession>> = std::sync::OnceLock::new();

fn sessions() -> &'static std::sync::Mutex<YggSession> {
    SESSIONS.get_or_init(|| std::sync::Mutex::new(YggSession::default()))
}

fn new_token() -> String {
    uuid::Uuid::new_v4().to_string().replace('-', "")
}

fn read_json_body(request: &mut tiny_http::Request) -> serde_json::Value {
    let mut buf = Vec::new();
    if request.as_reader().read_to_end(&mut buf).is_err() {
        return serde_json::Value::Null;
    }
    serde_json::from_slice(&buf).unwrap_or(serde_json::Value::Null)
}

fn ygg_no_content() -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_data(Vec::new()).with_status_code(StatusCode(204))
}

fn ygg_authenticate(request: &mut tiny_http::Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = read_json_body(request);
    let username = body
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if username.is_empty() {
        return json_400("falta username".to_string());
    }
    let client_token = body
        .get("clientToken")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(new_token);
    let access_token = new_token();
    let id = crate::minecraft::offline_uuid(&username);
    if let Ok(mut s) = sessions().lock() {
        s.tokens.insert(access_token.clone(), username.clone());
    }
    json_body(
        serde_json::json!({
            "accessToken": access_token,
            "clientToken": client_token,
            "availableProfiles": [{ "id": id, "name": username }],
            "selectedProfile": { "id": id, "name": username },
        })
        .to_string(),
    )
}

fn ygg_refresh(request: &mut tiny_http::Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = read_json_body(request);
    let access_token = body.get("accessToken").and_then(|v| v.as_str()).unwrap_or("");
    let client_token = body
        .get("clientToken")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(new_token);
    let username = sessions()
        .lock()
        .ok()
        .and_then(|mut s| {
            let user = s.tokens.remove(access_token)?;
            let fresh = new_token();
            s.tokens.insert(fresh.clone(), user.clone());
            Some((user, fresh))
        });
    let Some((username, fresh)) = username else {
        return json_400("token inválido".to_string());
    };
    let id = crate::minecraft::offline_uuid(&username);
    json_body(
        serde_json::json!({
            "accessToken": fresh,
            "clientToken": client_token,
            "selectedProfile": { "id": id, "name": username },
        })
        .to_string(),
    )
}

fn ygg_validate(request: &mut tiny_http::Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = read_json_body(request);
    let access_token = body.get("accessToken").and_then(|v| v.as_str()).unwrap_or("");
    let ok = sessions()
        .lock()
        .map(|s| s.tokens.contains_key(access_token))
        .unwrap_or(false);
    if ok {
        ygg_no_content()
    } else {
        json_400("token inválido".to_string())
    }
}

fn ygg_join(request: &mut tiny_http::Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = read_json_body(request);
    let access_token = body.get("accessToken").and_then(|v| v.as_str()).unwrap_or("");
    let server_id = body.get("serverId").and_then(|v| v.as_str()).unwrap_or("");
    let profile_id = body
        .get("selectedProfile")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if access_token.is_empty() || server_id.is_empty() || profile_id.is_empty() {
        return json_400("join incompleto".to_string());
    }
    let username = sessions()
        .lock()
        .ok()
        .and_then(|mut s| {
            let user = s.tokens.get(access_token)?.clone();
            s.joins.insert(
                server_id.to_string(),
                (user.clone(), profile_id.replace('-', "").to_lowercase()),
            );
            Some(user)
        });
    if username.is_none() {
        return json_400("token inválido".to_string());
    }
    ygg_no_content()
}

fn query_param(url: &str, key: &str) -> String {
    url.split('?')
        .nth(1)
        .unwrap_or("")
        .split('&')
        .filter_map(|kv| {
            let mut it = kv.splitn(2, '=');
            let k = it.next()?;
            let v = it.next().unwrap_or("");
            (k == key).then(|| url_decode(v))
        })
        .next()
        .unwrap_or_default()
}

fn ygg_has_joined(
    full_url: &str,
    game_dir: &std::path::Path,
    port: u16,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let username = query_param(full_url, "username");
    let server_id = query_param(full_url, "serverId");
    if username.is_empty() || server_id.is_empty() {
        return json_404("join incompleto");
    }
    let hit = sessions().lock().ok().and_then(|s| {
        s.joins
            .get(&server_id)
            .filter(|(u, _)| u.eq_ignore_ascii_case(&username))
            .cloned()
    });
    match hit {
        Some((user, id)) => json_body(ygg_profile_json(game_dir, &user, &id, port).to_string()),
        None => Response::from_data(Vec::new()).with_status_code(StatusCode(204)),
    }
}

fn sessions_username_for_profile(uuid_nodash: &str) -> Option<String> {
    sessions().lock().ok().and_then(|s| {
        // accessToken:username no guarda uuid; se resuelve por joins recientes.
        s.joins
            .values()
            .find(|(_, id)| id == uuid_nodash)
            .map(|(u, _)| u.clone())
    })
}

fn ygg_profiles_lookup(request: &mut tiny_http::Request) -> Response<std::io::Cursor<Vec<u8>>> {
    let body = read_json_body(request);
    let names = body.as_array().cloned().unwrap_or_default();
    let out: Vec<_> = names
        .iter()
        .filter_map(|v| v.as_str())
        .take(10)
        .map(|n| {
            serde_json::json!({
                "id": crate::minecraft::offline_uuid(n),
                "name": n,
            })
        })
        .collect();
    json_body(serde_json::json!(out).to_string())
}

/// Descarga authlib-injector (binario oficial sin modificar) a
/// `<game_dir>/ragsmc/injector/` si falta o está incompleto.
pub fn ensure_injector(game_dir: &std::path::Path) -> Result<PathBuf, String> {
    let dir = game_dir.join("ragsmc").join("injector");
    let dest = dir.join(format!("authlib-injector-{}.jar", INJECTOR_VERSION));
    if dest.is_file()
        && std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0) > 100_000
    {
        return Ok(dest);
    }
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("No se pudo crear {}: {}", dir.display(), e))?;
    eprintln!("[RagsMC] Descargando authlib-injector {}...", INJECTOR_VERSION);
    let bytes = reqwest::blocking::get(INJECTOR_URL)
        .map_err(|e| format!("No se pudo descargar authlib-injector: {}", e))?
        .bytes()
        .map_err(|e| format!("Descarga incompleta de authlib-injector: {}", e))?;
    if bytes.len() < 100_000 {
        return Err("Descarga de authlib-injector incompleta.".to_string());
    }
    std::fs::write(&dest, &bytes)
        .map_err(|e| format!("No se pudo guardar authlib-injector: {}", e))?;
    Ok(dest)
}

fn strip_query(url: &str) -> &str {
    url.split('?').next().unwrap_or(url)
}

fn handle_request(
    request: tiny_http::Request,
    game_dir: &std::path::Path,
    port: u16,
) -> Result<(), String> {
    let url = strip_query(request.url()).to_string();
    let method = request.method().clone();
    // Evita que el body quede sin leer en POST (tiny_http lo exige).
    let mut request = request;

    let response: Response<std::io::Cursor<Vec<u8>>> = match (method, url.as_str()) {
        (Method::Get, path) if path.starts_with("/skins/") && path.ends_with(".png.mcmeta") => {
            let uuid = path
                .trim_start_matches("/skins/")
                .trim_end_matches(".png.mcmeta");
            if !is_safe_uuid(uuid) {
                json_404("uuid inválido")
            } else {
                let p = skins_root(game_dir)
                    .join("skins")
                    .join(format!("{}.png.mcmeta", uuid));
                match std::fs::read(&p) {
                    Ok(bytes) => Response::from_data(bytes).with_header(content_type_json()),
                    Err(_) => json_404("sin metadata"),
                }
            }
        }
        (Method::Get, path) if path.starts_with("/skins/") && path.ends_with(".png") => {
            let uuid = path.trim_start_matches("/skins/").trim_end_matches(".png");
            if !is_safe_uuid(uuid) {
                json_404("uuid inválido")
            } else {
                let p = skin_png_path(game_dir, uuid);
                match std::fs::read(&p) {
                    Ok(bytes) => Response::from_data(bytes).with_header(content_type_png()),
                    Err(_) => json_404("skin no encontrada"),
                }
            }
        }
        (Method::Get, path) if path.starts_with("/capes/") && path.ends_with(".png") => {
            let uuid = path.trim_start_matches("/capes/").trim_end_matches(".png");
            if !is_safe_uuid(uuid) {
                json_404("uuid inválido")
            } else {
                let p = skins_root(game_dir)
                    .join("capes")
                    .join(format!("{}.png", uuid));
                match std::fs::read(&p) {
                    Ok(bytes) => Response::from_data(bytes).with_header(content_type_png()),
                    Err(_) => json_404("capa no encontrada"),
                }
            }
        }
        (Method::Get, path) if path.starts_with("/profile/") => {
            let username = path.trim_start_matches("/profile/");
            let username = url_decode(username);
            if username.is_empty() || username.len() > 16 {
                json_404("nombre inválido")
            } else {
                json_body(profile_json(game_dir, &username, port).to_string())
            }
        }
        (Method::Post, path) if path.starts_with("/upload") => {
            let query = request.url().split('?').nth(1).unwrap_or("").to_string();
            let params: std::collections::HashMap<_, _> = query
                .split('&')
                .filter_map(|kv| {
                    let mut it = kv.splitn(2, '=');
                    Some((it.next()?.to_string(), it.next().unwrap_or("").to_string()))
                })
                .collect();
            let uuid = params.get("uuid").cloned().unwrap_or_default();
            let model = params.get("model").cloned().unwrap_or_default();
            let mut body = Vec::new();
            let read = request.as_reader().read_to_end(&mut body);
            let out = if read.is_err() {
                json_404("no se pudo leer el cuerpo")
            } else if !is_safe_uuid(&uuid) {
                json_404("uuid inválido")
            } else {
                match crate::skin_manager::SkinModel::parse(&model) {
                    Err(e) => json_400(e),
                    Ok(_) => {
                        if let Err(e) = crate::skin_manager::validate_skin_png_bytes(&body) {
                            json_400(e)
                        } else {
                            let dest = skin_png_path(game_dir, &uuid);
                            match std::fs::write(&dest, &body) {
                                Ok(_) => {
                                    json_body(format!("{{\"ok\":true,\"uuid\":\"{}\"}}", uuid))
                                }
                                Err(e) => json_500(format!("no se pudo guardar: {}", e)),
                            }
                        }
                    }
                }
            };
            out
        }
        // ---- API Yggdrasil local (para authlib-injector como javaagent) ----
        // Sin firmas Mojang: todo es local y offline. El injector redirige
        // aquí las llamadas de authlib y el juego obtiene textures locales.
        (Method::Post, "/authserver/authenticate") => ygg_authenticate(&mut request),
        (Method::Post, "/authserver/refresh") => ygg_refresh(&mut request),
        (Method::Post, "/authserver/validate") => ygg_validate(&mut request),
        (Method::Post, "/authserver/signout") => ygg_no_content(),
        (Method::Post, "/authserver/invalidate") => ygg_no_content(),
        (Method::Post, "/sessionserver/session/minecraft/join") => {
            ygg_join(&mut request)
        }
        (Method::Get, path)
            if path.starts_with("/sessionserver/session/minecraft/hasJoined") =>
        {
            ygg_has_joined(request.url(), game_dir, port)
        }
        (Method::Get, path)
            if path.starts_with("/sessionserver/session/minecraft/profile/") =>
        {
            let uuid = path
                .trim_start_matches("/sessionserver/session/minecraft/profile/")
                .split('?')
                .next()
                .unwrap_or("");
            let uuid = uuid.replace('-', "").to_lowercase();
            if uuid.len() != 32 || !uuid.chars().all(|c| c.is_ascii_hexdigit()) {
                json_404("uuid inválido")
            } else {
                // Perfil por uuid: se resuelve contra la skin activa local.
                // (Offline de un jugador: el uuid del perfil y el de la skin
                // activa pertenecen a la misma cuenta local.)
                let username = sessions_username_for_profile(&uuid)
                    .unwrap_or_else(|| "RagsPlayer".to_string());
                json_body(ygg_profile_json(game_dir, &username, &uuid, port).to_string())
            }
        }
        (Method::Post, "/api/profiles/minecraft") => ygg_profiles_lookup(&mut request),
        _ => json_404("ruta desconocida"),
    };

    request
        .respond(response)
        .map_err(|e| format!("No se pudo responder: {}", e))
}

fn url_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex(bytes[i + 1]), hex(bytes[i + 2])) {
                out.push((h * 16 + l) as char);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

fn hex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

fn bind_server(addr: &str) -> Result<Server, String> {
    Server::http(addr).map_err(|e| format!("No se pudo bindear {}: {}", addr, e))
}

fn serve_forever(server: Server, game_dir: PathBuf, port: u16) {
    for request in server.incoming_requests() {
        if let Err(e) = handle_request(request, &game_dir, port) {
            eprintln!("[RagsMC] SkinServer: {}", e);
        }
    }
}

/// Bindea en 127.0.0.1:{port} y atiende en un thread separado.
/// Devuelve el puerto elegido (el bind exitoso garantiza que es nuestro).
fn spawn_on_port(game_dir: PathBuf, port: u16) -> Result<u16, String> {
    let server = bind_server(&format!("127.0.0.1:{}", port))?;
    std::thread::spawn(move || serve_forever(server, game_dir, port));
    Ok(port)
}

/// Arranca el servidor en un puerto aleatorio 40000-50000 (reintenta).
pub fn start_offline_skin_server(game_dir: PathBuf) -> Result<u16, String> {
    let _ = skin_manager::ensure_skins_dirs(&game_dir);
    let mut port = pick_start_port();
    let mut last_err = String::new();
    for _ in 0..64 {
        match spawn_on_port(game_dir.clone(), port) {
            Ok(actual) => {
                eprintln!("[RagsMC] OfflineSkinServer en http://localhost:{}", actual);
                return Ok(actual);
            }
            Err(e) => {
                last_err = e;
                port = if port >= 50000 { PORT_MIN } else { port + 1 };
            }
        }
    }
    Err(format!(
        "No se pudo iniciar el OfflineSkinServer: {}",
        last_err
    ))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::skin_manager::{upload_skin_bytes, SkinModel};

    fn png_bytes(w: u32, h: u32) -> Vec<u8> {
        crate::skin_manager::tests::test_png_bytes(w, h)
    }

    fn start_test_server(game_dir: PathBuf) -> u16 {
        // Puerto efímero vía probe estándar (se libera antes de bindear tiny_http).
        let probe = std::net::TcpListener::bind("127.0.0.1:0").expect("probe de test");
        let port = probe.local_addr().expect("addr de test").port();
        drop(probe);
        let got = spawn_on_port(game_dir, port).expect("spawn de test");
        assert_eq!(got, port);
        // Pequeña espera para que el listener acepte conexiones.
        std::thread::sleep(std::time::Duration::from_millis(150));
        port
    }

    fn http_get(port: u16, path: &str) -> (u16, Vec<u8>, String) {
        let url = format!("http://localhost:{}{}", port, path);
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap();
        let resp = client.get(&url).send().expect("GET al servidor local");
        let status = resp.status().as_u16();
        let ctype = resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        let bytes = resp.bytes().expect("cuerpo").to_vec();
        (status, bytes, ctype)
    }

    #[test]
    fn test_skin_server_starts() {
        let dir = tempfile::tempdir().unwrap();
        let port = start_test_server(dir.path().to_path_buf());
        assert!(port != 0);
        // Puerto efímero del SO (fuera del rango de producción, válido en test).
        let (status, _, _) = http_get(port, "/profile/Alguien");
        assert_eq!(status, 200);
    }

    #[test]
    fn test_skin_server_serves_png() {
        let dir = tempfile::tempdir().unwrap();
        let entry =
            upload_skin_bytes(dir.path(), "Steve", "classic", &png_bytes(64, 64)).unwrap();
        let port = start_test_server(dir.path().to_path_buf());
        let (status, body, ctype) = http_get(port, &format!("/skins/{}.png", entry.uuid));
        assert_eq!(status, 200);
        assert!(ctype.contains("image/png"), "ctype: {}", ctype);
        assert_eq!(body, png_bytes(64, 64));
        // uuid inexistente -> 404
        let (status, _, _) = http_get(port, "/skins/00000000.png");
        assert_eq!(status, 404);
    }

    #[test]
    fn test_skin_server_serves_profile() {
        let dir = tempfile::tempdir().unwrap();
        let port = start_test_server(dir.path().to_path_buf());
        let (status, body, ctype) = http_get(port, "/profile/RagsnorWolf");
        assert_eq!(status, 200);
        assert!(ctype.contains("application/json"), "ctype: {}", ctype);
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["name"], "RagsnorWolf");
        let props = json["properties"].as_array().unwrap();
        assert_eq!(props.len(), 1);
        assert_eq!(props[0]["name"], "textures");
        assert!(props[0].get("signature").is_none(), "sin firma local");
        // El value es base64 del JSON interno con la URL de la skin
        let raw = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            props[0]["value"].as_str().unwrap(),
        )
        .unwrap();
        let inner: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(inner["profileName"], "RagsnorWolf");
        let url = inner["textures"]["SKIN"]["url"].as_str().unwrap();
        assert!(
            url.contains(&format!("localhost:{}", port)) && url.ends_with(".png"),
            "url: {}",
            url
        );
        assert_eq!(inner["textures"]["SKIN"]["metadata"]["model"], "classic");
        // id == offline uuid v3 del nombre
        assert_eq!(json["id"], crate::minecraft::offline_uuid("RagsnorWolf"));
    }

    fn http_post(port: u16, path: &str, body: serde_json::Value) -> (u16, Vec<u8>) {
        let url = format!("http://localhost:{}{}", port, path);
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap();
        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .expect("POST al servidor local");
        let status = resp.status().as_u16();
        let bytes = resp.bytes().expect("cuerpo").to_vec();
        (status, bytes)
    }

    #[test]
    fn test_yggdrasil_roundtrip_offline() {
        let dir = tempfile::tempdir().unwrap();
        let entry =
            upload_skin_bytes(dir.path(), "Hero", "classic", &png_bytes(64, 64)).unwrap();
        crate::skin_manager::set_active_skin(dir.path(), &entry.uuid).unwrap();
        let port = start_test_server(dir.path().to_path_buf());

        // 1. authenticate con cualquier usuario/contraseña (offline)
        let (status, body) = http_post(
            port,
            "/authserver/authenticate",
            serde_json::json!({"username": "Hero", "password": "x", "clientToken": "ct-1"}),
        );
        assert_eq!(status, 200);
        let auth: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let token = auth["accessToken"].as_str().unwrap().to_string();
        assert!(!token.is_empty());
        assert_eq!(auth["clientToken"], "ct-1");
        assert_eq!(auth["selectedProfile"]["name"], "Hero");

        // 2. validate con el token
        let (status, _) = http_post(
            port,
            "/authserver/validate",
            serde_json::json!({"accessToken": token, "clientToken": "ct-1"}),
        );
        assert_eq!(status, 204);

        // 3. join + hasJoined (flujo de entrada a servidor)
        let (status, _) = http_post(
            port,
            "/sessionserver/session/minecraft/join",
            serde_json::json!({
                "accessToken": token,
                "selectedProfile": auth["selectedProfile"]["id"],
                "serverId": "srv-123",
            }),
        );
        assert_eq!(status, 204);
        let (status, body, _) = http_get(port, "/sessionserver/session/minecraft/hasJoined?username=Hero&serverId=srv-123");
        assert_eq!(status, 200);
        let profile: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(profile["name"], "Hero");
        assert_eq!(profile["properties"][0]["name"], "textures");

        // 4. hasJoined con serverId desconocido -> 204
        let (status, _, _) = http_get(
            port,
            "/sessionserver/session/minecraft/hasJoined?username=Hero&serverId=otro",
        );
        assert_eq!(status, 204);

        // 5. session profile por uuid con textures de la skin activa
        let id = auth["selectedProfile"]["id"].as_str().unwrap();
        let (status, body, _) = http_get(
            port,
            &format!("/sessionserver/session/minecraft/profile/{}", id),
        );
        assert_eq!(status, 200);
        let p: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(p["id"], id);

        // 6. lookup de perfiles por nombre
        let (status, body) = http_post(
            port,
            "/api/profiles/minecraft",
            serde_json::json!(["Hero", "Otro"]),
        );
        assert_eq!(status, 200);
        let list: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(list.as_array().unwrap().len(), 2);

        // 7. refresh rota el token; el viejo deja de validar
        let (status, body) = http_post(
            port,
            "/authserver/refresh",
            serde_json::json!({"accessToken": token, "clientToken": "ct-1"}),
        );
        assert_eq!(status, 200);
        let refreshed: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_ne!(refreshed["accessToken"].as_str().unwrap(), token);
        let (status, _) = http_post(
            port,
            "/authserver/validate",
            serde_json::json!({"accessToken": token, "clientToken": "ct-1"}),
        );
        assert_eq!(status, 400);
    }

    #[test]
    fn test_profile_usa_modelo_de_skin_activa() {
        let dir = tempfile::tempdir().unwrap();
        let entry = upload_skin_bytes(dir.path(), "Alex", "slim", &png_bytes(64, 64)).unwrap();
        crate::skin_manager::set_active_skin(dir.path(), &entry.uuid).unwrap();
        let port = start_test_server(dir.path().to_path_buf());
        let (_, body, _) = http_get(port, "/profile/Alex");
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let raw = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            json["properties"][0]["value"].as_str().unwrap(),
        )
        .unwrap();
        let inner: serde_json::Value = serde_json::from_slice(&raw).unwrap();
        assert_eq!(inner["textures"]["SKIN"]["metadata"]["model"], "slim");
        assert!(SkinModel::Classic != SkinModel::Slim);
    }
}
