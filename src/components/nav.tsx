"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Shirt, Sparkles, UserRound } from "lucide-react";
import { useWardrobe } from "./wardrobe";

const LINKS = [
  { href: "/armario", label: "Armário", icon: Shirt },
  { href: "/look", label: "Look", icon: Sparkles },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

function LookBadge() {
  const { outfitItems } = useWardrobe();
  if (!outfitItems.length) return null;
  return (
    <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-fg px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {outfitItems.length}
    </span>
  );
}

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="glass ml-6 hidden items-center gap-1 rounded-full p-1 md:flex">
      {[...LINKS.slice(0, 2), { href: "/adicionar", label: "Adicionar", icon: Plus }].map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={clsx("relative rounded-full px-4 py-1.5 text-sm font-medium transition", path.startsWith(l.href) ? "bg-fg text-white" : "text-muted hover:text-fg")}
        >
          {l.label}
          {l.href === "/look" && <LookBadge />}
        </Link>
      ))}
    </nav>
  );
}

/** Barra de baixo no celular: pílula de vidro flutuante com o botão de adicionar no meio. */
export function MobileNav() {
  const path = usePathname();
  const [armario, look, perfil] = LINKS;
  return (
    <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="glass-strong flex items-center rounded-[28px] px-2">
        <Tab {...armario} on={path.startsWith(armario.href)} />
        <Tab {...look} on={path.startsWith(look.href)} />
        <Link href="/adicionar" aria-label="Adicionar roupa" className="flex flex-1 justify-center py-2">
          <span className={clsx("grid h-11 w-11 place-items-center rounded-full bg-fg text-white shadow-[0_10px_20px_-8px_rgb(0_0_0/0.6)] transition active:scale-95", path.startsWith("/adicionar") && "ring-4 ring-fg/15")}>
            <Plus className="h-5 w-5" />
          </span>
        </Link>
        <Tab {...perfil} on={path.startsWith(perfil.href)} />
      </div>
    </nav>
  );
}

function Tab({ href, label, icon: Icon, on }: (typeof LINKS)[number] & { on: boolean }) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium">
      <span className={clsx("relative grid h-8 w-12 place-items-center rounded-full transition", on ? "bg-fg text-white" : "text-muted")}>
        <Icon className="h-[18px] w-[18px]" />
        {href === "/look" && <LookBadge />}
      </span>
      <span className={on ? "text-fg" : "text-muted"}>{label}</span>
    </Link>
  );
}
