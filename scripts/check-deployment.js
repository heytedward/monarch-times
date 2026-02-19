const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

async function main() {
  const hash = '0x70f7e18539c14bf8d06f27de4f497ce65ee0b51fbb28bf021f6b886363753cf2';
  console.log(`Checking transaction: ${hash}`);

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'),
  });

  try {
    const receipt = await client.getTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Transaction confirmed!');
      console.log('Contract Address:', receipt.contractAddress);
      
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(
        path.join(__dirname, '../DEPLOYED_ADDRESS.txt'), 
        receipt.contractAddress
      );
    } else {
      console.log('❌ Transaction failed (reverted).');
    }
  } catch (error) {
    console.log('Transaction not found or pending:', error.message);
  }
}

main().catch(console.error);
