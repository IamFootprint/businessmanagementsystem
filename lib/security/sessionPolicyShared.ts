import { z } from "zod";

export const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 5;
export const DEFAULT_INACTIVITY_COUNTDOWN_SECONDS = 60;

export const sessionPolicySchema = z.object({
  inactivityTimeoutMinutes: z.coerce.number().int().min(1).max(120),
  inactivityCountdownSeconds: z.coerce.number().int().min(10).max(300)
});

export type SessionPolicy = z.infer<typeof sessionPolicySchema>;

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  inactivityTimeoutMinutes: DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
  inactivityCountdownSeconds: DEFAULT_INACTIVITY_COUNTDOWN_SECONDS
};

export function normalizeSessionPolicy(input?: Partial<SessionPolicy> | null): SessionPolicy {
  const parsed = sessionPolicySchema.safeParse({
    inactivityTimeoutMinutes: input?.inactivityTimeoutMinutes ?? DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
    inactivityCountdownSeconds: input?.inactivityCountdownSeconds ?? DEFAULT_INACTIVITY_COUNTDOWN_SECONDS
  });
  if (!parsed.success) {
    return { ...DEFAULT_SESSION_POLICY };
  }
  return parsed.data;
}
