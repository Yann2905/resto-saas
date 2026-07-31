export type Plan = "starter" | "pro" | "business";

export type FeatureOverrides = {
  waiters?: boolean;
  pushNotifications?: boolean;
  fullStats?: boolean;
  maxTables?: number;
  cashRegister?: boolean;
  delivery?: boolean;
};

type ResolvedLimits = {
  maxTables: number;
  canChangeMaxTables: boolean;
  waiters: boolean;
  pushNotifications: boolean;
  fullStats: boolean;
  cashRegister: boolean;
  delivery: boolean;
  label: string;
};

const PLAN_DEFAULTS: Record<Plan, ResolvedLimits> = {
  starter: {
    maxTables: 10,
    canChangeMaxTables: false,
    waiters: false,
    pushNotifications: false,
    fullStats: false,
    cashRegister: false,
    delivery: false,
    label: "Starter",
  },
  pro: {
    maxTables: 10,
    canChangeMaxTables: true,
    waiters: true,
    pushNotifications: true,
    fullStats: true,
    cashRegister: true,
    delivery: true,
    label: "Pro",
  },
  business: {
    maxTables: 10,
    canChangeMaxTables: true,
    waiters: true,
    pushNotifications: true,
    fullStats: true,
    cashRegister: true,
    delivery: true,
    label: "Business",
  },
};

export function getPlanLimits(
  plan: string | null | undefined,
  overrides?: FeatureOverrides | null,
  isPartner?: boolean,
): ResolvedLimits {
  if (isPartner) {
    return { ...PLAN_DEFAULTS.business, canChangeMaxTables: true, cashRegister: true, delivery: true, label: "Partenaire" };
  }

  const key = (plan ?? "starter") as Plan;
  const base = PLAN_DEFAULTS[key] ?? PLAN_DEFAULTS.starter;

  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  return {
    maxTables: overrides.maxTables ?? base.maxTables,
    canChangeMaxTables: base.canChangeMaxTables,
    waiters: overrides.waiters ?? base.waiters,
    pushNotifications: overrides.pushNotifications ?? base.pushNotifications,
    fullStats: overrides.fullStats ?? base.fullStats,
    cashRegister: overrides.cashRegister ?? base.cashRegister,
    delivery: overrides.delivery ?? base.delivery,
    label: base.label,
  };
}

export function isPlanExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
