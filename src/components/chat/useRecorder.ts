"use client";

import { useEffect, useRef, useState } from "react";
import type { LangCode } from "@/lib/types";

export type MicState = "idle" | "recording" | "transcribing";
type MicError = "micError" | "micBlocked" | "transcribeError";

const MAX_RECORD_MS = 30_000;
/** How many bars the live level meter shows. */
export const METER_BARS = 28;
const EMPTY_BARS: number[] = Array(METER_BARS).fill(0);

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

/** Tap to record, tap again to stop; the speech is turned into text with Groq Whisper. */
export function useRecorder(lang: LangCode, onText: (text: string) => void, onError: (e: MicError) => void) {
  const [state, setState] = useState<MicState>("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meterRef = useRef<(() => void) | null>(null);
  // 0..1 loudness of the last moments, oldest first, drawn as the live bar while recording.
  const [bars, setBars] = useState<number[]>(EMPTY_BARS);

  /** Listen to the mic level and feed it to the bars. Returns a function that stops it. */
  const startMeter = (stream: MediaStream) => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let history = EMPTY_BARS;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 55) return;
      last = now;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const level = Math.min(1, Math.sqrt(sum / data.length) * 5);
      history = [...history.slice(1), level];
      setBars(history);
    };
    raf = requestAnimationFrame(tick);
    meterRef.current = () => {
      cancelAnimationFrame(raf);
      void ctx.close().catch(() => {});
      meterRef.current = null;
      setBars(EMPTY_BARS);
    };
  };

  useEffect(
    () => () => {
      meterRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
      recRef.current?.stream.getTracks().forEach((tr) => tr.stop());
    },
    [],
  );

  const fail = (e: MicError) => {
    setState("idle");
    onError(e);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return fail("micError");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      // Permission denied or blocked by the browser: tell them how to allow it. Anything else (no mic found): the generic message.
      const name = (e as { name?: string })?.name;
      return fail(name === "NotAllowedError" || name === "SecurityError" ? "micBlocked" : "micError");
    }
    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      meterRef.current?.();
      stream.getTracks().forEach((tr) => tr.stop());
      if (timerRef.current) clearTimeout(timerRef.current);
      const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
      if (blob.size < 1000) return fail("transcribeError");
      setState("transcribing");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "speech");
        fd.append("language", lang);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as { text?: string };
        if (!res.ok || !data.text) return fail("transcribeError");
        setState("idle");
        onText(data.text);
      } catch {
        fail("transcribeError");
      }
    };
    recRef.current = rec;
    rec.start();
    startMeter(stream);
    setState("recording");
    timerRef.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS);
  };

  const toggle = () => {
    if (state === "recording") recRef.current?.stop();
    else if (state === "idle") void start();
  };

  return { state, toggle, bars };
}
