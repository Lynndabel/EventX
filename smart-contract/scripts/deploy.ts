import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, "../.env") });
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { ethers } from "ethers";

async function main() {
  console.log("Deploying Ticket contract to Push Testnet Donut...");

  const rpcUrl = process.env.PUSH_TESTNET_RPC || "https://evm.rpc-testnet-donut-node1.push.org";
  const pkRaw = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "";
  const privateKey = pkRaw.startsWith("0x") ? pkRaw : "0x" + pkRaw;
  if (!privateKey || privateKey === "0x") {
    throw new Error("❌ PRIVATE_KEY is missing in environment. Set PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) in smart-contract/.env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 42101, name: "push-testnet-donut" });
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying contracts with the account:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance:", ethers.formatEther(balance), "PUSH");

  if (balance === 0n) {
    throw new Error("❌ Insufficient balance for deployment. Please fund your account.");
  }

  // Deploy Ticket contract
  console.log("Deploying Ticket contract...");
  
  // Get the contract artifact
  const hre = await import("hardhat");
  const ticketArtifact = await hre.artifacts.readArtifact("Ticket");
  
  const factory = new ethers.ContractFactory(ticketArtifact.abi, ticketArtifact.bytecode, wallet);
  const contract = await factory.deploy("EventX Tickets", "EVTX");
  await contract.waitForDeployment();
  
  const ticketAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const ticketHash = deployTx?.hash || "";
  
  console.log("Ticket contract deployed to:", ticketAddress);

  // Verify contract ownership
  const owner = await contract.owner();
  console.log("Contract owner:", owner);

  // Save deployment info
  const deploymentInfo = {
    network: "push-testnet-donut",
    chainId: 42101,
    deployer: wallet.address,
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
  console.log("Deployer:", wallet.address);
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
