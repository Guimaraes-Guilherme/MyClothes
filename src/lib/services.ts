import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, users } from "@/db";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./auth";
import { fieldErrors, signInSchema, signUpSchema } from "./validation";

export type Errors = Record<string, string[] | undefined>;
export type Result<T = object> = ({ ok: true } & T) | { ok: false; message?: string; errors?: Errors; status?: number };

/**
 * O Provador é de uso pessoal: a primeira conta criada é a dona do app e depois o cadastro fecha.
 * Para liberar mais contas, defina ALLOW_SIGNUP=true.
 */
export async function signupOpen() {
  if (process.env.ALLOW_SIGNUP === "true") return true;
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return count === 0;
}

export async function registerUser(input: unknown): Promise<Result<{ userId: string }>> {
  if (!(await signupOpen())) return { ok: false, message: "O cadastro está fechado. Este Provador já tem dono.", status: 403 };
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), status: 422 };
  const { name, email, password } = parsed.data;

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!user) return { ok: false, errors: { email: ["Já existe uma conta com este e-mail."] }, status: 409 };
  return { ok: true, userId: user.id };
}

export async function authenticate(input: unknown): Promise<Result<{ userId: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), status: 422 };
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, passwordHash: true } });
  // Compara mesmo sem usuário, para o tempo de resposta não revelar quais e-mails existem.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { ok: false, message: "E-mail ou senha incorretos.", status: 401 };
  return { ok: true, userId: user.id };
}
