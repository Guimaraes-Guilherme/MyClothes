import { and, eq } from "drizzle-orm";
import { db, items } from "@/db";
import { authed, fail, ok, readJson } from "@/lib/api";
import { firstError, itemPatchSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/roupas/[id]">;

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Edita nome, tipo, cor, favorito ou o ajuste da peça no manequim. */
export const PATCH = authed<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(404, "Peça não encontrada.");
  const parsed = itemPatchSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(422, firstError(parsed.error));

  const fitOnly = Object.keys(parsed.data).every((k) => k.startsWith("fit"));
  const [row] = await db
    .update(items)
    // Mudar só o ajuste não troca a versão da imagem (evita baixar a foto de novo).
    .set({ ...parsed.data, ...(fitOnly ? {} : { updatedAt: new Date() }) })
    .where(and(eq(items.id, id), eq(items.userId, user.id)))
    .returning({ id: items.id });
  if (!row) return fail(404, "Peça não encontrada.");
  return ok({ ok: true });
});

export const DELETE = authed<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(404, "Peça não encontrada.");
  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, user.id)));
  return ok({ ok: true });
});
