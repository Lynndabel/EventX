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
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const { connectionStatus } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();

  const userAddress = useMemo(() => {
    return pushChainClient?.universal?.account || '';
  }, [pushChainClient]);

  const isConnected = connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && !!userAddress;

  const { createEvent, getEventDetails, getTotalOccassions, error: blockchainError } = useBlockchainIntegration();

  const reloadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
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
    } catch (e) {
      console.error('Failed to load events for organizer', e);
      addToast({ 
        type: 'error', 
        title: 'Loading failed', 
        message: 'Unable to load events. Please refresh the page.' 
      });
    } finally {
      setIsLoadingEvents(false);
    }
  }, [getTotalOccassions, getEventDetails]);

  useEffect(() => {
    reloadEvents();
  }, [reloadEvents]);

  const organizerEvents = isConnected && userAddress
    ? events.filter(event => event.organizer?.toLowerCase() === userAddress.toLowerCase())
    : [];

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
            } catch (error) {
              console.error('Failed to save image URL', error);
            }
          }
        }
        
        setTimeout(() => { 
          reloadEvents(); 
        }, 1500);
        
        setShowCreateModal(false);
        addToast({ 
          type: 'success', 
          title: 'Event created', 
          message: 'Your event has been created successfully.' 
        });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      addToast({ 
        type: 'error', 
        title: 'Create failed', 
        message: blockchainError || 'Failed to create event. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Organizer Dashboard
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Create and manage your events
            </p>
          </div>

          {/* Not Connected State */}
          {!isConnected ? (
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-4">🎭</div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Connect your wallet to create and manage events as an organizer
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Use the connect button in the header to get started
              </p>
            </div>
          ) : (
            /* Loading State */
            isLoadingEvents ? (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                <div className="inline-block animate-spin h-10 w-10 border-4 border-brand/30 border-t-brand rounded-full mb-4" />
                <p className="text-sm sm:text-base text-gray-700 font-medium">
                  Loading your events...
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Please wait while we fetch your data
                </p>
              </div>
            ) : (
              /* Dashboard Content */
              <OrganizerDashboard
                userAddress={userAddress}
                isApprovedOrganizer={true}
                organizerEvents={organizerEvents}
                onCreateEvent={() => {
                  if (!isConnected) {
                    addToast({ 
                      type: 'error', 
                      title: 'Connect wallet', 
                      message: 'Please connect your wallet before creating an event.' 
                    });
                    return;
                  }
                  setShowCreateModal(true);
                }}
              />
            )
          )}

          {/* Stats Summary - Only show when connected and loaded */}
          {isConnected && !isLoadingEvents && organizerEvents.length > 0 && (
            <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Events</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                  {organizerEvents.length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Active</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mt-1">
                  {organizerEvents.filter(e => !e.canceled && !e.occurred).length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mt-1">
                  {organizerEvents.filter(e => e.occurred).length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Canceled</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 mt-1">
                  {organizerEvents.filter(e => e.canceled).length}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Create Event Modal */}
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
