import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Provador",
    short_name: "Provador",
    description: "Seu armário no celular: monte e prove combinações com as suas próprias roupas.",
    lang: "pt-BR",
    start_url: "/armario?origem=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f4f7",
    theme_color: "#f4f4f7",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Adicionar roupa", url: "/adicionar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Look", url: "/look", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
