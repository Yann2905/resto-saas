export type PlanKey =
  | "1_month"
  | "2_months"
  | "3_months"
  | "4_months"
  | "5_months";

export type Plan = {
  key: PlanKey;
  label: string;
  months: number;
  price: number;         // FCFA
  pricePerMonth: number; // FCFA
  saving: number;        // FCFA économisé vs prix mensuel × durée
  popular?: boolean;
};

const BASE_MONTHLY = 5000; // FCFA

export const PLANS: Plan[] = [
  { key: "1_month",  label: "1 mois",  months: 1, price: 5000,  pricePerMonth: 5000, saving: 0 },
  { key: "2_months", label: "2 mois",  months: 2, price: 10000, pricePerMonth: 5000, saving: 0 },
  { key: "3_months", label: "3 mois",  months: 3, price: 12000, pricePerMonth: 4000, saving: 3000, popular: true },
  { key: "4_months", label: "4 mois",  months: 4, price: 17000, pricePerMonth: 4250, saving: 3000 },
  { key: "5_months", label: "5 mois",  months: 5, price: 20000, pricePerMonth: 4000, saving: 5000 },
];

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
