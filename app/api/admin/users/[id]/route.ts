import { PUT as updateUser } from "../route";

export async function PUT(request: Request, context: { params: { id: string } }) {
  const payload = await request.json().catch(() => ({}));
  return updateUser(
    new Request(request.url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        id: context.params.id
      })
    })
  );
}
