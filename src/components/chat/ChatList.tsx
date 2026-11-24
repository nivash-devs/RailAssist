"use client";

import { useState } from "react";
import type { ChatMeta } from "@/lib/chatStore";
import { t } from "@/lib/i18n";
import type { LangCode } from "@/lib/types";

const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

/** Saved chats: open one, start a new one, delete one or all. Used in the PC side panel and the phone drawer. */
export function ChatList({
  lang,
  chats,
  activeId,
  name,
  disabled,
  onOpen,
  onNew,
  onDelete,
  onDeleteAll,
  onSignOut,
}: {
  lang: LangCode;
  chats: ChatMeta[];
  activeId: string | null;
  name: string;
  disabled: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onSignOut: () => void;
}) {
  const [confirm, setConfirm] = useState<string | "all" | null>(null);
  const draft = activeId !== null && !chats.some((c) => c.id === activeId);

  return (
    <div className="flex h-full min-h-0 flex-col" lang={lang}>
      <div className="shrink-0 px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-800 px-4 text-[1.0625rem] font-bold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          <PlusIcon className="h-5 w-5" />
          {t(lang, "newChatShort")}
        </button>
        <h2 className="mt-4 text-[0.875rem] font-bold uppercase tracking-wide text-brand-900">{t(lang, "myChats")}</h2>
      </div>

      <ul className="scroll-quiet min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-2">
        {draft && (
          <li>
            <div className="rounded-xl border-2 border-brand-800 bg-brand-50 px-3 py-3 text-[1rem] font-semibold text-brand-900">{t(lang, "untitledChat")}</div>
          </li>
        )}
        {!draft && chats.length === 0 && <li className="px-2 py-2 text-[0.9375rem] text-muted">{t(lang, "noChats")}</li>}
        {chats.map((c) => (
          <li key={c.id}>
            {confirm === c.id ? (
              <div className="rounded-xl border-2 border-brand-800 bg-card px-3 py-3" role="alertdialog" aria-label={t(lang, "deleteAsk")}>
                <p className="text-[1rem] font-semibold text-ink">{t(lang, "deleteAsk")}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirm(null);
                      onDelete(c.id);
                    }}
                    className="min-h-12 flex-1 rounded-xl bg-brand-800 px-2 text-[0.9375rem] font-bold text-white"
                  >
                    {t(lang, "deleteYes")}
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="min-h-12 flex-1 rounded-xl border border-line px-2 text-[0.9375rem] font-bold text-brand-900">
                    {t(lang, "cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`flex items-stretch rounded-xl border ${c.id === activeId ? "border-2 border-brand-800 bg-brand-50" : "border-line bg-card"}`}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  disabled={disabled}
                  aria-current={c.id === activeId ? "true" : undefined}
                  className="min-h-12 min-w-0 flex-1 truncate px-3 py-3 text-left text-[1rem] font-semibold text-ink disabled:opacity-60"
                >
                  {c.title || t(lang, "untitledChat")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(c.id)}
                  aria-label={`${t(lang, "deleteChat")}: ${c.title || t(lang, "untitledChat")}`}
                  title={t(lang, "deleteChat")}
                  className="grid w-12 shrink-0 place-items-center rounded-r-xl text-muted transition hover:text-brand-800"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="shrink-0 space-y-2 border-t border-line px-4 py-3">
        <p className="truncate text-[0.875rem] text-muted">{t(lang, "signedInAs", { name })}</p>
        {confirm === "all" ? (
          <div className="rounded-xl border-2 border-brand-800 px-3 py-3" role="alertdialog" aria-label={t(lang, "deleteAllAsk")}>
            <p className="text-[0.9375rem] font-semibold text-ink">{t(lang, "deleteAllAsk")}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  onDeleteAll();
                }}
                className="min-h-12 flex-1 rounded-xl bg-brand-800 px-2 text-[0.9375rem] font-bold text-white"
              >
                {t(lang, "deleteYes")}
              </button>
              <button type="button" onClick={() => setConfirm(null)} className="min-h-12 flex-1 rounded-xl border border-line px-2 text-[0.9375rem] font-bold text-brand-900">
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {chats.length > 0 && (
              <button type="button" onClick={() => setConfirm("all")} className="min-h-12 w-full rounded-xl border border-line px-3 text-[0.9375rem] font-semibold text-brand-900 transition hover:border-brand-800">
                {t(lang, "deleteAll")}
              </button>
            )}
            <button type="button" onClick={onSignOut} className="min-h-12 w-full rounded-xl px-3 text-[0.9375rem] font-semibold text-muted transition hover:text-brand-800">
              {t(lang, "signOut")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
