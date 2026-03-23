import { requireAdmin } from "@/lib/admin/guard";
import { ok } from "@/lib/api/responses";
import { ProfilesRepo } from "@/src/lib/store";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;

  const mechanics = await ProfilesRepo.listMechanics(auth.shopId!);
  return ok({ mechanics });
}
