import { network } from "hardhat";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Deploying Ticket contract to Push Testnet Donut...");
  
  const { viem } = await network.connect({
    network: "pushTestnetDonut",
    chainType: "l1",
  });

  const publicClient = await viem.getPublicClient();
  const [deployerClient] = await viem.getWalletClients();
  
  console.log("Deploying contracts with the account:", deployerClient.account.address);
  
  const balance = await publicClient.getBalance({
    address: deployerClient.account.address,
  });
  console.log("Account balance:", balance.toString());

  if (balance === 0n) {
    throw new Error("❌ Insufficient balance for deployment. Please fund your account.");
  }

  // Deploy Ticket contract
  console.log("Deploying Ticket contract...");
  
  // Get the contract artifact
  const hre = await import("hardhat");
  const ticketArtifact = await hre.artifacts.readArtifact("Ticket");
  
  const ticketHash = await deployerClient.deployContract({
    abi: ticketArtifact.abi,
    bytecode: ticketArtifact.bytecode as `0x${string}`,
    account: deployerClient.account,
    args: ["EventX Tickets", "EVTX"],
  });
  
  const ticketReceipt = await publicClient.waitForTransactionReceipt({
    hash: ticketHash,
  });
  const ticketAddress = ticketReceipt.contractAddress;
  console.log("Ticket contract deployed to:", ticketAddress);

  // Verify contract ownership
  const owner = await publicClient.readContract({
    address: ticketAddress!,
    abi: ticketArtifact.abi,
    functionName: 'owner'
  });
  console.log("Contract owner:", owner);

  // Save deployment info
  const deploymentInfo = {
    network: "push-testnet-donut",
    chainId: 42101,
    deployer: deployerClient.account.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: ticketHash,
    contracts: {
      Ticket: {
        address: ticketAddress,
        constructorArgs: ["EventX Tickets", "EVTX"],
        owner: owner
      }
    }
  };

  // Ensure deployments directory exists
  const deploymentsDir = join(process.cwd(), "deployments");
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = join(deploymentsDir, "ticket-push-testnet.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to", deploymentPath);
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Push Testnet Donut");
  console.log("Chain ID: 42101");
  console.log("Deployer:", deployerClient.account.address);
  console.log("Ticket Contract:", ticketAddress);
  console.log("Contract Owner:", owner);
  console.log("Transaction Hash:", ticketHash);
  
  return {
    address: ticketAddress,
    owner: owner,
    transactionHash: ticketHash,
    deploymentInfo
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
