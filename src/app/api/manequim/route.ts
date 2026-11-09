import { and, eq, inArray } from "drizzle-orm";
import { db, items } from "@/db";
import { authed, fail, ok } from "@/lib/api";
import { COLORS } from "@/lib/categories";
import { CATEGORY_EN, generateImage } from "@/lib/cloudflare";
import { readImage } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const ids = (v: FormDataEntryValue | null) => {
  try {
    const a = JSON.parse(String(v ?? "[]"));
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 8) : [];
  } catch {
    return [];
  }
};

/**
 * Foto de vitrine: manequim de loja realista vestindo o look.
 * O navegador manda até 4 fotos das peças (já reduzidas); as demais peças vão só descritas no texto.
 */
export const POST = authed(async (req, user) => {
  if (!rateLimit(`ia:${user.id}`, 40, 60 * 60 * 1000)) return fail(429, "Você gerou muitas imagens na última hora. Espere um pouco.");
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Envio inválido.");
  const refIds = ids(form.get("itemIds")).slice(0, 4);
  const extraIds = ids(form.get("extraIds"));
  if (!refIds.length) return fail(422, "Escolha pelo menos uma peça.");
  const body = form.get("body") === "feminino" ? "female" : "male";

  const all = [...refIds, ...extraIds];
  const rows = await db
    .select({ id: items.id, name: items.name, category: items.category, color: items.color })
    .from(items)
    .where(and(eq(items.userId, user.id), inArray(items.id, all)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (refIds.some((id) => !byId.has(id))) return fail(422, "Alguma peça do look não existe mais.");

  const refs: Blob[] = [];
  for (let i = 0; i < refIds.length; i++) {
    const img = await readImage(form.get(`ref_${i}`), 1024 * 1024);
    if (!img.ok) return fail(img.status, img.message);
    refs.push(new Blob([new Uint8Array(img.buf)], { type: img.type }));
  }

  const colorName = (c: string | null) => (c ? COLORS.find((x) => x.id === c)?.label.toLowerCase() : null);
  const describe = (id: string) => {
    const r = byId.get(id)!;
    const color = colorName(r.color);
    return `${CATEGORY_EN[r.category]}${color ? ` (${color})` : ""}`;
  };
  const lines = refIds.map((id, i) => `- the ${describe(id)} shown in image ${i}, exactly as it appears there`);
  const extras = extraIds.filter((id) => byId.has(id)).map((id) => `- a ${describe(id)}`);
  const hasShoes = [...refIds, ...extraIds].some((id) => byId.get(id)?.category === "calcado");

  const prompt = [
    `Professional fashion e-commerce product photo of a ${body} retail display mannequin: smooth matte white, faceless egg-shaped head, realistic athletic proportions, standing relaxed with one hand in the pocket, full body from head to shoes, centered.`,
    "The mannequin wears ALL of these garments together as one outfit:",
    ...lines,
    ...extras,
    "Copy each garment from its reference image with maximum fidelity: same color, fabric texture, wash, print, logo, embroidery and length. Use only the garment from each reference image and ignore any background, floor, bed or objects in it. Natural realistic drape, folds and layering.",
    hasShoes ? "" : "Plain clean white sneakers.",
    "Seamless light warm-grey studio background, soft diffused light, gentle floor shadow, photorealistic, sharp, no text.",
  ]
    .filter(Boolean)
    .join("\n");

  const r = await generateImage(prompt, refs);
  if (!r.ok) return fail(r.status, r.message);
  return ok({ image: r.image });
});
