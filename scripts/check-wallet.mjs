import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

// Manual .env loading - try multiple locations
let envLoaded = false;
const searchPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'monarch-times', '.env'),
  path.resolve(process.cwd(), 'monarch-cli', '.env')
];

for (const envPath of searchPaths) {
  try {
    if (fs.existsSync(envPath)) {
      console.log(`Loading .env from: ${envPath}`);
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      });
      envLoaded = true;
      break; 
    }
  } catch (e) {
    console.log(`Could not load .env from ${envPath}:`, e.message);
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env file found in root, monarch-times/, or monarch-cli/');
}

// Check for network override or default
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';
// Use Helius or default RPCs
const RPC_URL = process.env.SOLANA_RPC_URL_MAINNET || 
                (NETWORK === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com');

const PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY || process.env.SOLANA_AUTHORITY_SECRET_KEY;

async function check() {
  console.log(`\n--- Configuration ---`);
  console.log(`Network:    ${NETWORK}`);
  console.log(`RPC URL:    ${RPC_URL}`);
  
  if (!PRIVATE_KEY) {
    console.error('❌ Error: SOLANA_PRIVATE_KEY or SOLANA_AUTHORITY_SECRET_KEY not found.');
    process.exit(1);
  }

  try {
    let secretKey;
    if (PRIVATE_KEY.startsWith('[')) {
      secretKey = Uint8Array.from(JSON.parse(PRIVATE_KEY));
    } else {
      secretKey = bs58.decode(PRIVATE_KEY);
    }

    const keypair = Keypair.fromSecretKey(secretKey);
    const connection = new Connection(RPC_URL, 'confirmed');
    
    console.log(`\nChecking balance for wallet...`);
    const balance = await connection.getBalance(keypair.publicKey);

    console.log('\n--- Wallet Status ---');
    console.log(`Address:    ${keypair.publicKey.toString()}`);
    console.log(`Balance:    ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance === 0) {
      console.log('\n❌ BALANCE IS 0 SOL');
      console.log(`Ensure you sent funds to: ${keypair.publicKey.toString()}`);
      console.log(`And that you are checking the correct network (${NETWORK}).`);
    } else {
      console.log('\n✅ Wallet has funds.');
    }
  } catch (err) {
    console.error('Error checking wallet:', err);
  }
}

check();
