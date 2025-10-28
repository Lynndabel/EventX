import type { HardhatUserConfig } from "hardhat/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, ".env") });

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "paris",
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    pushTestnetDonut: {
      type: "http",
      chainType: "l1",
      // Push Testnet Donut RPC
      url: (process.env.PUSH_TESTNET_RPC as string) || "https://evm.rpc-testnet-donut-node1.push.org",
      chainId: 42101,
      accounts: ((process.env.PRIVATE_KEY || "").startsWith("0x")
        ? process.env.PRIVATE_KEY
        : process.env.PRIVATE_KEY
        ? `0x${process.env.PRIVATE_KEY}`
        : "")
        ? [
            ((process.env.PRIVATE_KEY || "").startsWith("0x")
              ? process.env.PRIVATE_KEY!
              : `0x${process.env.PRIVATE_KEY}`) as string,
          ]
        : [],
      // Let the provider suggest gas price; override if needed
    },
  },
};

export default config;
