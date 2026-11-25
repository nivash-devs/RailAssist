import { type ContactOption, contactHref } from "@/lib/contacts";
import { t } from "@/lib/i18n";
import type { LangCode } from "@/lib/types";
import { LinkIcon, PhoneIcon, PinIcon } from "../Icons";

/** "Opens Google Play" / "Opens irctctourism.com" instead of a long web address. */
function opensText(url: string, lang: LangCode): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "play.google.com") return t(lang, "opensPlay");
  if (host === "apps.apple.com") return t(lang, "opensAppStore");
  return t(lang, "opensSite", { site: host });
}

/** Call / open / ask-at buttons so the passenger can arrange help themselves. */
export function GetIt({ contacts, lang }: { contacts: ContactOption[]; lang: LangCode }) {
  return (
    <div className="mt-2 space-y-2">
      {contacts.map((c) => {
        const href = contactHref(c);
        if (c.kind === "counter" || !href)
          return (
            <div key={c.kind + c.value} className="flex min-w-0 items-start gap-2 text-[0.9375rem] leading-snug text-ink [overflow-wrap:anywhere]">
              <PinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <span>
                <span className="text-muted">{t(lang, "askAt")} </span>
                <b className="font-semibold">{c.i18nKey ? t(lang, c.i18nKey) : c.value}</b>
              </span>
            </div>
          );
        const isPhone = c.kind === "phone";
        return (
          <a
            key={c.kind + c.value}
            href={href}
            target={isPhone ? undefined : "_blank"}
            rel={isPhone ? undefined : "noopener noreferrer"}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5 text-brand-900 transition hover:border-brand-800 active:scale-[0.98]"
          >
            {c.icon ? (
              // eslint-disable-next-line @next/next/no-img-element -- tiny local icon, no need for next/image
              <img src={c.icon} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-xl" />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-800">
                {isPhone ? <PhoneIcon className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
              </span>
            )}
            <span className="min-w-0 leading-tight">
              <span className="block text-[1.0625rem] font-bold">
                {isPhone ? t(lang, "callNumber", { number: c.value }) : c.label}
              </span>
              <span className="block truncate text-sm text-muted">
                {isPhone ? c.label : opensText(href, lang)}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
