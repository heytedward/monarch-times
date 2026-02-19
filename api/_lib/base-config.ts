/**
 * Base Network Configuration for Monarch Times
 */

// Determine if we're using testnet or mainnet
const IS_TESTNET = process.env.BASE_NETWORK === 'sepolia';

// RPC Configuration
export const BASE_RPC_URL = IS_TESTNET
  ? process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
  : process.env.BASE_RPC_URL || 'https://mainnet.base.org';

export const BASE_CHAIN_ID = IS_TESTNET ? 84532 : 8453;

// Contract Addresses
export const MONARCH_CONTRACT_ADDRESS = IS_TESTNET
  ? '0x1351f1c430274644e1ff626f9c5551bda3770301' // Base Sepolia
  : process.env.BASE_CONTRACT_ADDRESS || ''; // Base Mainnet (deploy later)

// USDC Token Addresses
export const USDC_ADDRESS = IS_TESTNET
  ? '0x036CbD53842c5426634e7929541eC2318f3dCF7e' // Base Sepolia
  : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet

// Explorer URLs
export function getExplorerUrl(hash: string, type: 'address' | 'tx' = 'tx'): string {
  const baseUrl = IS_TESTNET ? 'https://sepolia.basescan.org' : 'https://basescan.org';
  return `${baseUrl}/${type}/${hash}`;
}
