import { z } from "zod";
import { requireRole } from "@/src/lib/auth/localSession";
import { listJobCardsByMechanicInRange, toDateIso } from "@/src/lib/store";
import { ok, badRequest, forbidden } from "@/lib/api/responses";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

function dateRangeForView(view: "day" | "week" | "month", anchorIso: string) {
  const [year, month, day] = anchorIso.split("-").map((part) => Number(part));
  const anchor = new Date(Date.UTC(year, month - 1, day));
  if (view === "day") return { from: anchorIso, to: anchorIso };

  if (view === "week") {
    const dayOfWeek = anchor.getUTCDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const from = new Date(anchor);
    from.setUTCDate(anchor.getUTCDate() - diffToMonday);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
    return { from: toDateIso(from.toISOString()), to: toDateIso(to.toISOString()) };
  }

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return { from: toDateIso(from.toISOString()), to: toDateIso(to.toISOString()) };
}

export async function GET(req: Request) {
  const auth = await requireRole(["MECHANIC"]);
  if (!auth.ok) return auth.response!;

  if (auth.profile.role !== "MECHANIC") {
    return forbidden("FORBIDDEN", "Mechanic access required.");
  }

  const { searchParams } = new URL(req.url);
  const viewInput = searchParams.get("view");
  const anchorInput = searchParams.get("anchor");
  const view = viewInput === "day" || viewInput === "week" || viewInput === "month" ? viewInput : "day";
  const anchor = anchorInput && /^\d{4}-\d{2}-\d{2}$/.test(anchorInput)
    ? anchorInput
    : toDateIso(new Date().toISOString());

  const defaultRange = dateRangeForView(view, anchor);
  const parsed = querySchema.safeParse({
    from: searchParams.get("from") || defaultRange.from,
    to: searchParams.get("to") || defaultRange.to
  });

  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Invalid date range.");
  }

  const from = parsed.data.from;
  const to = parsed.data.to;
  if (from > to) {
    return badRequest("INVALID_INPUT", "`from` cannot be after `to`.");
  }

  const jobCards = await listJobCardsByMechanicInRange(auth.profile.id, from, to);
  return ok({ view, anchor, from, to, jobCards });
}
