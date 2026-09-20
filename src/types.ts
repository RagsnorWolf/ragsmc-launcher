export type LoaderType = "vanilla" | "fabric" | "forge" | "neoforge" | "quilt" | "paper" | "purpur" | "spigot" | "bukkit";

export interface MemoryInfo {
  totalGB: number;
}

export interface ServiceStatusItem {
  service: string;
  status: string;
}

export type EditionType = "java" | "bedrock";

export type ViewType = "play" | "installations" | "settings" | "account" | "mods" | "console" | "resources" | "shaders";

export interface MinecraftVersion {
  id: string;
  name: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha";
  releaseDate: string;
  icon: string;
  description: string;
  changelog: string;
  size: number;
  supportedLoaders: LoaderType[];
  edition: EditionType;
  minJavaVersion: number;
  maxJavaVersion?: number;
  libraries?: Library[];
  mainClass?: string;
}

export interface Library {
  name: string;
  url?: string;
  downloads?: {
    artifact?: { url: string; sha1: string; size: number };
    classifiers?: Record<string, { url: string; sha1: string; size: number }>;
  };
  natives?: Record<string, string>;
  rules?: Array<{ action: "allow" | "disallow"; os?: { name: string } }>;
}

export interface VersionWithLoader {
  versionId: string;
  versionName: string;
  loader: LoaderType;
  loaderVersion?: string;
  icon: string;
  description: string;
  fullId: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha";
  edition: EditionType;
  minJavaVersion: number;
}

export interface LaunchConfig {
  version: string;
  loader: LoaderType;
  loaderVersion?: string;
  javaPath: string;
  javaVersion?: number;
  memory: number;
  width: number;
  height: number;
  fullscreen: boolean;
  server?: string;
  username?: string;
  accessToken?: string;
  uuid?: string;
  userType?: "mojang" | "legacy" | "offline";
  jvmArgs?: string;
  gameArgs?: string;
  gameDir?: string;
  resolution?: { width: number; height: number };
}

export interface Installation {
  id: string;
  name: string;
  icon: string;
  versionId: string;
  loader: LoaderType;
  loaderVersion?: string;
  javaPath: string;
  javaVersion?: number;
  memory: number;
  jvmArgs: string;
  gameArgs: string;
  gameDir: string;
  resolution: { width: number; height: number };
  fullscreen: boolean;
  mods: string[];
  resourcePacks: string[];
  shaders: string[];
  lastPlayed: string;
  playTime: number;
  createdAt: string;
  tags: string[];
  edition: EditionType;
  server?: string;
}

export interface Mod {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  author: string;
  downloads: number;
  category: string;
  minecraftVersions: string[];
  loaders: LoaderType[];
  dependencies: ModDependency[];
  side: "client" | "server" | "both";
  enabled: boolean;
  filePath?: string;
  source: "modrinth" | "curseforge" | "local" | "github";
}

export interface ModDependency {
  modId: string;
  version: string;
  required: boolean;
}

export interface Modpack {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  author: string;
  minecraftVersion: string;
  loader: LoaderType;
  loaderVersion: string;
  mods: ModpackMod[];
  source: "modrinth" | "curseforge" | "local" | "technic" | "ftb" | "atlauncher";
  downloads: number;
}

export interface ModpackMod {
  modId: string;
  version: string;
  required: boolean;
}

export interface ResourcePack {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  author: string;
  minecraftVersions: string[];
  format: number;
  enabled: boolean;
  filePath?: string;
  source: "modrinth" | "curseforge" | "local" | "planetminecraft";
}

export interface Shader {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  author: string;
  minecraftVersions: string[];
  compatibleLoaders: LoaderType[];
  enabled: boolean;
  filePath?: string;
  source: "modrinth" | "curseforge" | "local" | "shaderlaabs";
}

export interface World {
  id: string;
  name: string;
  icon?: string;
  gameMode: "survival" | "creative" | "adventure" | "spectator" | "hardcore";
  difficulty: "peaceful" | "easy" | "normal" | "hard";
  version: string;
  lastPlayed: string;
  playTime: number;
  size: number;
  path: string;
  seed?: string;
  gameType?: string;
  hardcore?: boolean;
  commandsEnabled?: boolean;
}

export interface Server {
  id: string;
  name: string;
  address: string;
  port: number;
  version: string;
  players: { online: number; max: number };
  motd: string;
  icon?: string;
  favorite: boolean;
  category: "survival" | "creative" | "minigames" | "pvp" | "rpg" | "modded" | "vanilla" | "other";
  tags: string[];
  addedAt: string;
  lastPinged?: string;
  latency?: number;
  online?: boolean;
  motdClean?: string;
}

export interface Profile {
  id: string;
  name: string;
  icon: string;
  installations: string[];
  javaPath: string;
  javaVersion?: number;
  memory: number;
  jvmArgs: string;
  gameArgs: string;
  resolution: { width: number; height: number };
  fullscreen: boolean;
  server?: string;
  environment: "production" | "development" | "testing";
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Account {
  id: string;
  username: string;
  uuid: string;
  type: "msa" | "mojang" | "offline" | "yggdrasil";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  skinUrl?: string;
  capeUrl?: string;
  selected: boolean;
}

export interface JavaInstallation {
  path: string;
  version: string;
  majorVersion: number;
  vendor: string;
  architecture: "x64" | "x86" | "arm64";
  javafx: boolean;
  valid: boolean;
  detectedAt: string;
}

export interface SystemInfo {
  os: {
    platform: string;
    release: string;
    arch: string;
    totalMemory: number;
    freeMemory: number;
    cpus: Array<{ model: string; speed: number }>;
  };
  java: JavaInstallation[];
  disk: {
    free: number;
    total: number;
  };
  gpu?: {
    vendor: string;
    renderer: string;
    version: string;
  };
}

export interface DownloadItem {
  id: string;
  name: string;
  url: string;
  destination: string;
  totalSize: number;
  downloadedSize: number;
  speed: number;
  progress: number;
  status: "pending" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
  error?: string;
  startTime: number;
  endTime?: number;
  resumable: boolean;
  fileType: "version" | "loader" | "library" | "asset" | "mod" | "modpack" | "resourcepack" | "shader" | "java";
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image?: string;
  url: string;
  date: string;
  type: "update" | "event" | "community" | "snapshot" | "security" | "announcement";
  author: string;
  tags: string[];
  read: boolean;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  changelog: string[];
  downloadUrl: string;
  size: number;
  signature: string;
  critical: boolean;
}

export interface ModResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
}

export interface BackupInfo {
  name: string;
  size: number;
  modified: number;
}

export interface DiagnosticReport {
  timestamp: string;
  system: SystemInfo;
  launcher: {
    version: string;
    uptime: number;
    memoryUsage: number;
  };
  installations: Array<{
    id: string;
    name: string;
    status: "healthy" | "warning" | "error";
    issues: string[];
  }>;
  downloads: Array<{
    id: string;
    name: string;
    status: string;
    error?: string;
  }>;
  logs: string[];
}

export interface SearchResult {
  type: "installation" | "version" | "mod" | "modpack" | "resourcepack" | "shader" | "world" | "server" | "profile" | "setting";
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  action: () => void;
}

export interface Notification {
  id: string;
  type: "success" | "warning" | "error" | "info" | "update";
  title: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  persistent?: boolean;
}

export const LOADER_INFO: Record<LoaderType, { name: string; color: string; bgColor: string; borderColor: string; icon: string; description: string }> = {
  vanilla: { name: "Vanilla", color: "text-emerald-400", bgColor: "bg-emerald-500/20", borderColor: "border-emerald-500/30", icon: "⬛", description: "Minecraft sin modificaciones" },
  fabric: { name: "Fabric", color: "text-purple-400", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30", icon: "🎭", description: "Modloader ligero y moderno" },
  forge: { name: "Forge", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500/30", icon: "⚙️", description: "Modloader clásico y completo" },
  neoforge: { name: "NeoForge", color: "text-cyan-400", bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/30", icon: "🔮", description: "Fork moderno de Forge" },
  quilt: { name: "Quilt", color: "text-pink-400", bgColor: "bg-pink-500/20", borderColor: "border-pink-500/30", icon: "🧵", description: "Fork de Fabric enfocado en comunidad" },
  paper: { name: "Paper", color: "text-blue-400", bgColor: "bg-blue-500/20", borderColor: "border-blue-500/30", icon: "📄", description: "Servidor optimizado de alto rendimiento" },
  purpur: { name: "Purpur", color: "text-rose-400", bgColor: "bg-rose-500/20", borderColor: "border-rose-500/30", icon: "💜", description: "Fork optimizado de Paper" },
  spigot: { name: "Spigot", color: "text-amber-400", bgColor: "bg-amber-500/20", borderColor: "border-amber-500/30", icon: "🟤", description: "Servidor clásico optimizado" },
  bukkit: { name: "Bukkit", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/30", icon: "📦", description: "API de servidor clásica" },
};

export const EDITION_INFO: Record<EditionType, { name: string; icon: string; color: string }> = {
  java: { name: "Java Edition", icon: "☕", color: "text-orange-400" },
  bedrock: { name: "Bedrock Edition", icon: "📱", color: "text-cyan-400" },
};

export const JAVA_VERSION_MAP: Record<string, number[]> = {
  "1.21.1": [21],
  "1.21": [21],
  "1.20.6": [21],
  "1.20.4": [21],
  "1.20.1": [17, 21],
  "1.20": [17, 21],
  "1.19.4": [17, 21],
  "1.19.2": [17],
  "1.19": [17],
  "1.18.2": [17],
  "1.18": [17],
  "1.17.1": [16, 17],
  "1.17": [16],
  "1.16.5": [8, 11, 16],
  "1.16.4": [8, 11],
  "1.16.3": [8, 11],
  "1.16.2": [8, 11],
  "1.16.1": [8, 11],
  "1.15.2": [8, 11],
  "1.14.4": [8, 11],
  "1.13.2": [8, 11],
  "1.12.2": [8],
  "1.11.2": [8],
  "1.10.2": [8],
  "1.9.4": [8],
  "1.8.9": [8],
  "1.7.10": [8],
};

export const LOADER_VERSIONS: Record<string, Record<LoaderType, string[]>> = {
  "1.21.1": { vanilla: ["1.21.1"], fabric: ["0.16.9"], forge: ["51.0.0"], paper: ["1.21.1"], quilt: ["0.20.0"], neoforge: ["21.1.0"], purpur: ["1.21.1"], spigot: ["1.21.1"], bukkit: [] },
  "1.21": { vanilla: ["1.21"], fabric: ["0.16.5"], forge: ["50.0.0"], paper: ["1.21"], quilt: ["0.19.0"], neoforge: ["21.0.0"], purpur: ["1.21"], spigot: ["1.21"], bukkit: [] },
  "1.20.6": { vanilla: ["1.20.6"], fabric: ["0.15.11"], forge: ["49.0.0"], paper: ["1.20.6"], quilt: ["0.18.0"], neoforge: ["20.4.0"], purpur: ["1.20.6"], spigot: ["1.20.6"], bukkit: [] },
  "1.20.4": { vanilla: ["1.20.4"], fabric: ["0.15.7"], forge: ["48.0.0"], paper: ["1.20.4"], quilt: ["0.17.0"], neoforge: ["20.2.0"], purpur: ["1.20.4"], spigot: ["1.20.4"], bukkit: [] },
  "1.20.1": { vanilla: ["1.20.1"], fabric: ["0.14.21"], forge: ["47.2.0"], paper: ["1.20.1"], quilt: ["0.16.0"], neoforge: ["20.1.0"], purpur: ["1.20.1"], spigot: ["1.20.1"], bukkit: [] },
  "1.20": { vanilla: ["1.20"], fabric: ["0.14.18"], forge: ["47.0.0"], paper: ["1.20"], quilt: ["0.15.0"], neoforge: ["20.0.0"], purpur: ["1.20"], spigot: ["1.20"], bukkit: [] },
  "1.19.4": { vanilla: ["1.19.4"], fabric: ["0.14.10"], forge: ["45.0.0"], paper: ["1.19.4"], quilt: ["0.14.0"], neoforge: ["20.0.0"], purpur: ["1.19.4"], spigot: ["1.19.4"], bukkit: [] },
  "1.19.2": { vanilla: ["1.19.2"], fabric: ["0.14.6"], forge: ["43.2.0"], paper: ["1.19.2"], quilt: ["0.13.0"], neoforge: [], purpur: ["1.19.2"], spigot: ["1.19.2"], bukkit: [] },
  "1.19": { vanilla: ["1.19"], fabric: ["0.14.0"], forge: ["41.1.0"], paper: ["1.19"], quilt: ["0.12.0"], neoforge: [], purpur: ["1.19"], spigot: ["1.19"], bukkit: [] },
  "1.18.2": { vanilla: ["1.18.2"], fabric: ["0.11.2"], forge: ["40.2.0"], paper: ["1.18.2"], quilt: ["0.10.0"], neoforge: [], purpur: ["1.18.2"], spigot: ["1.18.2"], bukkit: [] },
  "1.18.1": { vanilla: ["1.18.1"], fabric: ["0.11.1"], forge: ["39.1.0"], paper: ["1.18.1"], quilt: ["0.9.0"], neoforge: [], purpur: ["1.18.1"], spigot: ["1.18.1"], bukkit: [] },
  "1.18": { vanilla: ["1.18"], fabric: ["0.11.0"], forge: ["38.0.0"], paper: ["1.18"], quilt: ["0.8.0"], neoforge: [], purpur: ["1.18"], spigot: ["1.18"], bukkit: [] },
  "1.17.1": { vanilla: ["1.17.1"], fabric: ["0.9.1"], forge: ["37.1.0"], paper: ["1.17.1"], quilt: ["0.7.0"], neoforge: [], purpur: ["1.17.1"], spigot: ["1.17.1"], bukkit: [] },
  "1.17": { vanilla: ["1.17"], fabric: ["0.9.0"], forge: ["37.0.0"], paper: ["1.17"], quilt: [], neoforge: [], purpur: ["1.17"], spigot: ["1.17"], bukkit: [] },
  "1.16.5": { vanilla: ["1.16.5"], fabric: ["0.7.2"], forge: ["36.2.0"], paper: ["1.16.5"], quilt: [], neoforge: [], purpur: ["1.16.5"], spigot: ["1.16.5"], bukkit: ["1.16.5"] },
  "1.16.4": { vanilla: ["1.16.4"], fabric: ["0.7.1"], forge: ["35.1.0"], paper: ["1.16.4"], quilt: [], neoforge: [], purpur: [], spigot: ["1.16.4"], bukkit: ["1.16.4"] },
  "1.16.3": { vanilla: ["1.16.3"], fabric: ["0.6.2"], forge: ["34.1.0"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: ["1.16.3"], bukkit: ["1.16.3"] },
  "1.16.2": { vanilla: ["1.16.2"], fabric: ["0.6.1"], forge: ["33.1.0"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: ["1.16.2"], bukkit: ["1.16.2"] },
  "1.16.1": { vanilla: ["1.16.1"], fabric: ["0.6.0"], forge: ["32.1.0"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: ["1.16.1"], bukkit: ["1.16.1"] },
  "1.15.2": { vanilla: ["1.15.2"], fabric: ["0.4.8"], forge: ["31.2.0"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: ["1.15.2"], bukkit: ["1.15.2"] },
  "1.14.4": { vanilla: ["1.14.4"], fabric: ["0.4.5"], forge: ["28.2.0"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: ["1.14.4"], bukkit: ["1.14.4"] },
  "1.13.2": { vanilla: ["1.13.2"], fabric: [], forge: ["25.0.0"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: ["1.13.2"], bukkit: ["1.13.2"] },
  "1.12.2": { vanilla: ["1.12.2"], fabric: [], forge: ["14.23.5.2855"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: [], bukkit: ["1.12.2"] },
  "1.11.2": { vanilla: ["1.11.2"], fabric: [], forge: ["13.20.1.2555"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: [], bukkit: ["1.11.2"] },
  "1.10.2": { vanilla: ["1.10.2"], fabric: [], forge: ["12.18.3.2511"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: [], bukkit: ["1.10.2"] },
  "1.9.4": { vanilla: ["1.9.4"], fabric: [], forge: ["12.17.0.2051"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: [], bukkit: ["1.9.4"] },
  "1.8.9": { vanilla: ["1.8.9"], fabric: [], forge: ["11.15.1.2318"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: [], bukkit: ["1.8.9"] },
  "1.7.10": { vanilla: ["1.7.10"], fabric: [], forge: ["10.13.4.1614"], paper: [], quilt: [], neoforge: [], purpur: [], spigot: [], bukkit: ["1.7.10"] },
};

export const DEFAULT_JVM_ARGS = "-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M";

export interface ContentItem {
  filename: string;
  name: string;
  version: string;
  description: string;
  mcVersions: string[];
  size: number;
  enabled: boolean;
  path: string;
}

export interface InstallSummary {
  version: string;
  loader: string;
  loaderVersion: string;
  memoryMb: number;
  modsCount: number;
  modsEnabled: number;
  shadersCount: number;
  resourcePacksCount: number;
  javaPath: string;
  gameDir: string;
  resolution: string;
}

export interface AccountEntry {
  id: string;
  username: string;
  uuid: string;
  type: "offline";
  skinUrl?: string;
  selected: boolean;
}

export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  download_url: string | null;
  release_notes: string | null;
  release_date: string | null;
}

export type Edition = "java" | "bedrock";

export interface NewsEntry {
  id: string;
  title: string;
  description: string;
  date: string;
  image?: string;
  badge?: string;
  badgeColor?: "green" | "blue" | "purple" | "amber";
}

export interface ModEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  installed: boolean;
  slug: string;
  category: "utility" | "content" | "performance" | "visual" | "api";
}

export interface ActivityEntry {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  icon?: string;
  type: "welcome" | "install" | "mod" | "shader" | "update";
}

export interface DownloadProgress {
  task: string;
  current: string;
  total: string;
  percentage: number;
  paused: boolean;
}

export interface SocialLinkConfig {
  twitch: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
}

export const SOCIAL_LINKS: SocialLinkConfig = {
  twitch: "https://www.twitch.tv/ragsnorwolf",
  tiktok: "https://www.tiktok.com/@ragsnorwolf",
  youtube: "https://youtube.com/@ragsnorwolf_games?si=I35YLvdu7ush",
  whatsapp: "https://whatsapp.com/channel/0029VbBOkGf9WtC0e7cYaK0B",
};

export const SOCIAL_COLORS = {
  twitch: "#9146FF",
  tiktok: "#FFFFFF",
  youtube: "#FF0000",
  whatsapp: "#25D366",
} as const;