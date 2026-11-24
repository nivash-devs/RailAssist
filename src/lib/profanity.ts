// A small swear-word filter, checked on the server before the AI sees a message.
// The AI prompt also flags abuse in other languages, so this list only needs the
// common English and Hindi / Hinglish words.

/** Lowercase, undo common disguises (f*ck, $hit, fuuuck), keep letters only. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/\$/g, "s")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[*#.]/g, "")
    .replace(/([a-z])\1+/g, "$1"); // fuuuck -> fuck, asshole -> ashole
}

// Words are written already normalised (no double letters).
// A word that STARTS with one of these is blocked (fuck, fucker, fucking...).
const PREFIXES = [
  "fuck", "fuk", "fck", "motherfuck", "bitch", "bastard", "ashole", "cunt", "slut", "whore",
  "nig", "retard", "madarchod", "madarchot", "behenchod", "bhenchod", "benchod", "bhosd", "chutiy", "chutia",
  "gandu", "randi", "harami", "kamina", "kamine", "lavde", "lawde", "lodu", "betichod",
];
// Only blocked as a whole word (so "dickens" or "shiitake" are fine).
const WORDS = ["shit", "shity", "bulshit", "dick", "stfu", "lund", "gand", "gaand", "mc", "bc"];
// Indian scripts: blocked anywhere in the text.
const NATIVE = ["मादरचोद", "बहनचोद", "भेनचोद", "भोसड़", "भोसड", "चूतिया", "चुतिया", "गांडू", "गाण्डू", "लंड", "रंडी", "हरामी", "कमीना", "कमीने"];

// "nig" alone would catch "night": only the slurs.
const NIG = /^nig(g|ger|ga|er)/;

export function isAbusive(text: string): boolean {
  if (NATIVE.some((w) => text.includes(w))) return true;
  const tokens = normalise(text).split(/[^a-z]+/).filter(Boolean);
  return tokens.some((tok) => {
    if (WORDS.includes(tok)) return true;
    return PREFIXES.some((p) => (p === "nig" ? NIG.test(tok) : tok.startsWith(p)));
  });
}
