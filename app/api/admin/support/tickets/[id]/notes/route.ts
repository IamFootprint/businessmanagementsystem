import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { SupportTicketsRepo } from "@/src/lib/store";
import { ok, badRequest, notFound, created } from "@/lib/api/responses";

const noteSchema = z.object({
  text: z.string().min(1).max(2000)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const ticket = await SupportTicketsRepo.get(params.id);
  if (!ticket || ticket.shopId !== auth.shopId) {
    return notFound("TICKET_NOT_FOUND", "Ticket not found.");
  }

  const body = await req.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("NOTE_TEXT_REQUIRED", "Note text is required.");
  }

  const updated = await SupportTicketsRepo.addNote(params.id, {
    authorName: auth.phone || "Admin",
    text: parsed.data.text
  });

  return created({ ticket: updated });
}
