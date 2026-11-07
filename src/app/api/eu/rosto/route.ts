import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { authed, fail, ok } from "@/lib/api";
import { readImage } from "@/lib/images";

export const POST = authed(async (req, user) => {
  const form = await req.formData().catch(() => null);
  const img = await readImage(form?.get("image"), 300 * 1024);
  if (!img.ok) return fail(img.status, img.message);
  await db.update(users).set({ face: img.buf, faceType: img.type, faceUpdatedAt: new Date() }).where(eq(users.id, user.id));
  return ok({ ok: true });
});

export const DELETE = authed(async (_req, user) => {
  await db.update(users).set({ face: null, faceType: null, faceUpdatedAt: null }).where(eq(users.id, user.id));
  return ok({ ok: true });
});
