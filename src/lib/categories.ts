import type { Category } from "@/db/schema";

export type { Category };

/**
 * Onde cada tipo de peça fica no manequim.
 * Coordenadas no palco de 300 x 700 (mesma escala do desenho do manequim).
 * align: em que borda da área a peça "gruda" (camiseta no ombro, sapato no chão).
 */
export type Slot = { x: number; y: number; w: number; h: number; align: "top" | "bottom" | "center"; z: number };

export const STAGE = { w: 300, h: 700 };

export const CATEGORY_INFO: Record<Category, { label: string; plural: string; example: string; slot: Slot }> = {
  chapeu: { label: "Boné/Chapéu", plural: "Bonés e chapéus", example: "Boné", slot: { x: 92, y: 0, w: 116, h: 72, align: "bottom", z: 7 } },
  cima: { label: "Parte de cima", plural: "Partes de cima", example: "Camiseta", slot: { x: 44, y: 108, w: 212, h: 262, align: "top", z: 4 } },
  casaco: { label: "Casaco", plural: "Casacos", example: "Jaqueta", slot: { x: 36, y: 104, w: 228, h: 300, align: "top", z: 5 } },
  vestido: { label: "Vestido/Macacão", plural: "Vestidos e macacões", example: "Vestido", slot: { x: 52, y: 108, w: 196, h: 440, align: "top", z: 3 } },
  baixo: { label: "Parte de baixo", plural: "Partes de baixo", example: "Calça", slot: { x: 78, y: 318, w: 144, h: 336, align: "top", z: 2 } },
  calcado: { label: "Calçado", plural: "Calçados", example: "Tênis", slot: { x: 80, y: 612, w: 140, h: 84, align: "bottom", z: 1 } },
  acessorio: { label: "Acessório", plural: "Acessórios", example: "Bolsa", slot: { x: 212, y: 300, w: 86, h: 130, align: "center", z: 6 } },
};

/** Ordem em que as categorias aparecem nas listas (de cima para baixo no corpo). */
export const CATEGORY_ORDER: Category[] = ["chapeu", "casaco", "cima", "vestido", "baixo", "calcado", "acessorio"];

/** Peças que não combinam no mesmo look: vestir um vestido tira a parte de cima e a de baixo, e vice-versa. */
export const CONFLICTS: Partial<Record<Category, Category[]>> = {
  vestido: ["cima", "baixo"],
  cima: ["vestido"],
  baixo: ["vestido"],
};

export const COLORS: { id: string; label: string; hex: string }[] = [
  { id: "preto", label: "Preto", hex: "#141414" },
  { id: "branco", label: "Branco", hex: "#f7f7f7" },
  { id: "cinza", label: "Cinza", hex: "#9a9a9a" },
  { id: "bege", label: "Bege", hex: "#d8c7a8" },
  { id: "marrom", label: "Marrom", hex: "#6b4a32" },
  { id: "azul", label: "Azul", hex: "#2f5bd3" },
  { id: "jeans", label: "Jeans", hex: "#5a7393" },
  { id: "verde", label: "Verde", hex: "#3f7a4a" },
  { id: "vermelho", label: "Vermelho", hex: "#c8322f" },
  { id: "rosa", label: "Rosa", hex: "#f2a7c3" },
  { id: "amarelo", label: "Amarelo", hex: "#f2cf3a" },
  { id: "laranja", label: "Laranja", hex: "#f08a2c" },
  { id: "roxo", label: "Roxo", hex: "#7a4fc4" },
  { id: "estampado", label: "Estampado", hex: "conic-gradient(#f2a7c3,#2f5bd3,#f2cf3a,#3f7a4a,#f2a7c3)" },
];

export const colorInfo = (id: string | null) => COLORS.find((c) => c.id === id) ?? null;

/** Dados de uma peça que vão para o navegador (sem a imagem em si). */
export type ItemView = {
  id: string;
  name: string;
  category: Category;
  color: string | null;
  favorite: boolean;
  width: number;
  height: number;
  fitScale: number;
  fitX: number;
  fitY: number;
  /** Versão leve (vitrine e manequim). */
  url: string;
  /** Foto em resolução máxima (vista de perto e zoom). */
  fullUrl: string;
};

export type LookView = {
  id: string;
  name: string;
  itemIds: string[];
  aiUrl: string | null;
  createdAt: string;
};

/** Look sendo montado: no máximo uma peça por categoria. */
export type Outfit = Partial<Record<Category, string>>;

export function equip(outfit: Outfit, item: Pick<ItemView, "id" | "category">): Outfit {
  const next: Outfit = { ...outfit };
  if (next[item.category] === item.id) {
    delete next[item.category];
    return next;
  }
  for (const c of CONFLICTS[item.category] ?? []) delete next[c];
  next[item.category] = item.id;
  return next;
}

export function outfitFromIds(ids: string[], items: ItemView[]): Outfit {
  let o: Outfit = {};
  for (const id of ids) {
    const it = items.find((i) => i.id === id);
    if (it && o[it.category] !== it.id) o = equip(o, it);
  }
  return o;
}

export const outfitIds = (o: Outfit) => CATEGORY_ORDER.map((c) => o[c]).filter((v): v is string => Boolean(v));
