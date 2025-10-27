import { network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
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

  // Get contract artifacts
  const hre = require("hardhat");
  const ticketArtifact = await hre.artifacts.readArtifact("Ticket");

  // Deploy Ticket contract
  console.log("Deploying Ticket contract...");
  const ticketHash = await deployerClient.deployContract({
    abi: ticketArtifact.abi,
    bytecode: ticketArtifact.bytecode,
    account: deployerClient.account,
    args: ["EventX Tickets", "EVTX"], // Constructor arguments: _name, _symbol
  });
  
  const ticketReceipt = await publicClient.waitForTransactionReceipt({
    hash: ticketHash,
  });
  const ticketAddress = ticketReceipt.contractAddress;
  console.log("✅ Ticket contract deployed to:", ticketAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "push-testnet-donut",
    chainId: 42101,
    deployer: deployerClient.account.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      Ticket: {
        address: ticketAddress,
        name: "EventX Tickets", 
        symbol: "EVTX",
        transactionHash: ticketHash
      }
    }
  };

  // Ensure deployments directory exists
  const deploymentsDir = join(process.cwd(), "deployments");
  try {
    mkdirSync(deploymentsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const deploymentPath = join(deploymentsDir, "ticket-multi-organizer-push.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to", deploymentPath);
  
  console.log("\n=== Deployment Summary ===");
  console.log("Network: Push Testnet Donut");
  console.log("Chain ID: 42101");
  console.log("Deployer:", deployerClient.account.address);
  console.log("Ticket Contract:", ticketAddress);
  console.log("Name: EventX Tickets");
  console.log("Symbol: EVTX");
  console.log("Transaction Hash:", ticketHash);
  
  console.log("\n🔧 Next Steps:");
  console.log("1. Update your frontend with the new contract address:", ticketAddress);
  console.log("2. Update the contract ABI");
  console.log("3. Test the multi-organizer functionality");
  console.log("4. Use the approveOrganizer function to add organizers");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

