export type PlanId = 'starter' | 'pro';

export const PLAN_LIMITS = {
  starter: {
    invoicesPerMonth: 50,
    maxUsers: 1,
    aiOcr: true,
    bankSync: false,
    label: 'Стартер',
  },
  pro: {
    invoicesPerMonth: Infinity,
    maxUsers: 10,
    aiOcr: true,
    bankSync: true,
    label: 'Про',
  },
} as const;

export const TRIAL_DAYS = 14;

export function resolveEffectivePlan(plan: string | null | undefined, trialEndsAt: Date | null | undefined): PlanId {
  if (plan === 'pro') return 'pro';
  if (trialEndsAt && trialEndsAt.getTime() > Date.now()) return 'pro';
  return 'starter';
}

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
