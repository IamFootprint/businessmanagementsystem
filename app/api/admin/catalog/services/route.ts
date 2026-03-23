import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { badRequestFromZod, created as createdResponse, notFound, ok } from "@/lib/api/responses";
import { ServiceItemsRepo } from "@/src/lib/store";
import { logAudit } from "@/lib/admin/audit";

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  durationMins: z.number().int().min(15),
  basePriceCents: z.number().int().min(0),
  category: z.string().optional(),
  serviceType: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0)
});

function normalizeServiceInput(input: z.infer<typeof serviceSchema>) {
  const { serviceType, ...rest } = input;
  return {
    ...rest,
    category: input.category || serviceType || ""
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;
  const services = await ServiceItemsRepo.list(auth.shopId!);
  return ok({ services });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = serviceSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_SERVICE_PAYLOAD",
      "Some service details are invalid.",
      parsed.error,
      "Review the highlighted fields and try again."
    );
  }

  const created = await ServiceItemsRepo.create({ ...normalizeServiceInput(parsed.data), shopId: auth.shopId! });
  await logAudit({
    actor: auth.phone,
    action: "catalog.service.create",
    entity: "service_item",
    entityId: created.id,
    metadata: {
      actionLabel: "Created service",
      actorPhone: auth.phone,
      targetDisplay: created.name,
      diffSummary: [
        `Type: ${created.category || "General"}`,
        `Price: R ${Math.round(created.basePriceCents / 100)}`,
        `Duration: ${created.durationMins} mins`
      ]
    },
    shopId: auth.shopId!
  });
  return createdResponse({ service: created });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const payload = await req.json();
  const parsed = serviceSchema.extend({ id: z.string().min(1) }).safeParse(payload);
  if (!parsed.success) {
    return badRequestFromZod(
      "INVALID_SERVICE_PAYLOAD",
      "Some service details are invalid.",
      parsed.error,
      "Review the highlighted fields and try again."
    );
  }

  const updated = await ServiceItemsRepo.update(parsed.data.id, normalizeServiceInput(parsed.data));
  if (!updated) {
    return notFound("SERVICE_NOT_FOUND", "We could not find that service.");
  }
  await logAudit({
    actor: auth.phone,
    action: "catalog.service.update",
    entity: "service_item",
    entityId: updated.id,
    metadata: {
      actionLabel: "Updated service",
      actorPhone: auth.phone,
      targetDisplay: updated.name,
      diffSummary: [
        `Type: ${updated.category || "General"}`,
        `Price: R ${Math.round(updated.basePriceCents / 100)}`,
        `Duration: ${updated.durationMins} mins`,
        `Status: ${updated.isActive ? "Active" : "Inactive"}`
      ]
    },
    shopId: auth.shopId!
  });
  return ok({ service: updated });
}
