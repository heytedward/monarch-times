/**
 * Solana cNFT Minting Service for Monarch Times
 *
 * Real implementation using Metaplex Bubblegum for compressed NFTs (cNFTs)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  createTree, 
  fetchTree, 
  mintV1, 
  parseLeafFromMintV1Transaction, 
  mplBubblegum 
} from '@metaplex-foundation/mpl-bubblegum';
import { 
  publicKey, 
  signerIdentity, 
  createSignerFromKeypair, 
  generateSigner,
  percentAmount,
  some
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { sql } from './db';
import { getSolanaRpcUrl, getMerkleTreeAddress, getExplorerUrl } from './solana-config';

export interface MintResult {
  success: boolean;
  mintAddress?: string; // Signature/TxHash
  assetId?: string; // The ID of the cNFT
  error?: string;
}

export interface IntelMintParams {
  intelId: string;
  title: string;
  content: string;
  topicName: string;
  agentName: string;
  agentPublicKey: string; // Solana base58 address
  agentAvgRating: number;
  ownerWallet: string; // Solana base58 address
  minterAddress: string; // Solana base58 address
  pricePaid: number;
}

/**
 * Initialize Umi with Bubblegum and Signer
 */
function getUmi() {
  const rpcUrl = getSolanaRpcUrl();
  const umi = createUmi(rpcUrl).use(mplBubblegum());

  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not configured');
  }

  // Load keypair from base58 string
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(keypair.secretKey);
  const signer = createSignerFromKeypair(umi, umiKeypair);

  umi.use(signerIdentity(signer));

  return { umi, signer };
}

/**
 * Mint intel as a cNFT on Solana
 */
export async function mintIntelAsCNFT(params: IntelMintParams): Promise<MintResult> {
  const {
    intelId,
    title,
    content,
    topicName,
    agentName,
    agentPublicKey,
    agentAvgRating,
    ownerWallet,
    minterAddress,
  } = params;

  console.log(`[Solana Minting Service] Minting ${intelId} for agent ${agentName}`);

  try {
    const { umi, signer } = getUmi();
    const merkleTreeAddress = getMerkleTreeAddress();

    if (!merkleTreeAddress) {
      throw new Error('SOLANA_MERKLE_TREE_ADDRESS not configured');
    }

    const treePublicKey = publicKey(merkleTreeAddress);
    
    // Create metadata (URI should ideally be pre-uploaded to I-PFS or hosted by you)
    // For now, we'll use a placeholder or your API URL
    const metadataURI = `https://api.monarchtimes.xyz/api/metadata?id=${intelId}`;

    // Map rating (0-5) to something meaningful in traits
    const rating = Math.min(Math.max(Math.round(agentAvgRating), 0), 5);

    console.log('[Solana Minting Service] Minting to tree:', merkleTreeAddress);

    // Mint the cNFT
    const { signature } = await mintV1(umi, {
      leafOwner: publicKey(ownerWallet),
      merkleTree: treePublicKey,
      metadata: {
        name: `${title.substring(0, 20)}...`,
        symbol: 'INTEL',
        uri: metadataURI,
        sellerFeeBasisPoints: 500, // 5% secondary sales
        creators: [
          { address: signer.publicKey, verified: true, share: 0 },
          { address: publicKey(agentPublicKey), verified: false, share: 100 },
        ],
      },
    }).sendAndConfirm(umi);

    const txSignature = bs58.encode(signature);
    console.log('[Solana Minting Service] Minted! Signature:', txSignature);

    // Update database with success
    await sql`
      UPDATE minted_intel SET
        mint_address = ${txSignature},
        status = 'COMPLETED',
        signature = ${txSignature},
        minted_at = NOW(),
        merkle_tree = ${merkleTreeAddress},
        chain = 'solana'
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    // Try to get assetId from the transaction (optional)
    let assetId = '';
    try {
      const leaf = await parseLeafFromMintV1Transaction(umi, signature);
      assetId = leaf.id;
      console.log('[Solana Minting Service] Asset ID:', assetId);
      
      // Save asset ID
      await sql`UPDATE intel SET asset_id = ${assetId} WHERE id = ${intelId}`;
    } catch (e) {
      console.warn('[Solana Minting Service] Could not parse assetId from logs');
    }

    return {
      success: true,
      mintAddress: txSignature,
      assetId: assetId,
      signature: txSignature,
    };
  } catch (error: any) {
    console.error('[Solana Minting Service] Minting error:', error);

    // Update database with failure
    await sql`
      UPDATE minted_intel SET
        status = 'FAILED',
        error_message = ${error.message || 'Unknown error'},
        chain = 'solana'
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    return {
      success: false,
      error: error.message || 'Minting failed',
    };
  }
}

/**
 * Get asset details from blockchain (Helius Read API)
 */
export async function getAssetDetails(assetId: string): Promise<any | null> {
  const rpcUrl = getSolanaRpcUrl();
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAsset',
        params: { id: assetId },
      }),
    });

    const { result } = await response.json();
    return result;
  } catch (error) {
    console.error('[Solana Minting Service] Error fetching asset:', error);
    return null;
  }
}
