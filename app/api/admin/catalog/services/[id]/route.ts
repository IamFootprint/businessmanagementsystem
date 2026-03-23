import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { badRequestFromZod, notFound, ok } from "@/lib/api/responses";
import { ServiceItemsRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";

const updateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  durationMins: z.number().int().min(15),
  basePriceCents: z.number().int().min(0),
  category: z.string().optional(),
  serviceType: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0)
});

function normalizeServiceInput(input: z.infer<typeof updateSchema>) {
  const { serviceType, ...rest } = input;
  return {
    ...rest,
    category: input.category || serviceType || ""
  };
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_SERVICE_PAYLOAD",
      "Some service details are invalid.",
      parsed.error,
      "Review the highlighted fields and try again."
    );
  }

  const updated = await ServiceItemsRepo.update(context.params.id, normalizeServiceInput(parsed.data));
  if (!updated) {
    return notFound("SERVICE_NOT_FOUND", "We could not find that service.");
  }
  await logAudit({
    actor: auth.phone,
    action: "catalog.service.update",
    entity: "service_item",
    entityId: updated.id,
    metadata: { name: updated.name, isActive: updated.isActive },
    shopId: auth.shopId!
  });

  return ok({ service: updated });
}
