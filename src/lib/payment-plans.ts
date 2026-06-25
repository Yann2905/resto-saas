export type PlanTier = "starter" | "pro" | "business";

export type PlanKey =
  | "starter_1m"
  | "starter_6m"
  | "starter_1y"
  | "pro_1m"
  | "pro_6m"
  | "pro_1y"
  | "business_1m"
  | "business_6m"
  | "business_1y";

export type Plan = {
  key: PlanKey;
  tier: PlanTier;
  label: string;
  months: number;
  price: number;
  pricePerMonth: number;
  saving: number;
  popular?: boolean;
};

const TIER_LABELS: Record<PlanTier, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

export const PLANS: Plan[] = [
  // Starter — 10 000 FCFA/mois
  { key: "starter_1m", tier: "starter", label: "Starter · 1 mois",  months: 1,  price: 10000,  pricePerMonth: 10000, saving: 0 },
  { key: "starter_6m", tier: "starter", label: "Starter · 6 mois",  months: 6,  price: 50000,  pricePerMonth: 8300,  saving: 10000, popular: true },
  { key: "starter_1y", tier: "starter", label: "Starter · 1 an",    months: 12, price: 90000,  pricePerMonth: 7500,  saving: 30000 },
  // Pro — 15 000 FCFA/mois
  { key: "pro_1m",     tier: "pro",     label: "Pro · 1 mois",      months: 1,  price: 15000,  pricePerMonth: 15000, saving: 0 },
  { key: "pro_6m",     tier: "pro",     label: "Pro · 6 mois",      months: 6,  price: 75000,  pricePerMonth: 12500, saving: 15000, popular: true },
  { key: "pro_1y",     tier: "pro",     label: "Pro · 1 an",        months: 12, price: 130000, pricePerMonth: 10800, saving: 50000 },
  // Business — 30 000 FCFA/mois
  { key: "business_1m", tier: "business", label: "Business · 1 mois", months: 1,  price: 30000,  pricePerMonth: 30000, saving: 0 },
  { key: "business_6m", tier: "business", label: "Business · 6 mois", months: 6,  price: 150000, pricePerMonth: 25000, saving: 30000, popular: true },
  { key: "business_1y", tier: "business", label: "Business · 1 an",   months: 12, price: 280000, pricePerMonth: 23300, saving: 80000 },
];

export function getPlansByTier(tier: PlanTier): Plan[] {
  return PLANS.filter((p) => p.tier === tier);
}

export function getTierLabel(tier: PlanTier): string {
  return TIER_LABELS[tier];
}

export function getPlan(key: string): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}


/**
 * Calcule la nouvelle date d'expiration.
 * Si l'abonnement est encore actif, on prolonge à partir de l'expiration actuelle.
 * Sinon on part d'aujourd'hui.
 */
export function computeNewExpiry(
  currentExpiry: string | null,
  months: number,
): Date {
  const base =
    currentExpiry && new Date(currentExpiry) > new Date()
      ? new Date(currentExpiry)
      : new Date();
  base.setMonth(base.getMonth() + months);
  return base;
}

/**
 * Génère une référence unique de paiement.
 * Format: PAYyyMMddHHmm + 4 chars aléatoires → ex: PAY2605141351A7F2
 */
export function generatePaymentReference(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `PAY${yy}${MM}${dd}${HH}${mm}${rand}`;
}
