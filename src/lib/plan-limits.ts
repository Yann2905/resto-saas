export type Plan = "starter" | "pro" | "business";

export type FeatureOverrides = {
  waiters?: boolean;
  pushNotifications?: boolean;
  fullStats?: boolean;
  maxTables?: number;
};

type ResolvedLimits = {
  maxTables: number;
  waiters: boolean;
  pushNotifications: boolean;
  fullStats: boolean;
  label: string;
};

const PLAN_DEFAULTS: Record<Plan, ResolvedLimits> = {
  starter: {
    maxTables: 10,
    waiters: false,
    pushNotifications: false,
    fullStats: false,
    label: "Starter",
  },
  pro: {
    maxTables: 25,
    waiters: true,
    pushNotifications: true,
    fullStats: true,
    label: "Pro",
  },
  business: {
    maxTables: 999,
    waiters: true,
    pushNotifications: true,
    fullStats: true,
    label: "Business",
  },
};

export function getPlanLimits(
  plan: string | null | undefined,
  overrides?: FeatureOverrides | null,
  isPartner?: boolean,
): ResolvedLimits {
  if (isPartner) {
    return { ...PLAN_DEFAULTS.business, label: "Partenaire" };
  }

  const key = (plan ?? "starter") as Plan;
  const base = PLAN_DEFAULTS[key] ?? PLAN_DEFAULTS.starter;

  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  return {
    maxTables: overrides.maxTables ?? base.maxTables,
    waiters: overrides.waiters ?? base.waiters,
    pushNotifications: overrides.pushNotifications ?? base.pushNotifications,
    fullStats: overrides.fullStats ?? base.fullStats,
    label: base.label,
  };
}

export function isPlanExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
