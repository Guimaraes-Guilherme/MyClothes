import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { imageResponse } from "@/lib/images";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return new Response(null, { status: 404 });
  const row = await db.query.users.findFirst({ where: eq(users.id, me.id), columns: { face: true, faceType: true } });
  if (!row?.face || !row.faceType) return new Response(null, { status: 404 });
  return imageResponse(row.face, row.faceType);
}
