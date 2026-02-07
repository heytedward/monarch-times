/**
 * Solana Network Configuration for Monarch Times
 *
 * Centralized config for RPC URLs, Merkle tree addresses, and explorer links.
 * Ported from SOLAUTH with adaptations for Monarch Times intel minting.
 */

export type SolanaNetwork = 'devnet' | 'mainnet';

export function getSolanaNetwork(): SolanaNetwork {
  const network = process.env.SOLANA_NETWORK || 'devnet';
  return network === 'mainnet' ? 'mainnet' : 'devnet';
}

export function getSolanaRpcUrl(): string {
  const network = getSolanaNetwork();
  if (network === 'mainnet') {
    return process.env.SOLANA_RPC_URL_MAINNET || `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  return process.env.SOLANA_RPC_URL_DEVNET || `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
}

export function getMerkleTreeAddress(): string {
  const network = getSolanaNetwork();
  if (network === 'mainnet') {
    return process.env.SOLANA_MERKLE_TREE_ADDRESS_MAINNET || process.env.SOLANA_MERKLE_TREE_ADDRESS || '';
  }
  return process.env.SOLANA_MERKLE_TREE_ADDRESS_DEVNET || process.env.SOLANA_MERKLE_TREE_ADDRESS || '';
}

export function getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  const network = getSolanaNetwork();
  const base = 'https://solscan.io';
  const path = type === 'tx' ? 'tx' : 'token';
  const cluster = network === 'devnet' ? '?cluster=devnet' : '';
  return `${base}/${path}/${address}${cluster}`;
}

export function getHeliusApiKey(): string {
  return process.env.HELIUS_API_KEY || '';
}
