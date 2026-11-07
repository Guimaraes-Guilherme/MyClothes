import { and, eq } from "drizzle-orm";
import { db, items } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { imageResponse } from "@/lib/images";

/** Imagem da peça. Só o dono enxerga. */
export async function GET(req: Request, ctx: RouteContext<"/api/img/roupa/[id]">) {
  const { id } = await ctx.params;
  const me = await getCurrentUser();
  if (!me || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const row = await db.query.items.findFirst({
    where: and(eq(items.id, id), eq(items.userId, me.id)),
    columns: { image: true, imageType: true, thumb: true, thumbType: true },
  });
  if (!row) return new Response(null, { status: 404 });
  // Sem ?full=1 vai a versão leve (peças antigas, sem miniatura, mandam a original).
  const full = new URL(req.url).searchParams.has("full");
  if (!full && row.thumb && row.thumbType) return imageResponse(row.thumb, row.thumbType);
  return imageResponse(row.image, row.imageType);
}
