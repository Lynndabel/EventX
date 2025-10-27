import { TICKET_CONTRACT_ABI } from './contract-abi';
import { Event, TicketInfo } from '@/types/contract';

// Contract configuration - update with your deployed contract address
export const CONTRACT_CONFIG = {
  // Note: `useBlockchainIntegration` can read NEXT_PUBLIC_CONTRACT_ADDRESS at runtime.
  // This fallback is used by utilities/components that import CONTRACT_CONFIG directly.
  address: '0x6937de2Cd1Ad91C4EB7e86AC22ad92c5B89d678B',
  chainId: 42101, // Push Testnet Donut
};

// Default public RPC URL for Push Testnet Donut (can be overridden via NEXT_PUBLIC_RPC_URL)
export const DEFAULT_RPC_URL = 'https://evm.rpc-testnet-donut-node1.push.org';

// Utility functions for contract interactions
export const formatEventFromContract = (eventData: any[]): Event => {
  return {
    id: Number(eventData[0]),
    title: eventData[1],
    price: eventData[2],
    tickets: Number(eventData[3]),
    maxTickets: Number(eventData[4]),
    date: eventData[5],
    time: eventData[6],
    location: eventData[7],
    maxResalePrice: eventData[8],
    organizer: eventData[9],
    eventTimestamp: Number(eventData[10]),
    canceled: Boolean(eventData[11]),
    occurred: Boolean(eventData[12]),
    escrowBalance: eventData[13] as bigint,
  };
};

export const formatTicketFromContract = (ticketData: any[]): TicketInfo => {
  return {
    occasionId: Number(ticketData[0]),
    seatNumber: Number(ticketData[1]),
    isForSale: ticketData[2],
    resalePrice: ticketData[3],
    originalOwner: ticketData[4],
  };
};

export const formatPrice = (price: bigint): string => {
  return (Number(price) / 1e18).toFixed(4);
};

export const parsePrice = (price: string): bigint => {
  return BigInt(Math.floor(parseFloat(price) * 1e18));
};

export { TICKET_CONTRACT_ABI };
