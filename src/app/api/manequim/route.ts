import { and, eq, inArray } from "drizzle-orm";
import { db, items } from "@/db";
import { authed, fail, ok, readJson } from "@/lib/api";
import { CATEGORY_INFO, CATEGORY_ORDER } from "@/lib/categories";
import { CATEGORY_EN, generateImage, mannequinPrompt } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/** Gera a foto de vitrine: um manequim de loja realista vestindo as peças do look. */
export const POST = authed(async (req, user) => {
  if (!rateLimit(`ia:${user.id}`, 40, 60 * 60 * 1000)) return fail(429, "Você gerou muitas imagens na última hora. Espere um pouco.");
  const body = await readJson(req);
  const ids = Array.isArray(body.itemIds) ? body.itemIds.filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)).slice(0, 8) : [];
  if (!ids.length) return fail(422, "Escolha pelo menos uma peça.");
  const shape = body.body === "feminino" ? "feminino" : "masculino";

  const rows = await db
    .select({ name: items.name, category: items.category, image: items.image, imageType: items.imageType })
    .from(items)
    .where(and(eq(items.userId, user.id), inArray(items.id, ids)));
  if (!rows.length) return fail(422, "As peças escolhidas não foram encontradas.");
  rows.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const list = rows.map((r, i) => `Reference photo ${i + 1}: ${CATEGORY_EN[r.category]} — "${r.name}" (${CATEGORY_INFO[r.category].label}).`).join("\n");
  const r = await generateImage(
    mannequinPrompt(list, shape),
    rows.map((x) => ({ mime: x.imageType, data: x.image.toString("base64") })),
  );
  if (!r.ok) return fail(r.status, r.message);
  return ok({ image: r.image });
});
