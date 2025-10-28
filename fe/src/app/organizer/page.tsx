'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import OrganizerDashboard from '@/components/OrganizerDashboard';
import CreateEventModal from '@/components/CreateEventModal';
import { useBlockchainIntegration } from '@/hooks/useBlockchainIntegration';
import { Event } from '@/types/contract';
import { addToast } from '@/lib/toast';
import { usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';

interface CreateEventData {
  title: string;
  price: string;
  maxTickets: string;
  date: string;
  time: string;
  location: string;
  maxResalePrice: string;
}

export default function OrganizerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { connectionStatus } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();

  const userAddress = useMemo(() => {
    return pushChainClient?.universal?.account || '';
  }, [pushChainClient]);

  const isConnected = connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && !!userAddress;

  const { createEvent, getEventDetails, getTotalOccassions, error: blockchainError } = useBlockchainIntegration();

  const reloadEvents = useCallback(async () => {
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
  }, [getTotalOccassions, getEventDetails]);

  useEffect(() => {
    const load = async () => {
      try {
        await reloadEvents();
      } catch (e) {
        console.error('Failed to load events for organizer', e);
      }
    };
    load();
  }, [reloadEvents]);

  // reloadEvents defined above with useCallback

  const organizerEvents = isConnected && userAddress
    ? events.filter(event => event.organizer?.toLowerCase() === userAddress.toLowerCase())
    : [];

  // Detect connection via window.ethereum (no button here; header handles connect UI)

  const handleCreateEventSubmit = async (eventData: CreateEventData) => {
    setIsLoading(true);
    try {
      const success = await createEvent(eventData);
      if (success) {
        const total = await getTotalOccassions();
        const onchain = await getEventDetails(total);
        if (onchain) {
          if ((eventData as any).imageUrl) {
            try {
              const imgMapRaw = localStorage.getItem('event_images');
              const imgMap = imgMapRaw ? JSON.parse(imgMapRaw) : {};
              imgMap[String(total)] = (eventData as any).imageUrl;
              localStorage.setItem('event_images', JSON.stringify(imgMap));
            } catch {}
          }
        }
        setTimeout(() => { reloadEvents(); }, 1500);
        setShowCreateModal(false);
        addToast({ type: 'success', title: 'Event created', message: 'Event created successfully.' });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      addToast({ type: 'error', title: 'Create failed', message: `${blockchainError || 'Please try again.'}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <OrganizerDashboard
            userAddress={userAddress}
            isApprovedOrganizer={true}
            organizerEvents={organizerEvents}
            onCreateEvent={() => {
              if (!isConnected) {
                addToast({ type: 'error', title: 'Connect wallet', message: 'Please connect your wallet before creating an event.' });
                return;
              }
              setShowCreateModal(true);
            }}
          />
        </div>
      </section>

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreateEvent={handleCreateEventSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
