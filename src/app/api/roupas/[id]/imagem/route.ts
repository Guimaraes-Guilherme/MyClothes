import { and, eq } from "drizzle-orm";
import { db, items } from "@/db";
import { authed, fail, ok } from "@/lib/api";
import { readImage } from "@/lib/images";

/** Troca a foto de uma peça (ex.: refazer o recorte sem fundo). */
export const POST = authed<RouteContext<"/api/roupas/[id]/imagem">>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(404, "Peça não encontrada.");
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Envio inválido.");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) {
    return fail(422, "Tamanho da imagem inválido.");
  }
  const img = await readImage(form.get("image"), 3 * 1024 * 1024);
  if (!img.ok) return fail(img.status, img.message);
  const thumb = form.get("thumb") ? await readImage(form.get("thumb"), 512 * 1024) : null;
  if (thumb && !thumb.ok) return fail(thumb.status, thumb.message);
  const [row] = await db
    .update(items)
    .set({
      image: img.buf,
      imageType: img.type,
      thumb: thumb?.ok ? thumb.buf : null,
      thumbType: thumb?.ok ? thumb.type : null,
      width,
      height,
      fitScale: 1,
      fitX: 0,
      fitY: 0,
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, id), eq(items.userId, user.id)))
    .returning({ id: items.id });
  if (!row) return fail(404, "Peça não encontrada.");
  return ok({ ok: true });
});
