"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, GitCompareArrows, LayoutGrid, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/screens", label: "Galeri", icon: Grid2X2, exact: true },
  { href: "/screens/patterns", label: "Desenler", icon: GitCompareArrows },
  { href: "/screens/coverage", label: "Kapsam", icon: LayoutGrid },
  { href: "/screens/review", label: "İnceleme", icon: ClipboardCheck },
];

export function ScreensSubnav() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      {tabs.map((t) => {
        const active = isActive(t.href, t.exact);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <t.icon
              className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground/70")}
            />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
