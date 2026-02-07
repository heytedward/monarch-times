import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createNft,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
} from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Config
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

async function main() {
  console.log('🦋 Monarch Times - Collection Creator\n');

  // Load keypair
  const keypairPath = path.join(os.homedir(), '.monarch', 'mint-keypair.json');
  if (!fs.existsSync(keypairPath)) {
    console.error(`Error: Minting keypair not found at ${keypairPath}`);
    console.error('Run "monarch-cli" first or ensure you have a wallet configured.');
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  
  console.log(`Using Wallet: ${keypair.publicKey.toBase58()}`);

  // Setup Umi
  const umi = createUmi(RPC_URL).use(mplTokenMetadata());
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(keypair.secretKey);
  umi.use(keypairIdentity(umiKeypair));

  // Check balance
  const balance = await umi.rpc.getBalance(umi.identity.publicKey);
  const solBalance = Number(balance.basisPoints) / 1e9;
  console.log(`Balance: ${solBalance} SOL`);

  if (solBalance < 0.02) {
    console.error('Error: Insufficient SOL. Need at least 0.02 SOL to mint a collection.');
    process.exit(1);
  }

  console.log('\nCreating Collection NFT...');

  const collectionMint = generateSigner(umi);

  const { signature } = await createNft(umi, {
    mint: collectionMint,
    name: "Monarch Times Intel",
    symbol: "MNRCH",
    uri: "https://monarchtimes.xyz/collection-metadata.json", // You should host this file!
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true, 
  }).sendAndConfirm(umi);

  const signatureStr = bs58.encode(signature);
  const collectionAddress = collectionMint.publicKey.toString();

  console.log('\n✅ Collection Created Successfully!');
  console.log(`Collection Address: ${collectionAddress}`);
  console.log(`Transaction: ${signatureStr}`);
  console.log('\nNEXT STEPS:');
  console.log(`1. Add SOLANA_COLLECTION_ADDRESS=${collectionAddress} to your Vercel environment variables.`);
  console.log('2. Redeploy the API.');
}

main().catch(console.error);
