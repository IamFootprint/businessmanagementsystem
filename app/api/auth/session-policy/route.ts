import { ok, withErrorHandling } from "@/lib/api/responses";
import { getSessionPolicyFromStore } from "@/lib/security/sessionPolicy";
import { requireSession } from "@/src/lib/auth/localSession";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const policy = await getSessionPolicyFromStore();
  return ok(policy);
});
