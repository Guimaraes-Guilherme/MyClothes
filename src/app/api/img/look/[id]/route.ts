import { and, eq } from "drizzle-orm";
import { db, looks } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { imageResponse } from "@/lib/images";

/** Foto do look gerada pela IA. Só o dono enxerga. */
export async function GET(_req: Request, ctx: RouteContext<"/api/img/look/[id]">) {
  const { id } = await ctx.params;
  const me = await getCurrentUser();
  if (!me || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const row = await db.query.looks.findFirst({
    where: and(eq(looks.id, id), eq(looks.userId, me.id)),
    columns: { aiImage: true, aiImageType: true },
  });
  if (!row?.aiImage || !row.aiImageType) return new Response(null, { status: 404 });
  return imageResponse(row.aiImage, row.aiImageType);
}
