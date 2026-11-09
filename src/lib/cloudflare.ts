import "server-only";

/**
 * Geração de imagem pela Cloudflare Workers AI (modelos FLUX.2 da Black Forest Labs).
 * O plano grátis da Cloudflare dá uma cota diária; quando o modelo maior esgota, cai para o menor.
 */
const MODELS = (process.env.CF_IMAGE_MODELS || "@cf/black-forest-labs/flux-2-klein-9b,@cf/black-forest-labs/flux-2-klein-4b")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export const aiEnabled = () => Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);

export type GenResult = { ok: true; image: string; model: string } | { ok: false; status: number; message: string };

type CfResponse = { success?: boolean; result?: { image?: string }; errors?: { code?: number; message?: string }[] };

/**
 * Gera a imagem. `prompts` são variações do mesmo pedido: se o filtro de conteúdo da Cloudflare
 * (erro 3030, que às vezes barra pedidos inocentes) recusar uma, tenta a próxima.
 */
export async function generateImage(prompts: string[], refs: Blob[], size = { width: 768, height: 1024 }): Promise<GenResult> {
  const account = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!account || !token) return { ok: false, status: 503, message: "A IA do manequim ainda não foi configurada no servidor." };

  let last: GenResult = { ok: false, status: 502, message: "A IA não conseguiu gerar a imagem agora. Tente de novo." };
  const attempts = MODELS.flatMap((model) => prompts.map((prompt) => ({ model, prompt })));
  const started = Date.now();
  const BUDGET = 52_000; // a função da Vercel tem 60 s no total
  for (const { model, prompt } of attempts) {
    const left = BUDGET - (Date.now() - started);
    if (left < 8_000) break;
    const form = new FormData();
    form.set("prompt", prompt);
    form.set("seed", String(Math.floor(Math.random() * 2 ** 31)));
    form.set("width", String(size.width));
    form.set("height", String(size.height));
    refs.slice(0, 4).forEach((b, i) => form.set(`input_image_${i}`, b, `ref_${i}.jpg`));

    let res: Response;
    try {
      res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(left),
      });
    } catch {
      last = { ok: false, status: 504, message: "A IA demorou demais para responder. Tente de novo." };
      continue;
    }
    const data = (await res.json().catch(() => null)) as CfResponse | null;
    const image = data?.result?.image;
    if (res.ok && image) {
      const mime = image.startsWith("/9j/") ? "image/jpeg" : image.startsWith("iVBOR") ? "image/png" : "image/webp";
      return { ok: true, image: `data:${mime};base64,${image}`, model };
    }

    const detail = JSON.stringify(data?.errors ?? data ?? "").slice(0, 400);
    console.error("Cloudflare AI", model, res.status, detail);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 502, message: "A chave da Cloudflare foi recusada. Confira o CF_API_TOKEN e o CF_ACCOUNT_ID." };
    }
    // Cota diária grátis esgotada: vale para todos os modelos da conta, então para aqui.
    if (data?.errors?.[0]?.code === 3036 || /neuron|allocation/i.test(detail)) {
      return { ok: false, status: 429, message: "A cota grátis de hoje da IA acabou. Ela renova todo dia às 21h (horário de Brasília)." };
    }
    const code = data?.errors?.[0]?.code;
    const msg = (data?.errors?.[0]?.message ?? "").toLowerCase();
    if (code === 3040 || /capacity|overloaded|busy|unavailable/.test(msg) || res.status === 503) {
      last = { ok: false, status: 503, message: "A IA da Cloudflare está sobrecarregada agora. Tente de novo em alguns minutos." };
      continue;
    }
    // Filtro da Cloudflare barrou a imagem gerada. Na prática é causado por logos/escudos de marcas
    // nas peças: o navegador tenta de novo com as fotos borradas (outro texto não resolve).
    if (code === 3030 || /nsfw|safety|flagged|moderation/.test(msg)) {
      return { ok: false, status: 422, message: "FILTRO: O filtro de conteúdo da IA barrou a imagem (erro 3030)." };
    }
    last = { ok: false, status: 502, message: `A IA não conseguiu gerar a imagem agora. Tente de novo. (erro ${code ?? res.status}${msg ? `: ${msg.slice(0, 80)}` : ""})` };
  }
  return last;
}

/** Descrição de cada tipo de peça para o pedido em inglês. */
export const CATEGORY_EN: Record<string, string> = {
  chapeu: "cap/hat",
  cima: "top (t-shirt / shirt / sweater)",
  casaco: "jacket or coat worn over the top",
  vestido: "dress or jumpsuit",
  baixo: "pants / shorts / skirt",
  calcado: "shoes",
  acessorio: "accessory",
};
