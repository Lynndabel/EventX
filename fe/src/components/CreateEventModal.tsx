'use client';

import React from 'react';
import { useState } from 'react';
import { uploadToIPFS } from '@/lib/ipfs';
import { addToast } from '@/lib/toast';

interface CreateEventModalProps {
  onClose: () => void;
  onCreateEvent: (eventData: EventFormData) => void;
  isLoading?: boolean;
}

interface EventFormData {
  title: string;
  eventType: string;
  price: string;
  maxTickets: string;
  date: string;
  time: string;
  location: string;
  maxResalePrice: string;
  imageUrl?: string;
}

export default function CreateEventModal({ onClose, onCreateEvent, isLoading }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    eventType: 'free', 
    price: '',
    maxTickets: '',
    date: '',
    time: '',
    location: '',
    maxResalePrice: '',
    imageUrl: ''
  });

  const [errors, setErrors] = useState<Partial<EventFormData>>({});
  const [uploading, setUploading] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (parseInt(formData.maxTickets) < 1) newErrors.maxTickets = 'Must have at least 1 ticket';
    
    const price = parseFloat(formData.price);
    const maxResalePrice = parseFloat(formData.maxResalePrice);
    
    if (price < 0) newErrors.price = 'Price cannot be negative';
    if (maxResalePrice < 0) newErrors.maxResalePrice = 'Max resale price cannot be negative';
    if (price > 0 && maxResalePrice < price) {
      newErrors.maxResalePrice = 'Max resale price should be >= ticket price';
    }

    // Validate event is in the future
    if (formData.date && formData.time) {
      const eventDateTime = new Date(`${formData.date}T${formData.time}`);
      const now = new Date();
      if (isNaN(eventDateTime.getTime())) {
        newErrors.date = newErrors.date || 'Invalid date/time';
      } else if (eventDateTime.getTime() <= now.getTime()) {
        newErrors.date = 'Event date/time must be in the future';
        newErrors.time = 'Event date/time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onCreateEvent(formData);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
                placeholder="Enter event title"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Event Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Event Type *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="eventType"
                    value="free"
                    checked={formData.eventType === 'free'}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900">Free Event</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="eventType"
                    value="paid"
                    checked={formData.eventType === 'paid'}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900">Paid Event</span>
                </label>
              </div>
            </div>

            {/* Price and Max Tickets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.eventType === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Ticket Price (PUSH) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
                    placeholder="0.05"
                    required
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Max Tickets *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxTickets}
                  onChange={(e) => handleInputChange('maxTickets', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
                  placeholder="100"
                />
                {errors.maxTickets && <p className="text-red-500 text-sm mt-1">{errors.maxTickets}</p>}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={todayStr}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  min={formData.date === todayStr ? nowTimeStr : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
                placeholder="Enter event location"
              />
              {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            </div>

            {/* Event Flyer (Image Upload) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Event Flyer (Image)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const url = await uploadToIPFS(file);
                      setFormData(prev => ({ ...prev, imageUrl: url }));
                    } catch (err: unknown) {
                      console.error('Image upload failed', err);
                      const e = err as { message?: string } | undefined;
                      addToast({ type: 'error', title: 'Upload failed', message: e?.message || 'Image upload failed. Please try again.' });
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
              </div>
              {formData.imageUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.imageUrl} alt="Event flyer preview" className="w-48 h-32 object-cover rounded border" />
                  <p className="text-xs text-gray-500 mt-1 break-all">{formData.imageUrl}</p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Image will be uploaded to IPFS via Pinata.</p>
            </div>

            {/* Max Resale Price */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Max Resale Price (PUSH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.maxResalePrice}
                onChange={(e) => handleInputChange('maxResalePrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent"
                placeholder="0.075"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum price for ticket resale (prevents scalping)
              </p>
              {errors.maxResalePrice && <p className="text-red-500 text-sm mt-1">{errors.maxResalePrice}</p>}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || uploading}
                className="flex-1 py-2 px-4 btn-brand rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : uploading ? 'Uploading...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
