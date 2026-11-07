import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { ServiceWorker } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "Provador", template: "%s · Provador" },
  description: "Seu armário no celular: monte e prove combinações com as suas próprias roupas.",
  applicationName: "Provador",
  appleWebApp: { capable: true, title: "Provador", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f4f4f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="text-fg">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
