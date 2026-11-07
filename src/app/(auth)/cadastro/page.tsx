import Link from "next/link";
import type { Metadata } from "next";
import { signupOpen } from "@/lib/services";
import { Alert } from "@/components/ui";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  const open = await signupOpen();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-[-0.04em]">Crie seu Provador<span className="text-faint">.</span></h1>
      <p className="mb-7 mt-2 text-sm text-muted">Fotografe suas roupas e monte looks num manequim.</p>
      {open ? <SignUpForm /> : <Alert>O cadastro está fechado: este Provador já tem dono.</Alert>}
      <p className="mt-7 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-fg underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </>
  );
}
