import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats Date to YYYY-MM-DD string */
export function toDateStringYYYYMMDD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns tomorrow's date formatted as YYYY-MM-DD */
export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateStringYYYYMMDD(tomorrow);
}

/** Removes emojis, symbols prohibited by YouTube, and trims cleanly */
export function sanitizeTag(tag: string): string {
  if (!tag) return "";
  return tag
    // Remove emojis and pictographic symbols
    .replace(/[\p{Extended_Pictographic}\u200d\uFE0F\u20E3\u2600-\u27BF]/gu, "")
    // Remove characters forbidden or problematic for YouTube tags: < > # , " ' ` etc.
    .replace(/[#<>,!?:;`"'~^=+$%&*()[\]{}|\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Safely splits, cleans and deduplicates tag strings or arrays compliant with YouTube API */
export function parseTags(tags: string | string[] | undefined | null): string[] {
  if (!tags) return [];
  const rawList = Array.isArray(tags) ? tags : tags.split(",");
  const seen = new Set<string>();
  const result: string[] = [];
  let totalLength = 0;

  for (const raw of rawList) {
    const cleaned = sanitizeTag(raw);
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (seen.has(lower)) continue;

    // YouTube counts multi-word tags with double quotes ("word word"): len(tag) + 2
    const tagCost = cleaned.length + (cleaned.includes(" ") ? 2 : 0);
    const addedLen = tagCost + (result.length > 0 ? 1 : 0);
    if (totalLength + addedLen > 430) break;

    seen.add(lower);
    result.push(cleaned);
    totalLength += addedLen;
  }
  return result;
}

