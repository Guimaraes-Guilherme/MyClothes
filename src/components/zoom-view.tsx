"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const MIN = 1;
const MAX = 6;

/**
 * Foto da peça em tela cheia, na resolução máxima.
 * Pinça para aproximar, arraste para mover, toque duplo para alternar o zoom.
 */
export function ZoomView({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ s: number; x: number; y: number; dist: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clamp = (n: { s: number; x: number; y: number }) => {
    const s = Math.min(MAX, Math.max(MIN, n.s));
    const r = box.current?.getBoundingClientRect();
    const limX = r ? (r.width * (s - 1)) / 2 : 0;
    const limY = r ? (r.height * (s - 1)) / 2 : 0;
    return { s, x: Math.min(limX, Math.max(-limX, n.x)), y: Math.min(limY, Math.max(-limY, n.y)) };
  };

  const snapshot = () => {
    const ps = [...pointers.current.values()];
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length;
    const cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
    const dist = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
    start.current = { ...t, dist, cx, cy };
  };

  function zoomAt(clientX: number, clientY: number, target: number) {
    const r = box.current!.getBoundingClientRect();
    const px = clientX - (r.left + r.width / 2);
    const py = clientY - (r.top + r.height / 2);
    // Mantém o ponto tocado no mesmo lugar ao aproximar.
    const k = target / t.s;
    setT(clamp({ s: target, x: px - (px - t.x) * k, y: py - (py - t.y) * k }));
  }

  return (
    <div role="dialog" aria-modal aria-label={`${alt} em zoom`} className="fixed inset-0 z-[60] flex flex-col bg-[#f7f7fa] animate-fade-up">
      <div className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
          {t.s > 1.02 ? `${t.s.toFixed(1)}×` : "Pinça para aproximar"}
        </p>
        <button type="button" onClick={onClose} aria-label="Fechar zoom" className="glass grid h-10 w-10 place-items-center rounded-full">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        ref={box}
        className="relative flex-1 touch-none overflow-hidden select-none"
        onWheel={(e) => zoomAt(e.clientX, e.clientY, Math.min(MAX, Math.max(MIN, t.s * (e.deltaY < 0 ? 1.15 : 0.87))))}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          snapshot();
          setDragging(true);
          const now = Date.now();
          if (pointers.current.size === 1 && now - lastTap.current < 280) zoomAt(e.clientX, e.clientY, t.s > 1.5 ? 1 : 3);
          lastTap.current = now;
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId) || !start.current) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const ps = [...pointers.current.values()];
          const st = start.current;
          const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length;
          const cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
          if (ps.length > 1 && st.dist) {
            const dist = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
            const s = Math.min(MAX, Math.max(MIN, (st.s * dist) / st.dist));
            const r = box.current!.getBoundingClientRect();
            const ox = st.cx - (r.left + r.width / 2);
            const oy = st.cy - (r.top + r.height / 2);
            const k = s / st.s;
            setT(clamp({ s, x: ox - (ox - st.x) * k + (cx - st.cx), y: oy - (oy - st.y) * k + (cy - st.cy) }));
          } else if (st.s > 1) {
            setT(clamp({ s: st.s, x: st.x + (cx - st.cx), y: st.y + (cy - st.cy) }));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size) snapshot();
          else {
            start.current = null;
            setDragging(false);
          }
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          start.current = null;
          setDragging(false);
        }}
      >
        {!loaded && <div className="animate-shimmer absolute inset-0" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="item-shadow absolute inset-0 m-auto h-full w-full object-contain p-4 will-change-transform"
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`, transition: dragging ? "none" : "transform 0.2s ease-out" }}
        />
      </div>
      <p className="pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] text-faint">Toque duplo para aproximar ou voltar</p>
    </div>
  );
}
