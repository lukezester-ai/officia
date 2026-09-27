export const TRIAL_DAYS = 14;
export const STARTER_INVOICE_CAP = 50;

export const PLAN_IDS = ['starter', 'business', 'pro', 'accounting_firm'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanModules = {
  payroll: boolean;
  hr: boolean;
  ai: boolean;
  vatZip: boolean;
};

export type PlanLimits = {
  users: number | null;
  invoicesPerMonth: number | null;
  employees: number | null;
};

const PLAN_RULES: Record<PlanId, { limits: PlanLimits; modules: PlanModules }> = {
  starter: {
    limits: { users: 1, invoicesPerMonth: STARTER_INVOICE_CAP, employees: 0 },
    modules: { payroll: false, hr: false, ai: false, vatZip: false },
  },
  business: {
    limits: { users: 3, invoicesPerMonth: null, employees: 10 },
    modules: { payroll: true, hr: true, ai: false, vatZip: true },
  },
  pro: {
    limits: { users: 10, invoicesPerMonth: null, employees: null },
    modules: { payroll: true, hr: true, ai: true, vatZip: true },
  },
  accounting_firm: {
    limits: { users: null, invoicesPerMonth: null, employees: null },
    modules: { payroll: true, hr: true, ai: true, vatZip: true },
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

export function rulesFor(plan: PlanId) {
  return PLAN_RULES[plan];
}

export function trialEndsFrom(start: Date) {
  return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function isAccessOpen(input: {
  plan: PlanId;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  now: Date;
}) {
  if (input.subscriptionStatus === 'active' && input.plan !== 'starter') return true;
  if (input.plan !== 'starter') return false;
  if (!input.trialEndsAt) return false;
  return input.trialEndsAt.getTime() > input.now.getTime();
}

export function daysLeft(trialEndsAt: Date | null, now: Date) {
  if (!trialEndsAt) return 0;
  const ms = trialEndsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
