"use client";

import { useEffect, useState } from "react";
import { SIZE_KEY } from "@/lib/headScripts";

const SIZES = ["1", "2", "3"] as const;
type Size = (typeof SIZES)[number];


/** Cycles normal, bigger, biggest text. All sizes are in rem, so the whole page grows. */
export function TextSize({ label }: { label: string }) {
  const [size, setSize] = useState<Size>("1");

  useEffect(() => {
    const s = document.documentElement.dataset.size;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the size the head script already set
    if (s === "2" || s === "3") setSize(s);
  }, []);

  const next = () => {
    const now = (document.documentElement.dataset.size ?? "1") as Size;
    const n = SIZES[(SIZES.indexOf(now) + 1) % SIZES.length];
    if (n === "1") delete document.documentElement.dataset.size;
    else document.documentElement.dataset.size = n;
    try {
      localStorage.setItem(SIZE_KEY, n);
    } catch {
      /* storage blocked: still works for this visit */
    }
    setSize(n);
  };

  return (
    <button
      type="button"
      onClick={next}
      aria-label={label}
      title={label}
      className="grid h-12 min-w-12 shrink-0 place-items-center rounded-full border border-line bg-card px-3 font-bold text-brand-900 shadow-sm transition hover:border-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
    >
      <span aria-hidden className="leading-none">
        A<span className="text-[0.75em]">{size === "1" ? "" : size === "2" ? "+" : "++"}</span>
      </span>
    </button>
  );
}
