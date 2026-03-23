import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { SupportTicketsRepo } from "@/src/lib/store";
import { ok, badRequest, notFound } from "@/lib/api/responses";

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  assigneeId: z.string().optional()
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const ticket = await SupportTicketsRepo.get(params.id);
  if (!ticket || ticket.shopId !== auth.shopId) {
    return notFound("TICKET_NOT_FOUND", "Ticket not found.");
  }

  return ok({ ticket });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const ticket = await SupportTicketsRepo.get(params.id);
  if (!ticket || ticket.shopId !== auth.shopId) {
    return notFound("TICKET_NOT_FOUND", "Ticket not found.");
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("INVALID_UPDATE_DATA", "Invalid update data.");
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "resolved" && ticket.status !== "resolved") {
    updates.resolvedAtIso = new Date().toISOString();
  }

  const updated = await SupportTicketsRepo.update(params.id, updates as Parameters<typeof SupportTicketsRepo.update>[1]);
  return ok({ ticket: updated });
}
