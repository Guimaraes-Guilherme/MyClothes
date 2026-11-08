import { and, eq, inArray } from "drizzle-orm";
import { db, items, users } from "@/db";
import { authed, fail, ok, readJson } from "@/lib/api";
import { CATEGORY_INFO, CATEGORY_ORDER } from "@/lib/categories";
import { CATEGORY_EN, generateImage } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * Prova com IA: manda a foto de corpo inteiro + as peças para o modelo de imagem do Google (Gemini)
 * e devolve uma foto realista da pessoa vestindo o look.
 */
export const POST = authed(async (req, user) => {
  if (!rateLimit(`ia:${user.id}`, 30, 60 * 60 * 1000)) return fail(429, "Você fez muitas provas na última hora. Espere um pouco.");

  const body = await readJson(req);
  const ids = Array.isArray(body.itemIds) ? body.itemIds.filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)).slice(0, 8) : [];
  if (!ids.length) return fail(422, "Escolha pelo menos uma peça.");

  const me = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { body: true, bodyType: true } });
  if (!me?.body || !me.bodyType) return fail(422, "Adicione uma foto sua de corpo inteiro no Perfil para provar com IA.");

  const rows = await db
    .select({ name: items.name, category: items.category, image: items.image, imageType: items.imageType })
    .from(items)
    .where(and(eq(items.userId, user.id), inArray(items.id, ids)));
  if (!rows.length) return fail(422, "As peças escolhidas não foram encontradas.");
  rows.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const list = rows.map((r, i) => `Image ${i + 2}: ${CATEGORY_EN[r.category]} — "${r.name}" (${CATEGORY_INFO[r.category].label}).`).join("\n");
  const prompt = [
    "You are a virtual fitting room.",
    "Image 1 is a photo of a real person. The next images are individual clothing items from this person's own wardrobe (sometimes photographed lying on a bed or floor: use ONLY the garment, ignore backgrounds, feet and other objects):",
    list,
    "Create a photorealistic full-body photo of the SAME person from image 1 wearing ALL of these items together as one outfit.",
    "Keep the person's face, identity, hairstyle, skin tone, body shape and proportions exactly the same as in image 1.",
    "Reproduce every garment faithfully: same color, fabric, texture, pattern, prints, logos and length. Make them fit naturally on the body, with realistic folds and layering (jackets over tops, tops over or tucked into bottoms as it looks natural).",
    "For body areas without a provided item, keep what the person is already wearing, unless it clashes with a provided item.",
    "Pose: relaxed, standing, facing the camera, entire body visible from head to shoes.",
    "Background: clean bright white studio with a soft floor shadow. Vertical framing. Output only the image.",
  ].join("\n");

  const r = await generateImage(prompt, [
    { mime: me.bodyType, data: me.body.toString("base64") },
    ...rows.map((x) => ({ mime: x.imageType, data: x.image.toString("base64") })),
  ]);
  if (!r.ok) return fail(r.status, r.message);
  return ok({ image: r.image });
});
