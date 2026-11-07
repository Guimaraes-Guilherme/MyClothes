"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Download, Minus, RotateCcw, Shuffle, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { CATEGORY_INFO, CATEGORY_ORDER, outfitFromIds, type Category, type ItemView, type LookView, type Outfit } from "@/lib/categories";
import { Mannequin } from "@/components/mannequin";
import { Button, ButtonLink, PageTitle, inputClass } from "@/components/ui";
import { api, useWardrobe } from "@/components/wardrobe";

type Slide = { kind: "current"; name: string; items: ItemView[] } | { kind: "saved"; look: LookView; name: string; items: ItemView[] };

export function LookView() {
  const router = useRouter();
  const { items, looks, outfitItems, setOutfit, outfit, faceUrl, bodyUrl, aiEnabled, patchItem } = useWardrobe();
  const track = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [adjustingRaw, setAdjusting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ai, setAi] = useState<{ state: "loading" | "done" | "error"; image?: string; message?: string; lookId?: string } | null>(null);
  const [showPhoto, setShowPhoto] = useState<Record<string, boolean>>({});

  const slides: Slide[] = useMemo(
    () => [
      { kind: "current", name: "Look atual", items: outfitItems },
      ...looks.map((look) => ({
        kind: "saved" as const,
        look,
        name: look.name,
        items: look.itemIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ItemView => Boolean(i)),
      })),
    ],
    [outfitItems, looks, items],
  );

  const index = Math.min(slides.length - 1, Math.max(0, Math.round(pos)));
  const slide = slides[index];
  const slideWidth = () => (track.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
  const onScroll = useCallback(() => {
    const el = track.current;
    if (el) setPos(el.scrollLeft / slideWidth());
  }, []);
  const go = (i: number) => track.current?.scrollTo({ left: i * slideWidth(), behavior: "smooth" });


  const adjusting = slide.kind === "current" ? adjustingRaw : null;
  const sorted = [...slide.items].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  function remove(cat: Category) {
    const next: Outfit = { ...outfit };
    delete next[cat];
    setOutfit(next);
    if (adjusting && outfit[cat] === adjusting) setAdjusting(null);
  }

  function shuffle() {
    const pick = (c: Category) => {
      const list = items.filter((i) => i.category === c);
      return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    };
    const next: Outfit = {};
    const dress = pick("vestido");
    const top = pick("cima");
    const bottom = pick("baixo");
    if (dress && (!top || !bottom || Math.random() < 0.3)) next.vestido = dress.id;
    else {
      if (top) next.cima = top.id;
      if (bottom) next.baixo = bottom.id;
    }
    for (const [c, chance] of [["calcado", 1], ["casaco", 0.45], ["chapeu", 0.3], ["acessorio", 0.35]] as const) {
      const it = pick(c);
      if (it && Math.random() < chance) next[c] = it.id;
    }
    setOutfit(next);
    setAdjusting(null);
    go(0);
  }

  async function saveLook(name: string, aiImage?: Blob) {
    const form = new FormData();
    form.set("name", name);
    form.set("itemIds", JSON.stringify(outfitItems.map((i) => i.id)));
    if (aiImage) form.set("aiImage", aiImage, "look.webp");
    const r = await api<{ id: string }>("/api/looks", { method: "POST", body: form });
    router.refresh();
    return r.id;
  }

  async function deleteLook(id: string) {
    if (!confirm("Apagar este look? As peças continuam no armário.")) return;
    await api(`/api/looks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function tryOn() {
    const ids = slide.items.map((i) => i.id);
    const lookId = slide.kind === "saved" ? slide.look.id : undefined;
    setAi({ state: "loading", lookId });
    try {
      const r = await api<{ image: string }>("/api/provar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: ids }),
      });
      setAi({ state: "done", image: r.image, lookId });
    } catch (e) {
      setAi({ state: "error", message: (e as Error).message, lookId });
    }
  }

  const adjustItem = adjusting ? outfitItems.find((i) => i.id === adjusting) : null;

  return (
    <>
      <PageTitle
        title="Prove o look"
        subtitle={looks.length ? "Deslize para ver seus looks salvos. Toque numa peça para ajustar." : "Monte no manequim, salve e prove em você com IA."}
        action={
          <Button variant="secondary" onClick={shuffle} disabled={!items.length} className="h-10 px-4" aria-label="Look aleatório">
            <Shuffle className="h-4 w-4" /> <span className="hidden sm:inline">Surpreenda-me</span>
          </Button>
        }
      />

      {/* Passarela: o look no centro, os outros desfocados dos lados. */}
      <div
        ref={track}
        onScroll={onScroll}
        className="scrollbar-none snap-x-mandatory -mx-4 flex overflow-x-auto px-[27vw] sm:mx-0 sm:px-[calc(50%-150px)]"
      >
        {slides.map((s, i) => {
          const d = Math.min(Math.abs(i - pos), 1.6);
          const key = s.kind === "current" ? "current" : s.look.id;
          const aiUrl = s.kind === "saved" ? s.look.aiUrl : null;
          const photo = aiUrl && (showPhoto[key] ?? true);
          return (
            <div
              key={key}
              onClick={() => i !== index && go(i)}
              className="flex w-[46vw] max-w-[300px] shrink-0 snap-center flex-col items-center sm:w-[300px]"
              style={{ transform: `scale(${1 - d * 0.2})`, opacity: 1 - d * 0.35, filter: d > 0.05 ? `blur(${d * 4}px)` : undefined, transformOrigin: "center bottom" }}
            >
              <div className="relative h-[min(52vh,500px)] w-full">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={aiUrl} alt={`Foto do look ${s.name}`} className="animate-pop-in h-full w-full rounded-[28px] object-cover shadow-[0_24px_50px_-24px_rgb(30_30_60/0.45)]" />
                ) : (
                  <div className="mx-auto h-full" style={{ aspectRatio: "3 / 7" }}>
                    <Mannequin items={s.items} faceUrl={faceUrl} highlight={s.kind === "current" ? adjusting : null} />
                  </div>
                )}
                {aiUrl && i === index && (
                  <button
                    type="button"
                    onClick={() => setShowPhoto((p) => ({ ...p, [key]: !photo }))}
                    className="glass-strong absolute right-2 top-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                  >
                    {photo ? "Ver manequim" : "Ver foto IA"}
                  </button>
                )}
                {s.kind === "current" && !s.items.length && (
                  <div className="absolute inset-x-0 top-1/3 flex justify-center">
                    <ButtonLink href="/armario" variant="secondary" className="glass-strong">
                      Escolher roupas
                    </ButtonLink>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador de posição, como uma barra de progresso. */}
      {slides.length > 1 && (
        <div className="mx-auto mt-4 h-[3px] w-40 overflow-hidden rounded-full bg-fg/10">
          <div className="h-full rounded-full bg-fg transition-[width] duration-200" style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
        </div>
      )}

      {/* Barra de ações preta, como o "adicionar look" de uma loja. */}
      {sorted.length > 0 && (
        <div className="animate-fade-up mx-auto mt-5 flex max-w-xl gap-2">
          {slide.kind === "current" ? (
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-fg text-sm font-semibold text-white shadow-[0_18px_40px_-14px_rgb(0_0_0/0.7)] active:scale-[0.98]"
            >
              <Bookmark className="h-4 w-4" /> Salvar look
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOutfit(outfitFromIds(slide.items.map((i) => i.id), items));
                go(0);
              }}
              className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-fg text-sm font-semibold text-white shadow-[0_18px_40px_-14px_rgb(0_0_0/0.7)] active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" /> Montar de novo
            </button>
          )}
          <button
            type="button"
            onClick={tryOn}
            className="glass-strong flex h-13 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> Provar com IA
          </button>
        </div>
      )}

      <section className="mx-auto mt-7 max-w-xl">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
              {slide.kind === "current" ? "Montando agora" : `Look salvo · ${new Date(slide.look.createdAt).toLocaleDateString("pt-BR")}`}
            </p>
            <h2 className="truncate text-2xl font-bold tracking-[-0.03em]">{slide.name}</h2>
          </div>
          {slide.kind === "saved" && (
            <button type="button" onClick={() => deleteLook(slide.look.id)} className="glass grid h-9 w-9 shrink-0 place-items-center rounded-full" aria-label="Apagar look">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {sorted.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sorted.map((it, n) => (
              <li key={it.id}>
                <div
                  className={clsx(
                    "flex items-center gap-3 rounded-[22px] p-2 pr-3 transition",
                    adjusting === it.id ? "bg-white shadow-[0_14px_30px_-16px_rgb(30_30_60/0.4)] ring-1 ring-fg/10" : "glass",
                  )}
                >
                  <span className="w-5 text-center text-[11px] font-semibold tabular-nums text-faint">{n + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt="" className="item-shadow h-14 w-14 rounded-2xl bg-white/60 object-contain p-1" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-faint">{CATEGORY_INFO[it.category].label}</p>
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                  </div>
                  {slide.kind === "current" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdjusting(adjusting === it.id ? null : it.id)}
                        aria-label={`Ajustar ${it.name} no manequim`}
                        aria-pressed={adjusting === it.id}
                        className={clsx("grid h-9 w-9 place-items-center rounded-full transition", adjusting === it.id ? "bg-fg text-white" : "text-muted hover:bg-white")}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => remove(it.category)} aria-label={`Tirar ${it.name}`} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white">
                        <Minus className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                {adjustItem?.id === it.id && <AdjustPanel item={adjustItem} onChange={(p) => patchItem(it.id, p)} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-[22px] p-5 text-sm text-muted">
            Nenhuma peça ainda. Vá ao <Link href="/armario" className="font-semibold text-fg underline underline-offset-4">armário</Link> e toque no + das roupas.
          </p>
        )}
      </section>

      {saving && (
        <SaveSheet
          onClose={() => setSaving(false)}
          onSave={async (name) => {
            await saveLook(name);
            setSaving(false);
          }}
        />
      )}

      {ai && (
        <AiSheet
          state={ai}
          hasBody={Boolean(bodyUrl)}
          aiEnabled={aiEnabled}
          canSave={ai.lookId ? true : outfitItems.length > 0}
          onClose={() => setAi(null)}
          onRetry={tryOn}
          onSave={async (blob, name) => {
            if (ai.lookId) {
              const form = new FormData();
              form.set("aiImage", blob, "look.webp");
              await api(`/api/looks/${ai.lookId}`, { method: "PATCH", body: form });
              router.refresh();
            } else {
              await saveLook(name, blob);
            }
            setAi(null);
          }}
        />
      )}
    </>
  );
}

/** Ajuste fino da peça no manequim: tamanho e posição. Salva sozinho. */
function AdjustPanel({ item, onChange }: { item: ItemView; onChange: (p: Partial<ItemView>) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (p: Partial<ItemView>) => {
    onChange(p);
    if (timer.current) clearTimeout(timer.current);
    const body = { fitScale: item.fitScale, fitX: item.fitX, fitY: item.fitY, ...p };
    timer.current = setTimeout(() => {
      api(`/api/roupas/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    }, 400);
  };
  const row = (label: string, k: "fitScale" | "fitX" | "fitY", min: number, max: number, step: number) => (
    <label key={k} className="flex items-center gap-3 text-[12px] font-medium">
      <span className="w-20 shrink-0 text-muted">{label}</span>
      <input type="range" min={min} max={max} step={step} value={item[k]} onChange={(e) => set({ [k]: Number(e.target.value) })} className="flex-1 accent-[#101010]" />
    </label>
  );
  return (
    <div className="animate-fade-up mx-2 mt-1 flex flex-col gap-3 rounded-b-[22px] bg-white/60 px-4 pb-4 pt-3 backdrop-blur">
      {row("Tamanho", "fitScale", 0.5, 1.8, 0.01)}
      {row("↔ Lados", "fitX", -40, 40, 0.5)}
      {row("↕ Altura", "fitY", -40, 40, 0.5)}
      <button type="button" onClick={() => set({ fitScale: 1, fitX: 0, fitY: 0 })} className="self-end text-[12px] font-semibold text-muted underline underline-offset-4">
        Voltar ao padrão
      </button>
    </div>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal aria-label={label} className="fixed inset-0 z-50 flex items-end justify-center bg-white/40 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div className="glass-strong animate-fade-up relative w-full max-w-md rounded-t-[32px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[32px]" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

const defaultName = () => `Look de ${new Date().toLocaleDateString("pt-BR", { weekday: "long" })}`;

function SaveSheet({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet onClose={onClose} label="Salvar look">
      <h3 className="text-xl font-bold tracking-tight">Salvar look</h3>
      <p className="mt-1 text-sm text-muted">Ele aparece ao lado do manequim para você rever depois.</p>
      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await onSave(name);
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={clsx(inputClass, "border-white")} aria-label="Nome do look" />
        {error && <p className="text-sm font-medium">{error}</p>}
        <Button type="submit" disabled={busy || !name.trim()} className="h-12">
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </Sheet>
  );
}

/** Converte a foto da IA para WebP menor antes de salvar. */
async function toWebp(dataUrl: string): Promise<Blob> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Não consegui preparar a imagem."))), "image/webp", 0.88));
}

function AiSheet({
  state,
  hasBody,
  aiEnabled,
  canSave,
  onClose,
  onRetry,
  onSave,
}: {
  state: { state: "loading" | "done" | "error"; image?: string; message?: string; lookId?: string };
  hasBody: boolean;
  aiEnabled: boolean;
  canSave: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSave: (blob: Blob, name: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!aiEnabled || !hasBody) {
    return (
      <Sheet onClose={onClose} label="Provar com IA">
        <Sparkles className="h-6 w-6" />
        <h3 className="mt-3 text-xl font-bold tracking-tight">Falta um passo para provar com IA</h3>
        <p className="mt-2 text-sm text-muted">
          {!hasBody
            ? "Adicione no Perfil uma foto sua de corpo inteiro, de frente e com boa luz. A IA veste as peças nessa foto."
            : "A chave da IA ainda não foi configurada no servidor (GEMINI_API_KEY). Veja o README do projeto."}
        </p>
        {!hasBody && (
          <ButtonLink href="/perfil#foto-corpo" className="mt-5 h-12 w-full">
            Adicionar minha foto
          </ButtonLink>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} label="Provar com IA">
      <h3 className="text-xl font-bold tracking-tight">Provando em você</h3>
      <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-white/70">
        {state.state === "loading" && (
          <>
            <div className="animate-shimmer absolute inset-0" />
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <Sparkles className="mx-auto h-6 w-6 animate-pulse" />
                <p className="mt-2 text-sm font-medium">Vestindo as peças…</p>
                <p className="text-xs text-muted">Leva uns 10 a 20 segundos.</p>
              </div>
            </div>
          </>
        )}
        {state.state === "done" && state.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.image} alt="Você vestindo o look" className="animate-pop-in h-full w-full object-cover" />
        )}
        {state.state === "error" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-sm font-medium">{state.message}</p>
              <Button variant="secondary" onClick={onRetry} className="mt-4">
                Tentar de novo
              </Button>
            </div>
          </div>
        )}
      </div>
      {state.state === "done" && state.image && (
        <div className="mt-4 flex gap-2">
          {canSave && (
            <Button
              className="h-12 flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onSave(await toWebp(state.image!), defaultName());
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              <Bookmark className="h-4 w-4" /> {busy ? "Salvando…" : state.lookId ? "Guardar no look" : "Salvar look com a foto"}
            </Button>
          )}
          <a href={state.image} download="provador-look.png" className="glass grid h-12 w-12 place-items-center rounded-full" aria-label="Baixar foto">
            <Download className="h-4 w-4" />
          </a>
          <Button variant="secondary" className="h-12 w-12 px-0" onClick={onRetry} aria-label="Gerar de novo">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-medium">{error}</p>}
      <p className="mt-3 text-center text-[11px] text-faint">Cada prova usa a IA do Google (alguns centavos).</p>
    </Sheet>
  );
}
