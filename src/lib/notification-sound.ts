"use client";

/**
 * Admin-dashboard notification sound.
 *
 * Default: bundled WAV chimes in /public/sounds. Admin can override per type
 * with an uploaded file (URL in settings.notification_sounds) — when no
 * custom URL is set the bundled file plays, and if audio is unavailable the
 * Web Audio tone fallback still sounds.
 *
 * Browsers block audio before any user gesture: the context/elements are
 * unlocked on the first pointer/key interaction, requests before that are
 * silently skipped — never throws.
 */

export type NotificationSoundKind = "order" | "payment" | "review" | "test";

export interface SoundSetting {
  enabled: boolean;
  volume: number; // 0–100
  url?: string | null;
}

const DEFAULT_FILES: Record<NotificationSoundKind, string> = {
  order: "/sounds/order.wav",
  payment: "/sounds/payment.wav",
  review: "/sounds/review.wav",
  test: "/sounds/order.wav",
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterVolume = 0.5;
let unlocked = false;
const settings = new Map<NotificationSoundKind, SoundSetting>();

export function setSoundSettings(kind: NotificationSoundKind, s: SoundSetting) {
  settings.set(kind, s);
}

if (typeof window !== "undefined" && !unlocked) {
  const unlock = () => {
    unlocked = true;
    void ensureContext();
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = masterVolume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, gainValue: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainValue, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(gain).connect(master ?? ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur);
}

function playToneFallback(kind: NotificationSoundKind) {
  const ac = ensureContext();
  if (!ac) return;
  try {
    if (kind === "order") {
      tone(ac, 880, 0, 0.18, 0.16);
      tone(ac, 1320, 0.12, 0.22, 0.14);
    } else if (kind === "payment") {
      tone(ac, 1046, 0, 0.15, 0.14);
      tone(ac, 1568, 0.1, 0.2, 0.12);
    } else {
      tone(ac, 659, 0, 0.16, 0.12);
      tone(ac, 988, 0.12, 0.18, 0.1);
    }
  } catch {
    // Cosmetic only — never break the dashboard.
  }
}

/** Set master volume 0–1 (from the admin settings slider). */
export function setNotificationVolume(v: number) {
  masterVolume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
  if (ctx && master) master.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.03);
}

/** Play the chime for a kind. No-op when disabled or audio is still locked.
 *  `urlOverride` lets the settings page test the just-uploaded file before
 *  props refresh and repopulate the map. */
export async function playNotificationSound(kind: NotificationSoundKind, urlOverride?: string) {
  const s = settings.get(kind);
  if (s && s.enabled === false && kind !== "test") return;
  const vol = s ? Math.min(1, Math.max(0, s.volume / 100)) : masterVolume;
  const url = urlOverride || s?.url || DEFAULT_FILES[kind];
  ensureContext();
  try {
    const audio = new Audio(url);
    audio.volume = vol;
    await audio.play();
  } catch {
    masterVolume = vol;
    setNotificationVolume(vol);
    playToneFallback(kind);
  }
}
