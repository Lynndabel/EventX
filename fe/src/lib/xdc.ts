// src/lib/xdc.ts
// Repointed to Push Testnet Donut using ethers JsonRpcProvider
import { JsonRpcProvider } from 'ethers';

export type XdcConnectionInfo = {
  rpcUrl: string;
  chainId: number;
  network: 'push-testnet';
};

export function getXdcConnection(): XdcConnectionInfo {
  const envUrl = (process.env.NEXT_PUBLIC_RPC_URL || process.env.PUSH_TESTNET_RPC || '').trim();
  const chainIdEnv = (process.env.NEXT_PUBLIC_CHAIN_ID || '').trim();

  const defaultUrl = 'https://evm.rpc-testnet-donut-node1.push.org';
  const rpcUrl = envUrl && envUrl.length > 0 ? envUrl : defaultUrl;

  const chainId = chainIdEnv ? Number(chainIdEnv) : 42101;
  const network = 'push-testnet' as const;

  return { rpcUrl, chainId, network };
}

export function getXdcWeb3() {
  const { rpcUrl } = getXdcConnection();
  const provider = new JsonRpcProvider(rpcUrl);
  return provider;
}

export async function getCurrentBlockNumber(): Promise<number> {
  const provider = getXdcWeb3();
  const blockNumber = await provider.getBlockNumber();
  return Number(blockNumber);
}
