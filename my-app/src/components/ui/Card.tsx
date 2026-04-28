import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
