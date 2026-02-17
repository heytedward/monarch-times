import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createNft,
  mplTokenMetadata,
  fetchDigitalAsset
} from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as toPublicKey
} from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Load or create minting keypair
function getMintingKeypair() {
  const keypairPath = path.join(os.homedir(), '.monarch', 'mint-keypair.json');

  if (fs.existsSync(keypairPath)) {
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }

  // Create new keypair for minting
  const keypair = Keypair.generate();
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });
  console.log(`[NFT Minter] Created new minting keypair: ${keypair.publicKey.toBase58()}`);
  return keypair;
}

// Initialize Umi instance
function getUmi() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const umi = createUmi(rpcUrl).use(mplTokenMetadata());

  const mintingKeypair = getMintingKeypair();
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(mintingKeypair.secretKey);
  umi.use(keypairIdentity(umiKeypair));

  return umi;
}

/**
 * Create metadata JSON for the NFT
 */
function createMetadata(intel, agentName) {
  return {
    name: intel.title.slice(0, 32), // Max 32 chars for on-chain name
    symbol: 'MNRCH',
    description: intel.content.slice(0, 500),
    image: 'https://arweave.net/placeholder-monarch-nft', // TODO: Generate or upload image
    external_url: `https://monarchtimes.com/intel/${intel.id}`,
    attributes: [
      { trait_type: 'Topic', value: intel.topic_name || 'GENERAL' },
      { trait_type: 'Author', value: agentName },
      { trait_type: 'Rating', value: intel.rating || 5 },
      { trait_type: 'Minted', value: new Date().toISOString() },
    ],
    properties: {
      category: 'document',
      creators: [
        {
          address: intel.agent_public_key,
          share: 100,
        },
      ],
    },
  };
}

/**
 * Mint an intel post as an NFT
 * @param {Object} intel - The intel post to mint
 * @param {string} agentName - The agent's name
 * @param {string} recipientAddress - The wallet address to receive the NFT
 * @returns {Object} - Minting result with mint address
 */
export async function mintIntelAsNFT(intel, agentName, recipientAddress) {
  try {
    const umi = getUmi();

    // Generate metadata
    const metadata = createMetadata(intel, agentName);

    // For now, we'll use a data URI for metadata (in production, upload to Arweave)
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

    // Generate a new mint address
    const mint = generateSigner(umi);

    // Create the NFT
    const { signature } = await createNft(umi, {
      mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5), // 5% royalty
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          share: 100,
        },
      ],
      // Transfer to recipient after minting
      // tokenOwner: toPublicKey(recipientAddress),
    }).sendAndConfirm(umi);

    const mintAddress = mint.publicKey.toString();

    console.log(`[NFT Minter] Minted NFT: ${mintAddress}`);
    console.log(`[NFT Minter] Transaction: ${bs58.encode(signature)}`);

    return {
      success: true,
      mintAddress,
      signature: bs58.encode(signature),
      metadataUri,
      metadata,
    };
  } catch (error) {
    console.error(`[NFT Minter] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get NFT details by mint address
 */
export async function getNFTDetails(mintAddress) {
  try {
    const umi = getUmi();
    const asset = await fetchDigitalAsset(umi, toPublicKey(mintAddress));
    return asset;
  } catch (error) {
    console.error(`[NFT Minter] Error fetching NFT: ${error.message}`);
    return null;
  }
}

/**
 * Check if minting is available (keypair has SOL)
 */
export async function checkMintingAvailability() {
  try {
    const umi = getUmi();
    const balance = await umi.rpc.getBalance(umi.identity.publicKey);
    const solBalance = Number(balance.basisPoints) / 1e9;

    return {
      available: solBalance > 0.01, // Need at least 0.01 SOL
      balance: solBalance,
      mintingAddress: umi.identity.publicKey.toString(),
    };
  } catch (error) {
    return {
      available: false,
      balance: 0,
      error: error.message,
    };
  }
}

export default {
  mintIntelAsNFT,
  getNFTDetails,
  checkMintingAvailability,
};
