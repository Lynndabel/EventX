import { NextRequest } from 'next/server';
import { ethers } from 'ethers';
import { TICKET_CONTRACT_ABI } from '@/lib/contract-abi';
import { CONTRACT_CONFIG } from '@/lib/contract';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventId: number = Number(body?.eventId);
    const seatNumber: number = Number(body?.seatNumber);
    const priceWeiStr: string = String(body?.priceWei ?? '0');

    if (!Number.isFinite(eventId) || !Number.isFinite(seatNumber)) {
      return new Response(JSON.stringify({ error: 'Invalid eventId or seatNumber' }), { status: 400 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://evm.rpc-testnet-donut-node1.push.org';
    const privateKey = process.env.EVM_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_CONFIG.address;

    if (!privateKey) {
      return new Response(JSON.stringify({ error: 'Server not configured for settlement' }), { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, TICKET_CONTRACT_ABI, wallet);

    const value = BigInt(priceWeiStr);
    const tx = await contract.mint(eventId, seatNumber, { value });
    const receipt = await tx.wait();

    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    let mintedTokenId: number | null = null;
    for (const log of receipt.logs) {
      if (log.topics && log.topics.length > 0 && log.topics[0] === transferTopic) {
        const tokenIdHex = log.topics[3];
        if (tokenIdHex) {
          mintedTokenId = Number(BigInt(tokenIdHex));
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({ hash: tx.hash, tokenId: mintedTokenId }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Settlement failed' }), { status: 500 });
  }
}
