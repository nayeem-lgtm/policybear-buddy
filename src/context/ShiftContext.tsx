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
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/context/AuthContext";
import type { PresenceStatus } from "@/lib/mock-data";
import {
  getMyShiftDay,
  recordStatusChange,
  shiftHeartbeat,
  startShiftSession,
} from "@/lib/shift.functions";
import {
  formatClock,
  workedSeconds as computeWorked,
  type ShiftDay,
  type ShiftSessionRow,
} from "@/lib/shift-shared";


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

/** Operator-configurable alarm + auto-call policy (Break Alarm Control screen). */
export interface AlarmConfig {
  breakAllowanceSeconds: number;
  lunchAllowanceSeconds: number;
  autoCallAfterSeconds: number;
  escalateAfterSeconds: number;
  alarmEnabled: boolean;
  soundEnabled: boolean;
  autoCallEnabled: boolean;
  allowAcknowledge: boolean;
  supervisor: string;
}

export const DEFAULT_ALARM_CONFIG: AlarmConfig = {
  breakAllowanceSeconds: BREAK_ALLOWANCE_SECONDS,
  lunchAllowanceSeconds: LUNCH_ALLOWANCE_SECONDS,
  autoCallAfterSeconds: AUTO_CALL_AFTER_OVERRUN_SECONDS,
  escalateAfterSeconds: ESCALATION_AFTER_OVERRUN_SECONDS,
  alarmEnabled: true,
  soundEnabled: true,
  autoCallEnabled: true,
  allowAcknowledge: true,
  supervisor: "Owen Klein · Team Lead",
};

interface ShiftContextValue {
  status: PresenceStatus;
  statusSeconds: number;
  signedIn: boolean;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  config: AlarmConfig;
  updateConfig: (patch: Partial<AlarmConfig>) => void;
  resetConfig: () => void;
  allowanceSeconds: number | null;
  overrunSeconds: number;
  alarmActive: boolean;
  autoCallRinging: boolean;
  escalated: boolean;
  testing: boolean;
  startAlarmTest: (kind?: "Break" | "Lunch") => void;
  stopAlarmTest: () => void;
  events: ShiftEvent[];
  setStatus: (status: PresenceStatus, detail?: string) => void;
  acknowledgeAlarm: () => void;
  answerAutoCall: () => void;
  confirmations: Record<string, boolean>;
  toggleConfirmation: (key: string) => void;
  /** Persisted attendance record for today (null until the session is opened). */
  session: ShiftSessionRow | null;
  /** Live totals: persisted buckets plus the seconds elapsed in the current status. */
  totals: {
    availableSeconds: number;
    onCallSeconds: number;
    breakSeconds: number;
    lunchSeconds: number;
    meetingSeconds: number;
    trainingSeconds: number;
    unavailableSeconds: number;
    workedSeconds: number;
    breakOverrunSeconds: number;
    lunchOverrunSeconds: number;
  };
  signedInAt: string | null;
  signedOutAt: string | null;
  syncing: boolean;
  refreshSession: () => Promise<void>;
}


const ShiftContext = createContext<ShiftContextValue | null>(null);

function clockLabel(offsetSeconds = 0) {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const TONE_FOR_STATUS: Record<string, ShiftEvent["tone"]> = {
  Break: "warning",
  Lunch: "warning",
  Available: "info",
  "Signed Out": "muted",
};

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatusState] = useState<PresenceStatus>("Available");
  const [statusSeconds, setStatusSeconds] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [alarmAcknowledgedAt, setAlarmAcknowledgedAt] = useState<number | null>(null);
  const [autoCallAnswered, setAutoCallAnswered] = useState(false);
  const [config, setConfig] = useState<AlarmConfig>(DEFAULT_ALARM_CONFIG);
  const [testKind, setTestKind] = useState<"Break" | "Lunch" | null>(null);
  const [session, setSession] = useState<ShiftSessionRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<ShiftEvent[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({
    "Google Meet joined": true,
    "Camera on": true,
    "CallTools opened": true,
    "Ready for calls": false,
  });

  const startSession = useServerFn(startShiftSession);
  const pushStatus = useServerFn(recordStatusChange);
  const heartbeat = useServerFn(shiftHeartbeat);
  const loadDay = useServerFn(getMyShiftDay);

  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tick.current = setInterval(() => setStatusSeconds((s) => s + 1), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const applyDay = useCallback((day: ShiftDay) => {
    setSession(day.session);
    if (day.session) {
      setStatusState(day.session.current_status as PresenceStatus);
      setStatusSeconds(
        Math.max(
          0,
          Math.round((Date.now() - new Date(day.session.current_status_at).getTime()) / 1000),
        ),
      );
    }
    setEvents(
      day.events.map((e) => ({
        time: formatClock(e.started_at),
        event: e.status,
        detail: e.detail ?? "",
        tone: TONE_FOR_STATUS[e.status] ?? "brand",
      })),
    );
  }, []);

  const refreshSession = useCallback(async () => {
    if (!user) return;
    try {
      const day = (await loadDay()) as ShiftDay;
      applyDay(day);
    } catch {
      /* offline / not signed in — keep local state */
    }
  }, [user, loadDay, applyDay]);

  /** Automatic sign-in: opening the CRM starts (or resumes) today's shift record. */
  useEffect(() => {
    if (!user) {
      setSession(null);
      setEvents([]);
      return;
    }
    let active = true;
    void (async () => {
      setSyncing(true);
      try {
        await startSession({ data: {} });
        const day = (await loadDay()) as ShiftDay;
        if (active) applyDay(day);
      } catch {
        /* leave local-only state in place */
      } finally {
        if (active) setSyncing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, startSession, loadDay, applyDay]);

  /** Heartbeat so a forgotten session auto-closes at the last real activity. */
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      void heartbeat().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(id);
  }, [user, heartbeat]);


  const allowanceSeconds = useMemo(() => {
    if (testKind) return 0;
    if (status === "Break")
      return demoMode ? DEMO_BREAK_ALLOWANCE_SECONDS : config.breakAllowanceSeconds;
    if (status === "Lunch")
      return demoMode ? DEMO_LUNCH_ALLOWANCE_SECONDS : config.lunchAllowanceSeconds;
    return null;
  }, [status, demoMode, testKind, config.breakAllowanceSeconds, config.lunchAllowanceSeconds]);

  const overrunSeconds =
    allowanceSeconds === null ? 0 : Math.max(0, statusSeconds - allowanceSeconds);

  const alarmActive =
    config.alarmEnabled &&
    overrunSeconds > 0 &&
    (alarmAcknowledgedAt === null || !config.allowAcknowledge);

  const autoCallThreshold = demoMode ? DEMO_AUTO_CALL_SECONDS : config.autoCallAfterSeconds;
  const autoCallRinging =
    config.autoCallEnabled && overrunSeconds >= autoCallThreshold && !autoCallAnswered;
  const escalated = overrunSeconds >= (demoMode ? autoCallThreshold * 2 : config.escalateAfterSeconds);


  const setStatus = useCallback(
    (next: PresenceStatus, detail?: string) => {
      setStatusState(next);
      setStatusSeconds(0);
      setTestKind(null);
      setAlarmAcknowledgedAt(null);
      setAutoCallAnswered(false);
      const resolvedDetail =
        detail ??
        (next === "Break"
          ? "Allowance 15 minutes"
          : next === "Lunch"
            ? "Allowance 30 minutes"
            : next === "Available"
              ? "Ready for calls"
              : "");
      setEvents((prev) => [
        ...prev,
        {
          time: clockLabel(),
          event: next,
          detail: resolvedDetail,
          tone: TONE_FOR_STATUS[next] ?? "brand",
        },
      ]);

      if (!user) return;
      const allowance =
        next === "Break"
          ? demoMode
            ? DEMO_BREAK_ALLOWANCE_SECONDS
            : config.breakAllowanceSeconds
          : next === "Lunch"
            ? demoMode
              ? DEMO_LUNCH_ALLOWANCE_SECONDS
              : config.lunchAllowanceSeconds
            : null;

      void (async () => {
        setSyncing(true);
        try {
          // Re-open today's record when the agent signs back in after signing out.
          if (next !== "Signed Out" && (!session || session.signed_out_at)) {
            await startSession({ data: { detail: resolvedDetail } });
          }
          const updated = await pushStatus({
            data: { status: next, detail: resolvedDetail, allowanceSeconds: allowance },
          });
          if (updated) setSession(updated as ShiftSessionRow);
        } catch {
          /* keep local state; the next refresh reconciles */
        } finally {
          setSyncing(false);
        }
      })();
    },
    [
      user,
      session,
      demoMode,
      config.breakAllowanceSeconds,
      config.lunchAllowanceSeconds,
      startSession,
      pushStatus,
    ],
  );


  const logEvent = useCallback((event: ShiftEvent) => setEvents((prev) => [...prev, event]), []);

  const startAlarmTest = useCallback(
    (kind: "Break" | "Lunch" = "Break") => {
      setTestKind(kind);
      setStatusState(kind);
      setStatusSeconds(0);
      setAlarmAcknowledgedAt(null);
      setAutoCallAnswered(false);
      logEvent({
        time: clockLabel(),
        event: "Alarm test started",
        detail: `${kind} overrun simulation — no attendance exception recorded`,
        tone: "warning",
      });
    },
    [logEvent],
  );

  const stopAlarmTest = useCallback(() => {
    setTestKind(null);
    setStatusState("Available");
    setStatusSeconds(0);
    setAlarmAcknowledgedAt(null);
    setAutoCallAnswered(false);
    logEvent({
      time: clockLabel(),
      event: "Alarm test ended",
      detail: "Presence returned to Available",
      tone: "info",
    });
  }, [logEvent]);

  const value: ShiftContextValue = {
    status,
    statusSeconds,
    signedIn: status !== "Signed Out",
    demoMode,
    setDemoMode,
    config,
    updateConfig: (patch) => setConfig((c) => ({ ...c, ...patch })),
    resetConfig: () => setConfig(DEFAULT_ALARM_CONFIG),
    allowanceSeconds,
    overrunSeconds,
    alarmActive,
    autoCallRinging,
    escalated,
    testing: testKind !== null,
    startAlarmTest,
    stopAlarmTest,
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
