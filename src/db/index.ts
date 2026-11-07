import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL não configurada. Veja o arquivo .env.example.");

// O Neon inclui "channel_binding=require" na URL, parâmetro que o driver postgres.js não reconhece.
const parsed = new URL(rawUrl);
parsed.searchParams.delete("channel_binding");
const url = parsed.toString();

// Reaproveita a conexão entre recarregamentos no modo de desenvolvimento.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = globalForDb.pg ?? postgres(url, { max: 10, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export * from "./schema";
