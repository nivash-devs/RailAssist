"use client";

import { useEffect, useState } from "react";
import { isLang } from "@/lib/i18n";
import type { LangCode } from "@/lib/types";

/** The language the browser or phone is set to, if RailAssist supports it. */
function browserLang(): LangCode | null {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag?.toLowerCase().split("-")[0];
    if (isLang(code)) return code;
  }
  return null;
}

/**
 * Language choice is per page (passenger and family may differ).
 * `chosen` is null until we have looked, false on a first visit (show the language screen),
 * true once the person has picked one. `suggested` is the browser's language, for the first visit.
 */
export function useLang(page: string): { lang: LangCode; setLang: (l: LangCode) => void; chosen: boolean | null; suggested: LangCode | null } {
  const key = `railassist-lang-${page}`;
  const [lang, setLang] = useState<LangCode>("en");
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [suggested, setSuggested] = useState<LangCode | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key);
    } catch {
      /* ignore */
    }
    /* eslint-disable react-hooks/set-state-in-effect -- load saved choice after hydration */
    if (isLang(saved)) {
      setLang(saved);
      setChosen(true);
    } else {
      const guess = browserLang();
      if (guess) setLang(guess);
      setSuggested(guess);
      setChosen(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [key]);
  const update = (l: LangCode) => {
    setLang(l);
    setChosen(true);
    try {
      localStorage.setItem(key, l);
    } catch {
      /* ignore */
    }
  };
  return { lang, setLang: update, chosen, suggested };
}
