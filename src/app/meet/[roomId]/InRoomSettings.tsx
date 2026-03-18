"use client";

// In-room settings panel — Zoom-style
// Audio device picker, video device picker, background effects, noise suppression

import { useEffect, useState } from "react";
import { Icon } from "../../components/Icons";

export function InRoomSettings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"audio" | "video" | "background" | "general">("audio");
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [selectedAudioOut, setSelectedAudioOut] = useState<string>("");
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [micLevel, setMicLevel] = useState(0);
  const [bgEffect, setBgEffect] = useState<"none" | "blur" | "image" | "wall">("none");
  const [wallColor, setWallColor] = useState("#1e3a8a");
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGain, setAutoGain] = useState(false);

  // Get devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Need permission first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
        setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
        setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
      } catch {}
    }
    getDevices();
  }, []);

  // Mic level meter
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        const data = new Uint8Array(analyzer.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyzer.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(100, (avg / 255) * 100));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {}
    }
    setup();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function switchDevice(kind: "audioinput" | "audiooutput" | "videoinput", deviceId: string) {
    if (kind === "audioinput") setSelectedAudio(deviceId);
    if (kind === "audiooutput") setSelectedAudioOut(deviceId);
    if (kind === "videoinput") setSelectedVideo(deviceId);
  }

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-full max-w-md animate-slideInR flex-col border-l border-white/10 bg-[#0a0a0f] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-semibold">Settings</h2>
        <button onClick={onClose} className="rounded p-1.5 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Close">
          <Icon.Close size={16} />
        </button>
      </div>

      <div className="flex border-b border-white/10 px-3 py-2">
        {(["audio", "video", "background", "general"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize " +
              (tab === t ? "bg-white/10 text-white" : "text-white/50 hover:text-white")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "audio" && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/60">Speaker</label>
              <select
                value={selectedAudioOut}
                onChange={(e) => switchDevice("audiooutput", e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#15151b] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                <option value="">System default</option>
                {audioOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/60">Microphone</label>
              <select
                value={selectedAudio}
                onChange={(e) => switchDevice("audioinput", e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#15151b] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                <option value="">System default</option>
                {audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>

            {/* Test mic */}
            <div className="rounded-lg border border-white/10 bg-[#15151b] p-4">
              <div className="text-xs font-medium text-white/70">Test your microphone</div>
              <div className="mt-3 flex h-2 items-center gap-0.5 overflow-hidden rounded-full bg-white/5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className={"h-full flex-1 rounded-sm transition-all " + (i < (micLevel / 100) * 30 ? "bg-green-500" : "bg-white/5")}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-white/40">Speak to test. {Math.round(micLevel)}%</div>
            </div>

            <Toggle label="Noise suppression" value={noiseSuppression} onChange={setNoiseSuppression} />
            <Toggle label="Echo cancellation" value={echoCancellation} onChange={setEchoCancellation} />
            <Toggle label="Auto-mic gain" value={autoGain} onChange={setAutoGain} />
          </div>
        )}

        {tab === "video" && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/60">Camera</label>
              <select
                value={selectedVideo}
                onChange={(e) => switchDevice("videoinput", e.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#15151b] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                <option value="">System default</option>
                {videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/60">Quality</label>
              <div className="grid grid-cols-2 gap-2">
                {["Auto", "HD 720p", "SD 360p", "Low 180p"].map((q) => (
                  <button
                    key={q}
                    className="rounded-md border border-white/10 bg-[#15151b] px-3 py-2 text-xs hover:bg-white/5"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "background" && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/60">Background effects</label>
              <div className="grid grid-cols-2 gap-2">
                <BgCard label="None" active={bgEffect === "none"} onClick={() => setBgEffect("none")} />
                <BgCard label="Blur" active={bgEffect === "blur"} onClick={() => setBgEffect("blur")} />
                <BgCard label="Image" active={bgEffect === "image"} onClick={() => setBgEffect("image")} />
                <BgCard label="Solid color" active={bgEffect === "wall"} onClick={() => setBgEffect("wall")} />
              </div>
            </div>

            {bgEffect === "wall" && (
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {["#1e3a8a", "#7c2d12", "#365314", "#831843", "#0c0a09", "#1e1b4b"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setWallColor(c)}
                      style={{ background: c }}
                      className={
                        "h-10 rounded-md border-2 " +
                        (wallColor === c ? "border-white" : "border-transparent")
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "general" && (
          <div className="space-y-5">
            <Toggle label="Always show meeting controls" value={true} onChange={() => {}} />
            <Toggle label="Show names on participant videos" value={true} onChange={() => {}} />
            <Toggle label="Mirror my video" value={false} onChange={() => {}} />
            <Toggle label="Enter full screen when joining" value={false} onChange={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-md border border-white/10 bg-[#15151b] px-3 py-2.5"
    >
      <span className="text-sm text-white/80">{label}</span>
      <span
        className={
          "relative h-5 w-9 rounded-full transition-colors " +
          (value ? "bg-blue-500" : "bg-white/10")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all " +
            (value ? "left-4" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}

function BgCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-lg border-2 p-3 text-xs font-medium " +
        (active
          ? "border-blue-500 bg-blue-500/10 text-white"
          : "border-white/10 bg-[#15151b] text-white/70 hover:bg-white/5")
      }
    >
      {label}
    </button>
  );
}
