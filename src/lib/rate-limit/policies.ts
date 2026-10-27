/**
 * Central, configurable rate-limit policies. Values are initial estimates; tune
 * from load tests and abuse data (docs/architecture/capacity-plan.md).
 */
export const RATE_LIMITS = {
  loginByIp: { limit: 20, windowSeconds: 15 * 60 },
  loginByEmail: { limit: 8, windowSeconds: 15 * 60 },
  signupByIp: { limit: 5, windowSeconds: 60 * 60 },
  passwordResetByIp: { limit: 10, windowSeconds: 60 * 60 },
  passwordResetByEmail: { limit: 3, windowSeconds: 60 * 60 },
  profileUpdateByUser: { limit: 30, windowSeconds: 60 * 60 },
  globalSignOutByUser: { limit: 5, windowSeconds: 60 * 60 },
} as const satisfies Record<string, { limit: number; windowSeconds: number }>;

export type RateLimitPolicy = keyof typeof RATE_LIMITS;
