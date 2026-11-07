import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { authed, fail, ok, readJson } from "@/lib/api";
import { firstError, profileSchema } from "@/lib/validation";

export const PATCH = authed(async (req, user) => {
  const parsed = profileSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(422, firstError(parsed.error));
  await db.update(users).set({ name: parsed.data.name, updatedAt: new Date() }).where(eq(users.id, user.id));
  return ok({ ok: true });
});
