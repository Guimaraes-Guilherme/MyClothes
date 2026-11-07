import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={clsx("select-none font-bold tracking-[-0.04em]", size === "lg" ? "text-4xl" : "text-xl", className)}>
      Provador<span className="text-faint">.</span>
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-fg text-white hover:bg-black font-semibold shadow-[0_10px_24px_-10px_rgb(0_0_0/0.5)]",
  secondary: "glass text-fg hover:bg-white/80 font-medium",
  ghost: "text-fg hover:bg-white/60 font-medium",
  danger: "border border-line text-fg hover:bg-fg hover:text-white font-medium",
};
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

export const inputClass =
  "h-12 w-full rounded-2xl border bg-white/70 px-4 text-[15px] outline-none backdrop-blur transition placeholder:text-faint focus:border-fg focus:bg-white";

export function Field({
  label,
  error,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string[] | string; hint?: ReactNode }) {
  const id = props.id ?? props.name;
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!err}
        aria-describedby={err ? `${id}-error` : undefined}
        className={clsx(inputClass, err ? "border-fg" : "border-white")}
        {...props}
      />
      {err ? (
        <p id={`${id}-error`} className="text-[13px] font-medium">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-fg align-middle" />
          {err}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" }) {
  return (
    <div role="status" className={clsx("rounded-2xl px-4 py-3 text-sm", tone === "success" ? "bg-fg font-medium text-white" : "glass")}>
      {children}
    </div>
  );
}

/** Título de tela no estilo vitrine: "Seu armário." + uma linha de apoio. */
export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[32px] font-bold leading-none tracking-[-0.04em] sm:text-4xl">
          {title}
          <span className="text-faint">.</span>
        </h1>
        {subtitle && <p className="mt-2 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Chip({ active, className, ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx(
        "h-9 shrink-0 rounded-full px-4 text-[13px] font-medium transition active:scale-[0.97]",
        active ? "bg-fg text-white shadow-[0_8px_18px_-8px_rgb(0_0_0/0.5)]" : "glass text-fg/80 hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-fg font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials || "?"}
    </span>
  );
}
