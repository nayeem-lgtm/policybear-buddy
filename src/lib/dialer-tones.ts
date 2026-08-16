/**
 * Browser-only audio helpers for the agent desk softphone.
 * Real DTMF keypad tones plus a soft inbound ring, synthesised with WebAudio so
 * no audio assets are needed. All functions are no-ops during SSR.
 */

const DTMF: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Play the authentic dual-tone for a keypad key. */
export function playDtmf(key: string, volume = 0.14) {
  const pair = DTMF[key];
  const ac = audioContext();
  if (!pair || !ac) return;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
  gain.connect(ac.destination);
  for (const freq of pair) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    osc.stop(ac.currentTime + 0.18);
  }
}

/** Short two-note chirp used when a call connects or an outcome is saved. */
export function playChirp(up = true, volume = 0.1) {
  const ac = audioContext();
  if (!ac) return;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
  gain.connect(ac.destination);
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(up ? 620 : 880, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(up ? 980 : 480, ac.currentTime + 0.22);
  osc.connect(gain);
  osc.start();
  osc.stop(ac.currentTime + 0.3);
}

/** One ring burst (two short pulses) for a waiting inbound caller. */
export function playRing(volume = 0.12) {
  const ac = audioContext();
  if (!ac) return;
  for (const offset of [0, 0.42]) {
    const t = ac.currentTime + offset;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    gain.connect(ac.destination);
    for (const freq of [440, 480]) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.34);
    }
  }
}
