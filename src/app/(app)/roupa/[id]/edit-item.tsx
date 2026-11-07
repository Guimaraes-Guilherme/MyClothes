"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { CATEGORY_INFO, CATEGORY_ORDER, type Category, type ItemView } from "@/lib/categories";
import { Button, ButtonLink, PageTitle, inputClass } from "@/components/ui";
import { api, useWardrobe } from "@/components/wardrobe";
import { ColorPicker } from "../../adicionar/add-item";

export function EditItem({ id }: { id: string }) {
  const { items } = useWardrobe();
  const item = items.find((i) => i.id === id);
  if (!item) {
    return (
      <div className="mx-auto max-w-md text-center">
        <PageTitle title="Peça não encontrada" subtitle="Talvez ela tenha sido apagada." />
        <ButtonLink href="/armario">Voltar ao armário</ButtonLink>
      </div>
    );
  }
  return <Form key={item.id} item={item} />;
}

function Form({ item }: { item: ItemView }) {
  const router = useRouter();
  const { outfit, setOutfit } = useWardrobe();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<Category>(item.category);
  const [color, setColor] = useState<string | null>(item.color);
  const [favorite, setFavorite] = useState(item.favorite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/roupas/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, color, favorite }),
      });
      // Mudou de tipo: sai do look atual para não ficar na área errada do manequim.
      if (category !== item.category && outfit[item.category] === item.id) {
        const next = { ...outfit };
        delete next[item.category];
        setOutfit(next);
      }
      router.refresh();
      router.push("/armario");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Apagar "${item.name}" do armário?`)) return;
    setBusy(true);
    try {
      await api(`/api/roupas/${item.id}`, { method: "DELETE" });
      router.refresh();
      router.push("/armario");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Link href="/armario" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Armário
      </Link>
      <PageTitle title="Editar peça" />
      <div className="glass-strong relative rounded-[32px] p-5">
        <button
          type="button"
          onClick={() => setFavorite(!favorite)}
          aria-pressed={favorite}
          aria-label="Favorita"
          className={clsx("absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full transition", favorite ? "bg-fg text-white" : "glass")}
        >
          <Heart className={clsx("h-4 w-4", favorite && "fill-current")} />
        </button>
        <div className="relative mx-auto aspect-square w-full max-w-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.name} className="item-shadow absolute inset-0 h-full w-full object-contain object-bottom" />
        </div>
        <div className="shelf-lit mx-auto w-[85%] max-w-[280px]" />
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="nome" className="mb-2 block text-sm font-semibold">Nome</label>
          <input id="nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={clsx(inputClass, "border-white")} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Tipo</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={clsx("h-9 rounded-full px-4 text-[13px] font-medium transition", category === c ? "bg-fg text-white" : "glass")}>
                {CATEGORY_INFO[c].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Cor</p>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        {error && <p className="text-sm font-medium">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="h-13 w-13 px-0" onClick={remove} disabled={busy} aria-label="Apagar peça">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button className="h-13 flex-1" onClick={save} disabled={busy || !name.trim()}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
