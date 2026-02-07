/**
 * Solana cNFT Minting Service for Monarch Times
 *
 * Handles the creation of compressed NFTs (cNFTs) for intel posts using Metaplex Bubblegum.
 * Ported from SOLAUTH with adaptations for Monarch Times (raw SQL, intel metadata).
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, mintV1 } from '@metaplex-foundation/mpl-bubblegum';
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
  Umi,
} from '@metaplex-foundation/umi';
import { sql, generateId } from './db';
import { getSolanaRpcUrl, getSolanaNetwork, getMerkleTreeAddress, getHeliusApiKey } from './solana-config';

const HELIUS_API_KEY = getHeliusApiKey();
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Initialize UMI instance with Helius RPC
 */
let umiInstance: Umi | null = null;

async function getUmi(): Promise<Umi> {
  if (umiInstance) return umiInstance;

  const rpcUrl = getSolanaRpcUrl();
  umiInstance = createUmi(rpcUrl).use(mplBubblegum());

  // Load authority keypair
  const authoritySecretKey = process.env.SOLANA_PRIVATE_KEY || process.env.SOLANA_AUTHORITY_SECRET_KEY;
  if (authoritySecretKey) {
    try {
      let secretKeyBytes: Uint8Array;

      if (authoritySecretKey.startsWith('[')) {
        secretKeyBytes = new Uint8Array(JSON.parse(authoritySecretKey));
      } else {
        const bs58 = await import('bs58');
        secretKeyBytes = bs58.default.decode(authoritySecretKey);
      }

      const keypair = umiInstance.eddsa.createKeypairFromSecretKey(secretKeyBytes);
      const signer = createSignerFromKeypair(umiInstance, keypair);
      umiInstance.use(signerIdentity(signer));
      console.log(`[Minting Service] Authority loaded: ${signer.publicKey}`);
    } catch (e) {
      console.error('[Minting Service] Failed to load authority keypair:', e);
    }
  }

  return umiInstance;
}

/**
 * Generate a mock signature for development
 */
function generateDevSignature(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
  let result = '';
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a mock mint address for development
 */
function generateDevMintAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get asset ID from Helius DAS API after minting
 */
async function getAssetIdFromSignature(signature: string): Promise<string | null> {
  if (!HELIUS_API_KEY) return null;

  try {
    const response = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [signature] }),
    });

    const data = await response.json();
    if (data[0]?.events?.compressed) {
      return data[0].events.compressed[0]?.assetId || null;
    }
  } catch (e) {
    console.error('[Minting Service] Failed to get asset ID from Helius:', e);
  }

  return null;
}

/**
 * Build metadata URI for intel NFT
 */
function buildMetadataUri(intelId: string): string {
  const baseUrl = process.env.METADATA_BASE_URI || 'https://monarchtimes.xyz/api/metadata';
  return `${baseUrl}/${encodeURIComponent(intelId)}.json`;
}

export interface MintResult {
  success: boolean;
  mintAddress?: string;
  signature?: string;
  error?: string;
}

export interface IntelMintParams {
  intelId: string;
  title: string;
  content: string;
  topicName: string;
  agentName: string;
  agentPublicKey: string;
  agentAvgRating: number;
  ownerWallet: string;
  minterAddress: string;
  pricePaid: number;
}

/**
 * Mint intel as a compressed NFT
 */
export async function mintIntelAsCNFT(params: IntelMintParams): Promise<MintResult> {
  const {
    intelId,
    title,
    topicName,
    agentName,
    agentAvgRating,
    ownerWallet,
    minterAddress,
    pricePaid,
  } = params;

  const startTime = Date.now();
  const merkleTreeAddress = getMerkleTreeAddress();

  // Build intel metadata
  const metadata = {
    traits: [
      { trait_type: 'Topic', value: topicName || 'GENERAL' },
      { trait_type: 'Author', value: agentName },
      { trait_type: 'Rating', value: agentAvgRating.toFixed(1) },
      { trait_type: 'Minted', value: new Date().toISOString() },
    ],
  };

  // Development mode - return mock data if no tree configured
  if (IS_DEV && !merkleTreeAddress) {
    console.log(`[DEV MODE] Minting intel ${intelId} for ${ownerWallet.slice(0, 8)}...`);

    const mockSignature = generateDevSignature();
    const mockMintAddress = generateDevMintAddress();

    await new Promise(resolve => setTimeout(resolve, 500));

    // Record in database
    const mintId = generateId('MNT-');
    await sql`
      UPDATE minted_intel SET
        mint_address = ${mockMintAddress},
        merkle_tree = 'dev_tree',
        status = 'COMPLETED',
        signature = ${mockSignature},
        metadata = ${JSON.stringify(metadata)},
        minted_at = NOW()
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    console.log(`[DEV MODE] Minted in ${Date.now() - startTime}ms: ${mockMintAddress}`);

    return {
      success: true,
      mintAddress: mockMintAddress,
      signature: mockSignature,
    };
  }

  // Production mode - use Bubblegum
  if (!merkleTreeAddress) {
    return {
      success: false,
      error: 'Merkle tree address not configured. Set SOLANA_MERKLE_TREE_ADDRESS.',
    };
  }

  try {
    const umi = await getUmi();

    const merkleTree = publicKey(merkleTreeAddress);
    const owner = publicKey(ownerWallet);

    // Build metadata URI
    const metadataUri = buildMetadataUri(intelId);

    console.log(`[Minting Service] Minting intel "${title.slice(0, 30)}..." to ${ownerWallet.slice(0, 8)}...`);

    // Update status to MINTING
    await sql`
      UPDATE minted_intel SET
        status = 'MINTING',
        merkle_tree = ${merkleTreeAddress},
        metadata = ${JSON.stringify(metadata)}
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    // Check for collection address
    const collectionAddress = process.env.SOLANA_COLLECTION_ADDRESS;
    const collectionConfig = collectionAddress
      ? {
          key: publicKey(collectionAddress),
          verified: false, // Will need to be verified by authority separately if not signer
        }
      : null;

    // Send mint transaction
    const mintBuilder = mintV1(umi, {
      leafOwner: owner,
      merkleTree,
      metadata: {
        name: title.slice(0, 32),
        symbol: 'MNRCH',
        uri: metadataUri,
        sellerFeeBasisPoints: 500, // 5% royalty to agent
        collection: collectionConfig,
        creators: [
          {
            address: publicKey(params.agentPublicKey),
            verified: false,
            share: 100,
          },
        ],
      },
    });

    const { signature } = await mintBuilder.sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
    const signatureStr = Buffer.from(signature).toString('base64');

    // Get asset ID from Helius
    let mintAddress = signatureStr.substring(0, 44);
    const assetId = await getAssetIdFromSignature(signatureStr);
    if (assetId) {
      mintAddress = assetId;
    }

    // Update database with success
    await sql`
      UPDATE minted_intel SET
        mint_address = ${mintAddress},
        status = 'COMPLETED',
        signature = ${signatureStr},
        minted_at = NOW()
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    console.log(`[Minting Service] Minted in ${Date.now() - startTime}ms: ${mintAddress}`);

    return {
      success: true,
      mintAddress,
      signature: signatureStr,
    };
  } catch (error: any) {
    console.error('[Minting Service] Minting error:', error);

    // Update database with failure
    await sql`
      UPDATE minted_intel SET
        status = 'FAILED',
        error_message = ${error.message}
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get asset details from Helius DAS API
 */
export async function getAssetDetails(mintAddress: string): Promise<any | null> {
  if (!HELIUS_API_KEY) {
    console.warn('[Minting Service] Helius API key not configured for asset lookup');
    return null;
  }

  const network = getSolanaNetwork();
  const rpcUrl = network === 'mainnet'
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'monarch-asset-lookup',
        method: 'getAsset',
        params: { id: mintAddress },
      }),
    });

    const data = await response.json();
    return data.result || null;
  } catch (e) {
    console.error('[Minting Service] Failed to get asset details:', e);
    return null;
  }
}
