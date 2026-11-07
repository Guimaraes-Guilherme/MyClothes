import "server-only";

export type ImageResult = { ok: true; buf: Buffer; type: string } | { ok: false; message: string; status: number };

const TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

/** Valida um arquivo de imagem enviado pelo navegador (tipo, tamanho e "assinatura" do arquivo). */
export async function readImage(file: unknown, maxBytes: number): Promise<ImageResult> {
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Escolha uma imagem.", status: 422 };
  if (!TYPES.has(file.type)) return { ok: false, message: "Use uma imagem JPG, PNG ou WebP.", status: 415 };
  if (file.size > maxBytes) {
    return { ok: false, message: `A imagem ficou grande demais (máx. ${Math.round(maxBytes / 1024)} KB).`, status: 413 };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buf, file.type)) return { ok: false, message: "Arquivo de imagem inválido.", status: 422 };
  return { ok: true, buf, type: file.type };
}

export function looksLikeImage(b: Buffer, type: string) {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8;
  if (type === "image/png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/webp") return b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  return false;
}

export function imageResponse(buf: Buffer, type: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
