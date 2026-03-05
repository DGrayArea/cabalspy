
import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Pool types for Solana
const SOLANA_POOL_TYPES = [
  "pumpfun",
  "meteora",
  "moonshot",
  "jupiter",
  "raydium",
  "moonit",
  "letsbonk",
];

const endpoints = [
  // --- INTERNAL PROXY ENDPOINTS ---
  
  // 1. Mobula GET (New, Bonding, Bonded)
  { 
    name: 'Mobula GET (New/Bonding/Bonded)', 
    method: 'GET',
    url: `${BASE_URL}/api/mobula?assetMode=true&chainId=solana:solana&poolTypes=${SOLANA_POOL_TYPES.join(',')}` 
  },
  
  // 2. Mobula POST - Trending
  {
    name: 'Mobula POST (Trending)',
    method: 'POST',
    url: `${BASE_URL}/api/mobula`,
    data: {
      assetMode: true,
      views: [{
        name: "trending",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 10
      }]
    }
  },
  
  // 3. Mobula POST - Quality Tokens (Featured)
  {
    name: 'Mobula POST (Featured/Quality)',
    method: 'POST',
    url: `${BASE_URL}/api/mobula`,
    data: {
      assetMode: true,
      views: [{
        name: "quality-tokens",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 10,
        filters: {
          volume_24h: { gte: 5000 },
          holders_count: { gte: 50 },
          dexscreenerListed: true,
        }
      }]
    }
  },
  
  // 4. Mobula POST - High Volume (Top)
  {
    name: 'Mobula POST (Top/High Volume)',
    method: 'POST',
    url: `${BASE_URL}/api/mobula`,
    data: {
      assetMode: true,
      views: [{
        name: "high-volume",
        chainId: ["solana:solana"],
        poolTypes: SOLANA_POOL_TYPES,
        sortBy: "volume_1h",
        sortOrder: "desc",
        limit: 10,
        filters: {
          volume_1h: { gte: 1000 },
          market_cap: { gte: 5000, lte: 50000 },
          trades_1h: { gte: 10 },
        }
      }]
    }
  },

  // 5. Pump.fun Proxy
  { name: 'Pump.fun Latest (Proxy)', method: 'GET', url: `${BASE_URL}/api/pumpfun?endpoint=/coins&api=v3&sort=created_timestamp&order=DESC&limit=10` },
  
  // --- EXTERNAL PROTOCOL APIS ---
  { name: 'Raydium Launchpad', method: 'GET', url: 'https://launch-mint-v1.raydium.io/get/list?sort=hotToken&size=10&mintType=default&includeNsfw=false&platformId=PlatformWhiteList' },
  { name: 'Raydium AMM V3', method: 'GET', url: 'https://api.raydium.io/v2/ammV3/pool' },
  { name: 'Meteora DLMM', method: 'GET', url: 'https://damm-api.meteora.ag/pools' },
  { name: 'Moonshot API', method: 'GET', url: 'https://api.mintlp.io/v1/tokens' },
  { name: 'Mobula Pulse (External GET)', method: 'GET', url: 'https://api.mobula.io/api/2/pulse?chainId=solana:solana&limit=10' },
];

async function checkEndpoints() {
  console.log(`\n🚀 Starting Comprehensive API Check (Base URL: ${BASE_URL})\n`);
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Checking ${endpoint.name.padEnd(30)} [${endpoint.method}] ... `);
    
    try {
      const start = Date.now();
      const response = await axios({
        method: endpoint.method as any,
        url: endpoint.url,
        data: (endpoint as any).data,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - start;
      
      const dataSize = JSON.stringify(response.data).length;
      console.log(`✅ OK (${response.status}) [${duration}ms] Size: ${(dataSize/1024).toFixed(2)}KB`);
      results.push({ name: endpoint.name, method: endpoint.method, status: 'OK', code: response.status, duration });
    } catch (error: any) {
      const status = error.response ? error.response.status : 'FAILED';
      const message = error.response ? (error.response.data?.error || error.response.statusText) : error.message;
      console.log(`❌ ERROR: ${status} (${message})`);
      results.push({ name: endpoint.name, method: endpoint.method, status: 'ERROR', code: status, message });
    }
  }
  
  console.log('='.repeat(80));
  const successCount = results.filter(r => r.status === 'OK').length;
  console.log(`\nSummary: ${successCount}/${results.length} endpoints passed.`);
  
  if (successCount < results.length) {
    console.log('\n❌ Issues found:');
    results.filter(r => r.status === 'ERROR').forEach(r => {
      console.log(`  - [${r.method}] ${r.name}: ${r.code} (${r.message})`);
    });
  }
  
  console.log('\nNote: For internal endpoints, ensure the dev server is running (npm run dev).');
  console.log('To test production, run: BASE_URL=https://cabalspy-pi.vercel.app npm run test:apis\n');
}

checkEndpoints().catch(console.error);
