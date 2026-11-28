"use client";

import { LANGUAGES } from "@/lib/i18n";
import type { LangCode } from "@/lib/types";

/** First visit: big buttons, one per language, each written in its own script. */
export function LangGate({ suggested, onPick }: { suggested: LangCode | null; onPick: (l: LangCode) => void }) {
  const list = [...LANGUAGES].sort((a, b) => (a.code === suggested ? -1 : b.code === suggested ? 1 : 0));
  return (
    <main className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="anim-fade-up mx-auto w-full max-w-3xl">
        <h1 className="text-center text-[1.375rem] font-extrabold leading-snug text-brand-900 sm:text-[1.75rem]">Choose your language</h1>
        <p className="mt-1 text-center text-[1.0625rem] text-muted">अपनी भाषा चुनें</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {list.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onPick(l.code)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 text-center transition active:scale-[0.97] ${
                l.code === suggested ? "col-span-2 border-brand-800 bg-brand-50 sm:col-span-3" : "border-line bg-card hover:border-brand-800"
              }`}
            >
              <span className="text-[1.25rem] font-bold leading-tight text-brand-900">{l.native}</span>
              {l.english !== l.native && <span className="text-[0.9375rem] text-muted">{l.english}</span>}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
