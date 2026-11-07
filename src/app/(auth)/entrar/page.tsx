import Link from "next/link";
import type { Metadata } from "next";
import { signupOpen } from "@/lib/services";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const open = await signupOpen();
  return (
    <>
      <h1 className="text-3xl font-bold tracking-[-0.04em]">Bem-vindo de volta<span className="text-faint">.</span></h1>
      <p className="mb-7 mt-2 text-sm text-muted">Entre para abrir seu armário.</p>
      <SignInForm next={next} />
      {open && (
        <p className="mt-7 text-center text-sm text-muted">
          Primeira vez?{" "}
          <Link href="/cadastro" className="font-semibold text-fg underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      )}
    </>
  );
}
