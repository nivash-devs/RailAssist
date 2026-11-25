"use client";

import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/headScripts";

type Theme = "light" | "dark";

/** Sun / moon button that switches between light and dark mode and remembers it. */
export function ThemeToggle({ toDark, toLight, withText = false }: { toDark: string; toLight: string; withText?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the theme the head script already set
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked: the switch still works for this visit */
    }
    setTheme(next);
  };

  const label = theme === "dark" ? toLight : toDark;
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
      title={label}
      className={`flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-card text-brand-900 shadow-sm transition hover:border-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 ${
        withText ? "px-5 text-[1rem] font-bold" : "w-12"
      }`}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
      {withText && theme && <span>{label}</span>}
    </button>
  );
}
