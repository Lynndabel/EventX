import { useState, useCallback } from 'react';
import { PushUI, usePushWalletContext } from '@pushchain/ui-kit';
import { ethers } from 'ethers';
import { TICKET_CONTRACT_ABI } from '@/lib/contract-abi';
import { CONTRACT_CONFIG, DEFAULT_RPC_URL, formatEventFromContract } from '@/lib/contract';
import { Event } from '@/types/contract';

interface UseBlockchainIntegrationReturn {
  createEvent: (eventData: any, organizerFee: string) => Promise<boolean>;
  mintTicket: (eventId: number, seatNumber: number, price: string) => Promise<{ success: true; tokenId: number } | { success: false }>;
  checkOrganizerStatus: (address: string) => Promise<boolean>;
  getEventDetails: (eventId: number) => Promise<Event | null>;
  getTotalOccassions: () => Promise<number>;
  getTotalSupply: () => Promise<number>;
  getRegistrationsForEvent: (eventId: number) => Promise<Array<{ tokenId: number; owner: string; seatNumber: number }>>;
  getTicketsByOwner: (owner: string) => Promise<Array<{ tokenId: number; occasionId: number; seatNumber: number }>>;
  getOwnerOf: (tokenId: number) => Promise<string>;
  getTicketDetailsById: (tokenId: number) => Promise<{ occasionId: number; seatNumber: number; isForSale: boolean; resalePrice: bigint; originalOwner: string } | null>;
  getTokenURI: (tokenId: number) => Promise<string>;
  isCheckedIn: (tokenId: number) => Promise<boolean>;
  checkIn: (tokenId: number) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  cancelEvent: (eventId: number) => Promise<boolean>;
  markEventOccurred: (eventId: number) => Promise<boolean>;
  withdrawOrganizer: (eventId: number) => Promise<boolean>;
  refundAttendee: (tokenId: number) => Promise<boolean>;
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_CONFIG.address;
const ORGANIZER_FEE = '1000000000000000'; // 0.001 ETH in wei

export const useBlockchainIntegration = (): UseBlockchainIntegrationReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access wallet connection status from Push UI Kit (optional signal)
  const { connectionStatus } = usePushWalletContext();

  // Attempt to switch/add to Push Testnet (42101) if not already on it
  const ensurePushChain = useCallback(async () => {
    const expectedChainId = CONTRACT_CONFIG.chainId; // 42101
    const hexChainId = '0x' + expectedChainId.toString(16);

    if (!window.ethereum) {
      throw new Error('No EVM wallet provider found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const current = await provider.getNetwork();
    if (Number(current.chainId) === expectedChainId) return;

    try {
      await window.ethereum.request?.({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
      return;
    } catch (switchErr: any) {
      // If the chain is not added to the wallet, try to add it
      if (switchErr?.code === 4902) {
        try {
          await window.ethereum.request?.({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: hexChainId,
              chainName: 'Push Testnet Donut',
              nativeCurrency: { name: 'PUSH', symbol: 'PUSH', decimals: 18 },
              rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_RPC_URL],
              blockExplorerUrls: ['https://donut.push.network'],
            }],
          });
          return;
        } catch (addErr) {
          throw new Error('Please add/switch to Push Testnet Donut (42101) in your wallet');
        }
      }
      throw new Error('Please switch to Push Testnet Donut (42101) in your wallet');
    }
  }, []);

  // Signer-based contract (requires wallet) for write operations
  const getContract = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No EVM wallet provider found');
    }

    // Enforce/switch to Push chain before any write
    await ensurePushChain();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, TICKET_CONTRACT_ABI, signer);
  }, [ensurePushChain]);

  // Read-only contract via public RPC so UI works without wallet connection
  const getReadContract = useCallback(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || DEFAULT_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(CONTRACT_ADDRESS, TICKET_CONTRACT_ABI, provider);
  }, []);

  const createEvent = useCallback(async (eventData: any, organizerFee: string = ORGANIZER_FEE): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = await getContract();
      
      // Convert price to wei if it's a paid event
      const priceInWei = eventData.eventType === 'paid' 
        ? ethers.parseEther(eventData.price || '0')
        : BigInt(0);

      const maxResalePriceInWei = eventData.maxResalePrice 
        ? ethers.parseEther(eventData.maxResalePrice)
        : priceInWei;

      // Compute event timestamp (seconds since epoch) from date+time
      const eventTimestamp = Math.floor(new Date(`${eventData.date}T${eventData.time}`).getTime() / 1000);

      const tx = await contract.list(
        eventData.title,
        priceInWei,
        parseInt(eventData.maxTickets),
        eventData.date,
        eventData.time,
        eventData.location,
        maxResalePriceInWei,
        eventTimestamp,
        {
          value: BigInt(organizerFee)
        }
      );

      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  const getTotalOccassions = useCallback(async (): Promise<number> => {
    try {
      const contract = getReadContract();
      const total = await contract.totalOccassions();
      return Number(total);
    } catch (err: any) {
      console.error('Error fetching total occasions:', err);
      return 0;
    }
  }, [getReadContract]);

  const isCheckedIn = useCallback(async (tokenId: number): Promise<boolean> => {
    try {
      const contract = getReadContract();
      const v: boolean = await contract.isCheckedIn(tokenId);
      return Boolean(v);
    } catch (err: any) {
      console.error('Error reading isCheckedIn:', err);
      return false;
    }
  }, [getReadContract]);

  const checkIn = useCallback(async (tokenId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getContract();
      const tx = await contract.checkIn(tokenId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error calling checkIn:', err);
      setError(err.message || 'Failed to check in');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  const getTokenURI = useCallback(async (tokenId: number): Promise<string> => {
    try {
      const contract = getReadContract();
      const uri: string = await contract.tokenURI(tokenId);
      return uri;
    } catch (err: any) {
      console.error('Error reading tokenURI:', err);
      throw err;
    }
  }, [getReadContract]);

  // Organizer: cancel event
  const cancelEvent = useCallback(async (eventId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getContract();
      const tx = await contract.cancelEvent(eventId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error canceling event:', err);
      setError(err.message || 'Failed to cancel event');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  // Organizer: mark occurred
  const markEventOccurred = useCallback(async (eventId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getContract();
      const tx = await contract.markEventOccurred(eventId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error marking occurred:', err);
      setError(err.message || 'Failed to mark occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  // Organizer: withdraw proceeds
  const withdrawOrganizer = useCallback(async (eventId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getContract();
      const tx = await contract.withdrawOrganizer(eventId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error withdrawing organizer funds:', err);
      setError(err.message || 'Failed to withdraw proceeds');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  // Attendee: refund
  const refundAttendee = useCallback(async (tokenId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const contract = await getContract();
      const tx = await contract.refundAttendee(tokenId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error refunding attendee:', err);
      setError(err.message || 'Failed to refund');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  const getTicketDetailsById = useCallback(async (
    tokenId: number
  ): Promise<{ occasionId: number; seatNumber: number; isForSale: boolean; resalePrice: bigint; originalOwner: string } | null> => {
    try {
      const contract = getReadContract();
      const details = await contract.getTicketDetails(tokenId);
      return {
        occasionId: Number(details.occasionId),
        seatNumber: Number(details.seatNumber),
        isForSale: Boolean(details.isForSale),
        resalePrice: details.resalePrice as bigint,
        originalOwner: details.originalOwner as string,
      };
    } catch (err: any) {
      console.error('Error fetching ticket details by id:', err);
      return null;
    }
  }, [getReadContract]);

  const getOwnerOf = useCallback(async (tokenId: number): Promise<string> => {
    try {
      const contract = getReadContract();
      const owner = await contract.ownerOf(tokenId);
      return owner as string;
    } catch (err: any) {
      console.error('Error fetching ownerOf:', err);
      return "";
    }
  }, [getReadContract]);

  const getTicketsByOwner = useCallback(async (owner: string): Promise<Array<{ tokenId: number; occasionId: number; seatNumber: number }>> => {
    try {
      const contract = getReadContract();
      const total = await contract.totalSupply();
      const mine: Array<{ tokenId: number; occasionId: number; seatNumber: number }> = [];
      for (let tokenId = 1; tokenId <= Number(total); tokenId++) {
        const currentOwner = await contract.ownerOf(tokenId);
        if (currentOwner.toLowerCase() === owner.toLowerCase()) {
          const details = await contract.getTicketDetails(tokenId);
          mine.push({ tokenId, occasionId: Number(details.occasionId), seatNumber: Number(details.seatNumber) });
        }
      }
      return mine;
    } catch (err: any) {
      console.error('Error fetching tickets by owner:', err);
      return [];
    }
  }, [getReadContract]);

  const getTotalSupply = useCallback(async (): Promise<number> => {
    try {
      const contract = getReadContract();
      const total = await contract.totalSupply();
      return Number(total);
    } catch (err: any) {
      console.error('Error fetching total supply:', err);
      return 0;
    }
  }, [getReadContract]);

  const getRegistrationsForEvent = useCallback(async (eventId: number): Promise<Array<{ tokenId: number; owner: string; seatNumber: number }>> => {
    try {
      const contract = getReadContract();
      const total = await contract.totalSupply();
      const regs: Array<{ tokenId: number; owner: string; seatNumber: number }> = [];
      for (let tokenId = 1; tokenId <= Number(total); tokenId++) {
        const details = await contract.getTicketDetails(tokenId);
        if (Number(details.occasionId) === eventId) {
          const owner = await contract.ownerOf(tokenId);
          regs.push({ tokenId, owner, seatNumber: Number(details.seatNumber) });
        }
      }
      return regs;
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      return [];
    }
  }, [getReadContract]);

  const mintTicket = useCallback(async (eventId: number, seatNumber: number, price: string): Promise<{ success: true; tokenId: number } | { success: false }> => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = await getContract();
      const priceInWei = ethers.parseEther(price);

      const tx = await contract.mint(eventId, seatNumber, {
        value: priceInWei
      });

      const receipt = await tx.wait();
      // Parse ERC721 Transfer event to extract tokenId
      const transferTopic = ethers.id("Transfer(address,address,uint256)");
      let mintedTokenId: number | null = null;
      for (const log of receipt.logs) {
        if (log.topics && log.topics.length > 0 && log.topics[0] === transferTopic) {
          // tokenId is the 3rd indexed topic
          const tokenIdHex = log.topics[3];
          if (tokenIdHex) {
            mintedTokenId = Number(BigInt(tokenIdHex));
            break;
          }
        }
      }

      if (mintedTokenId !== null) {
        return { success: true, tokenId: mintedTokenId };
      }
      // Fallback if parsing failed
      return { success: true, tokenId: NaN };
    } catch (err: any) {
      console.error('Error minting ticket:', err);
      // Attempt cross-chain server settlement if wallet can't switch/add chain or write is blocked
      try {
        const res = await fetch('/api/settle/mint', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            eventId,
            seatNumber,
            priceWei: ethers.parseEther(price).toString(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const tokenId = Number(data?.tokenId);
          return { success: true, tokenId: Number.isFinite(tokenId) ? tokenId : NaN };
        }
        const e = await res.json().catch(() => ({}));
        setError(e?.error || 'Server settlement failed');
        return { success: false };
      } catch (serverErr: any) {
        console.error('Server settlement error:', serverErr);
        setError(err.message || 'Failed to purchase ticket');
        return { success: false };
      }
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  const checkOrganizerStatus = useCallback(async (address: string): Promise<boolean> => {
    try {
      const contract = getReadContract();
      const ok: boolean = await contract.isApprovedOrganizer(address);
      return Boolean(ok);
    } catch (err: any) {
      console.error('Error checking organizer status:', err);
      return false;
    }
  }, [getReadContract]);

  const getEventDetails = useCallback(async (eventId: number): Promise<Event | null> => {
    try {
      const contract = getReadContract();
      const eventDetails = await contract.getEventDetails(eventId);
      const event = formatEventFromContract(eventDetails as any[]);
      
      // Debug logging
      console.log('getEventDetails Debug:', {
        eventId,
        rawTickets: eventDetails.tickets,
        rawMaxTickets: eventDetails.maxTickets,
        parsedTickets: event.tickets,
        parsedMaxTickets: event.maxTickets,
        available: event.maxTickets - event.tickets
      });
      
      return event;
    } catch (err: any) {
      console.error('Error fetching event details:', err);
      return null;
    }
  }, [getContract]);

  return {
    createEvent,
    mintTicket,
    checkOrganizerStatus,
    getEventDetails,
    getTotalOccassions,
    getTotalSupply,
    getRegistrationsForEvent,
    getTicketsByOwner,
    getOwnerOf,
    getTicketDetailsById,
    getTokenURI,
    isCheckedIn,
    checkIn,
    cancelEvent,
    markEventOccurred,
    withdrawOrganizer,
    refundAttendee,
    isLoading,
    error
  };
};
