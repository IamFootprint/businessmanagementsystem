import { requireAdmin } from "@/lib/admin/guard";
import { ok, badRequest } from "@/lib/api/responses";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response!;
  return ok({ packages: [] });
}

export async function POST() {
  return badRequest("PACKAGES_DISABLED", "Packages are disabled.");
}

export async function PUT() {
  return badRequest("PACKAGES_DISABLED", "Packages are disabled.");
}
