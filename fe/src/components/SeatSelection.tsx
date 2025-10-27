'use client';

import React, { useState, useEffect } from 'react';
import { Event } from '@/types/contract';
import { useSeatTracking } from '@/hooks/useSeatTracking';
import { formatPrice } from '@/lib/contract';

interface SeatSelectionProps {
  event: Event;
  onConfirm: (seatNumber: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function SeatSelection({ event, onConfirm, onCancel, isLoading }: SeatSelectionProps) {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const { seatStatuses, reserveSeat, releaseSeat, getTotalAvailable } = useSeatTracking(event);

  const handleSeatClick = async (seatNumber: number) => {
    if (selectedSeat !== null) {
      releaseSeat(selectedSeat);
    }

    const seat = seatStatuses[seatNumber];
    if (!seat || !seat.isAvailable || seat.isReserved) {
      return;
    }

    const reserved = await reserveSeat(seatNumber, 'current-user'); // TODO: Use actual user address
    if (reserved) {
      setSelectedSeat(seatNumber);
    }
  };

  useEffect(() => {
    return () => {
      if (selectedSeat !== null) {
        releaseSeat(selectedSeat);
      }
    };
  }, [selectedSeat, releaseSeat]);

  const handleConfirm = () => {
    if (selectedSeat !== null) {
      onConfirm(selectedSeat);
    }
  };

  // Generate seat grid using real-time seat tracking
  const generateSeats = () => {
    const seats = [];
    const rows = Math.ceil(event.maxTickets / 10);
    
    for (let row = 0; row < rows; row++) {
      const rowSeats = [];
      for (let seat = 0; seat < 10 && (row * 10 + seat) < event.maxTickets; seat++) {
        const seatNumber = row * 10 + seat;
        const seatStatus = seatStatuses[seatNumber];
        const isSelected = selectedSeat === seatNumber;
        const isOccupied = seatStatus && !seatStatus.isAvailable;
        const isReserved = seatStatus && seatStatus.isReserved && !isSelected;
        
        rowSeats.push(
          <button
            key={seatNumber}
            onClick={() => handleSeatClick(seatNumber)}
            disabled={isOccupied || isReserved || isLoading}
            className={`
              w-8 h-8 m-1 rounded text-xs font-medium transition-colors
              ${isOccupied 
                ? 'bg-red-500 text-white cursor-not-allowed' 
                : isReserved
                ? 'bg-yellow-500 text-white cursor-not-allowed'
                : isSelected
                ? 'bg--600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }
            `}
          >
            {seatNumber + 1}
          </button>
        );
      }
      
      seats.push(
        <div key={row} className="flex justify-center">
          {rowSeats}
        </div>
      );
    }
    
    return seats;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Select Your Seat</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
            <p className="text-gray-600">{event.date} at {event.time}</p>
            <p className="text-gray-600">{event.location}</p>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xl font-bold text-green-600">
                Price: {formatPrice(event.price)} PUSH
              </p>
              <p className="text-sm text-green-600 font-medium">
                {getTotalAvailable()} seats available
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-center mb-4">
              <div className="inline-block bg-gray-800 text-white px-8 py-2 rounded">
                STAGE
              </div>
            </div>
            
            <div className="space-y-2">
              {generateSeats()}
            </div>

            <div className="flex justify-center items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Taken</span>
              </div>
            </div>
          </div>

          {selectedSeat !== null && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-green-800">
                Selected Seat: <strong>#{selectedSeat + 1}</strong>
              </p>
              <p className="text-green-600 text-sm">
                Total: {formatPrice(event.price)} PUSH
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedSeat === null || isLoading}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Confirm Purchase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
