/**
 * Phone helpers shared by telephony ingest and the scrubbing/attribution matcher.
 * Matching is only deterministic when both sides normalise identically, so every
 * provider record and every lookup must go through `normalizeE164`.
 */

/** Best-effort E.164 normalisation for US/CA-centric numbers. Returns null when unusable. */
export function normalizeE164(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[^\d+]/g, "");
  if (!digits) return null;
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  d = d.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

/** (555) 010-1234 style display for a stored E.164 value. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

/** Talk time as m:ss. */
export function formatTalk(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
