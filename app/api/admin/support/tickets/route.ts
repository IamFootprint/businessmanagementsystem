import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { SupportTicketsRepo, type SupportTicketRecord } from "@/src/lib/store";
import { ok, created, badRequest } from "@/lib/api/responses";

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  category: z.enum(["payment", "cancellation", "general", "complaint"]),
  priority: z.enum(["low", "normal", "high"]),
  description: z.string().min(1).max(2000),
  bookingId: z.string().optional(),
  assigneeId: z.string().optional()
});

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  let tickets: SupportTicketRecord[] = await SupportTicketsRepo.list(auth.shopId!);

  if (status) tickets = tickets.filter((t: SupportTicketRecord) => t.status === status);
  if (category) tickets = tickets.filter((t: SupportTicketRecord) => t.category === category);

  return ok({ tickets });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("INVALID_TICKET_DATA", "Invalid ticket data.");
  }

  const ticket = await SupportTicketsRepo.create({
    ...parsed.data,
    shopId: auth.shopId!
  });

  return created({ ticket });
}
