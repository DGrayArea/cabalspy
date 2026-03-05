/**
 * Protocol logos and metadata for Solana DEXs/Launchpads
 * Uses existing platformLogos utility for consistency
 */

import {
  getPlatformLogo,
  getPlatformName,
  getPlatformIcon,
} from "./platformLogos";

export interface ProtocolInfo {
  id: string;
  name: string;
  logo: string;
  color: string;
  description?: string;
  icon?: string;
}

export const PROTOCOL_LOGOS: Record<string, ProtocolInfo> = {
  pumpfun: {
    id: "pumpfun",
    name: getPlatformName("pumpfun"),
    logo:
      getPlatformLogo("pumpfun") ||
      "https://www.google.com/s2/favicons?domain=pump.fun&sz=128",
    color: "#9945FF",
    description: "Meme coin launchpad",
    icon: getPlatformIcon("pumpfun"),
  },
  meteora: {
    id: "meteora",
    name: getPlatformName("meteora"),
    logo:
      getPlatformLogo("meteora") ||
      "https://www.google.com/s2/favicons?domain=meteora.ag&sz=128",
    color: "#14F195",
    description: "Dynamic liquidity protocol",
    icon: getPlatformIcon("meteora"),
  },
  moonshot: {
    id: "moonshot",
    name: getPlatformName("moonshot"),
    logo:
      getPlatformLogo("moonshot") ||
      "https://moonshot.money/images/webclip.png",
    color: "#FFD700",
    description: "DEX Screener launchpad",
    icon: getPlatformIcon("moonshot"),
  },
  jupiter: {
    id: "jupiter",
    name: getPlatformName("jupiter"),
    logo:
      getPlatformLogo("jupiter") ||
      "https://www.google.com/s2/favicons?domain=jup.ag&sz=128",
    color: "#00D4AA",
    description: "Solana DEX aggregator",
    icon: getPlatformIcon("jupiter"),
  },
  raydium: {
    id: "raydium",
    name: getPlatformName("raydium"),
    logo:
      getPlatformLogo("raydium") ||
      "https://dd.dexscreener.com/ds-data/dexes/raydium.png",
    color: "#7B3FE4",
    description: "AMM & liquidity provider",
    icon: getPlatformIcon("raydium"),
  },
  moonit: {
    id: "moonit",
    name: getPlatformName("moonit"),
    logo:
      getPlatformLogo("moonit") ||
      "https://dd.dexscreener.com/ds-data/dexes/moonit.png",
    color: "#FF69B4",
    description: "Meme coin launchpad",
    icon: getPlatformIcon("moonit"),
  },
  letsbonk: {
    id: "letsbonk",
    name: "LetsBonk",
    logo: getPlatformLogo("bonk") || "https://bonk.fun/logos/bonk_fun.png",
    color: "#FF6B35",
    description: "Community-driven launchpad",
    icon: getPlatformIcon("bonk"),
  },
};

export const PROTOCOLS_LIST = Object.values(PROTOCOL_LOGOS);

/**
 * Get protocol info by ID
 */
export function getProtocolInfo(id: string): ProtocolInfo | undefined {
  return PROTOCOL_LOGOS[id];
}

/**
 * Get protocol logo URL by ID
 */
export function getProtocolLogo(id: string): string {
  return PROTOCOL_LOGOS[id]?.logo || "";
}

/**
 * Get protocol name by ID
 */
export function getProtocolName(id: string): string {
  return PROTOCOL_LOGOS[id]?.name || id;
}
