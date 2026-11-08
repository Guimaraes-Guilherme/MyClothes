"use client";

/**
 * Tratamento das fotos no próprio celular (nada vai para um servidor externo):
 * - corrige a rotação da câmera e reduz o tamanho;
 * - remove o fundo com um modelo de IA que roda no navegador;
 * - corta as bordas vazias, para a peça encostar certinho nas áreas do manequim.
 */

export type Processed = { blob: Blob; width: number; height: number; url: string };

const MAX_UPLOAD = 2800 * 1024;

async function bitmapFrom(file: Blob) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toBlob(c: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Não consegui gerar a imagem."))), type, quality));
}

/** WebP com transparência quando o navegador sabe gerar; senão PNG (iPhone antigo). Garante o limite de tamanho. */
async function exportImage(c: HTMLCanvasElement, transparent: boolean): Promise<Blob> {
  let blob = await toBlob(c, "image/webp", 0.92);
  if (blob.type !== "image/webp") blob = await toBlob(c, transparent ? "image/png" : "image/jpeg", 0.88);
  let cur = c;
  while (blob.size > MAX_UPLOAD && cur.width > 300) {
    const next = canvas(Math.round(cur.width * 0.8), Math.round(cur.height * 0.8));
    next.getContext("2d")!.drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
    blob = await toBlob(cur, blob.type, 0.86);
  }
  return blob;
}

/** Reduz a foto (lado maior = max) mantendo a proporção. */
export async function downscale(file: Blob, max = 1200): Promise<HTMLCanvasElement> {
  const bmp = await bitmapFrom(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = canvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

export async function canvasToPng(c: HTMLCanvasElement) {
  return toBlob(c, "image/png");
}

/** Remove o fundo. Na primeira vez baixa o modelo (uns 40 MB), que fica guardado no aparelho. */
export async function removeBg(input: Blob, onProgress?: (label: string, pct: number | null) => void): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(input, {
    model: "isnet_quint8",
    output: { format: "image/png" },
    progress: (key, current, total) => {
      if (key.startsWith("fetch")) onProgress?.("Baixando o removedor de fundo (só na primeira vez)…", total ? Math.round((current / total) * 100) : null);
      else onProgress?.("Removendo o fundo…", null);
    },
  });
}

/** Corta as bordas transparentes, reduz e exporta. Devolve também as dimensões finais. */
export async function finalize(input: Blob | HTMLCanvasElement, transparent: boolean, max = 1800): Promise<Processed> {
  let src: HTMLCanvasElement;
  if (input instanceof HTMLCanvasElement) src = input;
  else {
    const bmp = await bitmapFrom(input);
    src = canvas(bmp.width, bmp.height);
    src.getContext("2d")!.drawImage(bmp, 0, 0);
    bmp.close?.();
  }

  let box = { x: 0, y: 0, w: src.width, h: src.height };
  if (transparent) {
    const ctx = src.getContext("2d", { willReadFrequently: true })!;
    const img = ctx.getImageData(0, 0, src.width, src.height);
    keepLargestBlob(img);
    ctx.putImageData(img, 0, 0);
    const { data, width, height } = img;
    let minX = width,
      minY = height,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 16) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || (maxX - minX) * (maxY - minY) < width * height * 0.01) {
      throw new Error("Não encontrei a roupa na foto. Tente uma foto com a peça inteira e um fundo liso, ou use a foto original.");
    }
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.01);
    box = {
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      w: Math.min(width, maxX + pad + 1) - Math.max(0, minX - pad),
      h: Math.min(height, maxY + pad + 1) - Math.max(0, minY - pad),
    };
  }

  const s = Math.min(1, max / Math.max(box.w, box.h));
  const out = canvas(Math.max(1, Math.round(box.w * s)), Math.max(1, Math.round(box.h * s)));
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
  const blob = await exportImage(out, transparent);
  return { blob, width: out.width, height: out.height, url: URL.createObjectURL(blob) };
}

/** Recorte quadrado (para o rosto do manequim), com zoom e deslocamento em frações da imagem. */
export async function cropSquare(file: Blob, zoom: number, cx: number, cy: number, size = 320): Promise<Blob> {
  const bmp = await bitmapFrom(file);
  const side = Math.min(bmp.width, bmp.height) / zoom;
  const x = Math.min(bmp.width - side, Math.max(0, cx * bmp.width - side / 2));
  const y = Math.min(bmp.height - side, Math.max(0, cy * bmp.height - side / 2));
  const c = canvas(size, size);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, x, y, side, side, 0, 0, size, size);
  bmp.close?.();
  let blob = await toBlob(c, "image/webp", 0.88);
  if (blob.type !== "image/webp") blob = await toBlob(c, "image/jpeg", 0.88);
  return blob;
}

/** Foto de corpo inteiro para a IA: só reduz e comprime. */
export async function prepareBodyPhoto(file: Blob): Promise<Blob> {
  const c = await downscale(file, 1280);
  let blob = await toBlob(c, "image/jpeg", 0.88);
  if (blob.size > 1400 * 1024) blob = await toBlob(c, "image/jpeg", 0.75);
  return blob;
}

/** Miniatura leve da peça já tratada (vitrine e manequim). */
export async function thumbnail(full: Processed, transparent: boolean): Promise<Blob> {
  const bmp = await bitmapFrom(full.blob);
  const s = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
  const c = canvas(Math.max(1, Math.round(bmp.width * s)), Math.max(1, Math.round(bmp.height * s)));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  let blob = await toBlob(c, "image/webp", 0.85);
  if (blob.type !== "image/webp") blob = await toBlob(c, transparent ? "image/png" : "image/jpeg", 0.85);
  return blob;
}

/**
 * Mantém só a maior "mancha" visível do recorte (a peça) e apaga sobras pequenas,
 * como um pé ou um chinelo que apareceram na foto.
 */
function keepLargestBlob(img: ImageData) {
  const { data, width, height } = img;
  const cell = Math.max(2, Math.round(Math.max(width, height) / 300));
  const gw = Math.ceil(width / cell);
  const gh = Math.ceil(height / cell);
  const solid = new Uint8Array(gw * gh);
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 40) solid[Math.floor(y / cell) * gw + Math.floor(x / cell)] = 1;
    }
  }
  const label = new Int32Array(gw * gh);
  const sizes = [0];
  const stack: number[] = [];
  for (let i = 0; i < solid.length; i++) {
    if (!solid[i] || label[i]) continue;
    const id = sizes.length;
    let size = 0;
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const c = stack.pop()!;
      size++;
      const cx = c % gw;
      const cy = (c - cx) / gw;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const n = ny * gw + nx;
          if (solid[n] && !label[n]) {
            label[n] = id;
            stack.push(n);
          }
        }
      }
    }
    sizes.push(size);
  }
  if (sizes.length < 2) return;
  let best = 1;
  for (let k = 2; k < sizes.length; k++) if (sizes[k] > sizes[best]) best = k;
  // Sobras com mais de 25% do tamanho da peça ficam (ex.: o outro pé de um par de tênis).
  const keep = new Set<number>();
  for (let k = 1; k < sizes.length; k++) if (k === best || sizes[k] > sizes[best] * 0.25) keep.add(k);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = label[Math.floor(y / cell) * gw + Math.floor(x / cell)];
      if (!keep.has(l)) data[(y * width + x) * 4 + 3] = 0;
    }
  }
}
