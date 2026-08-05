import { useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCall } from "@/context/CallContext";
import { cn } from "@/lib/utils";

function clock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallOverlay() {
  const {
    state,
    kind,
    peer,
    muted,
    cameraOff,
    seconds,
    localStream,
    remoteStream,
    error,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute,
    toggleCamera,
  } = useCall();

  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
    if (audioRef.current && remoteStream) audioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (state === "idle" || !peer) return null;

  const label =
    state === "ringing"
      ? `Incoming ${kind} call`
      : state === "calling"
        ? "Calling…"
        : state === "connecting"
          ? "Connecting…"
          : clock(seconds);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-navy/95 p-4 backdrop-blur">
      <audio ref={audioRef} autoPlay />
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border/40 bg-card shadow-xl">
        {kind === "video" && state === "active" ? (
          <div className="relative aspect-video bg-black">
            <video ref={remoteRef} autoPlay playsInline className="size-full object-cover" />
            <video
              ref={localRef}
              autoPlay
              muted
              playsInline
              className="absolute right-3 bottom-3 h-28 w-44 rounded-md border border-white/20 object-cover"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 bg-brand-navy py-10 text-brand-ink-foreground">
            <Avatar className="size-20">
              <AvatarFallback className="bg-brand text-xl text-brand-foreground">
                {peer.initials}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-semibold">{peer.name}</p>
            <p className="text-sm text-brand-ink-foreground/70">{label}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 p-4">
          {kind === "video" && state === "active" && (
            <p className="text-sm font-medium text-foreground">
              {peer.name} · {label}
            </p>
          )}
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            {state === "ringing" ? (
              <>
                <Button onClick={() => void acceptCall()} className="gap-1.5">
                  <Phone className="size-4" /> Accept
                </Button>
                <Button variant="destructive" onClick={() => void declineCall()} className="gap-1.5">
                  <PhoneOff className="size-4" /> Decline
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                  className={cn(muted && "border-destructive text-destructive")}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
                {kind === "video" && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleCamera}
                    className={cn(cameraOff && "border-destructive text-destructive")}
                    aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                  >
                    {cameraOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
                  </Button>
                )}
                <Button variant="destructive" onClick={() => void hangUp()} className="gap-1.5">
                  <PhoneOff className="size-4" /> End call
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
