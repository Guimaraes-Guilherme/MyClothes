import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@/db";

export const SESSION_COOKIE = "pv_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY = 24 * 60 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

// O cookie dura 1 ano; quem decide se a sessão ainda vale é a data de expiração no banco.
async function setCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

/** Cria uma sessão no banco e devolve o token (usado direto pelo app nativo). */
export async function createSessionToken(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

/** Cria a sessão e grava o cookie (site). */
export async function createSession(userId: string) {
  const { token } = await createSessionToken(userId);
  await setCookie(token);
}

/** Valida o cookie de sessão e devolve o usuário, ou null. */
export async function validateSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateToken(token) : null;
}

/** Valida um token de sessão (cookie do site ou "Authorization: Bearer" do app) e devolve o usuário. */
export async function validateToken(token: string) {
  if (!token || token.length > 100) return null;
  const id = hashToken(token);

  const row = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1)
    .then((r) => r[0]);

  if (!row) return null;
  if (row.session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  // Sessão deslizante: renova quando estiver perto de expirar.
  if (row.session.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * DAY) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
  }

  return row.user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function destroyToken(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
