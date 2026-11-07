"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { signIn, signUp } from "./actions";

const empty: FormState = {};

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, empty);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message && <Alert>{state.message}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" defaultValue={state.values?.email} error={state.errors?.email} required />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" placeholder="Sua senha" error={state.errors?.password} required />
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, empty);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message && <Alert>{state.message}</Alert>}
      <Field label="Nome" name="name" autoComplete="name" placeholder="Como quer ser chamado" defaultValue={state.values?.name} error={state.errors?.name} required />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" defaultValue={state.values?.email} error={state.errors?.email} required />
      <Field label="Senha" name="password" type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" hint="Use letras e números." error={state.errors?.password} required />
      <Field label="Confirme a senha" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Digite a senha de novo" error={state.errors?.confirmPassword} required />
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Criando…" : "Criar meu Provador"}
      </Button>
    </form>
  );
}
