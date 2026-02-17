/**
 * Base NFT Minting Service for Monarch Times
 *
 * Real implementation using viem to interact with MonarchIntel contract
 */

import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { sql } from './db';
import {
  BASE_RPC_URL,
  BASE_CHAIN_ID,
  MONARCH_CONTRACT_ADDRESS,
  getExplorerUrl
} from './base-config';
import MONARCH_ABI from './MonarchIntel.abi.json';

export interface MintResult {
  success: boolean;
  mintAddress?: string; // Transaction Hash for EVM
  signature?: string;
  error?: string;
}

export interface IntelMintParams {
  intelId: string;
  title: string;
  content: string;
  topicName: string;
  agentName: string;
  agentPublicKey: string; // EVM address
  agentAvgRating: number;
  ownerWallet: string; // EVM address
  minterAddress: string; // EVM address
  pricePaid: number;
}

// Get chain based on chain ID
const chain = BASE_CHAIN_ID === 84532 ? baseSepolia : base;

// Create public client for reading blockchain data
const publicClient = createPublicClient({
  chain,
  transport: http(BASE_RPC_URL),
});

/**
 * Create wallet client for signing transactions
 * Requires MINTER_PRIVATE_KEY in environment
 */
function getWalletClient() {
  const privateKey = process.env.MINTER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('MINTER_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return createWalletClient({
    account,
    chain,
    transport: http(BASE_RPC_URL),
  });
}

/**
 * Mint intel as an NFT on Base
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
    minterAddress,
  } = params;

  console.log(`[Base Minting Service] Minting ${intelId} for agent ${agentName}`);

  try {
    // Validate contract address
    if (!MONARCH_CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured');
    }

    // Create metadata URI (you can customize this to point to your API or IPFS)
    const metadataURI = `https://api.monarchtimes.xyz/metadata/${intelId}`;
    // Or use IPFS: Upload to IPFS first and use: `ipfs://QmXXXXX...`

    // Calculate rating (0-5 scale)
    const rating = Math.min(Math.max(Math.round(agentAvgRating), 0), 5);

    console.log('[Base Minting Service] Minting parameters:', {
      metadataURI,
      agentAddress: agentPublicKey,
      rating,
    });

    // Get wallet client
    const walletClient = getWalletClient();

    // Call mintIntel on the contract
    const hash = await walletClient.writeContract({
      address: MONARCH_CONTRACT_ADDRESS as `0x${string}`,
      abi: MONARCH_ABI,
      functionName: 'mintIntel',
      args: [metadataURI, agentPublicKey as `0x${string}`, BigInt(rating)],
    });

    console.log('[Base Minting Service] Transaction submitted:', hash);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log('[Base Minting Service] Transaction confirmed:', {
      hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
    });

    // Extract tokenId from events (optional - for future features)
    let tokenId: bigint | undefined;
    if (receipt.logs && receipt.logs.length > 0) {
      // Parse IntelMinted event to get tokenId
      // This is optional - you can extract it from logs if needed
      try {
        const log = receipt.logs[0];
        // First indexed parameter in IntelMinted event is tokenId
        if (log.topics && log.topics.length > 1) {
          tokenId = BigInt(log.topics[1]);
          console.log('[Base Minting Service] Token ID:', tokenId.toString());
        }
      } catch (e) {
        console.warn('[Base Minting Service] Could not parse tokenId from logs:', e);
      }
    }

    // Update database with success
    await sql`
      UPDATE minted_intel SET
        mint_address = ${hash},
        status = 'COMPLETED',
        signature = ${hash},
        minted_at = NOW(),
        merkle_tree = ${`base_${chain.name}_${MONARCH_CONTRACT_ADDRESS}`}
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    return {
      success: true,
      mintAddress: hash,
      signature: hash,
    };
  } catch (error: any) {
    console.error('[Base Minting Service] Minting error:', error);

    // Update database with failure
    await sql`
      UPDATE minted_intel SET
        status = 'FAILED',
        error_message = ${error.message || 'Unknown error'}
      WHERE intel_id = ${intelId} AND minter_address = ${minterAddress}
    `;

    return {
      success: false,
      error: error.message || 'Minting failed',
    };
  }
}

/**
 * Get asset details from blockchain
 */
export async function getAssetDetails(txHash: string): Promise<any | null> {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`
    });

    return {
      chain: chain.name,
      txHash,
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      explorerUrl: getExplorerUrl(txHash, 'tx'),
    };
  } catch (error) {
    console.error('[Base Minting Service] Error fetching transaction:', error);
    return null;
  }
}
