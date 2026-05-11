// Validators basiques pour les boundaries API.
// Ne dépend de rien — pas de zod pour rester léger.

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEK_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function isNonEmptyString(v: unknown, max = 500): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

export function isSlug(v: unknown): v is string {
  return typeof v === "string" && v.length <= 64 && SLUG_RE.test(v);
}

export function isEmail(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length <= 254 &&
    EMAIL_RE.test(v)
  );
}

export function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isStrongEnoughPassword(v: unknown): v is string {
  return typeof v === "string" && v.length >= 6 && v.length <= 128;
}

export function isHttpsUrlOrNull(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "string") return false;
  if (v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function isIsoDateOrNull(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "string") return false;
  const t = Date.parse(v);
  return !isNaN(t);
}

export function isOpeningHoursOrNull(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "object" || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  for (const k of WEEK_KEYS) {
    const day = obj[k];
    if (!day || typeof day !== "object" || Array.isArray(day)) return false;
    const d = day as Record<string, unknown>;
    if (typeof d.open !== "string" || !HHMM_RE.test(d.open)) return false;
    if (typeof d.close !== "string" || !HHMM_RE.test(d.close)) return false;
    if (typeof d.closed !== "boolean") return false;
  }
  return true;
}
