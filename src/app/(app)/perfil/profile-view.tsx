"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, LogOut, Trash2, UserRound } from "lucide-react";
import { cropSquare, prepareBodyPhoto } from "@/lib/process-image";
import { Mannequin } from "@/components/mannequin";
import { Button, PageTitle, inputClass } from "@/components/ui";
import { api, useWardrobe } from "@/components/wardrobe";
import { signOut } from "../../(auth)/actions";

export function ProfileView({ name: initialName, email }: { name: string; email: string }) {
  const router = useRouter();
  const { items, looks, faceUrl, bodyUrl, aiEnabled } = useWardrobe();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [msg, setMsg] = useState<string | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const faceRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLInputElement>(null);

  async function saveName() {
    setMsg(null);
    try {
      await api("/api/eu", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      setSavedName(name);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function upload(kind: "rosto" | "corpo", blob: Blob) {
    setBusy(kind);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("image", blob, blob.type === "image/webp" ? "foto.webp" : "foto.jpg");
      await api(`/api/eu/${kind}`, { method: "POST", body: form });
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function clear(kind: "rosto" | "corpo") {
    setBusy(kind);
    await api(`/api/eu/${kind}`, { method: "DELETE" }).catch(() => {});
    router.refresh();
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Perfil" subtitle={`${items.length} peças no armário · ${looks.length} looks salvos`} />

      {msg && <p className="glass mb-4 rounded-2xl px-4 py-3 text-sm font-medium">{msg}</p>}

      <section className="glass-strong rounded-[28px] p-5">
        <h2 className="text-lg font-bold tracking-tight">Seu manequim</h2>
        <BodyPicker />
        <p className="mt-1 text-sm text-muted">Tipo de manequim da foto de vitrine e, se quiser, seu rosto na montagem rápida.</p>
        <div className="mt-4 flex items-center gap-5">
          <div className="w-20 shrink-0">
            <Mannequin faceUrl={faceUrl} />
          </div>
          <div className="flex flex-col gap-2">
            <input ref={faceRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFaceFile(e.target.files?.[0] ?? null)} />
            <Button onClick={() => faceRef.current?.click()} disabled={busy === "rosto"}>
              <UserRound className="h-4 w-4" /> {faceUrl ? "Trocar rosto" : "Usar meu rosto"}
            </Button>
            {faceUrl && (
              <Button variant="ghost" onClick={() => clear("rosto")} disabled={busy === "rosto"}>
                <Trash2 className="h-4 w-4" /> Manequim sem rosto
              </Button>
            )}
          </div>
        </div>
      </section>

      <section id="foto-corpo" className="glass-strong mt-4 scroll-mt-24 rounded-[28px] p-5">
        <h2 className="text-lg font-bold tracking-tight">Foto para provar com IA</h2>
        <p className="mt-1 text-sm text-muted">
          Uma foto sua de corpo inteiro, de frente, com boa luz e roupa justa ou simples. A IA veste os looks nessa foto.
        </p>
        <div className="mt-4 flex items-end gap-4">
          <div className="grid aspect-[3/4] w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/70">
            {bodyUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bodyUrl} alt="Sua foto de corpo inteiro" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-8 w-8 text-faint" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={bodyRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) await upload("corpo", await prepareBodyPhoto(f));
              }}
            />
            <Button onClick={() => bodyRef.current?.click()} disabled={busy === "corpo"}>
              <Camera className="h-4 w-4" /> {busy === "corpo" ? "Enviando…" : bodyUrl ? "Trocar foto" : "Adicionar foto"}
            </Button>
            {bodyUrl && (
              <Button variant="ghost" onClick={() => clear("corpo")} disabled={busy === "corpo"}>
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            )}
          </div>
        </div>
        {!aiEnabled && <p className="mt-4 text-[12px] text-faint">Por enquanto a prova usa o app do Gemini no celular (grátis).</p>}
      </section>

      <section className="glass mt-4 rounded-[28px] p-5">
        <h2 className="text-lg font-bold tracking-tight">Conta</h2>
        <p className="mt-1 text-sm text-muted">{email}</p>
        <div className="mt-4 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Seu nome" className={clsx(inputClass, "border-white")} />
          <Button onClick={saveName} disabled={name.trim() === savedName || name.trim().length < 2} className="h-12">
            Salvar
          </Button>
        </div>
        <form action={signOut} className="mt-4">
          <Button variant="danger" type="submit">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </form>
      </section>

      {faceFile && (
        <FaceCropper
          file={faceFile}
          onClose={() => {
            setFaceFile(null);
            if (faceRef.current) faceRef.current.value = "";
          }}
          onSave={async (blob) => {
            await upload("rosto", blob);
            setFaceFile(null);
            if (faceRef.current) faceRef.current.value = "";
          }}
        />
      )}
    </div>
  );
}

/** Enquadrar o rosto num círculo: zoom e posição, com prévia no manequim. */
function FaceCropper({ file, onClose, onSave }: { file: File; onClose: () => void; onSave: (b: Blob) => Promise<void> }) {
  const [zoom, setZoom] = useState(1.6);
  const [cx, setCx] = useState(0.5);
  const [cy, setCy] = useState(0.38);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    const t = setTimeout(async () => {
      const blob = await cropSquare(file, zoom, cx, cy, 200);
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setPreview(url);
    }, 60);
    return () => {
      alive = false;
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, zoom, cx, cy]);

  const row = (label: string, value: number, set: (v: number) => void, min: number, max: number) => (
    <label className="flex items-center gap-3 text-[12px] font-medium">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <input type="range" min={min} max={max} step={0.005} value={value} onChange={(e) => set(Number(e.target.value))} className="flex-1 accent-[#101010]" />
    </label>
  );

  return (
    <div role="dialog" aria-modal aria-label="Enquadrar rosto" className="fixed inset-0 z-50 flex items-end justify-center bg-white/40 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div className="glass-strong animate-fade-up w-full max-w-md rounded-t-[32px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[32px]" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold tracking-tight">Enquadre seu rosto</h3>
        <p className="mt-1 text-sm text-muted">Deixe o rosto preenchendo o círculo.</p>
        <div className="mt-5 flex items-center justify-center gap-8">
          <div className="h-36 w-36 overflow-hidden rounded-full bg-white/70 ring-4 ring-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && <img src={preview} alt="Prévia" className="h-full w-full object-cover" />}
          </div>
          <div className="w-16">
            <Mannequin faceUrl={preview} />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {row("Zoom", zoom, setZoom, 1, 5)}
          {row("↔", cx, setCx, 0, 1)}
          {row("↕", cy, setCy, 0, 1)}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="h-12" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="h-12 flex-1"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave(await cropSquare(file, zoom, cx, cy, 320));
            }}
          >
            {busy ? "Salvando…" : "Usar este rosto"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Manequim masculino ou feminino na foto de vitrine (guardado neste aparelho). */
function BodyPicker() {
  const [body, setBody] = useState<string>("masculino");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBody(localStorage.getItem("pv_corpo") === "feminino" ? "feminino" : "masculino");
    } catch {}
  }, []);
  const pick = (v: string) => {
    setBody(v);
    try {
      localStorage.setItem("pv_corpo", v);
    } catch {}
  };
  return (
    <div className="mt-3 inline-flex rounded-full bg-white/60 p-1 text-[13px] font-medium">
      {["masculino", "feminino"].map((v) => (
        <button key={v} type="button" onClick={() => pick(v)} className={clsx("rounded-full px-4 py-1.5 capitalize transition", body === v ? "bg-fg text-white" : "text-muted")}>
          {v}
        </button>
      ))}
    </div>
  );
}
