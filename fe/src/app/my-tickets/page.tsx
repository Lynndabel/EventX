"use client";

import { useEffect, useState, useMemo } from "react";
import TicketCard from "@/components/TicketCard";
import { useBlockchainIntegration } from "@/hooks/useBlockchainIntegration";
import { Event } from "@/types/contract";
import { addToast } from "@/lib/toast";
import { usePushWalletContext, usePushChainClient, PushUI } from "@pushchain/ui-kit";

interface OwnedTicket {
  tokenId: number;
  occasionId: number;
  seatNumber: number;
  event?: Event | null;
}

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<OwnedTicket[]>([]);

  const { connectionStatus } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();

  const walletAddress = useMemo(() => {
    return pushChainClient?.universal?.account || '';
  }, [pushChainClient]);

  const isConnected = connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && !!walletAddress;

  const { getTicketsByOwner, getEventDetails, refundAttendee, getTokenURI } = useBlockchainIntegration();
  const [origin, setOrigin] = useState<string>("");
  const nowSec = Math.floor(Date.now() / 1000);
  const GRACE_SECONDS = 48 * 3600; // 48h

  const canRefund = (ev?: Event | null): boolean => {
    if (!ev) return false;
    if (ev.canceled) return true;
    if (ev.occurred) return false;
    if (ev.eventTimestamp && nowSec > (ev.eventTimestamp + GRACE_SECONDS)) return true;
    return false;
  };

  const openNFTImage = async (tokenId: number) => {
    const win = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
    if (win) {
      try {
        win.document.open();
        win.document.write('<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:20px;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial"><p>Loading NFT...</p></body></html>');
        win.document.close();
      } catch {}
    }
    try {
      const uri = await getTokenURI(tokenId);
      if (uri.startsWith('data:application/json')) {
        const [header, payload] = uri.split(',', 2);
        const isBase64 = /;base64/i.test(header);
        let jsonStr = '';
        try {
          if (isBase64) {
            jsonStr = typeof atob !== 'undefined' ? atob(payload) : Buffer.from(payload, 'base64').toString('utf-8');
          } else {
            try {
              jsonStr = decodeURIComponent(payload);
            } catch {
              jsonStr = payload;
            }
          }
          const meta = JSON.parse(jsonStr);
          const image: string | undefined = meta.image || meta.image_data;
          if (image) {
            if (win) {
              win.document.open();
              if (image.startsWith('data:image/svg+xml')) {
                const [hdr, payload] = image.split(',', 2);
                const isB64 = /;base64/i.test(hdr);
                let svgMarkup = '';
                try {
                  if (isB64) svgMarkup = typeof atob !== 'undefined' ? atob(payload) : Buffer.from(payload, 'base64').toString('utf-8');
                  else {
                    try { svgMarkup = decodeURIComponent(payload); } catch { svgMarkup = payload; }
                  }
                } catch { svgMarkup = payload; }
                win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0">${svgMarkup}</body></html>`);
              } else if (image.startsWith('data:image/')) {
                win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0"><img alt="NFT" src="${image}"/></body></html>`);
              } else if (image.trim().startsWith('<svg')) {
                win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0">${image}</body></html>`);
              } else {
                win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0"><a href="${image}" target="_blank" rel="noopener noreferrer">Open image</a></body></html>`);
              }
              win.document.close();
            } else {
              window.open(image, '_blank');
            }
            return;
          }
        } catch {
          const startIdx = jsonStr.indexOf('data:image/svg+xml');
          if (startIdx !== -1) {
            const endTag = '</svg>';
            const endIdx = jsonStr.indexOf(endTag, startIdx);
            if (endIdx !== -1) {
              const svgContent = jsonStr.substring(startIdx, endIdx + endTag.length);
              if (win) {
                win.document.open();
                win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0">${svgContent}</body></html>`);
                win.document.close();
              } else {
                const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
                window.open(dataUrl, '_blank');
              }
              return;
            }
          }
          const svgStart = jsonStr.indexOf('<svg');
          const svgEndTag = '</svg>';
          const svgEnd = svgStart !== -1 ? jsonStr.indexOf(svgEndTag, svgStart) : -1;
          if (svgStart !== -1 && svgEnd !== -1) {
            const svgMarkup = jsonStr.substring(svgStart, svgEnd + svgEndTag.length);
            if (win) {
              win.document.open();
              win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0">${svgMarkup}</body></html>`);
              win.document.close();
            } else {
              const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;
              window.open(dataUrl, '_blank');
            }
            return;
          }
          if (win) {
            win.location.href = uri;
          } else {
            window.open(uri, '_blank');
          }
          return;
        }
      }
      if (uri.startsWith('data:image/')) {
        if (win) {
          win.document.open();
          win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0"><img alt="NFT" src="${uri}"/></body></html>`);
          win.document.close();
        } else window.open(uri, '_blank');
        return;
      }
      if (uri.trim().startsWith('<svg')) {
        if (win) {
          win.document.open();
          win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0">${uri}</body></html>`);
          win.document.close();
        } else {
          const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(uri)}`;
          window.open(dataUrl, '_blank');
        }
        return;
      }
      if (win) win.location.href = uri; else window.open(uri, '_blank');
    } catch (e) {
      console.error('Failed to open NFT image', e);
      if (win) {
        win.document.open();
        win.document.write('<p style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial">Failed to open NFT image. Check console for details.</p>');
        win.document.close();
      }
    }
  };

  const loadTickets = async (address: string) => {
    setLoading(true);
    try {
      const mine = await getTicketsByOwner(address);
      const enriched: OwnedTicket[] = [];
      for (const t of mine) {
        const ev = await getEventDetails(t.occasionId);
        enriched.push({ ...t, event: ev });
      }
      setTickets(enriched);
    } catch (e) {
      console.error("Failed to load tickets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && walletAddress) {
      loadTickets(walletAddress);
    }
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {!isConnected ? (
          <div className="bg-white rounded-lg sm:rounded-xl shadow p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-5xl mb-4">🎫</div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
              Connect your wallet
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              Connect to view the tickets you own.
            </p>
            <div className="mt-6 inline-block">
              <WalletConnect onConnect={handleConnect} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg sm:rounded-xl shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Your Tickets
                </h2>
                <p className="text-xs sm:text-sm text-gray-700 font-mono truncate">
                  {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => loadTickets(walletAddress)}
                className="px-4 py-2 btn-brand rounded-lg text-sm font-semibold hover:opacity-90 transition flex-shrink-0"
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-brand rounded-full mb-3" />
                <p className="text-sm sm:text-base text-gray-700">Loading your tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-gray-700 py-8 sm:py-12">
                <div className="text-4xl sm:text-5xl mb-3">📭</div>
                <p className="text-sm sm:text-base font-medium">No tickets found for this wallet.</p>
                <p className="text-xs sm:text-sm mt-2 text-gray-600">
                  Purchase a ticket from the Events page and check back here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {tickets.map((t) => (
                  <div key={t.tokenId} className="border border-gray-200 rounded-lg p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                        Ticket #{t.tokenId}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {t.event && (
                          t.event.canceled ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Canceled</span>
                          ) : t.event.occurred ? (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Ended</span>
                          ) : t.event.eventTimestamp && nowSec > (t.event.eventTimestamp + GRACE_SECONDS) ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded whitespace-nowrap">Refund Available</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>
                          )
                        )}
                        <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded whitespace-nowrap">
                          Seat {t.seatNumber + 1}
                        </span>
                      </div>
                    </div>

                    {t.event ? (
                      <>
                        <p className="text-sm sm:text-base text-gray-800 font-medium line-clamp-2">
                          {t.event.title}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700 mt-1">
                          {t.event.date} at {t.event.time}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700 truncate">
                          {t.event.location}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-700">Loading event details...</p>
                    )}

                    <div className="mt-3 text-xs sm:text-sm text-gray-500">
                      <p>Event ID: {t.occasionId}</p>
                    </div>

                    {/* Refund */}
                    {canRefund(t.event) && (
                      <div className="mt-3 sm:mt-4">
                        <button
                          className="w-full text-xs sm:text-sm bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 font-semibold transition"
                          onClick={async () => {
                            const ok = await refundAttendee(t.tokenId);
                            if (ok) {
                              addToast({ type: 'success', title: 'Refund requested', message: `Refund processed for Ticket #${t.tokenId}.` });
                              setTimeout(() => {
                                if (walletAddress) loadTickets(walletAddress);
                              }, 1200);
                            } else {
                              addToast({ type: 'error', title: 'Refund failed', message: 'Unable to process refund. Please try again.' });
                            }
                          }}
                        >
                          Request Refund
                        </button>
                        <p className="text-xs text-gray-500 mt-1.5">
                          Refunds available when an event is canceled or 48h after the event if not marked occurred.
                        </p>
                      </div>
                    )}

                    {/* View NFT */}
                    <div className="mt-3">
                      <button
                        className="w-full text-xs sm:text-sm btn-brand py-2 rounded font-semibold hover:opacity-90 transition"
                        onClick={() => openNFTImage(t.tokenId)}
                      >
                        View NFT
                      </button>
                    </div>

                    {/* Verification QR & Link */}
                    <div className="mt-4 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                      <div className="border rounded p-2 bg-white mx-auto sm:mx-0 flex-shrink-0">
                        {origin && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={`QR for ticket #${t.tokenId}`}
                            width={140}
                            height={140}
                            className="sm:w-[160px] sm:h-[160px]"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${origin}/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}`)}`}
                          />
                        )}
                      </div>
                      <div className="flex-1 w-full min-w-0">
                        <p className="text-xs sm:text-sm text-gray-700 font-medium mb-1.5">
                          Verification Link
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 min-w-0 border rounded px-2 py-1.5 text-xs sm:text-sm"
                            readOnly
                            value={origin ? `${origin}/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}` : `/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}`}
                          />
                          <button
                            onClick={() => {
                              const url = origin ? `${origin}/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}` : `/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}`;
                              navigator.clipboard.writeText(url);
                              addToast({ type: 'success', title: 'Copied!', message: 'Link copied to clipboard' });
                            }}
                            className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded font-medium transition flex-shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          Show this QR or link at entry for instant on-chain verification.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
