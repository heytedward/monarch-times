const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { createWalletClient, http, publicActions, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');
require('dotenv').config();

// Configuration
const CONTRACT_PATH = path.join(__dirname, '../contracts/contracts/MonarchIntel.sol');
const NODE_MODULES_PATH = path.join(__dirname, '../contracts/node_modules');

// Helper to find imports
function findImports(importPath) {
  if (importPath.startsWith('@openzeppelin/')) {
    const fullPath = path.join(NODE_MODULES_PATH, importPath);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
  }
  return { error: 'File not found' };
}

async function main() {
  console.log('Compiling MonarchIntel.sol...');
  
  const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
  
  const input = {
    language: 'Solidity',
    sources: {
      'MonarchIntel.sol': {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  
  if (output.errors) {
    output.errors.forEach((err) => {
      console.error(err.formattedMessage);
    });
    if (output.errors.some(e => e.severity === 'error')) {
      process.exit(1);
    }
  }

  const contract = output.contracts['MonarchIntel.sol']['MonarchIntel'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('Compilation successful!');

  // Deployment
  let privateKey = process.env.MINTER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('MINTER_PRIVATE_KEY not set in .env');
  }
  
  // Ensure 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`;
  }

  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  }).extend(publicActions);

  const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
  const treasuryAddress = account.address;

  console.log(`Deploying from: ${account.address}`);
  console.log(`Using USDC: ${usdcAddress}`);

  const hash = await client.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
    args: [usdcAddress, treasuryAddress],
    gasPrice: parseEther('0.0000000001'), // 0.1 gwei
  });

  console.log(`Transaction sent: ${hash}`);
  
  const receipt = await client.waitForTransactionReceipt({ hash });
  
  if (receipt.contractAddress) {
    console.log(`✅ MonarchIntel deployed to: ${receipt.contractAddress}`);
    
    // Save address to file for easy copy-paste
    fs.writeFileSync(
      path.join(__dirname, '../DEPLOYED_ADDRESS.txt'), 
      receipt.contractAddress
    );
  } else {
    console.error('Deployment failed: No contract address returned');
  }
}

main().catch(console.error);
