import { openUrl } from "@tauri-apps/plugin-opener";

export const SOCIAL_LINKS = {
  twitch: "https://www.twitch.tv/ragsnorwolf",
  tiktok: "https://www.tiktok.com/@ragsnorwolf",
  youtube: "https://youtube.com/@ragsnorwolf_games?si=I35YLvdu7ush",
  whatsapp: "https://whatsapp.com/channel/0029VbBOkGf9WtC0e7cYaK0B",
} as const;

export const SOCIAL_COLORS = {
  twitch: "#9146FF",
  tiktok: "#FFFFFF",
  youtube: "#FF0000",
  whatsapp: "#25D366",
} as const;

export type SocialNetwork = keyof typeof SOCIAL_LINKS;

export const openSocial = async (network: SocialNetwork) => {
  await openUrl(SOCIAL_LINKS[network]);
};

export const getSocialColor = (network: SocialNetwork): string => {
  return SOCIAL_COLORS[network];
};