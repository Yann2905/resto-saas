export type Plan = "starter" | "pro" | "business";

type PlanLimits = {
  maxTables: number;
  waiters: boolean;
  pushNotifications: boolean;
  fullStats: boolean;
  label: string;
};

const LIMITS: Record<Plan, PlanLimits> = {
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

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  const key = (plan ?? "starter") as Plan;
  return LIMITS[key] ?? LIMITS.starter;
}

export function isPlanExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
