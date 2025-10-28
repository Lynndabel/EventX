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
    // Open the window synchronously to avoid popup blockers
    const win = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
    // Write a loading page immediately
    if (win) {
      try {
        win.document.open();
        win.document.write('<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:20px;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial"><p>Loading NFT...</p></body></html>');
        win.document.close();
      } catch {}
    }
    try {
      const uri = await getTokenURI(tokenId);
      // tokenURI may be a data:application/json;... with { image: 'data:image/svg+xml;utf8,...' }
      if (uri.startsWith('data:application/json')) {
        const [header, payload] = uri.split(',', 2);
        // Try base64 first
        const isBase64 = /;base64/i.test(header);
        let jsonStr = '';
        try {
          if (isBase64) {
            jsonStr = typeof atob !== 'undefined' ? atob(payload) : Buffer.from(payload, 'base64').toString('utf-8');
          } else {
            // Some implementations do not percent-encode. Use payload as-is if decode fails.
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
          // If JSON.parse failed (e.g., image contains unescaped quotes), try to extract image URL heuristically
          const startIdx = jsonStr.indexOf('data:image/svg+xml');
          if (startIdx !== -1) {
            // Find end of svg by searching for closing tag
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
          // Try extracting raw <svg> markup
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
          // Last resort: open the whole JSON data URL
          if (win) {
            win.location.href = uri;
          } else {
            window.open(uri, '_blank');
          }
          return;
        }
      }
      // Fallback: if tokenURI is already an image data URL, open it directly
      if (uri.startsWith('data:image/')) {
        if (win) {
          win.document.open();
          win.document.write(`<!doctype html><html><head><meta charset="utf-8"/></head><body style="margin:0"><img alt="NFT" src="${uri}"/></body></html>`);
          win.document.close();
        } else window.open(uri, '_blank');
        return;
      }
      // If tokenURI is raw SVG markup
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
      // Otherwise just open whatever URI it is
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
      // Enrich with event details
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!isConnected ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Connect your wallet</h2>
            <p className="text-gray-700">Connect to view the tickets you own.</p>
            <div className="mt-6 inline-block">
              <WalletConnect onConnect={handleConnect} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Tickets</h2>
                <p className="text-sm text-gray-700 font-mono">{walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</p>
              </div>
              <button
                onClick={() => loadTickets(walletAddress)}
                className="px-4 py-2 btn-brand rounded-lg"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <p className="text-gray-700">Loading your tickets...</p>
            ) : tickets.length === 0 ? (
              <div className="text-center text-gray-700 py-10">
                <p>No tickets found for this wallet.</p>
                <p className="text-sm mt-2 text-gray-700">Purchase a ticket from the Events page and check back here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map((t) => (
                  <div key={t.tokenId} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">Ticket #{t.tokenId}</h3>
                      <div className="flex items-center gap-2">
                        {t.event && (
                          t.event.canceled ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Canceled</span>
                          ) : t.event.occurred ? (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Ended</span>
                          ) : t.event.eventTimestamp && nowSec > (t.event.eventTimestamp + GRACE_SECONDS) ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Refund Available</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                          )
                        )}
                        <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded">Seat {t.seatNumber + 1}</span>
                      </div>
                    </div>
                    {t.event ? (
                      <>
                        <p className="text-gray-800 font-medium">{t.event.title}</p>
                        <p className="text-sm text-gray-700">{t.event.date} at {t.event.time}</p>
                        <p className="text-sm text-gray-700">{t.event.location}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-700">Loading event details...</p>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Event ID: {t.occasionId}</p>
                    </div>

                    {/* Refund */}
                    {canRefund(t.event) && (
                      <div className="mt-3">
                        <button
                          className="w-full text-sm bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700"
                          onClick={async () => {
                            const ok = await refundAttendee(t.tokenId);
                            if (ok) {
                              addToast({ type: 'success', title: 'Refund requested', message: `Refund processed for Ticket #${t.tokenId}.` });
                              // Reload after a short delay
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
                        <p className="text-xs text-gray-500 mt-1">Refunds available when an event is canceled or 48h after the event if not marked occurred.</p>
                      </div>
                    )}

                    {/* View NFT */}
                    <div className="mt-3">
                      <button
                        className="w-full text-sm btn-brand py-2 rounded"
                        onClick={() => openNFTImage(t.tokenId)}
                      >
                        View NFT
                      </button>
                    </div>

                    {/* Verification QR & Link */}
                    <div className="mt-4 flex items-start gap-4">
                      <div className="border rounded p-2 bg-white">
                        {/* Generate QR without deps using external service */}
                        {origin && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={`QR for ticket #${t.tokenId}`}
                            width={180}
                            height={180}
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${origin}/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}`)}`}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 font-medium mb-1">Verification Link</p>
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            readOnly
                            value={origin ? `${origin}/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}` : `/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}`}
                          />
                          <button
                            onClick={() => {
                              const url = origin ? `${origin}/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}` : `/verify?tokenId=${t.tokenId}&eventId=${t.occasionId}`;
                              navigator.clipboard.writeText(url);
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Show this QR or link at entry for instant on-chain verification.</p>
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
