// English + the 22 languages of the Eighth Schedule of the Constitution of India.
export type LangCode =
  | "en" | "hi" | "as" | "bn" | "brx" | "doi" | "gu" | "kn" | "ks" | "kok" | "mai" | "ml"
  | "mni" | "mr" | "ne" | "or" | "pa" | "sa" | "sat" | "sd" | "ta" | "te" | "ur";

export const NEED_TYPES = [
  "wheelchair",
  "porter",
  "battery_car",
  "lower_berth",
  "meal",
  "medical",
  "escort",
  "other",
] as const;
export type NeedType = (typeof NEED_TYPES)[number];
