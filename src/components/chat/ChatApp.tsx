"use client";

import { useEffect, useRef, useState } from "react";
import type { BotReply, ChatMessage, ChatNeed, Where } from "@/lib/chat";
import { offlineReply, PLANNABLE } from "@/lib/chat";
import { generalLinks, helplineContacts, serviceContacts, SERVICE_COST } from "@/lib/contacts";
import { needLabel, t, type TKey } from "@/lib/i18n";
import type { LangCode, NeedType } from "@/lib/types";
import { ListIcon, MicIcon, NeedIcon, PhoneIcon, StopIcon } from "../Icons";
import { LangPicker } from "../LangPicker";
import { Logo } from "../Logo";
import { deleteAllChats, deleteChat, loadMessages, saveChat as saveCloudChat, watchChats, type ChatMeta } from "@/lib/chatStore";
import { ChatList } from "./ChatList";
import { InstallPrompt } from "./InstallPrompt";
import { GoogleG, SignIn } from "./SignIn";
import { useAccount } from "./useAccount";
import { useLang } from "../useLang";
import { TextSize } from "../TextSize";
import { ThemeToggle } from "../ThemeToggle";
import { GetIt } from "./GetIt";
import { useRecorder } from "./useRecorder";

const STORE_KEY = "railassist-chat";
const GUEST_KEY = "railassist-guest";
const uid = () => Math.random().toString(36).slice(2, 10);

const WHERE_KEY: Record<Where, TKey | null> = {
  boarding: "whereBoarding",
  arrival: "whereArrival",
  onboard: "whereOnboard",
  any: null,
};

const SUGGESTIONS: TKey[] = ["suggestWheelchair", "suggestBags", "suggestFood", "suggestMedical"];

type View = "ask" | "services" | "help";
const VIEWS: { id: View; key: TKey; Icon: (p: { className?: string }) => React.ReactNode }[] = [
  { id: "ask", key: "navAsk", Icon: MicIcon },
  { id: "services", key: "navServices", Icon: ListIcon },
  { id: "help", key: "navHelp", Icon: PhoneIcon },
];

/** The chat lives only in this browser (localStorage). Nobody else can see it. */
function loadChat(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveChat(m: ChatMessage[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(m.slice(-60)));
  } catch {
    /* storage full or blocked: chat still works for this visit */
  }
}

/** What we send to the AI: the visible conversation as plain text. */
function toApi(messages: ChatMessage[]) {
  return messages.map((m) => {
    if (m.role === "user") return { role: "user", content: m.text };
    const b = m.bot;
    const needs = b?.needs.length ? `\n(Needs listed: ${b.needs.map((n) => `${n.type} @ ${n.where}`).join(", ")})` : "";
    return { role: "assistant", content: (b?.reply ?? m.text) + needs };
  });
}

export function ChatApp() {
  const [lang, setLang] = useLang("passenger");
  const acct = useAccount();
  const userId = acct.user?.uid ?? null;
  const [guest, setGuest] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("ask");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const activeRef = useRef<string | null>(null);
  const savedKey = useRef("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // "login": ask to sign in. "cloud": signed in, chats saved in Firestore. "local": no account, chat saved on this device.
  const mode: "loading" | "login" | "cloud" | "local" = !acct.ready || guest === null ? "loading" : userId ? "cloud" : acct.enabled && !guest ? "login" : "local";
  const inApp = mode === "cloud" || mode === "local";

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved "continue without signing in" choice after mount
      setGuest(localStorage.getItem(GUEST_KEY) === "1");
    } catch {
      setGuest(false);
    }
  }, []);

  // No account: the chat lives only in this browser.
  useEffect(() => {
    if (mode !== "local") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load this device's chat once we know there is no account
    setMessages(loadChat());
    setLoaded(true);
  }, [mode]);
  useEffect(() => {
    if (mode === "local" && loaded) saveChat(messages);
    // Keep the welcome message in view until the chat starts.
    if (view === "ask" && (messages.length || busy)) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loaded, busy, view, mode]);

  /** Open a saved chat, or a fresh empty one. */
  const openChat = (id: string, isNew: boolean) => {
    activeRef.current = id;
    setActiveId(id);
    setMessages([]);
    setNotice(null);
    setDrawer(false);
    setView("ask");
    if (isNew || !userId) {
      savedKey.current = `${id}:0`;
      setLoaded(true);
      return;
    }
    setLoaded(false);
    loadMessages(userId, id)
      .then((m) => {
        if (activeRef.current !== id) return;
        savedKey.current = `${id}:${m.length}`;
        setMessages(m);
        setLoaded(true);
      })
      .catch(() => {
        if (activeRef.current !== id) return;
        setNotice(t(lang, "saveFail"));
        setLoaded(true);
      });
  };

  // Signed in: follow this person's saved chats, and open the latest one (or a new one).
  useEffect(() => {
    if (!userId) return;
    let first = true;
    const unsubscribe = watchChats(
      userId,
      (list) => {
        setChats(list);
        if (first) {
          first = false;
          openChat(list[0]?.id ?? uid(), !list.length);
        }
      },
      () => setNotice(t(lang, "saveFail")),
    );
    return () => {
      unsubscribe();
      activeRef.current = null;
      setChats([]);
      setActiveId(null);
      setMessages([]);
      setLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only restart when the person signs in or out
  }, [userId]);

  // Save the open chat to Firestore whenever it changes (not when it was only just opened).
  useEffect(() => {
    if (mode !== "cloud" || !userId || !activeId || !loaded || messages.length === 0) return;
    const key = `${activeId}:${messages.length}`;
    if (savedKey.current === key) return;
    savedKey.current = key;
    const title = (messages.find((m) => m.role === "user")?.text ?? "").slice(0, 60);
    saveCloudChat(userId, activeId, title, messages).catch(() => setNotice(t(lang, "saveFail")));
  }, [messages, activeId, loaded, userId, mode, lang]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || busy || !inApp || (mode === "cloud" && !loaded)) return;
    setView("ask");
    setNotice(null);
    setText("");
    const userMsg: ChatMessage = { id: uid(), role: "user", text: content, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);
    let reply: BotReply;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toApi(next), lang }),
      });
      const data = (await res.json()) as { reply?: BotReply };
      reply = res.ok && data.reply ? data.reply : offlineReply(content, lang);
    } catch {
      // No connection: answer on this device so the chat never dead-ends.
      reply = offlineReply(content, lang);
    }
    setMessages((m) => [...m, { id: uid(), role: "bot", text: reply.reply, bot: reply, ts: Date.now() }]);
    setBusy(false);
  };

  const mic = useRecorder(
    lang,
    (heard) => void send(heard),
    (e) => {
      setNotice(t(lang, e));
      inputRef.current?.focus();
    },
  );

  const newChat = () => {
    if (mode === "cloud") {
      if (messages.length === 0) {
        setDrawer(false);
        setView("ask");
      } else openChat(uid(), true);
      return;
    }
    setMessages([]);
    setNotice(null);
  };

  const removeChat = async (id: string) => {
    if (!userId) return;
    try {
      await deleteChat(userId, id);
    } catch {
      setNotice(t(lang, "saveFail"));
      return;
    }
    if (activeRef.current === id) {
      const next = chats.find((c) => c.id !== id);
      openChat(next?.id ?? uid(), !next);
    }
  };

  const removeAll = async () => {
    if (!userId) return;
    try {
      await deleteAllChats(userId);
    } catch {
      setNotice(t(lang, "saveFail"));
      return;
    }
    openChat(uid(), true);
  };

  const googleSignIn = async () => {
    await acct.signIn();
  };
  const continueAsGuest = () => {
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch {
      /* ignore */
    }
    setGuest(true);
  };
  const signOut = async () => {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
    setGuest(false);
    setDrawer(false);
    await acct.signOut();
  };

  const working = busy || mic.state === "transcribing";
  const privacy = mode === "cloud" ? t(lang, "privacySaved") : t(lang, "privacyNote");
  const list = (
    <ChatList
      lang={lang}
      chats={chats}
      activeId={activeId}
      name={acct.user?.displayName || acct.user?.email || ""}
      disabled={working}
      onOpen={(id) => openChat(id, false)}
      onNew={newChat}
      onDelete={(id) => void removeChat(id)}
      onDeleteAll={() => void removeAll()}
      onSignOut={() => void signOut()}
    />
  );

  return (
    <div className="relative flex h-dvh w-full flex-col bg-paper">
      <header className="shrink-0 border-b border-line bg-card">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 lg:px-8 lg:py-3">
          <Logo size={38} sub={t(lang, "tagline")} />
          <nav className={`items-center gap-1 rounded-full bg-paper p-1 ${inApp ? "hidden lg:flex" : "hidden"}`} aria-label="RailAssist">
            {VIEWS.map(({ id, key, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-current={view === id ? "page" : undefined}
                className={`flex h-12 items-center gap-2 rounded-full px-5 text-[1.0625rem] font-bold transition ${
                  view === id ? "bg-brand-800 text-white" : "text-brand-900 hover:bg-brand-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t(lang, key)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <TextSize label={t(lang, "textSize")} />
            <span className="hidden sm:block">
              <ThemeToggle toDark={t(lang, "darkMode")} toLight={t(lang, "lightMode")} />
            </span>
            <LangPicker lang={lang} onChange={setLang} label={t(lang, "language")} />
          </div>
        </div>
      </header>

      {mode === "loading" && <div className="flex-1" />}

      {mode === "login" && <SignIn lang={lang} onGoogle={googleSignIn} onGuest={continueAsGuest} />}

      {inApp && view === "services" && (
        <main className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-8" lang={lang}>
          <ServicesView lang={lang} disabled={working} onAsk={(type) => void send(t(lang, "askTopic", { topic: needLabel(lang, type) }))} />
        </main>
      )}

      {inApp && view === "help" && (
        <main className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-8" lang={lang}>
          <HelpView lang={lang} note={privacy} />
        </main>
      )}

      {inApp && view === "ask" && (
        <div className="flex min-h-0 flex-1">
          {mode === "cloud" && <aside className="hidden w-72 shrink-0 border-r border-line bg-card lg:block xl:w-80">{list}</aside>}
          <section className="flex min-w-0 flex-1 flex-col">
          {mode === "cloud" && (
            <div className="flex shrink-0 gap-2 border-b border-line bg-card px-3 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-3 text-[1rem] font-bold text-brand-900"
              >
                <ListIcon className="h-5 w-5" />
                {t(lang, "myChats")}
              </button>
              <button type="button" onClick={newChat} disabled={working} className="min-h-12 flex-1 rounded-xl bg-brand-800 px-3 text-[1rem] font-bold text-white disabled:opacity-60">
                + {t(lang, "newChatShort")}
              </button>
            </div>
          )}
          <main className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4 lg:px-8 lg:pt-8" lang={lang}>
            <div className="mx-auto flex w-full max-w-3xl flex-col">
              <BotBubble>
                <p className="text-[1.125rem] leading-snug text-ink">{t(lang, "welcome")}</p>
                <p className="mt-2 text-sm text-muted">{privacy}</p>
                {mode === "local" && acct.enabled && (
                  <button
                    type="button"
                    onClick={() => void googleSignIn().catch(() => setNotice(t(lang, "signInFail")))}
                    className="mt-3 flex min-h-12 items-center gap-2 rounded-xl border-2 border-brand-800 bg-white px-3 text-[0.9375rem] font-bold text-[#201b17]"
                  >
                    <GoogleG className="h-5 w-5" />
                    {t(lang, "signInToSave")}
                  </button>
                )}
              </BotBubble>

              {loaded && messages.length === 0 && (
                <div className="anim-fade-up mt-2 flex flex-wrap gap-2 pl-1">
                  {SUGGESTIONS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => void send(t(lang, k))}
                      className="min-h-12 rounded-full border-2 border-brand-800/20 bg-card px-4 py-2 text-[1rem] font-semibold text-brand-800 transition hover:border-brand-800 active:scale-[0.97]"
                    >
                      {t(lang, k)}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="anim-fade-up mt-3 flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-800 px-4 py-3 text-[1.125rem] leading-snug text-white">{m.text}</div>
                  </div>
                ) : (
                  <BotMessage key={m.id} reply={m.bot!} lang={lang} />
                ),
              )}

              {working && (
                <BotBubble>
                  <span className="anim-blink text-[1.0625rem] text-muted">{mic.state === "transcribing" ? t(lang, "transcribing") : t(lang, "thinking")}</span>
                </BotBubble>
              )}
              <div ref={endRef} />
            </div>
          </main>

          {/* Input bar */}
          <div className="shrink-0 border-t border-line bg-card px-3 pb-3 pt-2.5 lg:px-8 lg:pb-5 lg:pt-4">
            <div className="mx-auto w-full max-w-3xl">
              {notice && (
                <div role="alert" className="anim-fade-up mb-2 rounded-xl bg-accent-50 px-3 py-2 text-[0.9375rem] font-semibold text-accent-600">
                  {notice}
                </div>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(text);
                }}
              >
                <button
                  type="button"
                  onClick={mic.toggle}
                  disabled={busy || mic.state === "transcribing"}
                  aria-label={mic.state === "recording" ? t(lang, "listening") : t(lang, "tapToSpeak")}
                  className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-white transition active:scale-95 disabled:opacity-50 ${
                    mic.state === "recording" ? "pulse-ring bg-red-600 text-red-600" : "bg-accent-500 hover:bg-accent-600"
                  }`}
                >
                  <span className="relative text-white">{mic.state === "recording" ? <StopIcon className="h-6 w-6" /> : <MicIcon className="h-7 w-7" />}</span>
                </button>
                <textarea
                  id="chat-input"
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(text);
                    }
                  }}
                  aria-label={t(lang, "typeMessage")}
                  placeholder={mic.state === "recording" ? t(lang, "listening") : t(lang, "typeMessage")}
                  className="max-h-32 min-h-14 flex-1 resize-none rounded-2xl border-2 border-line bg-paper px-4 py-3.5 text-[1.125rem] leading-snug text-ink outline-none focus:border-brand-700"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || busy}
                  aria-label={t(lang, "send")}
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-800 text-white transition active:scale-95 disabled:bg-brand-100 disabled:text-brand-700/50"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </form>
              {mode === "local" && messages.length > 0 && (
                <button type="button" onClick={newChat} className="mt-1 min-h-12 w-full text-center text-[0.9375rem] font-semibold text-muted hover:text-brand-800">
                  {t(lang, "newChat")}
                </button>
              )}
            </div>
          </div>
          </section>
        </div>
      )}

      {/* Phone: tabs at the bottom, in thumb reach */}
      {inApp && (
      <nav className="grid shrink-0 grid-cols-3 border-t border-line bg-card lg:hidden" aria-label="RailAssist">
        {VIEWS.map(({ id, key, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-current={view === id ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.9375rem] font-bold transition ${
              view === id ? "text-brand-800" : "text-muted"
            }`}
          >
            <span className={`grid h-8 w-14 place-items-center rounded-full ${view === id ? "bg-brand-100" : ""}`}>
              <Icon className="h-5 w-5" />
            </span>
            {t(lang, key)}
          </button>
        ))}
      </nav>
      )}

      {drawer && mode === "cloud" && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t(lang, "myChats")}>
          <button type="button" aria-label={t(lang, "closeMenu")} onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/50" />
          <div className="anim-slide-in absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-card shadow-xl">
            <div className="flex shrink-0 justify-end px-3 pt-3">
              <button type="button" onClick={() => setDrawer(false)} className="min-h-12 rounded-xl px-4 text-[1rem] font-bold text-brand-900">
                {t(lang, "closeMenu")}
              </button>
            </div>
            <div className="min-h-0 flex-1">{list}</div>
          </div>
        </div>
      )}
      <InstallPrompt lang={lang} />
    </div>
  );
}

/** FREE (green) or PAID (maroon) label for a kind of help. */
function CostBadge({ type, lang, withNote = false }: { type: NeedType; lang: LangCode; withNote?: boolean }) {
  const c = SERVICE_COST[type];
  if (!c) return null;
  const free = c.cost === "free";
  return (
    <span className={withNote ? "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1" : "inline-flex"}>
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.8125rem] font-extrabold tracking-wide ${
          free ? "bg-ok-600 text-paper" : "bg-brand-800 text-paper"
        }`}
      >
        {t(lang, free ? "free" : "paid")}
      </span>
      {withNote && <span className="text-[0.9375rem] leading-snug text-muted">{t(lang, c.note)}</span>}
    </span>
  );
}

/** Every kind of help, browsable without typing. */
function ServicesView({ lang, disabled, onAsk }: { lang: LangCode; disabled: boolean; onAsk: (type: NeedType) => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-[1.375rem] font-bold text-brand-900">{t(lang, "servicesTitle")}</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {PLANNABLE.map((type) => (
          <div key={type} className="flex min-w-0 flex-col rounded-2xl border border-line bg-card px-4 py-4">
            <div className="flex gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-600">
                <NeedIcon type={type} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[1.1875rem] font-bold leading-tight text-ink">{needLabel(lang, type)}</h2>
                </div>
                <CostBadge type={type} lang={lang} withNote />
              </div>
            </div>
            <div className="flex-1">
              <GetIt contacts={serviceContacts(type)} lang={lang} />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(type)}
              className="mt-3 min-h-12 rounded-xl bg-brand-50 px-4 text-[1rem] font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-60"
            >
              {t(lang, "askAbout")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Help any time, official links, and what RailAssist is. */
function HelpView({ lang, note }: { lang: LangCode; note: string }) {
  const helpline = helplineContacts();
  const links = generalLinks();
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        {helpline.length > 0 && (
          <section className="rounded-2xl border-2 border-brand-800 bg-card px-4 py-4">
            <h1 className="text-[1.375rem] font-bold text-brand-900">{t(lang, "alwaysAvailable")}</h1>
            <GetIt contacts={helpline} lang={lang} />
          </section>
        )}
        <section className="rounded-2xl border border-line bg-card px-4 py-4">
          <h2 className="text-[1.1875rem] font-bold text-brand-900">{t(lang, "aboutTitle")}</h2>
          <p className="mt-2 text-[1.0625rem] leading-snug text-ink">{t(lang, "whoFor")}</p>
          <p className="mt-2 text-[1.0625rem] leading-snug text-ink">{t(lang, "whyText")}</p>
          <p className="mt-1 text-[0.8125rem] text-muted">{t(lang, "whySource")}</p>
          <p className="mt-3 inline-flex items-center gap-2 text-[1.0625rem] font-semibold text-ink">
            <span className="rounded-md bg-ok-600 px-2 py-0.5 text-[0.8125rem] font-extrabold tracking-wide text-paper">{t(lang, "free")}</span>
            {t(lang, "appFree")}
          </p>
          <p className="mt-3 text-[0.9375rem] leading-snug text-muted">{note}</p>
        </section>
        <div className="flex items-center gap-3 sm:hidden">
          <ThemeToggle toDark={t(lang, "darkMode")} toLight={t(lang, "lightMode")} />
        </div>
      </div>
      {links.length > 0 && (
        <section className="min-w-0 rounded-2xl border border-line bg-card px-4 py-4">
          <h2 className="text-[1.1875rem] font-bold text-brand-900">{t(lang, "usefulLinks")}</h2>
          <GetIt contacts={links} lang={lang} />
        </section>
      )}
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="anim-fade-up mt-3 flex justify-start first:mt-0">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-card px-4 py-3">{children}</div>
    </div>
  );
}

function BotMessage({ reply, lang }: { reply: BotReply; lang: LangCode }) {
  const helpline = helplineContacts();
  return (
    <div className="anim-fade-up mt-3 max-w-[96%] space-y-2">
      <BotBubble>
        <p className="text-[1.125rem] leading-snug text-ink">{reply.reply}</p>
        {!reply.understood && <p className="mt-2 text-[1rem] leading-snug text-muted">{t(lang, "canHelpWith")}</p>}
        {reply.source === "offline" && reply.understood && <p className="mt-2 text-sm text-muted">{t(lang, "offlinePlan")}</p>}
      </BotBubble>

      {reply.notPossible.length > 0 && (
        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <div className="text-[0.9375rem] font-bold text-brand-900">{t(lang, "notPossibleTitle")}</div>
          <ul className="mt-1 list-disc pl-5 text-[1rem] text-muted">
            {reply.notPossible.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {reply.needs.map((n, i) => (
        <NeedCard key={n.type + n.where + i} need={n} lang={lang} delay={i * 90} />
      ))}

      {reply.needs.length > 0 && helpline.length > 0 && (
        <div className="rounded-2xl border border-line bg-brand-50/70 px-4 py-3">
          <div className="text-[0.9375rem] font-bold text-brand-900">{t(lang, "alwaysAvailable")}</div>
          <GetIt contacts={helpline} lang={lang} />
        </div>
      )}
    </div>
  );
}

/** One kind of help in an answer: where, what, cost, then how to get it. */
function NeedCard({ need, lang, delay }: { need: ChatNeed; lang: LangCode; delay: number }) {
  const whereKey = WHERE_KEY[need.where];
  const links = serviceContacts(need.type);
  return (
    <div className="anim-fade-up rounded-2xl border border-line bg-card px-4 py-3" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent-600">
          <NeedIcon type={need.type} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          {whereKey && <div className="text-sm font-semibold text-accent-600">{t(lang, whereKey)}</div>}
          <div className="text-lg font-bold leading-tight text-ink">{need.title || needLabel(lang, need.type)}</div>
          <CostBadge type={need.type} lang={lang} withNote />
          <p className="mt-1 text-[1rem] leading-snug text-muted">{need.instruction}</p>
        </div>
      </div>
      {links.length > 0 && (
        <div className="mt-2">
          <div className="text-[0.875rem] font-bold text-brand-900">{t(lang, "howToGet")}</div>
          <GetIt contacts={links} lang={lang} />
        </div>
      )}
    </div>
  );
}
