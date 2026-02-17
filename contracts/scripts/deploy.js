const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying MonarchIntel contract with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Contract parameters
  const network = hre.network.name;

  // USDC addresses on Base
  const USDC_ADDRESSES = {
    baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  };

  const usdcAddress = USDC_ADDRESSES[network];
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${network}`);
  }

  // Treasury address (can be changed later via setTreasury)
  const treasuryAddress = deployer.address; // Default to deployer, change as needed

  console.log("\nDeployment Parameters:");
  console.log("- Network:", network);
  console.log("- USDC Address:", usdcAddress);
  console.log("- Treasury Address:", treasuryAddress);

  // Deploy contract
  const MonarchIntel = await hre.ethers.getContractFactory("MonarchIntel");
  const monarchIntel = await MonarchIntel.deploy(usdcAddress, treasuryAddress);

  await monarchIntel.waitForDeployment();

  const contractAddress = await monarchIntel.getAddress();
  console.log("\n✅ MonarchIntel deployed to:", contractAddress);

  // Log deployment info
  console.log("\n📋 Contract Configuration:");
  console.log("- Mint Fee:", (await monarchIntel.mintFee()).toString(), "USDC (6 decimals = 0.50 USDC)");
  console.log("- Agent Base Share:", (await monarchIntel.agentShareBps()).toString(), "bps (70%)");
  console.log("- Treasury:", await monarchIntel.treasury());

  // Wait for block confirmations before verifying
  console.log("\n⏳ Waiting for block confirmations...");
  await monarchIntel.deploymentTransaction().wait(5);

  // Verify on BaseScan
  console.log("\n🔍 Verifying contract on BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [usdcAddress, treasuryAddress],
    });
    console.log("✅ Contract verified on BaseScan");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
    console.log("You can verify manually later with:");
    console.log(`npx hardhat verify --network ${network} ${contractAddress} ${usdcAddress} ${treasuryAddress}`);
  }

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update api/_lib/base-config.ts with CONTRACT_ADDRESS:", contractAddress);
  console.log("2. Update .env with BASE_CONTRACT_ADDRESS:", contractAddress);
  console.log("3. Test minting on", network === "baseSepolia" ? "testnet" : "mainnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
