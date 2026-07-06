export type PlanId = 'starter' | 'business' | 'pro' | 'accounting-firm';

export const PLAN_LIMITS = {
  starter: {
    invoicesPerMonth: 50,
    maxUsers: 1,
    aiOcr: true,
    bankSync: true,
    label: 'Стартер',
  },
  business: {
    invoicesPerMonth: 500,
    maxUsers: 3,
    aiOcr: true,
    bankSync: true,
    label: 'Бизнес',
  },
  pro: {
    invoicesPerMonth: Infinity,
    maxUsers: 10,
    aiOcr: true,
    bankSync: true,
    label: 'Про',
  },
  'accounting-firm': {
    invoicesPerMonth: Infinity,
    maxUsers: Infinity,
    aiOcr: true,
    bankSync: true,
    label: 'Счетоводна кантора',
  },
} as const;

export const TRIAL_DAYS = 14;

export function resolveEffectivePlan(plan: string | null | undefined, trialEndsAt: Date | null | undefined): PlanId {
  if (plan === 'pro' || plan === 'business' || plan === 'accounting-firm') return plan;
  if (trialEndsAt && trialEndsAt.getTime() > Date.now()) return 'pro';
  return 'starter';
}

export function getPlanLimits(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
