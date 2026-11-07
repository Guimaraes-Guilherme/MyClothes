"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { equip, outfitIds, type ItemView, type LookView, type Outfit } from "@/lib/categories";

type Wardrobe = {
  items: ItemView[];
  looks: LookView[];
  faceUrl: string | null;
  bodyUrl: string | null;
  aiEnabled: boolean;
  outfit: Outfit;
  outfitItems: ItemView[];
  setOutfit: (o: Outfit) => void;
  toggle: (item: ItemView) => void;
  /** Ajuste local (antes de salvar no servidor), para o manequim responder na hora. */
  patchItem: (id: string, patch: Partial<ItemView>) => void;
};

const Ctx = createContext<Wardrobe | null>(null);
const KEY = "pv_outfit";

export function WardrobeProvider({
  items: initialItems,
  looks,
  faceUrl,
  bodyUrl,
  aiEnabled,
  children,
}: Omit<Wardrobe, "outfit" | "outfitItems" | "setOutfit" | "toggle" | "patchItem" | "items"> & { items: ItemView[]; children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, Partial<ItemView>>>({});
  const [outfit, setOutfitState] = useState<Outfit>({});

  const items = useMemo(() => initialItems.map((i) => (overrides[i.id] ? { ...i, ...overrides[i.id] } : i)), [initialItems, overrides]);

  // O look em montagem fica guardado no aparelho, para não se perder ao trocar de tela ou fechar o app.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && typeof saved === "object") setOutfitState(saved);
    } catch {}
  }, []);

  const setOutfit = useCallback((o: Outfit) => {
    setOutfitState(o);
    try {
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch {}
  }, []);

  // Peças apagadas saem do look.
  const outfitItems = useMemo(() => outfitIds(outfit).map((id) => items.find((i) => i.id === id)).filter((i): i is ItemView => Boolean(i)), [outfit, items]);

  const value = useMemo<Wardrobe>(
    () => ({
      items,
      looks,
      faceUrl,
      bodyUrl,
      aiEnabled,
      outfit,
      outfitItems,
      setOutfit,
      toggle: (item) => setOutfit(equip(outfit, item)),
      patchItem: (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } })),
    }),
    [items, looks, faceUrl, bodyUrl, aiEnabled, outfit, outfitItems, setOutfit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWardrobe() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWardrobe fora do WardrobeProvider");
  return v;
}

/** Chamada à API com mensagem de erro amigável. */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Algo deu errado. Tente de novo.");
  return data as T;
}
