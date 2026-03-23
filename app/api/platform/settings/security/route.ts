import { requirePlatformOwner } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { badRequestFromZod, ok, serverError, withErrorHandling } from "@/lib/api/responses";
import { getSessionPolicyFromStore, updateSessionPolicyInStore } from "@/lib/security/sessionPolicy";
import { sessionPolicySchema } from "@/lib/security/sessionPolicyShared";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const policy = await getSessionPolicyFromStore();
  return ok(policy);
});

export const PUT = withErrorHandling(async (request: Request) => {
  const auth = await requirePlatformOwner();
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => null);
  const parsed = sessionPolicySchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_SESSION_POLICY",
      "Security settings are invalid.",
      parsed.error,
      "Use whole numbers within the allowed range."
    );
  }

  const updated = await updateSessionPolicyInStore(parsed.data);
  if (!updated) {
    return serverError(
      "SESSION_POLICY_SAVE_FAILED",
      "Could not save security settings.",
      "Try again. If the problem continues, contact support."
    );
  }

  await logAudit({
    actor: auth.phone,
    action: "platform.security.session_policy.updated",
    entity: "session_policy",
    entityId: auth.shopId,
    shopId: auth.shopId,
    metadata: updated
  });

  return ok(updated);
});
