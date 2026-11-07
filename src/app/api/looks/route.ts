import { and, eq, inArray } from "drizzle-orm";
import { db, items, looks } from "@/db";
import { authed, fail, ok } from "@/lib/api";
import { readImage } from "@/lib/images";
import { firstError, lookSchema } from "@/lib/validation";

/** Salva um look. Recebe FormData: name, itemIds (JSON) e, opcionalmente, aiImage (foto da prova com IA). */
export const POST = authed(async (req, user) => {
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Envio inválido.");
  let ids: unknown = [];
  try {
    ids = JSON.parse(String(form.get("itemIds") ?? "[]"));
  } catch {}
  const parsed = lookSchema.safeParse({ name: form.get("name"), itemIds: ids });
  if (!parsed.success) return fail(422, firstError(parsed.error));

  const owned = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.userId, user.id), inArray(items.id, parsed.data.itemIds)));
  if (owned.length !== new Set(parsed.data.itemIds).size) return fail(422, "Alguma peça do look não existe mais.");

  let ai: { aiImage: Buffer; aiImageType: string } | object = {};
  if (form.get("aiImage")) {
    const img = await readImage(form.get("aiImage"), 2 * 1024 * 1024);
    if (!img.ok) return fail(img.status, img.message);
    ai = { aiImage: img.buf, aiImageType: img.type };
  }

  const [row] = await db.insert(looks).values({ userId: user.id, ...parsed.data, ...ai }).returning({ id: looks.id });
  return ok({ id: row.id }, 201);
});
