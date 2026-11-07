"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { CATEGORY_INFO, CATEGORY_ORDER, type Category } from "@/lib/categories";
import { ButtonLink, Chip, PageTitle } from "@/components/ui";
import { ItemTile } from "@/components/item-tile";
import { ItemViewer } from "@/components/item-viewer";
import { Mannequin } from "@/components/mannequin";
import { useWardrobe } from "@/components/wardrobe";

export function ArmarioView() {
  const { items, outfit, outfitItems, toggle, faceUrl } = useWardrobe();
  const [filter, setFilter] = useState<Category | "todas" | "favoritas">("todas");
  const [open, setOpen] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const list = filter === "todas" ? items : filter === "favoritas" ? items.filter((i) => i.favorite) : items.filter((i) => i.category === filter);
    return [...list].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  }, [items, filter]);

  if (!items.length) {
    return (
      <>
        <PageTitle title="Seu armário" subtitle="Ainda vazio. Comece fotografando uma peça." />
        <div className="glass-strong animate-fade-up mx-auto mt-6 flex max-w-md flex-col items-center rounded-[32px] px-6 pb-8 pt-6 text-center">
          <div className="w-28">
            <Mannequin faceUrl={faceUrl} />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">Vamos encher essas prateleiras</h2>
          <p className="mt-2 text-sm text-muted">
            Tire uma foto da roupa (de preferência esticada numa superfície lisa). O fundo é removido sozinho e a peça vai para o armário.
          </p>
          <ButtonLink href="/adicionar" className="mt-6 h-12 px-6">
            <Plus className="h-4 w-4" /> Adicionar primeira peça
          </ButtonLink>
        </div>
      </>
    );
  }

  const favCount = items.filter((i) => i.favorite).length;

  return (
    <>
      <PageTitle
        title="Seu armário"
        subtitle={`${items.length} ${items.length === 1 ? "peça" : "peças"}. Toque para ver de perto, + para vestir no manequim.`}
      />

      <div className="scrollbar-none -mx-4 -my-2 mb-4 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        <Chip active={filter === "todas"} onClick={() => setFilter("todas")}>
          Tudo
        </Chip>
        {favCount > 0 && (
          <Chip active={filter === "favoritas"} onClick={() => setFilter("favoritas")}>
            Favoritas · {favCount}
          </Chip>
        )}
        {CATEGORY_ORDER.filter((c) => counts[c]).map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_INFO[c].plural} · {counts[c]}
          </Chip>
        ))}
      </div>

      {/* Vitrine: cada peça na sua prateleira de acrílico. */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((item, i) => (
          <ItemTile
            key={item.id}
            item={item}
            index={i}
            equipped={outfit[item.category] === item.id}
            onOpen={() => setOpen(i)}
            onToggle={() => toggle(item)}
          />
        ))}
      </div>

      {outfitItems.length > 0 && (
        <div className="animate-fade-up fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md md:bottom-6">
          <Link href="/look" className="flex items-center gap-3 rounded-full bg-fg py-2 pl-2 pr-5 text-white shadow-[0_18px_40px_-14px_rgb(0_0_0/0.7)] transition active:scale-[0.98]">
            <span className="flex -space-x-3">
              {outfitItems.slice(0, 4).map((i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i.id} src={i.url} alt="" className="h-10 w-10 rounded-full bg-white object-contain p-1 ring-2 ring-fg" />
              ))}
            </span>
            <span className="flex-1 text-sm font-semibold">
              Ver look · {outfitItems.length} {outfitItems.length === 1 ? "peça" : "peças"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {open !== null && <ItemViewer list={shown} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
