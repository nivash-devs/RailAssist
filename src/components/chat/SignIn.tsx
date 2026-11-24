"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { LangCode } from "@/lib/types";
import { LogoMark } from "../Logo";

export function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.4-4.8 7.1l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.4z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

/** First screen: sign in (or sign up, Google does both) or carry on without an account. */
export function SignIn({ lang, onGoogle, onGuest }: { lang: LangCode; onGoogle: () => Promise<void>; onGuest: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onGoogle();
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <main className="scroll-quiet grid min-h-0 flex-1 place-items-center overflow-y-auto px-4 py-8" lang={lang}>
      <div className="anim-fade-up w-full max-w-md rounded-3xl border border-line bg-card px-6 py-8 text-center">
        <div className="flex justify-center">
          <LogoMark size={64} />
        </div>
        <h1 className="mt-4 text-[1.625rem] font-bold leading-tight text-brand-900">{t(lang, "signInTitle")}</h1>
        <p className="mt-2 text-[1.0625rem] leading-snug text-muted">{t(lang, "signInBody")}</p>

        <button
          type="button"
          onClick={() => void go()}
          disabled={busy}
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-brand-800 bg-white px-4 text-[1.125rem] font-bold text-[#201b17] transition hover:bg-brand-50 active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleG className="h-6 w-6" />
          {t(lang, "continueGoogle")}
        </button>
        <p className="mt-2 text-[0.9375rem] leading-snug text-muted">{t(lang, "signInNew")}</p>

        {failed && (
          <p role="alert" className="mt-3 rounded-xl bg-accent-50 px-3 py-2 text-[0.9375rem] font-semibold text-accent-600">
            {t(lang, "signInFail")}
          </p>
        )}

        <div className="my-5 h-px bg-line" />

        <button
          type="button"
          onClick={onGuest}
          className="min-h-12 w-full rounded-2xl px-4 text-[1.0625rem] font-bold text-brand-800 transition hover:bg-brand-50"
        >
          {t(lang, "continueGuest")}
        </button>
        <p className="mt-1 text-[0.875rem] leading-snug text-muted">{t(lang, "guestNote")}</p>
      </div>
    </main>
  );
}
