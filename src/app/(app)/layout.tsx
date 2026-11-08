import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listItems, listLooks } from "@/lib/wardrobe";
import { Avatar, Logo } from "@/components/ui";
import { MobileNav, NavLinks } from "@/components/nav";
import { InstallPrompt } from "@/components/pwa";
import { WardrobeProvider } from "@/components/wardrobe";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [items, looks] = await Promise.all([listItems(user.id), listLooks(user.id)]);
  return (
    <WardrobeProvider items={items} looks={looks} faceUrl={user.faceUrl} bodyUrl={user.bodyUrl} aiEnabled={Boolean(process.env.GEMINI_API_KEY)}>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 bg-[#f6f6f9]/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
            <Link href="/armario" aria-label="Armário">
              <Logo />
            </Link>
            <NavLinks />
            <Link href="/perfil" aria-label="Perfil" className="ml-auto rounded-full">
              <Avatar name={user.name} url={user.faceUrl} size={34} />
            </Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-2 sm:px-6 md:pb-16">{children}</div>
        <MobileNav />
        <InstallPrompt />
      </div>
    </WardrobeProvider>
  );
}
