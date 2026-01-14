'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useBlockchainIntegration } from '@/hooks/useBlockchainIntegration';
import { Event } from '@/types/contract';
import WalletConnect from '@/components/WalletConnect';
import { addToast } from '@/lib/toast';

function VerifyClient() {
  const search = useSearchParams();
  const tokenIdParam = search.get('tokenId');
  const eventIdParam = search.get('eventId');
  const tokenId = useMemo(() => (tokenIdParam ? Number(tokenIdParam) : NaN), [tokenIdParam]);
  const eventId = useMemo(() => (eventIdParam ? Number(eventIdParam) : NaN), [eventIdParam]);

  const { getTicketDetailsById, getOwnerOf, getEventDetails, isCheckedIn, checkIn, checkOrganizerStatus } = useBlockchainIntegration();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [message, setMessage] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [approvedOrganizer, setApprovedOrganizer] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      if (!tokenId || !eventId || Number.isNaN(tokenId) || Number.isNaN(eventId)) {
        setStatus('invalid');
        setMessage('Missing or invalid tokenId/eventId in the URL.');
        setLoading(false);
        return;
      }
      try {
        const details = await getTicketDetailsById(tokenId);
        if (!details) {
          setStatus('invalid');
          setMessage('Ticket not found on-chain.');
          setLoading(false);
          return;
        }
        if (Number(details.occasionId) !== Number(eventId)) {
          setStatus('invalid');
          setMessage(`Ticket does not belong to event ${eventId}.`);
          setSeatNumber(details.seatNumber);
          setLoading(false);
          return;
        }

        const currentOwner = await getOwnerOf(tokenId);
        const ev = await getEventDetails(eventId);
        const chk = await isCheckedIn(tokenId);

        setOwner(currentOwner);
        setSeatNumber(details.seatNumber);
        setEvent(ev);
        setChecked(chk);
        setStatus('valid');
        setMessage('This ticket is valid.');
      } catch (e) {
        console.error('Verification failed', e);
        setStatus('invalid');
        setMessage('Verification error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tokenId, eventId, getTicketDetailsById, getOwnerOf, getEventDetails, isCheckedIn]);

  const handleConnect = async (address: string) => {
    try {
      const ok = await checkOrganizerStatus(address);
      setApprovedOrganizer(ok);
    } catch {
      setApprovedOrganizer(false);
    }
  };

  const doCheckIn = async () => {
    if (!tokenId || Number.isNaN(tokenId)) return;
    const ok = await checkIn(tokenId);
    if (ok) {
      addToast({ type: 'success', title: 'Checked In', message: `Token #${tokenId} checked in.` });
      // refresh status
      const chk = await isCheckedIn(tokenId);
      setChecked(chk);
    } else {
      addToast({ type: 'error', title: 'Check-In failed', message: 'Unable to check in. Ensure you are an approved organizer.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Image src="/logo.png" alt="EventX" width={80} height={80} className="h-20 w-20 object-contain" />
              </Link>
              <span className="ml-2 text-sm text-gray-500">Verify Ticket</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-gray-500 hover:link-brand">Events</Link>
              <Link href="/my-tickets" className="text-gray-500 hover:link-brand">My Tickets</Link>
              <WalletConnect onConnect={handleConnect} />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Ticket Verification</h1>
            <p className="text-gray-600 text-sm mt-1">Token #{Number.isNaN(tokenId) ? '-' : tokenId} • Event #{Number.isNaN(eventId) ? '-' : eventId}</p>
          </div>

          {loading ? (
            <p className="text-gray-500">Verifying on-chain...</p>
          ) : (
            <>
              <div className={`rounded-lg p-4 mb-6 ${status === 'valid' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-semibold ${status === 'valid' ? 'text-green-800' : 'text-red-800'}`}>{message}</p>
              </div>

              {status === 'valid' && (
                <div className="space-y-4">
                  {event && (
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Event</p>
                      <p className="text-lg font-semibold text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">{event.date} at {event.time}</p>
                      <p className="text-sm text-gray-600">{event.location}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Seat</p>
                      <p className="text-lg font-semibold text-gray-900">{seatNumber !== null ? `#${seatNumber + 1}` : '-'}</p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm text-gray-500">Owner</p>
                      <p className="text-lg font-mono text-gray-900">{owner ? `${owner.slice(0,6)}...${owner.slice(-4)}` : '-'}</p>
                    </div>
                  </div>

                  {/* Check-in status & action (organizers only) */}
                  <div className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Check-in Status</p>
                      {checked ? (
                        <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Checked In</span>
                      ) : (
                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Not Checked In</span>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={doCheckIn}
                        disabled={!approvedOrganizer || checked}
                        className={`px-4 py-2 rounded ${(!approvedOrganizer || checked) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'btn-brand'}`}
                      >
                        {checked ? 'Already Checked In' : (approvedOrganizer ? 'Check In' : 'Organizer Only')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {status === 'invalid' && (
                <div className="text-sm text-gray-600">
                  <p>Ensure the QR was generated for the correct event and the tokenId is valid.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Loading…</div>}>
      <VerifyClient />
    </Suspense>
  );
}
