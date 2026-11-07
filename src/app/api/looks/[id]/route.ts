import { and, eq } from "drizzle-orm";
import { db, looks } from "@/db";
import { authed, fail, ok } from "@/lib/api";
import { readImage } from "@/lib/images";

type Ctx = RouteContext<"/api/looks/[id]">;
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Guarda a foto da prova com IA num look que já existe. */
export const PATCH = authed<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(404, "Look não encontrado.");
  const form = await req.formData().catch(() => null);
  const img = await readImage(form?.get("aiImage"), 2 * 1024 * 1024);
  if (!img.ok) return fail(img.status, img.message);
  const [row] = await db
    .update(looks)
    .set({ aiImage: img.buf, aiImageType: img.type, updatedAt: new Date() })
    .where(and(eq(looks.id, id), eq(looks.userId, user.id)))
    .returning({ id: looks.id });
  if (!row) return fail(404, "Look não encontrado.");
  return ok({ ok: true });
});

export const DELETE = authed<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) return fail(404, "Look não encontrado.");
  await db.delete(looks).where(and(eq(looks.id, id), eq(looks.userId, user.id)));
  return ok({ ok: true });
});
