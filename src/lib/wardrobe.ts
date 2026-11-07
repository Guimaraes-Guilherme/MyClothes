import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, items, looks } from "@/db";
import type { ItemView, LookView } from "./categories";

export const itemUrl = (id: string, updatedAt: Date) => `/api/img/roupa/${id}?v=${updatedAt.getTime()}`;
export const lookUrl = (id: string, updatedAt: Date) => `/api/img/look/${id}?v=${updatedAt.getTime()}`;

/** Todas as peças do usuário, sem as imagens (que vão por URL). */
export async function listItems(userId: string): Promise<ItemView[]> {
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      category: items.category,
      color: items.color,
      favorite: items.favorite,
      width: items.width,
      height: items.height,
      fitScale: items.fitScale,
      fitX: items.fitX,
      fitY: items.fitY,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .where(eq(items.userId, userId))
    .orderBy(desc(items.favorite), asc(items.createdAt));
  return rows.map(({ updatedAt, ...r }) => ({ ...r, url: itemUrl(r.id, updatedAt) }));
}

export async function listLooks(userId: string): Promise<LookView[]> {
  const rows = await db
    .select({ id: looks.id, name: looks.name, itemIds: looks.itemIds, hasAi: looks.aiImageType, createdAt: looks.createdAt, updatedAt: looks.updatedAt })
    .from(looks)
    .where(eq(looks.userId, userId))
    .orderBy(desc(looks.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    itemIds: r.itemIds,
    aiUrl: r.hasAi ? lookUrl(r.id, r.updatedAt) : null,
    createdAt: r.createdAt.toISOString(),
  }));
}
