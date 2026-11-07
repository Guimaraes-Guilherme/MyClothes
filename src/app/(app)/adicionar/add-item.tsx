"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, Plus, Wand2 } from "lucide-react";
import { CATEGORY_INFO, CATEGORY_ORDER, COLORS, type Category } from "@/lib/categories";
import { canvasToPng, downscale, finalize, removeBg, type Processed } from "@/lib/process-image";
import { Button, PageTitle, inputClass } from "@/components/ui";
import { api, useWardrobe } from "@/components/wardrobe";

type Stage =
  | { step: "pick" }
  | { step: "working"; preview: string; label: string; pct: number | null }
  | { step: "edit"; original: Processed; cutout: Processed | null; cutoutError?: string }
  | { step: "done"; id: string; url: string; category: Category; name: string };

export function AddItem() {
  const router = useRouter();
  const { outfit, setOutfit } = useWardrobe();
  const [stage, setStage] = useState<Stage>({ step: "pick" });
  const [useCutout, setUseCutout] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma foto.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setStage({ step: "working", preview, label: "Preparando a foto…", pct: null });
    try {
      const small = await downscale(file, 1200);
      const original = await finalize(small, false);
      let cutout: Processed | null = null;
      let cutoutError: string | undefined;
      try {
        const png = await removeBg(await canvasToPng(small), (label, pct) => setStage({ step: "working", preview, label, pct }));
        setStage({ step: "working", preview, label: "Recortando a peça…", pct: null });
        cutout = await finalize(png, true);
      } catch (e) {
        console.error(e);
        cutoutError =
          e instanceof Error && e.message.startsWith("Não encontrei")
            ? e.message
            : "Não consegui remover o fundo desta vez (sem internet na primeira vez?). Você pode salvar a foto original.";
      }
      setUseCutout(Boolean(cutout));
      setStage({ step: "edit", original, cutout, cutoutError });
    } catch (e) {
      console.error(e);
      setError("Não consegui abrir essa foto. Tente outra.");
      setStage({ step: "pick" });
    }
  }

  async function save() {
    if (stage.step !== "edit" || !category) return;
    const img = useCutout && stage.cutout ? stage.cutout : stage.original;
    const finalName = name.trim() || CATEGORY_INFO[category].example;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("image", img.blob, img.blob.type === "image/webp" ? "peca.webp" : img.blob.type === "image/png" ? "peca.png" : "peca.jpg");
      form.set("name", finalName);
      form.set("category", category);
      form.set("color", color ?? "");
      form.set("width", String(img.width));
      form.set("height", String(img.height));
      const r = await api<{ id: string; url: string }>("/api/roupas", { method: "POST", body: form });
      router.refresh();
      setStage({ step: "done", id: r.id, url: img.url, category, name: finalName });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStage({ step: "pick" });
    setCategory(null);
    setName("");
    setColor(null);
    setError(null);
  }

  const inputs = (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </>
  );

  if (stage.step === "pick") {
    return (
      <div className="mx-auto max-w-md">
        <PageTitle title="Nova peça" subtitle="Fotografe a roupa e ela vai direto para a prateleira." />
        {inputs}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => camRef.current?.click()} className="glass-strong flex aspect-square flex-col items-center justify-center gap-3 rounded-[28px] transition active:scale-[0.98]">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-fg text-white">
              <Camera className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold">Tirar foto</span>
          </button>
          <button type="button" onClick={() => galRef.current?.click()} className="glass flex aspect-square flex-col items-center justify-center gap-3 rounded-[28px] transition active:scale-[0.98]">
            <span className="glass-strong grid h-14 w-14 place-items-center rounded-full">
              <ImagePlus className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold">Da galeria</span>
          </button>
        </div>
        {error && <p className="mt-4 text-sm font-medium">{error}</p>}
        <div className="glass mt-5 rounded-[24px] p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="h-4 w-4" /> Dicas para ficar perfeito
          </p>
          <ul className="mt-3 space-y-2 text-[13px] text-muted">
            <li>• Estique a peça numa superfície lisa (cama, chão ou parede), de frente.</li>
            <li>• Fotografe de cima, com a peça inteira aparecendo e boa luz.</li>
            <li>• Calçados: de lado, como numa vitrine.</li>
            <li>• O fundo é removido automaticamente aqui no celular.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (stage.step === "working") {
    return (
      <div className="mx-auto max-w-md">
        <PageTitle title="Nova peça" subtitle="Só um instante…" />
        <div className="glass-strong relative overflow-hidden rounded-[32px] p-6">
          <div className="relative mx-auto aspect-square w-full max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stage.preview} alt="" className="h-full w-full rounded-3xl object-contain opacity-60 blur-[1px]" />
            <div className="animate-shimmer absolute inset-0 rounded-3xl" />
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            {stage.label}
            {stage.pct !== null && <span className="tabular-nums text-muted">{stage.pct}%</span>}
          </div>
          {stage.pct !== null && (
            <div className="mx-auto mt-3 h-1 w-48 overflow-hidden rounded-full bg-fg/10">
              <div className="h-full rounded-full bg-fg transition-[width]" style={{ width: `${stage.pct}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage.step === "done") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="glass-strong animate-pop-in rounded-[32px] p-6">
          <div className="relative mx-auto aspect-square w-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stage.url} alt="" className="item-shadow absolute inset-0 h-full w-full object-contain object-bottom" />
          </div>
          <div className="shelf-lit mx-auto w-60" />
          <p className="mt-6 inline-flex items-center gap-2 text-lg font-bold">
            <Check className="h-5 w-5" /> {stage.name} guardada
          </p>
          <p className="mt-1 text-sm text-muted">Já está na prateleira de {CATEGORY_INFO[stage.category].plural.toLowerCase()}.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              className="h-12"
              onClick={() => {
                setOutfit({ ...outfit, [stage.category]: stage.id });
                router.push("/look");
              }}
            >
              Vestir no manequim
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-12" onClick={reset}>
                <Plus className="h-4 w-4" /> Outra peça
              </Button>
              <Link href="/armario" className="glass flex h-12 items-center justify-center rounded-full text-sm font-medium">
                Ver armário
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shown = useCutout && stage.cutout ? stage.cutout : stage.original;
  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Nova peça" subtitle="Confira o recorte e diga que peça é." />
      <div className="glass-strong rounded-[32px] p-5">
        <div className="relative mx-auto aspect-square w-full max-w-[280px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={shown.url} src={shown.url} alt="Prévia da peça" className="animate-pop-in item-shadow absolute inset-0 h-full w-full object-contain object-bottom" />
        </div>
        <div className="shelf-lit mx-auto w-[85%] max-w-[300px]" />

        <div className="mt-6 flex justify-center">
          <div className="glass inline-flex rounded-full p-1 text-[13px] font-medium">
            <button type="button" disabled={!stage.cutout} onClick={() => setUseCutout(true)} className={clsx("rounded-full px-4 py-1.5 transition disabled:opacity-40", useCutout && stage.cutout ? "bg-fg text-white" : "text-muted")}>
              Sem fundo
            </button>
            <button type="button" onClick={() => setUseCutout(false)} className={clsx("rounded-full px-4 py-1.5 transition", !useCutout || !stage.cutout ? "bg-fg text-white" : "text-muted")}>
              Foto original
            </button>
          </div>
        </div>
        {stage.cutoutError && <p className="mt-3 text-center text-[13px] text-muted">{stage.cutoutError}</p>}
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold">Que peça é?</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={clsx("h-9 rounded-full px-4 text-[13px] font-medium transition", category === c ? "bg-fg text-white" : "glass")}
              >
                {CATEGORY_INFO[c].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="nome" className="mb-2 block text-sm font-semibold">
            Nome <span className="font-normal text-faint">(opcional)</span>
          </label>
          <input
            id="nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={category ? `Ex.: ${CATEGORY_INFO[category].example} preta` : "Ex.: Camiseta branca básica"}
            className={clsx(inputClass, "border-white")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">
            Cor <span className="font-normal text-faint">(opcional)</span>
          </p>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        {error && <p className="text-sm font-medium">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="h-13" onClick={reset}>
            Trocar foto
          </Button>
          <Button className="h-13 flex-1" disabled={!category || saving} onClick={save}>
            {saving ? "Guardando…" : category ? "Guardar no armário" : "Escolha o tipo da peça"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.label}
          aria-label={c.label}
          aria-pressed={value === c.id}
          onClick={() => onChange(value === c.id ? null : c.id)}
          className={clsx("h-8 w-8 rounded-full ring-1 ring-black/10 transition active:scale-90", value === c.id && "ring-2 ring-fg ring-offset-2 ring-offset-white")}
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );
}
