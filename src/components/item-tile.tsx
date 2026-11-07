"use client";

import clsx from "clsx";
import { Check, Plus } from "lucide-react";
import { CATEGORY_INFO, type ItemView } from "@/lib/categories";

/** Uma peça apoiada na prateleira de acrílico, como numa vitrine. */
export function ItemTile({
  item,
  equipped,
  onOpen,
  onToggle,
  index = 0,
}: {
  item: ItemView;
  equipped: boolean;
  onOpen: () => void;
  onToggle: () => void;
  index?: number;
}) {
  return (
    <div className="animate-fade-up group relative flex flex-col" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <button type="button" onClick={onOpen} className="relative block aspect-square w-full" aria-label={`Ver ${item.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt=""
          loading="lazy"
          draggable={false}
          className="item-shadow absolute inset-x-[8%] bottom-1 top-[6%] m-auto h-[90%] w-[84%] object-contain object-bottom transition duration-300 group-hover:-translate-y-1.5 group-active:scale-[0.97]"
        />
      </button>
      <div className={clsx("mx-1 transition", equipped ? "shelf-lit" : "shelf")} />
      <div className="mt-2.5 flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight">{item.name}</p>
          <p className="mt-0.5 truncate text-[11px] uppercase tracking-wider text-faint">{labelFor(item)}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={equipped ? `Tirar ${item.name} do look` : `Vestir ${item.name}`}
          aria-pressed={equipped}
          className={clsx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition active:scale-90",
            equipped ? "bg-fg text-white shadow-[0_6px_14px_-6px_rgb(0_0_0/0.6)]" : "glass text-fg",
          )}
        >
          {equipped ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

const labelFor = (i: ItemView) => CATEGORY_INFO[i.category].label;
