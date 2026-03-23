import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadsRepo } from "@/src/lib/store";
import { logAuditEvent } from "@/lib/audit/service";
import { rateLimit, getClientIp } from "@/lib/auth/rate-limit";

const LEADS_RATE_LIMIT = 5; // max 5 leads per IP per hour
const LEADS_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  formType: z.enum(["demo", "early-access", "custom"]),
  message: z.string().max(2000).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`leads:${ip}`, LEADS_RATE_LIMIT, LEADS_RATE_WINDOW);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const lead = await LeadsRepo.create({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    company: parsed.data.company || null,
    formType: parsed.data.formType,
    message: parsed.data.message || null,
    utmSource: parsed.data.utmSource || null,
    utmMedium: parsed.data.utmMedium || null,
    utmCampaign: parsed.data.utmCampaign || null,
  });

  await logAuditEvent({
    eventName: "lead.created",
    eventCategory: "platform",
    action: "create",
    outcome: "success",
    severity: "info",
    actor: { type: "system", display: "public_form" },
    target: { type: "lead", id: lead.id, display: parsed.data.email },
    contextJson: { formType: parsed.data.formType, utmSource: parsed.data.utmSource },
  }, request);

  return NextResponse.json({ ok: true, id: lead.id });
}
