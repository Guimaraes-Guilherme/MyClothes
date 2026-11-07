"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Send } from "lucide-react";
import { CATEGORY_INFO, CATEGORY_ORDER, type ItemView } from "@/lib/categories";
import { Button } from "./ui";

/**
 * Prova grátis pelo app do Gemini: o Provador prepara a sua foto + as peças,
 * copia o pedido já escrito e abre o compartilhamento do celular.
 * Depois você traz a foto gerada de volta para guardar no look.
 */
export function GeminiShare({ items, bodyUrl, onResult }: { items: ItemView[]; bodyUrl: string; onResult: (dataUrl: string) => void }) {
  const [files, setFiles] = useState<File[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pick = useRef<HTMLInputElement>(null);

  const sorted = [...items].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  const prompt = [
    "Use a primeira foto (sou eu) e me vista com TODAS as peças de roupa das outras fotos, juntas, como um único look:",
    ...sorted.map((it, i) => `- Foto ${i + 2}: ${CATEGORY_INFO[it.category].label.toLowerCase()} — ${it.name}`),
    "Mantenha meu rosto, cabelo, tom de pele, corpo e pose exatamente iguais.",
    "Reproduza cada peça fielmente: mesma cor, tecido, textura, estampa, logos e comprimento, com caimento e dobras naturais.",
    "Foto realista de corpo inteiro, da cabeça aos pés, de frente, com fundo branco de estúdio. Gere a imagem.",
  ].join("\n");

  async function prepare() {
    setBusy(true);
    setMsg(null);
    try {
      const list = [
        await toJpegFile(bodyUrl, "1-eu.jpg"),
        ...(await Promise.all(sorted.map((it, i) => toJpegFile(it.fullUrl, `${i + 2}-${slug(it.name)}.jpg`)))),
      ];
      setFiles(list);
    } catch {
      setMsg("Não consegui preparar as fotos. Confira a internet e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!files) return;
    setMsg(null);
    // Copia o texto antes de abrir o compartilhamento (precisa ser no mesmo toque).
    navigator.clipboard?.writeText(prompt).catch(() => {});
    const data = { files, text: prompt, title: "Provar look" };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
        setSent(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setMsg("O celular não deixou compartilhar. Tente de novo.");
      }
      return;
    }
    // Computador: baixa as fotos e abre o Gemini numa aba nova.
    for (const f of files) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    window.open("https://gemini.google.com/app", "_blank", "noopener");
    setSent(true);
  }

  return (
    <div>
      <ol className="space-y-3 text-sm">
        <Step n={1} done={Boolean(files)} title="Preparar as fotos">
          Sua foto de corpo + {sorted.length} {sorted.length === 1 ? "peça" : "peças"} do look.
        </Step>
        <Step n={2} done={sent} title="Enviar para o Gemini">
          Escolha o app <b>Gemini</b> no compartilhamento. O pedido já fica copiado: é só <b>colar</b> na caixa de texto e enviar.
        </Step>
        <Step n={3} done={false} title="Trazer a foto de volta">
          Salve a imagem que o Gemini gerar e escolha ela aqui para guardar no look.
        </Step>
      </ol>

      <div className="mt-5 flex flex-col gap-2">
        {!files ? (
          <Button className="h-12" onClick={prepare} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {busy ? "Preparando…" : "Preparar fotos"}
          </Button>
        ) : (
          <Button className="h-12" onClick={share}>
            <Send className="h-4 w-4" /> {sent ? "Enviar de novo" : "Abrir no Gemini"}
          </Button>
        )}
        <input
          ref={pick}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const r = new FileReader();
            r.onload = () => onResult(String(r.result));
            r.readAsDataURL(f);
          }}
        />
        <Button variant="secondary" className="h-12" onClick={() => pick.current?.click()}>
          <ImagePlus className="h-4 w-4" /> Já tenho a foto do Gemini
        </Button>
      </div>
      {msg && <p className="mt-3 text-sm font-medium">{msg}</p>}
      <details className="mt-4 text-[12px] text-muted">
        <summary className="cursor-pointer font-medium">Ver o pedido que vai copiado</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white/70 p-3 font-sans">{prompt}</pre>
      </details>
    </div>
  );
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-fg text-white" : "glass"}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-[13px] text-muted">{children}</p>
      </div>
    </li>
  );
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "peca";

/** Baixa a imagem e converte para JPEG com fundo branco (todos os apps aceitam). */
async function toJpegFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("download");
  const bmp = await createImageBitmap(await res.blob());
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("jpeg"))), "image/jpeg", 0.9));
  return new File([blob], name, { type: "image/jpeg" });
}
