import { db, items } from "@/db";
import { authed, fail, ok } from "@/lib/api";
import { readImage } from "@/lib/images";
import { itemUrl } from "@/lib/wardrobe";
import { firstError, itemSchema } from "@/lib/validation";

const MAX = 3 * 1024 * 1024;
const MAX_THUMB = 512 * 1024;

/** Cadastra uma peça. A imagem chega já sem fundo, recortada e em WebP/PNG (o navegador faz esse trabalho). */
export const POST = authed(async (req, user) => {
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Envio inválido.");

  const parsed = itemSchema.safeParse({ name: form.get("name"), category: form.get("category"), color: form.get("color") });
  if (!parsed.success) return fail(422, firstError(parsed.error));

  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) {
    return fail(422, "Tamanho da imagem inválido.");
  }

  const img = await readImage(form.get("image"), MAX);
  if (!img.ok) return fail(img.status, img.message);
  const thumb = form.get("thumb") ? await readImage(form.get("thumb"), MAX_THUMB) : null;
  if (thumb && !thumb.ok) return fail(thumb.status, thumb.message);

  const [row] = await db
    .insert(items)
    .values({ userId: user.id, ...parsed.data, color: parsed.data.color ?? null, image: img.buf, imageType: img.type, ...(thumb?.ok ? { thumb: thumb.buf, thumbType: thumb.type } : {}), width, height })
    .returning({ id: items.id, updatedAt: items.updatedAt });
  return ok({ id: row.id, url: itemUrl(row.id, row.updatedAt) }, 201);
});
