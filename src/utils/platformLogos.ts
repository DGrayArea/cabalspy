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
    // Pump.fun - using logo from their assets
    pump: 'https://pump.fun/_next/static/media/pump-logo.avif',
    pumpfun: 'https://pump.fun/_next/static/media/pump-logo.avif',
    'pump.fun': 'https://pump.fun/_next/static/media/pump-logo.avif', // Jupiter API format
    pumpportal: 'https://pump.fun/_next/static/media/pump-logo.avif', // PumpPortal is pump.fun data source
    
    // Raydium - using CoinGecko logo (reliable source)
    raydium: 'https://assets.coingecko.com/coins/images/13902/small/PSigc4ie_400x400.jpg',
    'raydium-launchlab': 'https://assets.coingecko.com/coins/images/13902/small/PSigc4ie_400x400.jpg', // Jupiter API format
    
    // Meteora - using logo from their website/CDN
    meteora: 'https://meteora.ag/logo.png',
    'met-dbc': 'https://meteora.ag/logo.png', // Meteora DBC format
    'dynamic-bc': 'https://meteora.ag/logo.png', // Uses Meteora DBC
    
    // Orca - using CoinGecko logo (reliable source)
    orca: 'https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png',
    
    // Moonshot - using logo from their website
    moonshot: 'https://moonshot.cc/logo.png',
    
    // Jupiter - using logo from Jupiter aggregator
    jupiter: 'https://jup.ag/logo.png',
    jupiterstudio: 'https://jup.ag/logo.png',
    'jupiter-studio': 'https://jup.ag/logo.png',
    'jup-studio': 'https://jup.ag/logo.png', // Jupiter API format
    
    // Bonk - using CoinGecko logo (reliable source)
    bonk: 'https://assets.coingecko.com/coins/images/28600/small/bonk.png',
    'letsbonk.fun': 'https://assets.coingecko.com/coins/images/28600/small/bonk.png', // Jupiter API format
    
    // Other platforms - trying common logo paths
    bags: 'https://bags.fun/logo.png',
    'bags.fun': 'https://bags.fun/logo.png',
    heaven: 'https://heaven.fun/logo.png',
    'daos-fun': 'https://daos.fun/logo.png',
    'daos.fun': 'https://daos.fun/logo.png',
    candle: 'https://candle.fun/logo.png',
    sugar: 'https://sugar.fun/logo.png',
    believe: 'https://believe.fun/logo.png',
    moonit: 'https://moonit.fun/logo.png',
    boop: 'https://boop.fun/logo.png',
    launchlab: 'https://assets.coingecko.com/coins/images/13902/small/PSigc4ie_400x400.jpg', // Launchlab is part of Raydium
    'america.fun': 'https://america.fun/logo.png',
    mayhem: 'https://mayhem.fun/logo.png',
    'pump-amm': 'https://pump.fun/_next/static/media/pump-logo.avif',
    wavebreak: 'https://wavebreak.fun/logo.png',
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


