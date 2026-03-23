import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { JobCardsRepo, getJobCard } from "@/src/lib/store";
import { logAuditEvent } from "@/lib/audit/service";
import { resolveActorFromSession } from "@/lib/audit/resolveActor";

const schema = z.object({
  text: z.string().min(1)
});

export async function POST(req: Request, context: { params: { id: string } }) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid note payload." } },
      { status: 400 }
    );
  }

  const card = await getJobCard(context.params.id);
  if (!card) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Job card not found." } },
      { status: 404 }
    );
  }
  if (auth.profile.role === "MECHANIC" && card.assignedMechanicId !== auth.profile.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Job card not assigned." } },
      { status: 403 }
    );
  }
  if (card.completion?.completedAtIso) {
    return NextResponse.json(
      { error: { code: "LOCKED", message: "Job card already completed." } },
      { status: 409 }
    );
  }

  const updated = await JobCardsRepo.addNote(card.id, {
    id: `note_${Date.now()}`,
    atIso: new Date().toISOString(),
    authorProfileId: auth.profile.id,
    text: parsed.data.text
  });
  if (!updated) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Job card not found." } },
      { status: 404 }
    );
  }

  await logAuditEvent({
    eventName: "job_card.note.added",
    eventCategory: "job_card",
    action: "add_note",
    actor: resolveActorFromSession(auth.profile),
    target: {
      type: "job_card",
      id: updated.id,
      display: updated.ref
    },
    contextJson: { noteLength: parsed.data.text.length },
    shopId: updated.shopId
  }, req);

  return NextResponse.json({ jobCard: updated });
}
