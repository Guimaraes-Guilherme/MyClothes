"use server";

import { redirect } from "next/navigation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSession, destroySession } from "@/lib/session";
import { authenticate, registerUser } from "@/lib/services";
import type { FormState } from "@/lib/validation";

const TOO_MANY = "Muitas tentativas. Espere um minuto e tente de novo.";

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const values = { name: raw.name ?? "", email: raw.email ?? "" };
  if (!rateLimit(`signup:${await clientIp()}`, 10, 60 * 60 * 1000)) return { message: TOO_MANY, values };

  const r = await registerUser(raw);
  if (!r.ok) return { message: r.message, errors: r.errors, values };
  await createSession(r.userId);
  redirect("/armario");
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const values = { email: raw.email ?? "" };
  const email = String(raw.email ?? "").trim().toLowerCase();
  if (!rateLimit(`signin:${await clientIp()}`, 20, 60_000) || !rateLimit(`signin:${email}`, 8, 60_000)) {
    return { message: TOO_MANY, values };
  }

  const r = await authenticate(raw);
  if (!r.ok) return { message: r.message, errors: r.errors, values };
  await createSession(r.userId);
  const next = typeof raw.next === "string" && raw.next.startsWith("/") && !raw.next.startsWith("//") ? raw.next : null;
  redirect(next ?? "/armario");
}

export async function signOut() {
  await destroySession();
  redirect("/entrar");
}
