import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { sendMessage } from "@/lib/messaging";

export type CallKind = "voice" | "video";
export type CallState = "idle" | "calling" | "ringing" | "connecting" | "active" | "ended";

interface PeerInfo {
  id: string;
  name: string;
  initials: string;
}

interface SignalPayload {
  callId: string;
  from: PeerInfo;
  kind: CallKind;
  conversationId?: string | null;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  reason?: string;
}

interface CallValue {
  state: CallState;
  kind: CallKind;
  peer: PeerInfo | null;
  callId: string | null;
  muted: boolean;
  cameraOff: boolean;
  seconds: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  startCall: (peer: PeerInfo, kind: CallKind, conversationId?: string | null) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallValue | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

function channelName(userId: string) {
  return `calls:${userId}`;
}

function formatDuration(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<CallState>("idle");
  const [kind, setKind] = useState<CallKind>("voice");
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const myChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingOfferRef = useRef<SignalPayload | null>(null);
  const conversationRef = useRef<string | null>(null);
  const answeredRef = useRef(false);

  const sendSignal = useCallback(
    async (toUserId: string, event: string, payload: SignalPayload) => {
      const channel = supabase.channel(channelName(toUserId), {
        config: { broadcast: { ack: true } },
      });
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
        setTimeout(resolve, 2500);
      });
      await channel.send({ type: "broadcast", event, payload });
      await supabase.removeChannel(channel);
    },
    [],
  );

  const teardown = useCallback(() => {
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream((stream) => {
      stream?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    answeredRef.current = false;
    pendingOfferRef.current = null;
  }, []);

  const finishCall = useCallback(
    async (status: "ended" | "missed" | "declined", duration: number) => {
      const activeCallId = callId;
      const conversationId = conversationRef.current;
      const partner = peer;
      teardown();
      setState("idle");
      setSeconds(0);
      setCallId(null);
      setPeer(null);
      conversationRef.current = null;

      if (!activeCallId || !user) return;
      await supabase
        .from("call_sessions")
        .update({
          status,
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .eq("id", activeCallId);

      if (conversationId && partner) {
        try {
          await sendMessage({
            conversationId,
            senderId: user.id,
            body: "",
            kind: "call",
            call: {
              direction: "outgoing",
              duration: status === "ended" ? formatDuration(duration) : "—",
              missed: status !== "ended",
            },
          });
        } catch {
          /* summary is best-effort */
        }
      }
    },
    [callId, peer, teardown, user],
  );

  const buildPeerConnection = useCallback(
    (targetId: string, activeCallId: string, callKind: CallKind, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (!event.candidate || !user) return;
        void sendSignal(targetId, "ice", {
          callId: activeCallId,
          kind: callKind,
          from: { id: user.id, name: user.name, initials: user.avatarInitials },
          candidate: event.candidate.toJSON(),
        });
      };
      pc.ontrack = (event) => {
        const [incoming] = event.streams;
        if (incoming) setRemoteStream(incoming);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          answeredRef.current = true;
          setState("active");
        }
        if (pc.connectionState === "failed") setError("Connection lost.");
      };
      pcRef.current = pc;
      return pc;
    },
    [sendSignal, user],
  );

  const startCall = useCallback(
    async (target: PeerInfo, callKind: CallKind, conversationId?: string | null) => {
      if (!user) return;
      setError(null);
      setKind(callKind);
      setPeer(target);
      setState("calling");
      conversationRef.current = conversationId ?? null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callKind === "video",
        });
        setLocalStream(stream);

        const { data, error: insertError } = await supabase
          .from("call_sessions")
          .insert({
            conversation_id: conversationId ?? null,
            initiator_id: user.id,
            kind: callKind,
            scope: "internal",
            status: "ringing",
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        const newCallId = data.id as string;
        setCallId(newCallId);
        await supabase
          .from("call_participants")
          .insert([{ call_id: newCallId, user_id: target.id, state: "invited" }]);

        const pc = buildPeerConnection(target.id, newCallId, callKind, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignal(target.id, "offer", {
          callId: newCallId,
          kind: callKind,
          conversationId: conversationId ?? null,
          from: { id: user.id, name: user.name, initials: user.avatarInitials },
          sdp: offer,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start the call.");
        teardown();
        setState("idle");
      }
    },
    [buildPeerConnection, sendSignal, teardown, user],
  );

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer || !user) return;
    setState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: offer.kind === "video",
      });
      setLocalStream(stream);
      const pc = buildPeerConnection(offer.from.id, offer.callId, offer.kind, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp!));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase
        .from("call_sessions")
        .update({ status: "active", answered_at: new Date().toISOString() })
        .eq("id", offer.callId);

      await sendSignal(offer.from.id, "answer", {
        callId: offer.callId,
        kind: offer.kind,
        from: { id: user.id, name: user.name, initials: user.avatarInitials },
        sdp: answer,
      });
      setState("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the call.");
      teardown();
      setState("idle");
    }
  }, [buildPeerConnection, sendSignal, teardown, user]);

  const declineCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (offer && user) {
      await sendSignal(offer.from.id, "end", {
        callId: offer.callId,
        kind: offer.kind,
        from: { id: user.id, name: user.name, initials: user.avatarInitials },
        reason: "declined",
      });
      await supabase.from("call_sessions").update({ status: "declined" }).eq("id", offer.callId);
    }
    teardown();
    setState("idle");
    setPeer(null);
    setCallId(null);
  }, [sendSignal, teardown, user]);

  const hangUp = useCallback(async () => {
    if (peer && user && callId) {
      await sendSignal(peer.id, "end", {
        callId,
        kind,
        from: { id: user.id, name: user.name, initials: user.avatarInitials },
        reason: "hangup",
      });
    }
    await finishCall(answeredRef.current ? "ended" : "missed", seconds);
  }, [callId, finishCall, kind, peer, seconds, sendSignal, user]);

  // Inbound signalling channel for this user.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(channelName(user.id), {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (pcRef.current) {
          void sendSignal(signal.from.id, "end", { ...signal, reason: "busy" });
          return;
        }
        pendingOfferRef.current = signal;
        conversationRef.current = signal.conversationId ?? null;
        setKind(signal.kind);
        setPeer(signal.from);
        setCallId(signal.callId);
        setState("ringing");
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (!pcRef.current || !signal.sdp) return;
        void pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        answeredRef.current = true;
        setState("active");
      })
      .on("broadcast", { event: "ice" }, ({ payload }) => {
        const signal = payload as SignalPayload;
        if (!pcRef.current || !signal.candidate) return;
        void pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      })
      .on("broadcast", { event: "end" }, () => {
        void finishCall(answeredRef.current ? "ended" : "missed", seconds);
      })
      .subscribe();

    myChannelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      myChannelRef.current = null;
    };
  }, [finishCall, seconds, sendSignal, user]);

  useEffect(() => {
    if (state !== "active") return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach((track) => (track.enabled = !next));
      return next;
    });
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localStream?.getVideoTracks().forEach((track) => (track.enabled = !next));
      return next;
    });
  }, [localStream]);

  const value = useMemo<CallValue>(
    () => ({
      state,
      kind,
      peer,
      callId,
      muted,
      cameraOff,
      seconds,
      localStream,
      remoteStream,
      error,
      startCall,
      acceptCall,
      declineCall,
      hangUp,
      toggleMute,
      toggleCamera,
    }),
    [
      state,
      kind,
      peer,
      callId,
      muted,
      cameraOff,
      seconds,
      localStream,
      remoteStream,
      error,
      startCall,
      acceptCall,
      declineCall,
      hangUp,
      toggleMute,
      toggleCamera,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}

export { formatDuration };
