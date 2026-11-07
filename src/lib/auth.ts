import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { validateSession } from "./session";

/** Usuário logado, lido uma vez por requisição. Nunca inclui o hash da senha nem as fotos. */
export const getCurrentUser = cache(async () => {
  const user = await validateSession();
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    faceUrl: user.faceUpdatedAt ? `/api/img/rosto?v=${user.faceUpdatedAt.getTime()}` : null,
    bodyUrl: user.bodyUpdatedAt ? `/api/img/corpo?v=${user.bodyUpdatedAt.getTime()}` : null,
    createdAt: user.createdAt,
  };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

const BCRYPT_COST = 12;
export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails têm conta.
export const DUMMY_HASH = "$2b$12$C94RKQTDh9p6ZoCGJzkt5eSxE7pg5FMysCYRpbj69109WLuJzR4sO";
