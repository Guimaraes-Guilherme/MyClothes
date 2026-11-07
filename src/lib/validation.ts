import { z } from "zod";
import { CATEGORIES } from "@/db/schema";
import { COLORS } from "./categories";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Digite um e-mail válido." }).max(254, { error: "E-mail muito longo." }));

// bcrypt só considera os primeiros 72 bytes da senha.
const password = z
  .string()
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .refine((v) => new TextEncoder().encode(v).length <= 72, { error: "A senha pode ter no máximo 72 caracteres." })
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), { error: "Use letras e números na senha." });

const name = z
  .string()
  .trim()
  .min(2, { error: "Digite seu nome." })
  .max(80, { error: "Nome muito longo." });

export const signUpSchema = z
  .object({ name, email, password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    error: "As senhas não são iguais.",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "Digite sua senha." }).max(200),
});

export const profileSchema = z.object({ name });

const colorIds = COLORS.map((c) => c.id) as [string, ...string[]];

export const itemSchema = z.object({
  name: z.string().trim().min(1, { error: "Dê um nome para a peça." }).max(60, { error: "Nome muito longo." }),
  category: z.enum(CATEGORIES, { error: "Escolha o tipo da peça." }),
  color: z
    .enum(colorIds)
    .nullish()
    .or(z.literal("").transform(() => null)),
});

export const itemPatchSchema = z
  .object({
    name: itemSchema.shape.name,
    category: itemSchema.shape.category,
    color: itemSchema.shape.color,
    favorite: z.boolean(),
    fitScale: z.number().min(0.3).max(2.5),
    fitX: z.number().min(-60).max(60),
    fitY: z.number().min(-60).max(60),
  })
  .partial();

export const lookSchema = z.object({
  name: z.string().trim().min(1, { error: "Dê um nome para o look." }).max(60, { error: "Nome muito longo." }),
  itemIds: z.array(z.uuid()).min(1, { error: "O look precisa de pelo menos uma peça." }).max(10),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
