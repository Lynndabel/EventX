'use client';

import Link from 'next/link';
import HowItWorksSlider from '@/components/HowItWorksSlider';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <section className="animated-green text-gray-900">
        <div className="relative py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow">About EventX</h1>
            <p className="text-xl text-gray-700 drop-shadow">
              Secure, transparent event ticketing powered by blockchain
            </p>
            <p className="mt-4 text-lg md:text-xl text-gray-700 drop-shadow">
              Real tickets only. Fair resale with caps. Instant QR check‑in. Own your access always.
            </p>
            <div className="accent-bar" />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 relative">
        {/* Subtle gradient blobs */}
        <div className="gradient-blob" style={{ top: '-3rem', left: '-4rem' }} />
        <div className="gradient-blob" style={{ bottom: '-3rem', right: '-4rem', transform: 'rotate(15deg)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-12 mb-12">
              <div className="max-w-3xl">
                <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3 tracking-tight">Ticketing that’s simple, fair, and secure</h3>
                <p className="text-gray-700 text-lg leading-relaxed">
                  EventX helps organizers sell out faster and gives attendees a fair, transparent way to get in.
                  No fake tickets. No price gouging. Just smooth entry with instant verification.
                </p>
              </div>

            </div>

            {/* Why EventX (green cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 rounded-xl border border-green-100 bg-green-50">
                <h4 className="text-xl font-semibold text-green-950 mb-2">Real tickets only</h4>
                <p className="text-green-900/80">Every ticket is unique and verifiable at the door.</p>
              </div>
              <div className="p-6 rounded-xl border border-green-100 bg-green-50">
                <h4 className="text-xl font-semibold text-green-950 mb-2">Fair resale</h4>
                <p className="text-green-900/80">Set caps and keep pricing under control.</p>
              </div>
              <div className="p-6 rounded-xl border border-green-100 bg-green-50">
                <h4 className="text-xl font-semibold text-green-950 mb-2">Instant check‑in</h4>
                <p className="text-green-900/80">Fast QR verification equals smooth entry.</p>
              </div>
            </div>

            

            <h3 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">For Organizers</h4>
                <HowItWorksSlider
                  slides={[
                    { title: 'Connect your wallet', description: 'Sign in with your preferred wallet.' },
                    { title: 'Create your event', description: 'Add title, date/time, price, seats, and location.' },
                    { title: 'Set resale rules', description: 'Cap resale prices and protect your brand reputation.' },
                    { title: 'Go live and share', description: 'Share a link or QR. Track sales and check‑ins live.' },
                  ]}
                />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">For Attendees</h4>
                <HowItWorksSlider
                  slides={[
                    { title: 'Open the event', description: 'Use a shared link or QR to view details and seats.' },
                    { title: 'Pick a seat & pay', description: 'Confirm in your wallet. Ticket issues instantly.' },
                    { title: 'Access your ticket', description: 'Your digital pass stays available on your phone.' },
                    { title: 'Scan and enter', description: 'Show QR at the door for instant, verifiable check‑in always.' },
                  ]}
                />
              </div>
            </div>

            {/* Trust & Transparency removed to reduce verbosity */}

            {/* Bottom CTA Banner */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-10 mt-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">Bring transparent ticketing to your next event</h3>
                <p className="text-gray-600 mt-1">Start selling in minutes and check in guests instantly.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/events" className="px-6 py-3 rounded-lg btn-brand">Explore Events</Link>
                <Link href="/organizer" className="px-6 py-3 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50">Create an Event</Link>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg text-center border border-gray-200 shadow-sm">
              <h3 className="text-2xl font-bold text-black mb-4">Ready to get started?</h3>
              <p className="text-gray-800 mb-6">Join thousands of users who trust EventX for secure, transparent event ticketing.</p>
              <Link 
                href="/events" 
                className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Explore Events
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

