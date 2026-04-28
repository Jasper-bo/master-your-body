"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, MAIN_NAV_ITEMS } from "@/lib/constants";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link className="font-display text-xl font-bold" href="/dashboard">
          {APP_NAME}
        </Link>

        <div className="flex items-center gap-1 rounded-xl bg-surface-muted p-1">
          {MAIN_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
