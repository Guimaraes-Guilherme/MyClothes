import clsx from "clsx";
import { CATEGORY_INFO, type ItemView } from "@/lib/categories";

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/**
 * Manequim de estúdio (desenho vetorial) com as peças vestidas por cima, em camadas.
 * Cada tipo de peça tem uma área fixa no corpo (veja CATEGORY_INFO) e o ajuste fino de cada peça.
 */
export function Mannequin({
  items = [],
  faceUrl,
  className,
  highlight,
}: {
  items?: Pick<ItemView, "id" | "category" | "url" | "fitScale" | "fitX" | "fitY" | "name">[];
  faceUrl?: string | null;
  className?: string;
  highlight?: string | null;
}) {
  return (
    <div className={clsx("relative aspect-[3/7] w-full select-none", className)}>
      {/* Sombra no chão */}
      <div className="absolute bottom-[0.5%] left-1/2 h-[3%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(30_30_60/0.22),rgb(30_30_60/0))]" />
      <Figure />
      {faceUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faceUrl}
          alt=""
          draggable={false}
          className="absolute rounded-[50%] object-cover shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6)]"
          style={{ left: pct(116, 300), top: pct(18, 700), width: pct(68, 300), height: pct(80, 700), zIndex: 1 }}
        />
      )}
      {items.map((it) => {
        const s = CATEGORY_INFO[it.category].slot;
        const origin = s.align === "top" ? "center top" : s.align === "bottom" ? "center bottom" : "center";
        return (
          <div
            key={it.id}
            className="pointer-events-none absolute"
            style={{ left: pct(s.x, 300), top: pct(s.y, 700), width: pct(s.w, 300), height: pct(s.h, 700), zIndex: s.z + 1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.url}
              alt={it.name}
              draggable={false}
              className={clsx("animate-pop-in h-full w-full object-contain item-shadow transition-[outline] duration-200", highlight === it.id && "rounded-lg outline-2 outline-offset-4 outline-dashed outline-fg/40")}
              style={{ objectPosition: origin, transformOrigin: origin, transform: `translate(${it.fitX}%, ${it.fitY}%) scale(${it.fitScale})` }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** O corpo do manequim, num branco-acinzentado de loja. Palco de 300 x 700. */
function Figure() {
  const mirror = (d: string) => <path d={d} transform="matrix(-1 0 0 1 300 0)" />;
  const arm = "M88,138 Q70,146 66,196 L57,300 Q54,350 60,388 Q68,398 77,388 L82,306 L95,206 Z";
  const leg = "M93,356 L149,356 L147,448 L141,560 L137,632 L113,632 L106,560 L96,448 Z";
  const foot = "M111,628 L139,628 Q142,652 137,664 L98,664 Q95,650 111,628 Z";
  return (
    <svg viewBox="0 0 300 700" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pv-skin" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#d9d9e2" />
          <stop offset="0.45" stopColor="#f4f4f8" />
          <stop offset="1" stopColor="#cfcfda" />
        </linearGradient>
        <radialGradient id="pv-head" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#fbfbfd" />
          <stop offset="1" stopColor="#d3d3dd" />
        </radialGradient>
      </defs>
      <g fill="url(#pv-skin)" stroke="rgb(255 255 255 / 0.9)" strokeWidth="1.2">
        <path d={arm} />
        {mirror(arm)}
        <path d={leg} />
        {mirror(leg)}
        <path d={foot} />
        {mirror(foot)}
        <rect x="136" y="90" width="28" height="34" rx="9" />
        <path d="M98,130 Q150,110 202,130 L214,148 Q208,228 194,298 Q206,328 208,362 L92,362 Q94,328 106,298 Q92,228 86,148 Z" />
        <ellipse cx="150" cy="58" rx="34" ry="40" fill="url(#pv-head)" />
      </g>
      {/* Linhas de costura do manequim */}
      <path d="M150,124 L150,360" stroke="rgb(255 255 255 / 0.7)" strokeWidth="1" fill="none" />
      <path d="M92,362 L208,362" stroke="rgb(180 180 200 / 0.5)" strokeWidth="1" fill="none" />
    </svg>
  );
}
