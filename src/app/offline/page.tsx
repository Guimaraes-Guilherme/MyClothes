import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/ui";
import { RetryButton } from "./retry";

export const metadata: Metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size="lg" />
      <span className="grid h-16 w-16 place-items-center rounded-full bg-fg text-white">
        <WifiOff className="h-7 w-7" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-bold">Você está sem internet</h1>
        <p className="mt-2 max-w-xs text-muted">Assim que a conexão voltar, seu armário aparece de novo.</p>
      </div>
      <RetryButton />
    </main>
  );
}
