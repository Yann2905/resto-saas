import type { OpeningHours, WeekKey, DaySchedule } from "@/types";

export const WEEK_KEYS: WeekKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const WEEK_LABELS: Record<WeekKey, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

// JS Date.getDay() : 0 = Sunday, 1 = Monday ...
const JS_DAY_TO_KEY: Record<number, WeekKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export function defaultOpeningHours(): OpeningHours {
  const day: DaySchedule = { open: "08:00", close: "22:00", closed: false };
  return {
    mon: { ...day },
    tue: { ...day },
    wed: { ...day },
    thu: { ...day },
    fri: { ...day },
    sat: { ...day },
    sun: { ...day, closed: true },
  };
}

function parseHM(s: string): number {
  const [h, m] = s.split(":").map((v) => parseInt(v, 10));
  return h * 60 + (m || 0);
}

export function isOpenAt(
  hours: OpeningHours | null,
  at: Date = new Date()
): boolean {
  if (!hours) return true;
  const key = JS_DAY_TO_KEY[at.getDay()];
  const day = hours[key];
  if (!day || day.closed) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  const open = parseHM(day.open);
  const close = parseHM(day.close);
  if (close < open) {
    // overnight (ex: 18:00 → 02:00)
    return now >= open || now < close;
  }
  return now >= open && now < close;
}

export function formatTodayHours(hours: OpeningHours | null): string {
  if (!hours) return "Ouvert 24/7";
  const key = JS_DAY_TO_KEY[new Date().getDay()];
  const day = hours[key];
  if (!day) return "—";
  if (day.closed) return "Fermé aujourd'hui";
  return `Ouvert ${day.open} – ${day.close}`;
}
