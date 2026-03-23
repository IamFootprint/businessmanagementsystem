import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { logAudit } from "@/lib/admin/audit";
import { ok, badRequest, serverError } from "@/lib/api/responses";
import { AvailabilityBlocksRepo } from "@/src/lib/store";

const blockSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
  isEmergency: z.boolean().optional()
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  try {
    const blocks = await AvailabilityBlocksRepo.list(auth.shopId!);
    return ok({ blocks });
  } catch {
    return ok({ blocks: [], warning: "Availability blocks unavailable." });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = blockSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_BLOCK_PAYLOAD", "Invalid block payload.");
  }

  try {
    const created = await AvailabilityBlocksRepo.create({
      shopId: auth.shopId!,
      date: parsed.data.date,
      reason: parsed.data.reason,
      isEmergency: parsed.data.isEmergency
    });

    await logAudit({
      actor: auth.phone,
      action: parsed.data.isEmergency ? "availability.emergency.create" : "availability.block.create",
      entity: "availability_block",
      entityId: created.id,
      shopId: auth.shopId!
    });

    return ok({ block: created });
  } catch {
    return serverError("AVAILABILITY_BLOCK_CREATE_FAILED", "Failed to create availability block.");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = z.object({ id: z.string().min(1) }).safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_DELETE_PAYLOAD", "Invalid delete payload.");
  }

  try {
    const deleted = await AvailabilityBlocksRepo.remove(parsed.data.id);
    if (!deleted) {
      return badRequest("BLOCK_NOT_FOUND", "Availability block not found.");
    }

    await logAudit({
      actor: auth.phone,
      action: "availability.block.delete",
      entity: "availability_block",
      entityId: parsed.data.id,
      shopId: auth.shopId!
    });

    return ok({ deleted: true });
  } catch {
    return serverError("AVAILABILITY_BLOCK_DELETE_FAILED", "Failed to delete availability block.");
  }
}
