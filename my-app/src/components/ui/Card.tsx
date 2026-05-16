import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]",
        className,
      ].join(" ")}
      {...props}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400" />
      {children}
    </section>
  );
}
