import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { getSchedulingPolicy, saveSchedulingPolicy } from "@/src/lib/workshop/scheduling";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest } from "@/lib/api/responses";

const schema = z.object({
  defaultNoticeHours: z.number().int().min(0).max(240).optional(),
  assignmentMode: z.enum(["AUTO", "MANUAL"]).optional(),
  blackoutDates: z.array(z.string()).optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;
  const policy = await getSchedulingPolicy(auth.shopId!);
  return ok({ policy });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_SCHEDULING_POLICY", "Invalid scheduling policy payload.");
  }
  const policy = await saveSchedulingPolicy(auth.shopId!, parsed.data);
  await logAudit({
    actor: auth.phone,
    action: "scheduling.policy.update",
    entity: "shop_settings",
    metadata: policy,
    shopId: auth.shopId!
  });
  return ok({ policy });
}
