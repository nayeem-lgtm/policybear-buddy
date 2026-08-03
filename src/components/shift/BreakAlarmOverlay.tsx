import { useEffect, useRef } from "react";
import { AlarmClock, PhoneCall, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, useShift } from "@/context/ShiftContext";

/**
 * Full-screen red break-overrun alarm.
 * Plays an audible tone while active and escalates to an automatic inbound
 * call ring when the overrun passes the auto-call threshold.
 */
export function BreakAlarmOverlay() {
  const {
    alarmActive,
    overrunSeconds,
    autoCallRinging,
    acknowledgeAlarm,
    answerAutoCall,
    setStatus,
    status,
    config,
    testing,
    stopAlarmTest,
    escalated,
  } = useShift();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!alarmActive || !config.soundEnabled) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }
    if (typeof window === "undefined") return;

    let cancelled = false;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = audioCtxRef.current ?? new Ctor();
    audioCtxRef.current = ctx;
    void ctx.resume?.();

    const interval = setInterval(() => {
      if (cancelled || ctx.state !== "running") return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = autoCallRinging ? 880 : 620;
      gain.gain.value = 0.045;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }, 700);

    stopRef.current = () => clearInterval(interval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [alarmActive, autoCallRinging, config.soundEnabled]);

  if (!alarmActive) return null;

  return (
    <div className="alarm-pulse fixed inset-0 z-[100] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-white/15">
          <TriangleAlert className="size-10" />
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.3em] uppercase opacity-80">
          {testing ? "Alarm test in progress" : "Break allowance exceeded"}
        </p>
        <h1 className="mt-3 text-5xl font-bold tabular">
          +{formatDuration(overrunSeconds)}
        </h1>
        <p className="mt-4 text-sm/6 opacity-90">
          You are {formatDuration(overrunSeconds)} over your {status === "Lunch" ? "lunch" : "break"}{" "}
          allowance. Return to <span className="font-semibold">Available</span> now — this overrun is
          being recorded as an attendance exception and your team lead has been notified.
        </p>

        {autoCallRinging && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-white/25 bg-white/10 px-4 py-3">
            <PhoneCall className="ring-ping size-5" />
            <span className="text-sm font-medium">
              Automatic supervisor call ringing — CallTools · Owen Klein
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="ml-2"
              onClick={answerAutoCall}
            >
              Answer
            </Button>
          </div>
        )}

        {escalated && !testing && (
          <p className="mt-4 text-xs font-medium tracking-wide uppercase opacity-90">
            Escalated to HR · attendance exception filed
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {testing && (
            <Button size="lg" variant="secondary" onClick={stopAlarmTest}>
              End test
            </Button>
          )}
          {!testing && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setStatus("Available", "Returned from overrun")}
          >
            <AlarmClock className="size-4" />
            Return to Available
          </Button>
          )}
          {config.allowAcknowledge && (
          <Button
            size="lg"
            variant="ghost"
            className="border border-white/40 text-white hover:bg-white/15 hover:text-white"
            onClick={acknowledgeAlarm}
          >
            Acknowledge &amp; keep timer running
          </Button>
          )}
        </div>
      </div>
    </div>
  );
}
