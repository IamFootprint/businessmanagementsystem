import { NextResponse } from "next/server";
import { z } from "zod";
import { InvitesRepo } from "@/src/lib/store";

const schema = z.object({
  token: z.string().min(10)
});

export async function POST(req: Request) {
  const payload = await req.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Invalid invite token." } },
      { status: 400 }
    );
  }
  const result = await InvitesRepo.consume(parsed.data.token);
  if (!result.invite) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Invite not found." } },
      { status: 404 }
    );
  }
  if (!result.profile) {
    return NextResponse.json(
      { error: { code: "ALREADY_USED", message: "Invite already used." } },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, profile: result.profile });
}
