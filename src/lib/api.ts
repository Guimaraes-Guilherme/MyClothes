import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "./auth";
import { rateLimit } from "./rate-limit";

/** Respostas de erro sempre têm o formato { error: { message } }. */
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}

type Handler<C> = (req: Request, user: CurrentUser, ctx: C) => Promise<Response>;

/** Exige o usuário logado (cookie) e aplica um limite de requisições. */
export function authed<C>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const user = await getCurrentUser();
    if (!user) return fail(401, "Sua sessão expirou. Entre de novo.");
    if (!rateLimit(`api:${user.id}`, 300, 60_000)) return fail(429, "Muitas requisições. Espere um pouco.");
    try {
      return await handler(req, user, ctx);
    } catch (e) {
      console.error(e);
      return fail(500, "Erro inesperado. Tente de novo.");
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
