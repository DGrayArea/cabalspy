/**
 * Platform logos and chain logos utility
 * Provides URLs and components for displaying platform and chain logos
 */

export type PlatformType =
  | 'pump'
  | 'pumpfun'
  | 'raydium'
  | 'meteora'
  | 'orca'
  | 'moonshot'
  | 'jupiter-studio'
  | 'jupiter'
  | 'bonk'
  | 'bags'
  | 'heaven'
  | 'daos-fun'
  | 'candle'
  | 'sugar'
  | 'believe'
  | 'moonit'
  | 'boop'
  | 'launchlab'
  | 'dynamic-bc'
  | 'mayhem'
  | 'pump-amm'
  | 'wavebreak';

export type ChainType = 'solana' | 'bsc' | 'ethereum' | 'base';

/**
 * Get platform logo URL
 */
export function getPlatformLogo(platform: string | undefined): string | null {
  if (!platform) return null;

  // Normalize: lowercase and create variations
  const lower = platform.toLowerCase();
  const normalized = lower.replace(/[_-]/g, '');
  const normalizedDots = lower.replace(/\./g, '');

  const logoMap: Record<string, string> = {
    // Pump.fun - using Google favicon proxy (more reliable)
    pump: 'https://www.google.com/s2/favicons?domain=pump.fun&sz=128',
    pumpfun: 'https://www.google.com/s2/favicons?domain=pump.fun&sz=128',
    'pump.fun': 'https://www.google.com/s2/favicons?domain=pump.fun&sz=128', // Jupiter API format
    pumpportal: 'https://www.google.com/s2/favicons?domain=pump.fun&sz=128', // PumpPortal is pump.fun data source
    
    // Raydium - using DexScreener logo (reliable source)
    raydium: 'https://dd.dexscreener.com/ds-data/dexes/raydium.png',
    'raydium-launchlab': 'https://dd.dexscreener.com/ds-data/dexes/raydium.png', // Jupiter API format
    raydiumlaunchlab: 'https://dd.dexscreener.com/ds-data/dexes/raydium.png',
    
    // Meteora - using Google favicon proxy (more reliable)
    meteora: 'https://www.google.com/s2/favicons?domain=meteora.ag&sz=128',
    'met-dbc': 'https://www.google.com/s2/favicons?domain=meteora.ag&sz=128', // Meteora DBC format
    metdbc: 'https://www.google.com/s2/favicons?domain=meteora.ag&sz=128',
    'dynamic-bc': 'https://www.google.com/s2/favicons?domain=meteora.ag&sz=128', // Uses Meteora DBC
    dynamicbc: 'https://www.google.com/s2/favicons?domain=meteora.ag&sz=128',
    
    // Orca - using CoinGecko logo (reliable source)
    orca: 'https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png',
    
    // Moonshot - using direct logo URL (reliable source)
    moonshot: 'https://moonshot.money/images/webclip.png',
    
    // Jupiter - using Google favicon proxy (more reliable)
    jupiter: 'https://www.google.com/s2/favicons?domain=jup.ag&sz=128',
    jupiterstudio: 'https://www.google.com/s2/favicons?domain=jup.ag&sz=128',
    'jupiter-studio': 'https://www.google.com/s2/favicons?domain=jup.ag&sz=128',
    'jup-studio': 'https://www.google.com/s2/favicons?domain=jup.ag&sz=128', // Jupiter API format
    jupstudio: 'https://www.google.com/s2/favicons?domain=jup.ag&sz=128',
    
    // Bonk - using direct logo URL (reliable source)
    bonk: 'https://bonk.fun/logos/bonk_fun.png',
    'letsbonk.fun': 'https://bonk.fun/logos/bonk_fun.png', // Jupiter API format
    letsbonkfun: 'https://bonk.fun/logos/bonk_fun.png',
    
    // Moonit - using DexScreener logo (reliable source)
    moonit: 'https://dd.dexscreener.com/ds-data/dexes/moonit.png',
    
    // Other platforms - using Google favicon proxy (more reliable than direct favicons)
    bags: 'https://www.google.com/s2/favicons?domain=bags.fun&sz=128',
    'bags.fun': 'https://www.google.com/s2/favicons?domain=bags.fun&sz=128',
    bagsfun: 'https://www.google.com/s2/favicons?domain=bags.fun&sz=128',
    heaven: 'https://www.google.com/s2/favicons?domain=heaven.fun&sz=128',
    'daos-fun': 'https://www.google.com/s2/favicons?domain=daos.fun&sz=128',
    'daos.fun': 'https://www.google.com/s2/favicons?domain=daos.fun&sz=128',
    daosfun: 'https://www.google.com/s2/favicons?domain=daos.fun&sz=128',
    candle: 'https://www.google.com/s2/favicons?domain=candle.fun&sz=128',
    sugar: 'https://www.google.com/s2/favicons?domain=sugar.fun&sz=128',
    believe: 'https://www.google.com/s2/favicons?domain=believe.fun&sz=128',
    boop: 'https://www.google.com/s2/favicons?domain=boop.fun&sz=128',
    launchlab: 'https://dd.dexscreener.com/ds-data/dexes/launchlab.png', // Launchlab logo from DexScreener
    'america.fun': 'https://www.google.com/s2/favicons?domain=america.fun&sz=128',
    americafun: 'https://www.google.com/s2/favicons?domain=america.fun&sz=128',
    mayhem: 'https://www.google.com/s2/favicons?domain=mayhem.fun&sz=128',
    'pump-amm': 'https://www.google.com/s2/favicons?domain=pump.fun&sz=128',
    pumpamm: 'https://www.google.com/s2/favicons?domain=pump.fun&sz=128',
    wavebreak: 'https://www.google.com/s2/favicons?domain=wavebreak.fun&sz=128',
    'trends.fun': 'https://www.google.com/s2/favicons?domain=trends.fun&sz=128',
    trendsfun: 'https://www.google.com/s2/favicons?domain=trends.fun&sz=128',
    dubdub: 'https://www.google.com/s2/favicons?domain=dubdub.fun&sz=128',
  };

  // Try exact match first, then normalized versions
  return logoMap[lower] || logoMap[normalized] || logoMap[normalizedDots] || null;
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: string | undefined): string {
  if (!platform) return 'Unknown';

  const nameMap: Record<string, string> = {
    pump: 'Pump.fun',
    pumpfun: 'Pump.fun',
    pumpportal: 'Pump.fun', // PumpPortal is pump.fun data source
    raydium: 'Raydium',
    'raydium-launchlab': 'Raydium Launchlab', // Jupiter API format
    meteora: 'Meteora',
    orca: 'Orca',
    moonshot: 'Moonshot',
    jupiter: 'Jupiter',
    'jupiter-studio': 'Jupiter Studio',
    'jup-studio': 'Jupiter Studio', // Jupiter API format
    jupiterstudio: 'Jupiter Studio',
    bonk: 'Bonk',
    'letsbonk.fun': 'LetsBonk.fun', // Jupiter API format
    bags: 'Bags',
    heaven: 'Heaven',
    'daos-fun': 'DAOs.fun',
    candle: 'Candle',
    sugar: 'Sugar',
    believe: 'Believe',
    moonit: 'Moonit',
    boop: 'Boop',
    launchlab: 'LaunchLab',
    'dynamic-bc': 'Dynamic BC',
    mayhem: 'Mayhem',
    'pump-amm': 'Pump AMM',
    wavebreak: 'Wavebreak',
  };

  const normalized = platform.toLowerCase().replace(/[_-]/g, '');
  return nameMap[normalized] || platform.charAt(0).toUpperCase() + platform.slice(1);
}

/**
 * Get chain logo URL
 */
export function getChainLogo(chain: ChainType | string | undefined): string {
  const chainMap: Record<string, string> = {
    solana: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    sol: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    bsc: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    binance: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    ethereum: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    eth: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    base: 'https://assets.coingecko.com/coins/images/27508/small/base.png',
  };

  if (!chain) return chainMap.solana;
  const normalized = chain.toLowerCase();
  return chainMap[normalized] || chainMap.solana;
}

/**
 * Get platform icon emoji (fallback if logo fails to load)
 */
export function getPlatformIcon(platform: string | undefined): string {
  if (!platform) return '🪙';

  const normalized = platform.toLowerCase().replace(/[_-]/g, '');

  const iconMap: Record<string, string> = {
    pump: '🚀',
    pumpfun: '🚀',
    pumpportal: '🚀', // PumpPortal is pump.fun data source
    raydium: '⚡',
    'raydium-launchlab': '⚡', // Jupiter API format
    meteora: '🌠',
    orca: '🐋',
    moonshot: '🌙',
    jupiter: '🪐',
    jupiterstudio: '🪐',
    'jupiter-studio': '🪐',
    'jup-studio': '🪐', // Jupiter API format
    bonk: '🐕',
    'letsbonk.fun': '🐕', // Jupiter API format
    bags: '👜',
    heaven: '☁️',
    'daos-fun': '👥',
    candle: '🕯️',
    sugar: '🍬',
    believe: '✨',
    moonit: '🌙',
    boop: '👆',
    launchlab: '🔬',
    'dynamic-bc': '🌠',
    mayhem: '💥',
    'pump-amm': '🚀',
    wavebreak: '🌊',
  };

  return iconMap[normalized] || '🪙';
}


