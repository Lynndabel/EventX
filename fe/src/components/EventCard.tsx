'use client';

import { Event } from '@/types/contract';
import Link from 'next/link';
import { formatPrice } from '@/lib/contract';

interface EventCardProps {
  event: Event;
  onRegister: (eventId: number) => void;
  isConnected: boolean;
}

export default function EventCard({ event, onRegister, isConnected }: EventCardProps) {
  // tickets represents AVAILABLE tickets from the contract
  const availableTickets = event.tickets;
  const soldTickets = event.maxTickets - availableTickets;
  const isSoldOut = availableTickets <= 0;
  const isExpired = (() => {
    if (!event.date || !event.time) return false;
    const dt = new Date(`${event.date}T${event.time}`);
    return !isNaN(dt.getTime()) && dt.getTime() <= Date.now();
  })();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Flyer Image */}
      {event.imageUrl && (
        <div className="w-full aspect-[16/9] bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={`${event.title} flyer`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          <Link href={`/event/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h3>
        {isExpired && (
          <div className="mb-2 inline-flex items-center text-xs font-medium px-2 py-1 rounded bg-gray-200 text-gray-700">
            Event Ended
          </div>
        )}
        
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{event.date} at {event.time}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-2xl font-bold text-brand">
              {formatPrice(event.price)} PUSH
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Available</div>
            <div className={`font-semibold ${isSoldOut ? 'text-red-500' : 'text-green-600'}`}>
              {availableTickets} / {event.maxTickets}
            </div>
          </div>
        </div>

        <button
          onClick={() => onRegister(event.id)}
          disabled={!isConnected || isSoldOut || isExpired}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            !isConnected
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isSoldOut
              ? 'bg-red-100 text-red-500 cursor-not-allowed'
              : isExpired
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'btn-brand'
          }`}
        >
          {!isConnected
            ? 'Connect Wallet to Register'
            : isSoldOut
            ? 'Sold Out'
            : isExpired
            ? 'Event Ended'
            : 'Register for Event'
          }
        </button>
      </div>
    </div>
  );
}
