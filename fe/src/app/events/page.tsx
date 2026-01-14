'use client';

import { useEffect, useState, useMemo } from 'react';
import EventCard from '@/components/EventCard';
import RegisterModal from '@/components/RegisterModal';
import { useBlockchainIntegration } from '@/hooks/useBlockchainIntegration';
import { Event } from '@/types/contract';
import { mockEvents } from '@/lib/mockData';
import { usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';
import { addToast } from '@/lib/toast';

// Events page is read-only for events listing and ticket purchase

// Start with empty events; events will be added after on-chain creation

// This is mock
const mockEvents: Event[] = [];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { connectionStatus } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();

  const userAddress = useMemo(() => {
    return pushChainClient?.universal?.account || '';
  }, [pushChainClient]);

  const isConnected = connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && !!userAddress;
  
  const { mintTicket, getEventDetails, getTotalOccassions, error: blockchainError } = useBlockchainIntegration();

  // Load existing events from chain on initial render
  const reloadEvents = async () => {
    const total = await getTotalOccassions();
    const loaded: Event[] = [];
    const imgMapRaw = typeof window !== 'undefined' ? localStorage.getItem('event_images') : null;
    const imgMap: Record<string, string> = imgMapRaw ? JSON.parse(imgMapRaw) : {};
    for (let i = 1; i <= total; i++) {
      const ev = await getEventDetails(i);
      if (ev) {
        const withImg = imgMap[String(ev.id)] ? { ...ev, imageUrl: imgMap[String(ev.id)] } : ev;
        loaded.push(withImg);
      }
    }
    setEvents(loaded);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await reloadEvents();
      } catch (e) {
        console.error('Failed to load events from chain', e);
      }
    };
    load();
  }, [reloadEvents]);

  const handleEventRegister = async (eventId: number) => {
    const total = await getTotalOccassions();
    if (eventId <= 0 || eventId > total) {
      alert('This event is not available on-chain yet. Please refresh or create a new event.');
      return;
    }
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  const handleSeatConfirm = async (seatNumber: number) => {
    if (!selectedEvent) return;
    setIsLoading(true);
    try {
      const priceInEth = (Number(selectedEvent.price) / 1e18).toString();
      const result = await mintTicket(selectedEvent.id, seatNumber, priceInEth);
      if (result.success) {
        const tokenPart = isNaN(result.tokenId) ? '' : ` Ticket #${result.tokenId}.`;
        const refreshed = await getEventDetails(selectedEvent.id);
        if (refreshed) {
          setEvents(prev => prev.map(ev => ev.id === refreshed.id ? refreshed : ev));
        }
        setTimeout(() => { reloadEvents(); }, 1500);
        setSelectedEvent(null);
        addToast({ type: 'success', title: 'Registration complete', message: `Ticket purchased successfully!${tokenPart}` });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      addToast({ type: 'error', title: 'Registration failed', message: `${blockchainError || 'Please try again.'}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeatCancel = () => setSelectedEvent(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section (Animated Green) */}
      <section className="animated-green">
        <div className="relative py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
              Secure Event Ticketing
              <br />
              <span className="text-green-700">On The Blockchain</span>
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-gray-700">
              Discover and secure your tickets with transparency and security
            </p>
            {!isConnected && (
              <div className="inline-block">
                <WalletConnect onConnect={handleWalletConnect} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Upcoming Events</h3>
            <p className="text-lg text-gray-600">
              Browse events and grab your seat
            </p>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No events available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRegister={handleEventRegister}
                  isConnected={isConnected}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose EventX?</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900">Secure & Transparent</h4>
              <p className="text-gray-800">All transactions are recorded on the blockchain for complete transparency</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900">Resale Market</h4>
              <p className="text-gray-800">Safely resell your tickets with price controls and authenticity guaranteed</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900">Instant Transfer</h4>
              <p className="text-gray-800">Immediate ticket ownership transfer with smart contract automation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Seat Selection Modal */}
      {selectedEvent && (
        <SeatSelection
          event={selectedEvent}
          onConfirm={handleSeatConfirm}
          onCancel={handleSeatCancel}
          isLoading={isLoading}
        />
      )}

    </div>
  );
}
