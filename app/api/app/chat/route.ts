import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { ChatThreadsRepo, ServiceItemsRepo } from "@/src/lib/store";
import { ok, badRequest, forbidden } from "@/lib/api/responses";

const messageSchema = z.object({
  message: z.string().min(1),
  threadId: z.string().optional()
});

function suggestReply(input: string, services: Array<{ name: string; description?: string }>) {
  const text = input.toLowerCase();
  const matched = services.find((service) => {
    const name = service.name.toLowerCase();
    return text.includes(name) || name.split(" ").some((word) => word.length > 4 && text.includes(word));
  });
  if (matched) {
    return `Based on your message, "${matched.name}" looks like a good fit. You can book it now from /app/book.`;
  }
  const top = services.slice(0, 3).map((service) => service.name).join(", ");
  return `I can help you choose a service and then book. Popular options right now: ${top}.`;
}

export async function GET() {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const thread = await ChatThreadsRepo.getOrCreateForCustomer(auth.profile.id);
  return ok({ thread });
}

export async function POST(request: Request) {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const payload = await request.json().catch(() => ({}));
  const parsed = messageSchema.safeParse(payload);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid chat message.");
  }

  const thread = parsed.data.threadId
    ? await ChatThreadsRepo.getById(parsed.data.threadId)
    : await ChatThreadsRepo.getOrCreateForCustomer(auth.profile.id);
  if (!thread || thread.customerProfileId !== auth.profile.id) {
    return forbidden("FORBIDDEN", "Thread not available.");
  }

  const userMessage = {
    id: `msg_${Date.now()}_u`,
    atIso: new Date().toISOString(),
    role: "USER" as const,
    text: parsed.data.message.trim()
  };
  await ChatThreadsRepo.appendMessage(thread.id, userMessage);

  const services = await ServiceItemsRepo.listActive(auth.profile.shopId);
  const assistantMessage = {
    id: `msg_${Date.now()}_a`,
    atIso: new Date().toISOString(),
    role: "ASSISTANT" as const,
    text: suggestReply(parsed.data.message, services)
  };
  const updated = await ChatThreadsRepo.appendMessage(thread.id, assistantMessage);

  return ok({ thread: updated });
}
