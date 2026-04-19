"use client";

// Share modal — code, link, email, QR, embed

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "../../components/Icons";

export function ShareModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [qrSvg, setQrSvg] = useState<string>("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/meet/${roomId}` : "";

  useEffect(() => {
    let cancelled = false;
    if (!link) return;
    QRCode.toString(link, { type: "svg", margin: 1, width: 128 })
      .then((svg) => { if (!cancelled) setQrSvg(svg); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [link]);

  const copy = async (text: string, which: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const mailto = `mailto:?subject=${encodeURIComponent("Join my Indux Meet meeting")}&body=${encodeURIComponent(`Join my meeting: ${link}\n\nMeeting code: ${roomId}`)}`;
  const embed = `<iframe src="${link}?embed=1" width="800" height="600" allow="camera; microphone; display-capture"></iframe>`;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur animate-fadeIn" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-scaleIn w-[36rem] max-w-[94vw] rounded-2xl border border-white/10 bg-[#0f0f14] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Share meeting</h2>
            <p className="mt-1 text-xs text-white/50">Anyone with the code or link can join</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Close">
            <Icon.Close size={16} />
          </button>
        </div>

        <div className="mt-5 flex gap-5">
          <div className="flex-1 space-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Code</div>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <code className="font-mono text-sm font-semibold tracking-wider">{roomId}</code>
                <button
                  onClick={() => copy(roomId, "code")}
                  className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"
                >
                  <Icon.Copy size={12} />
                  {copied === "code" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Link</div>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="truncate font-mono text-xs text-white/80">{link}</span>
                <button
                  onClick={() => copy(link, "link")}
                  className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"
                >
                  <Icon.Copy size={12} />
                  {copied === "link" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={mailto}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
              >
                <Icon.Send size={12} />
                Email
              </a>
              <button
                onClick={() => copy(embed, "link")}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
                title="Copy iframe embed snippet"
              >
                <Icon.Picture size={12} />
                Embed
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
              <div className="flex items-center gap-1.5 font-medium text-white/70">
                <Icon.Info size={12} />
                Tip
              </div>
              <p className="mt-1">Lock the room from Manage to require admin approval.</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-xl border border-white/10 bg-white p-3">
              {qrSvg ? (
                <div
                  className="h-32 w-32 [&_svg]:h-32 [&_svg]:w-32"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="h-32 w-32 animate-pulse rounded bg-gray-200" />
              )}
            </div>
            <span className="mt-2 text-[10px] text-white/40">Scan to join</span>
          </div>
        </div>
      </div>
    </div>
  );
}
