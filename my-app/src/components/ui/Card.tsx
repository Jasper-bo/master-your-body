import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = "", style, ...props }: CardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-transparent bg-surface p-6 shadow-[var(--shadow-card)]",
        className,
      ].join(" ")}
      style={{
        background:
          "linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, rgba(46,204,113,0.22), rgba(92,184,253,0.18), rgba(248,160,24,0.08)) border-box",
        ...style,
      }}
      {...props}
    />
  );
}
