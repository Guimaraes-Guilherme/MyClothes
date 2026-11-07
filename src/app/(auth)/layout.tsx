import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { Mannequin } from "@/components/mannequin";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/armario");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,560px)_1fr]">
      <main className="flex flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))] sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="glass-strong rounded-[28px] p-6 sm:p-8">{children}</div>
        </div>
        <p className="text-xs text-faint">© {new Date().getFullYear()} Provador</p>
      </main>
      <aside className="relative hidden items-center justify-center overflow-hidden lg:flex" aria-hidden>
        <div className="flex items-end gap-6">
          <div className="w-40 opacity-50 blur-[3px]"><Mannequin /></div>
          <div className="w-64"><Mannequin /></div>
          <div className="w-40 opacity-50 blur-[3px]"><Mannequin /></div>
        </div>
        <p className="absolute bottom-12 left-12 max-w-md text-5xl font-bold leading-[1.02] tracking-[-0.04em]">
          Seu armário inteiro.<br />
          <span className="text-faint">Prove antes de vestir.</span>
        </p>
      </aside>
    </div>
  );
}
