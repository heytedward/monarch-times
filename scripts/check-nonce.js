const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

async function main() {
  const address = '0xcE830484F0E4Ca5B5d4fa86fB3dcE35da840918b'; // Your deployer address from logs
  
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://base-sepolia-rpc.publicnode.com'),
  });

  const latestNonce = await client.getTransactionCount({
    address,
    blockTag: 'latest'
  });

  const pendingNonce = await client.getTransactionCount({
    address,
    blockTag: 'pending'
  });

  console.log(`Latest Nonce (confirmed): ${latestNonce}`);
  console.log(`Pending Nonce (mempool): ${pendingNonce}`);
}

main().catch(console.error);
