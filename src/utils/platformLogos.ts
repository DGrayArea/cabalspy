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

  const normalized = platform.toLowerCase().replace(/[_-]/g, '');

  const logoMap: Record<string, string> = {
    // Pump.fun - using favicon with no-cors fallback
    pump: 'https://pump.fun/favicon.ico',
    pumpfun: 'https://pump.fun/favicon.ico',
    'pump.fun': 'https://pump.fun/favicon.ico', // Jupiter API format
    pumpportal: 'https://pump.fun/favicon.ico', // PumpPortal is pump.fun data source
    
    // Raydium - using favicon
    raydium: 'https://raydium.io/favicon.ico',
    'raydium-launchlab': 'https://raydium.io/favicon.ico', // Jupiter API format
    
    // Meteora - using favicon
    meteora: 'https://meteora.ag/favicon.ico',
    
    // Orca - using favicon
    orca: 'https://orca.so/favicon.ico',
    
    // Moonshot - using favicon
    moonshot: 'https://moonshot.cc/favicon.ico',
    
    // Jupiter - using favicon
    jupiter: 'https://jup.ag/favicon.ico',
    jupiterstudio: 'https://jup.ag/favicon.ico',
    'jupiter-studio': 'https://jup.ag/favicon.ico',
    'jup-studio': 'https://jup.ag/favicon.ico', // Jupiter API format
    
    // Bonk - using CoinGecko logo
    bonk: 'https://assets.coingecko.com/coins/images/28600/small/bonk.png',
    'letsbonk.fun': 'https://assets.coingecko.com/coins/images/28600/small/bonk.png', // Jupiter API format
    
    // Other platforms - using favicons
    bags: 'https://bags.fun/favicon.ico',
    heaven: 'https://heaven.fun/favicon.ico',
    'daos-fun': 'https://daos.fun/favicon.ico',
    candle: 'https://candle.fun/favicon.ico',
    sugar: 'https://sugar.fun/favicon.ico',
    believe: 'https://believe.fun/favicon.ico',
    moonit: 'https://moonit.fun/favicon.ico',
    boop: 'https://boop.fun/favicon.ico',
    launchlab: 'https://launchlab.fun/favicon.ico',
    'dynamic-bc': 'https://meteora.ag/favicon.ico', // Uses Meteora DBC
    mayhem: 'https://mayhem.fun/favicon.ico',
    'pump-amm': 'https://pump.fun/favicon.ico',
    wavebreak: 'https://wavebreak.fun/favicon.ico',
  };

  return logoMap[normalized] || null;
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


