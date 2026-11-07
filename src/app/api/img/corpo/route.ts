import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { imageResponse } from "@/lib/images";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 404 });
  const row = await db.query.users.findFirst({ where: eq(users.id, me.id), columns: { body: true, bodyType: true } });
  if (!row?.body || !row.bodyType) return new Response(null, { status: 404 });
  return imageResponse(row.body, row.bodyType);
}
