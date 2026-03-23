import { z } from "zod";

export const quoteRequestSchema = z
  .object({
    itemType: z.enum(["package", "service"]).optional(),
    itemId: z.string().min(1).optional(),
    packageId: z.string().min(1).optional(),
    addOnIds: z.array(z.string()).optional(),
    distanceKm: z.number().min(0).optional(),
    afterHours: z.boolean().optional(),
    partsCents: z.number().int().min(0).optional(),
    addOnsCents: z.number().int().min(0).optional(),
    consumablesCents: z.number().int().min(0).optional()
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

export const quoteLineItemSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  amountCents: z.number().int()
});

export const pricingSnapshotSchema = z.object({
  lineItems: z.array(quoteLineItemSchema),
  subtotalCents: z.number().int(),
  totalCents: z.number().int(),
  currency: z.literal("ZAR")
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type PricingSnapshot = z.infer<typeof pricingSnapshotSchema>;
