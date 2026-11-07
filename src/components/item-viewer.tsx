"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from "lucide-react";
import { CATEGORY_INFO, colorInfo, type ItemView } from "@/lib/categories";
import { useWardrobe } from "./wardrobe";

/**
 * Vista de perto: a peça escolhida cresce no centro, sobre a prateleira acesa,
 * e as vizinhas ficam menores e desfocadas dos lados. Deslize para passar.
 */
export function ItemViewer({ list, start, onClose }: { list: ItemView[]; start: number; onClose: () => void }) {
  const { outfit, toggle } = useWardrobe();
  const track = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(start);
  const active = list[Math.min(list.length - 1, Math.max(0, Math.round(pos)))];

  const slideWidth = () => (track.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;

  useLayoutEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * slideWidth();
  }, [start]);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (el) setPos(el.scrollLeft / slideWidth());
  }, []);

  const go = useCallback((i: number) => {
    track.current?.scrollTo({ left: Math.max(0, Math.min(list.length - 1, i)) * slideWidth(), behavior: "smooth" });
  }, [list.length]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(Math.round(pos) + 1);
      if (e.key === "ArrowLeft") go(Math.round(pos) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, go, pos]);

  if (!active) return null;
  const equipped = outfit[active.category] === active.id;
  const color = colorInfo(active.color);

  return (
    <div role="dialog" aria-modal aria-label={active.name} className="fixed inset-0 z-50 flex flex-col bg-[#f7f7fa]/90 backdrop-blur-2xl animate-fade-up">
      {/* Luz de estúdio atrás da peça */}
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-[60vh] w-[90vw] max-w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255),rgb(236_234_252/0.6),rgb(255_255_255/0))]" />

      <div className="relative z-10 flex items-start justify-between gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            {CATEGORY_INFO[active.category].label}
            {color && ` · ${color.label}`}
          </p>
          <h2 key={active.id} className="animate-fade-up mt-1 line-clamp-2 text-[30px] font-bold uppercase leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            {active.name}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        className="scrollbar-none snap-x-mandatory relative z-10 flex flex-1 items-center overflow-x-auto px-[18vw] sm:px-[32vw]"
      >
        {list.map((item, i) => {
          const d = Math.min(Math.abs(i - pos), 1.6);
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => (i === Math.round(pos) ? null : go(i))}
              className="flex w-[64vw] shrink-0 snap-center flex-col items-center justify-end sm:w-[36vw]"
              style={{ transform: `scale(${1 - d * 0.32})`, opacity: 1 - d * 0.4, filter: d > 0.05 ? `blur(${d * 5}px)` : undefined }}
              aria-label={item.name}
            >
              <div className="relative aspect-square w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" draggable={false} className="item-shadow absolute inset-0 h-full w-full object-contain object-bottom" />
              </div>
              <div className={clsx("mt-1 w-[92%]", i === Math.round(pos) ? "shelf-lit" : "shelf")} />
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => go(Math.round(pos) - 1)} aria-label="Anterior" className="glass absolute left-6 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => go(Math.round(pos) + 1)} aria-label="Próxima" className="glass absolute right-6 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full md:grid">
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-center gap-3 text-[11px] font-medium tabular-nums text-faint">
          <span>{String(Math.round(pos) + 1).padStart(2, "0")}</span>
          <span className="relative h-[2px] w-28 overflow-hidden rounded-full bg-fg/10">
            <span className="absolute inset-y-0 left-0 rounded-full bg-fg transition-[width]" style={{ width: `${((Math.round(pos) + 1) / list.length) * 100}%` }} />
          </span>
          <span>{String(list.length).padStart(2, "0")}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggle(active)}
            className={clsx(
              "flex h-13 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold transition active:scale-[0.98]",
              equipped ? "glass-strong text-fg" : "bg-fg text-white shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)]",
            )}
          >
            {equipped ? (
              <>
                <Check className="h-4 w-4" /> No manequim · tirar
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Vestir no manequim
              </>
            )}
          </button>
          <Link href={`/roupa/${active.id}`} aria-label="Editar peça" className="glass-strong grid h-13 w-13 place-items-center rounded-full">
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
