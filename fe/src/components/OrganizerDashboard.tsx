'use client';

import { useState } from 'react';
import { Event } from '@/types/contract';
import { formatPrice } from '@/lib/contract';
import { useBlockchainIntegration } from '@/hooks/useBlockchainIntegration';
import { addToast } from '@/lib/toast';

interface OrganizerDashboardProps {
  userAddress: string;
  isApprovedOrganizer: boolean;
  organizerEvents: Event[];
  onCreateEvent: () => void;
}

export default function OrganizerDashboard({ 
  userAddress, 
  isApprovedOrganizer, 
  organizerEvents, 
  onCreateEvent 
}: OrganizerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'analytics'>('overview');
  const { getRegistrationsForEvent, isCheckedIn, checkIn, cancelEvent: cancelEventOnChain, markEventOccurred: markOccurredOnChain, withdrawOrganizer: withdrawOnChain } = useBlockchainIntegration();
  const [openRegs, setOpenRegs] = useState<Record<number, boolean>>({});
  const [regsData, setRegsData] = useState<Record<number, { loading: boolean; items: Array<{ tokenId: number; owner: string; seatNumber: number; checked?: boolean }> }>>({});
  const [regCounts, setRegCounts] = useState<Record<number, { checked: number; total: number }>>({});
  const [regSearch, setRegSearch] = useState<Record<number, string>>({});
  const [regPage, setRegPage] = useState<Record<number, number>>({});
  const PAGE_SIZE = 50;

  const toggleRegistrations = async (eventId: number) => {
    setOpenRegs(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    // Load if opening and not yet loaded
    const willOpen = !openRegs[eventId];
    if (willOpen) {
      setRegsData(prev => ({ ...prev, [eventId]: { loading: true, items: prev[eventId]?.items || [] } }));
      const items = await getRegistrationsForEvent(eventId);
      // Load check-in statuses in parallel
      const statuses = await Promise.all(items.map(i => isCheckedIn(i.tokenId)));
      const itemsWithStatus = items.map((i, idx) => ({ ...i, checked: Boolean(statuses[idx]) }));
      const checkedCount = itemsWithStatus.filter(i => i.checked).length;
      setRegsData(prev => ({ ...prev, [eventId]: { loading: false, items: itemsWithStatus } }));
      setRegCounts(prev => ({ ...prev, [eventId]: { checked: checkedCount, total: itemsWithStatus.length } }));
      setRegPage(prev => ({ ...prev, [eventId]: 1 }));
    }
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const GRACE_SECONDS = 48 * 3600; // 48 hours

  const formatCountdown = (target?: number) => {
    if (!target) return '';
    const d = Math.max(0, target - nowSec);
    const hrs = Math.floor(d / 3600);
    const mins = Math.floor((d % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const onCancelEvent = async (ev: Event) => {
    const ok = await cancelEventOnChain(ev.id);
    if (ok) addToast({ type: 'success', title: 'Event canceled', message: `${ev.title} was canceled.` });
    else addToast({ type: 'error', title: 'Cancel failed', message: 'Unable to cancel event.' });
  };

  const onMarkOccurred = async (ev: Event) => {
    const ok = await markOccurredOnChain(ev.id);
    if (ok) addToast({ type: 'success', title: 'Marked occurred', message: `${ev.title} marked as occurred.` });
    else addToast({ type: 'error', title: 'Mark failed', message: 'Unable to mark as occurred.' });
  };

  const onWithdraw = async (ev: Event) => {
    const ok = await withdrawOnChain(ev.id);
    if (ok) addToast({ type: 'success', title: 'Withdrawn', message: `Proceeds withdrawn for ${ev.title}.` });
    else addToast({ type: 'error', title: 'Withdraw failed', message: 'Unable to withdraw proceeds.' });
  };

  const onRowCheckIn = async (eventId: number, tokenId: number) => {
    const ok = await checkIn(tokenId);
    if (ok) {
      addToast({ type: 'success', title: 'Checked In', message: `Token #${tokenId} checked in.` });
      // Update local state
      setRegsData(prev => {
        const curr = prev[eventId]?.items || [];
        const updated = curr.map(it => it.tokenId === tokenId ? { ...it, checked: true } : it);
        return { ...prev, [eventId]: { loading: false, items: updated } };
      });
      setRegCounts(prev => {
        const c = prev[eventId] || { checked: 0, total: 0 };
        return { ...prev, [eventId]: { checked: Math.min(c.checked + 1, c.total), total: c.total } };
      });
    } else {
      addToast({ type: 'error', title: 'Check-In failed', message: 'Unable to check in this ticket.' });
    }
  };

  if (!isApprovedOrganizer) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">Not an Approved Organizer</h3>
            <p className="text-yellow-700">
              Your wallet ({userAddress.slice(0, 6)}...{userAddress.slice(-4)}) is not approved to create events. 
              Contact the platform owner to get organizer approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalEvents = organizerEvents.length;
  // tickets represents AVAILABLE. Compute sold per event as (maxTickets - tickets)
  const totalTicketsSold = organizerEvents.reduce((sum, event) => sum + (event.maxTickets - event.tickets), 0);
  const totalRevenue = organizerEvents.reduce((sum, event) => 
    sum + (Number(event.price) * (event.maxTickets - event.tickets)), 0
  );

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Organizer Dashboard</h2>
            <p className="text-gray-600">Manage your events and track performance</p>
          </div>
          <button
            onClick={onCreateEvent}
            className="btn-brand px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Event
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'events', label: 'My Events' },
            { id: 'analytics', label: 'Analytics' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[var(--brand-500)] text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-brand-50 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-brand">Total Events</p>
                    <p className="text-2xl font-bold text-brand-700">{totalEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Tickets Sold</p>
                    <p className="text-2xl font-bold text-green-900">{totalTicketsSold}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {(totalRevenue / 1e18).toFixed(4)} PUSH
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
              {organizerEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">No events created yet</p>
                  <p className="text-sm">Create your first event to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {organizerEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-600">{event.date} at {event.time}</p>
                          <p className="text-sm text-gray-600">{event.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Sold</p>
                          <p className="font-semibold">{event.maxTickets - event.tickets}/{event.maxTickets}</p>
                          <p className="text-sm text-green-600">{formatPrice(event.price)} PUSH</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">All My Events</h3>
              <button
                onClick={onCreateEvent}
                className="btn-brand px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Create New Event
              </button>
            </div>

            {organizerEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No events created yet</p>
                <button
                  onClick={onCreateEvent}
                  className="btn-brand px-6 py-2 rounded-lg transition-colors"
                >
                  Create Your First Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizerEvents.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-semibold text-gray-900 mb-2">{event.title}</h4>
                      {/* Status badge */}
                      <div>
                        {event.canceled ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Canceled</span>
                        ) : event.occurred ? (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Ended</span>
                        ) : event.eventTimestamp && nowSec > (event.eventTimestamp + GRACE_SECONDS) ? (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Refund Available</span>
                        ) : event.eventTimestamp && nowSec >= event.eventTimestamp ? (
                          <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded">Ongoing</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Upcoming</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>{event.date} at {event.time}</p>
                      <p>{event.location}</p>
                      <p className="font-medium text-brand">{formatPrice(event.price)} PUSH</p>
                      {/* Countdown */}
                      {event.eventTimestamp && !event.canceled && !event.occurred && (
                        <p className="text-xs text-gray-500">
                          Starts in: {nowSec < event.eventTimestamp ? formatCountdown(event.eventTimestamp) : '0h 0m'}
                          {event.eventTimestamp && nowSec >= event.eventTimestamp && (
                            <>
                              {' '}• Grace left: {formatCountdown(event.eventTimestamp + GRACE_SECONDS)}
                            </>
                          )}
                        </p>
                      )}
                      {/* Escrow */}
                      {typeof event.escrowBalance === 'bigint' && (
                        <p className="text-xs text-gray-500">Escrow: {(Number(event.escrowBalance) / 1e18).toFixed(4)} PUSH</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">Tickets Sold</span>
                      <span className="font-semibold">{event.maxTickets - event.tickets}/{event.maxTickets}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-brand h-2 rounded-full" 
                        style={{ width: `${((event.maxTickets - event.tickets) / event.maxTickets) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => toggleRegistrations(event.id)}
                        className="flex-1 text-sm bg-gray-100 text-gray-700 py-2 px-3 rounded hover:bg-gray-200 transition-colors"
                      >
                        {openRegs[event.id] ? 'Hide Registrations' : 'View Registrations'}
                      </button>
                      {/* Cancel Event */}
                      <button
                        onClick={() => onCancelEvent(event)}
                        disabled={Boolean(event.canceled) || Boolean(event.occurred) || (event.eventTimestamp ? nowSec >= event.eventTimestamp : false)}
                        className={`flex-1 text-sm py-2 px-3 rounded transition-colors ${
                          (event.canceled || event.occurred || (event.eventTimestamp ? nowSec >= event.eventTimestamp : false))
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        Cancel Event
                      </button>
                      {/* Mark Occurred */}
                      <button
                        onClick={() => onMarkOccurred(event)}
                        disabled={Boolean(event.canceled) || Boolean(event.occurred) || !(event.eventTimestamp ? nowSec >= event.eventTimestamp : false)}
                        className={`flex-1 text-sm py-2 px-3 rounded transition-colors ${
                          (event.canceled || event.occurred || !(event.eventTimestamp ? nowSec >= event.eventTimestamp : false))
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'btn-brand'
                        }`}
                      >
                        Mark Occurred
                      </button>
                      {/* Withdraw Proceeds */}
                      <button
                        onClick={() => onWithdraw(event)}
                        disabled={Boolean(event.canceled) || !Boolean(event.occurred) || !(typeof event.escrowBalance === 'bigint' && event.escrowBalance > 0n)}
                        className={`flex-1 text-sm py-2 px-3 rounded transition-colors ${
                          (event.canceled || !event.occurred || !(typeof event.escrowBalance === 'bigint' && event.escrowBalance > 0n))
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        Withdraw Proceeds
                      </button>
                    </div>

                    {openRegs[event.id] && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">Registrations</h5>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">Checked in {regCounts[event.id]?.checked || 0} / {regCounts[event.id]?.total || 0}</span>
                          <div className="flex items-center gap-2">
                            <input
                              value={regSearch[event.id] || ''}
                              onChange={(e) => setRegSearch(prev => ({ ...prev, [event.id]: e.target.value }))}
                              placeholder="Search by owner address"
                              className="border rounded px-2 py-1 text-xs w-56"
                            />
                            <button
                              className="text-xs px-3 py-1 rounded bg-brand text-white hover:bg-brand"
                              onClick={async () => {
                                const q = (regSearch[event.id] || '').trim().toLowerCase();
                                const list = regsData[event.id]?.items || [];
                                const matches = list.filter(r => r.owner.toLowerCase().includes(q));
                                if (!q || matches.length === 0) {
                                  addToast({ type: 'error', title: 'No match', message: 'No registrations match that address.' });
                                  return;
                                }
                                const target = matches.find(m => !m.checked) || matches[0];
                                if (target.checked) {
                                  addToast({ type: 'info', title: 'Already checked in', message: `Token #${target.tokenId} is already checked in.` });
                                  return;
                                }
                                await onRowCheckIn(event.id, target.tokenId);
                              }}
                            >
                              Check In by Address
                            </button>
                          </div>
                        </div>
                        {regsData[event.id]?.loading ? (
                          <p className="text-sm text-gray-500">Loading registrations...</p>
                        ) : regsData[event.id]?.items?.length ? (
                          <div className="overflow-x-auto">
                            {/* Pagination controls (top) */}
                            <div className="flex items-center justify-end gap-2 mb-2">
                              {(() => {
                                const all = regsData[event.id]?.items || [];
                                const q = (regSearch[event.id] || '').trim().toLowerCase();
                                const filtered = all.filter(r => !q || r.owner.toLowerCase().includes(q));
                                const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                                const page = Math.min(regPage[event.id] || 1, totalPages);
                                return (
                                  <div className="flex items-center gap-2 text-xs">
                                    <button
                                      className="px-2 py-1 border rounded disabled:opacity-50"
                                      onClick={() => setRegPage(prev => ({ ...prev, [event.id]: Math.max(1, page - 1) }))}
                                      disabled={page <= 1}
                                    >Prev</button>
                                    <span>Page {page} / {totalPages}</span>
                                    <button
                                      className="px-2 py-1 border rounded disabled:opacity-50"
                                      onClick={() => setRegPage(prev => ({ ...prev, [event.id]: Math.min(totalPages, page + 1) }))}
                                      disabled={page >= totalPages}
                                    >Next</button>
                                  </div>
                                );
                              })()}
                            </div>

                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="py-2 pr-4">Token ID</th>
                                  <th className="py-2 pr-4">Owner</th>
                                  <th className="py-2 pr-4">Seat</th>
                                  <th className="py-2 pr-4">Status</th>
                                  <th className="py-2 pr-4">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const all = regsData[event.id]?.items || [];
                                  const q = (regSearch[event.id] || '').trim().toLowerCase();
                                  const filtered = all.filter(r => !q || r.owner.toLowerCase().includes(q));
                                  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                                  const page = Math.min(regPage[event.id] || 1, totalPages);
                                  const start = (page - 1) * PAGE_SIZE;
                                  const paged = filtered.slice(start, start + PAGE_SIZE);
                                  return paged.map((r) => (
                                  <tr key={r.tokenId} className="border-t">
                                    <td className="py-2 pr-4">#{r.tokenId}</td>
                                    <td className="py-2 pr-4 font-mono">{r.owner.slice(0,6)}...{r.owner.slice(-4)}</td>
                                    <td className="py-2 pr-4">{r.seatNumber + 1}</td>
                                    <td className="py-2 pr-4">
                                      {r.checked ? (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Checked In</span>
                                      ) : (
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Not Checked In</span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <button
                                        onClick={() => onRowCheckIn(event.id, r.tokenId)}
                                        disabled={Boolean(r.checked)}
                                        className={`text-xs px-3 py-1 rounded ${r.checked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'btn-brand'}`}
                                      >
                                        {r.checked ? 'Done' : 'Check In'}
                                      </button>
                                    </td>
                                  </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>

                            {/* Pagination controls (bottom) */}
                            <div className="flex items-center justify-end gap-2 mt-2">
                              {(() => {
                                const all = regsData[event.id]?.items || [];
                                const q = (regSearch[event.id] || '').trim().toLowerCase();
                                const filtered = all.filter(r => !q || r.owner.toLowerCase().includes(q));
                                const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
                                const page = Math.min(regPage[event.id] || 1, totalPages);
                                return (
                                  <div className="flex items-center gap-2 text-xs">
                                    <button
                                      className="px-2 py-1 border rounded disabled:opacity-50"
                                      onClick={() => setRegPage(prev => ({ ...prev, [event.id]: Math.max(1, page - 1) }))}
                                      disabled={page <= 1}
                                    >Prev</button>
                                    <span>Page {page} / {totalPages}</span>
                                    <button
                                      className="px-2 py-1 border rounded disabled:opacity-50"
                                      onClick={() => setRegPage(prev => ({ ...prev, [event.id]: Math.min(totalPages, page + 1) }))}
                                      disabled={page >= totalPages}
                                    >Next</button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No registrations found.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Event Analytics</h3>
            
            {organizerEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No data available. Create events to see analytics.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Performance Summary */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Performance Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Average Ticket Price</p>
                      <p className="text-xl font-bold text-gray-900">
                        {organizerEvents.length > 0 
                          ? (organizerEvents.reduce((sum, event) => sum + Number(event.price), 0) / organizerEvents.length / 1e18).toFixed(4)
                          : '0'
                        } PUSH
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Attendance Rate</p>
                      <p className="text-xl font-bold text-gray-900">
                        {organizerEvents.length > 0
                          ? Math.round((totalTicketsSold / organizerEvents.reduce((sum, event) => sum + event.maxTickets, 0)) * 100)
                          : 0
                        }%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Performance */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Event Performance</h4>
                  <div className="space-y-4">
                    {organizerEvents.map((event) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-900">{event.title}</h5>
                          <span className="text-sm text-gray-500">
                            {Math.round(((event.maxTickets - event.tickets) / event.maxTickets) * 100)}% sold
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${((event.maxTickets - event.tickets) / event.maxTickets) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{event.maxTickets - event.tickets} sold of {event.maxTickets}</span>
                          <span>Revenue: {((Number(event.price) * (event.maxTickets - event.tickets)) / 1e18).toFixed(4)} PUSH</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
