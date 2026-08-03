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
import type { PresenceStatus } from "@/lib/mock-data";

/**
 * Shift + presence state for the signed-in employee.
 *
 * Break rules (Policy Bear standard Pacific shift 07:00–16:00):
 *  - Break 1  09:00–09:15  → 15 minute allowance
 *  - Lunch    11:00–11:30  → 30 minute allowance
 *  - Break 2  13:30–13:45  → 15 minute allowance
 *
 * Escalation once the allowance is exceeded:
 *  1. Grace 0s      → red full-screen alarm + audible alert
 *  2. +120s         → automatic call-back ring to the agent (auto-dial)
 *  3. +300s         → team lead + HR notified (handled server-side later)
 */

export const BREAK_ALLOWANCE_SECONDS = 15 * 60;
export const LUNCH_ALLOWANCE_SECONDS = 30 * 60;
export const AUTO_CALL_AFTER_OVERRUN_SECONDS = 120;
export const ESCALATION_AFTER_OVERRUN_SECONDS = 300;

/** Demo-friendly: shorten timers so the alarm behaviour is reviewable. */
export const DEMO_BREAK_ALLOWANCE_SECONDS = 20;
export const DEMO_LUNCH_ALLOWANCE_SECONDS = 30;
export const DEMO_AUTO_CALL_SECONDS = 10;

export interface ShiftEvent {
  time: string;
  event: string;
  detail: string;
  tone: "success" | "info" | "brand" | "muted" | "warning" | "danger";
}

interface ShiftContextValue {
  status: PresenceStatus;
  statusSeconds: number;
  signedIn: boolean;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  allowanceSeconds: number | null;
  overrunSeconds: number;
  alarmActive: boolean;
  autoCallRinging: boolean;
  events: ShiftEvent[];
  setStatus: (status: PresenceStatus, detail?: string) => void;
  acknowledgeAlarm: () => void;
  answerAutoCall: () => void;
  confirmations: Record<string, boolean>;
  toggleConfirmation: (key: string) => void;
}

const ShiftContext = createContext<ShiftContextValue | null>(null);

function clockLabel(offsetSeconds = 0) {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [status, setStatusState] = useState<PresenceStatus>("Available");
  const [statusSeconds, setStatusSeconds] = useState(0);
  const [demoMode, setDemoMode] = useState(true);
  const [alarmAcknowledgedAt, setAlarmAcknowledgedAt] = useState<number | null>(null);
  const [autoCallAnswered, setAutoCallAnswered] = useState(false);
  const [events, setEvents] = useState<ShiftEvent[]>([
    { time: "07:00", event: "Sign In", detail: "CRM · CallTools · Google Meet confirmed", tone: "success" },
    { time: "07:04", event: "Available", detail: "Ready for calls", tone: "info" },
  ]);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({
    "Google Meet joined": true,
    "Camera on": true,
    "CallTools opened": true,
    "Ready for calls": false,
  });

  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tick.current = setInterval(() => setStatusSeconds((s) => s + 1), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const allowanceSeconds = useMemo(() => {
    if (status === "Break") return demoMode ? DEMO_BREAK_ALLOWANCE_SECONDS : BREAK_ALLOWANCE_SECONDS;
    if (status === "Lunch") return demoMode ? DEMO_LUNCH_ALLOWANCE_SECONDS : LUNCH_ALLOWANCE_SECONDS;
    return null;
  }, [status, demoMode]);

  const overrunSeconds =
    allowanceSeconds === null ? 0 : Math.max(0, statusSeconds - allowanceSeconds);

  const alarmActive = overrunSeconds > 0 && alarmAcknowledgedAt === null;

  const autoCallThreshold = demoMode ? DEMO_AUTO_CALL_SECONDS : AUTO_CALL_AFTER_OVERRUN_SECONDS;
  const autoCallRinging = overrunSeconds >= autoCallThreshold && !autoCallAnswered;

  const setStatus = useCallback((next: PresenceStatus, detail?: string) => {
    setStatusState(next);
    setStatusSeconds(0);
    setAlarmAcknowledgedAt(null);
    setAutoCallAnswered(false);
    setEvents((prev) => [
      ...prev,
      {
        time: clockLabel(),
        event: next,
        detail:
          detail ??
          (next === "Break"
            ? "Allowance 15 minutes"
            : next === "Lunch"
              ? "Allowance 30 minutes"
              : next === "Available"
                ? "Ready for calls"
                : ""),
        tone:
          next === "Break" || next === "Lunch"
            ? "warning"
            : next === "Available"
              ? "info"
              : next === "Signed Out"
                ? "muted"
                : "brand",
      },
    ]);
  }, []);

  const value: ShiftContextValue = {
    status,
    statusSeconds,
    signedIn: status !== "Signed Out",
    demoMode,
    setDemoMode,
    allowanceSeconds,
    overrunSeconds,
    alarmActive,
    autoCallRinging,
    events,
    setStatus,
    acknowledgeAlarm: () => setAlarmAcknowledgedAt(Date.now()),
    answerAutoCall: () => setAutoCallAnswered(true),
    confirmations,
    toggleConfirmation: (key) =>
      setConfirmations((c) => ({ ...c, [key]: !c[key] })),
  };

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShift must be used inside <ShiftProvider>");
  return ctx;
}

export function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
