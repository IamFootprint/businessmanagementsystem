import { z } from "zod";
import { ServiceItemsRepo, ensureServiceSeed } from "@/src/lib/store";
import { AVAILABILITY_RULES } from "@/lib/availability/rules";
import { buildSlots } from "@/lib/availability/slots";
import { formatLocalDateLabel, formatLocalTimeLabel } from "@/lib/availability/time";
import { getPublicPackageById } from "@/lib/catalog/publicPackages";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const querySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    itemType: z.enum(["package", "service"]).optional(),
    itemId: z.string().min(1).optional(),
    packageId: z.string().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (value.packageId) return;
    if (!value.itemType || !value.itemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "itemType and itemId are required."
      });
    }
  });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedItemType = searchParams.get("itemType") ?? undefined;
  const requestedItemId = searchParams.get("itemId") ?? undefined;
  const requestedPackageId = searchParams.get("packageId") ?? undefined;
  const parsed = querySchema.safeParse({
    date: searchParams.get("date"),
    itemType: requestedItemType,
    itemId: requestedItemId,
    packageId: requestedPackageId
  });

  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid availability query.");
  }

  const { date } = parsed.data;
  const itemId = parsed.data.itemId || parsed.data.packageId!;
  const isPackageRequest = parsed.data.itemType === "package" || Boolean(parsed.data.packageId);

  let durationMinutes = 0;
  if (isPackageRequest) {
    const pkg = await getPublicPackageById(itemId);
    if (!pkg) {
      return notFound("NOT_FOUND", "Package not available.");
    }
    durationMinutes = pkg.durationMinutes;
  } else {
    await ensureServiceSeed();
    const service = await ServiceItemsRepo.get(itemId);
    if (!service || !service.isActive) {
      return notFound("NOT_FOUND", "Service not available.");
    }
    durationMinutes = service.durationMins;
  }

  const slots = buildSlots({ date, packageDurationMinutes: durationMinutes, existingBookings: [] });

  return ok({
    date,
    timeZone: AVAILABILITY_RULES.timeZone,
    slots: slots.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      label: `${formatLocalDateLabel(slot.start)} ${formatLocalTimeLabel(slot.start)}`
    }))
  });
}
