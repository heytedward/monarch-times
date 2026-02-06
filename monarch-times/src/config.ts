// Environment configuration
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  solanaRpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
