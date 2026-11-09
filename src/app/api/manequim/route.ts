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
  const soft = form.get("soft") === "1";

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
  const cats = new Set([...refIds, ...extraIds].map((id) => byId.get(id)?.category));
  const hasShoes = cats.has("calcado");
  const hasBottom = cats.has("baixo") || cats.has("vestido");
  const hasTop = cats.has("cima") || cats.has("vestido") || cats.has("casaco");

  const who = body === "female" ? "women's" : "men's";
  const outfit = [
    "It is fully dressed in this outfit, worn together:",
    ...lines,
    ...extras,
    "Copy each garment from its reference image as faithfully as possible: same color, fabric texture, print, logo, embroidery and length. Use only the garment from each reference image and ignore any background, floor, bed or objects in it. Natural drape, folds and layering.",
    soft ? "Draw the garments without any brand logos, crests, badges, numbers or text on them; keep their colors, stripes, collars and trims." : "",
    hasShoes ? "" : "Plain clean white sneakers.",
    hasBottom ? "" : "Simple plain grey trousers.",
    hasTop ? "" : "Simple plain white crew-neck t-shirt.",
  ].filter(Boolean);
  const scene = "Seamless light warm-grey studio backdrop, soft diffused light, gentle floor shadow, photorealistic catalog photo, sharp, no text.";

  const prompts = [
    [`Clothing catalog photo of a plastic ${who} fashion display mannequin in a clothing store: matte white plastic, faceless smooth head, standing straight, full figure from head to shoes, centered.`, ...outfit, scene].join("\n"),
  ];

  const r = await generateImage(prompts, refs);
  if (!r.ok) return fail(r.status, r.message);
  return ok({ image: r.image });
});
