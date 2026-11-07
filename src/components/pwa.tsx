"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registra o service worker (só em produção, para não atrapalhar o desenvolvimento). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

const DISMISS_KEY = "pv_install_dismissed";
const noop = () => () => {};

function useIsStandalone() {
  return useSyncExternalStore(
    noop,
    () => window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true),
    () => true,
  );
}

function useIsIos() {
  return useSyncExternalStore(
    noop,
    () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent),
    () => false,
  );
}

function useWasDismissed() {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now() - 14 * 24 * 60 * 60 * 1000;
      } catch {
        return false;
      }
    },
    () => true,
  );
}

/**
 * Convite para instalar o app no celular.
 * Android/Chrome: usa o pedido nativo de instalação. iPhone: explica o "Adicionar à Tela de Início".
 */
export function InstallPrompt() {
  const standalone = useIsStandalone();
  const ios = useIsIos();
  const dismissedBefore = useWasDismissed();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || dismissedBefore || closed || (!deferred && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setClosed(true);
  };

  return (
    <div className="animate-fade-up fixed inset-x-3 bottom-[calc(96px+env(safe-area-inset-bottom))] z-50 rounded-3xl glass-strong p-4 shadow-2xl md:hidden">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Instale o Provador</p>
          {ios ? (
            <p className="mt-1 text-sm text-muted">
              Toque em <Share className="mx-0.5 inline h-4 w-4 -translate-y-0.5" aria-label="Compartilhar" /> e depois em
              <span className="font-semibold text-fg"> Adicionar à Tela de Início</span>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Abra direto da tela inicial, em tela cheia, como um app.</p>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="Agora não" className="rounded-full p-1 text-muted">
          <X className="h-5 w-5" />
        </button>
      </div>
      {deferred && (
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
            setClosed(true);
          }}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-fg text-sm font-semibold text-white"
        >
          <Download className="h-4 w-4" /> Instalar
        </button>
      )}
    </div>
  );
}
