import "server-only";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export type GeminiImage = { mime: string; data: string };
export type GeminiResult = { ok: true; image: string } | { ok: false; status: number; message: string };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[];
};

export const geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

/** Gera uma imagem com o modelo de imagem do Google a partir de um texto + fotos de referência. */
export async function generateImage(prompt: string, images: GeminiImage[]): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, status: 503, message: "A IA automática não está configurada. Use a prova grátis pelo app do Gemini." };

  const parts = [{ text: prompt }, ...images.map((i) => ({ inline_data: { mime_type: i.mime, data: i.data } }))];
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return { ok: false, status: 504, message: "A IA demorou demais para responder. Tente de novo." };
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok) {
    console.error("Gemini", res.status, JSON.stringify(data)?.slice(0, 600));
    if (res.status === 429) {
      // "limit: 0" = a chave não tem cota grátis para este modelo (precisa de faturamento).
      const noFree = /limit:\s*0\b|free_tier|FreeTier/i.test(JSON.stringify(data ?? ""));
      return {
        ok: false,
        status: 429,
        message: noFree
          ? "O Google não liberou cota grátis para essa IA nesta chave. Use o app do Gemini (grátis)."
          : "A cota da IA acabou por agora. Tente mais tarde ou use o app do Gemini (grátis).",
      };
    }
    if (res.status === 400 || res.status === 403) {
      return { ok: false, status: 502, message: "A chave da IA foi recusada. Confira a GEMINI_API_KEY no Google AI Studio." };
    }
    return { ok: false, status: 502, message: "A IA não conseguiu gerar a imagem agora. Tente de novo." };
  }

  const image = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!image?.data) return { ok: false, status: 502, message: "A IA não devolveu uma imagem desta vez. Tente de novo." };
  return { ok: true, image: `data:${image.mimeType || "image/png"};base64,${image.data}` };
}

/** Texto que descreve cada peça, na ordem em que as fotos vão para a IA. */
export const CATEGORY_EN: Record<string, string> = {
  chapeu: "hat or cap",
  cima: "top (t-shirt / shirt / sweater)",
  casaco: "jacket or coat, worn over the top",
  vestido: "dress or jumpsuit",
  baixo: "bottoms (pants / shorts / skirt)",
  calcado: "shoes",
  acessorio: "accessory (bag, watch, necklace, glasses…)",
};

/** Pedido do manequim de loja, no estilo das fotos de vitrine. */
export function mannequinPrompt(list: string, body: "masculino" | "feminino") {
  return [
    `Professional fashion product photo of a ${body === "feminino" ? "female" : "male"} store display mannequin: glossy matte-white, faceless, smooth head, realistic athletic proportions, standing relaxed with one hand in the pocket, full body visible from head to shoes, centered.`,
    "The mannequin is wearing ALL of the following garments together as one outfit. Each reference photo shows exactly one of the owner's real garments, sometimes lying on a bed or floor — use ONLY the garment itself and ignore the background, floor, people, feet and any other objects in those photos:",
    list,
    "Reproduce every garment with maximum fidelity: identical color, fabric, texture, wash, print, logos, embroidery, stitching, fit and length. Dress them naturally on the mannequin with realistic drape, folds and layering (jacket over top, top over or tucked into bottoms as looks natural). Do not invent extra garments; if no shoes are given, use simple plain white sneakers.",
    "Background: seamless very light warm-grey studio backdrop with soft diffused lighting and a gentle floor shadow, like a premium e-commerce catalog. Vertical 3:4 framing, photorealistic, sharp. Output only the image, with no text.",
  ].join("\n");
}
