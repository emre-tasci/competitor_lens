"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Grid3X3,
  Brain,
  Settings,
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exchanges", label: "Borsalar", icon: Building2 },
  { href: "/features", label: "Özellikler", icon: ListChecks },
  { href: "/matrix", label: "Feature Matrix", icon: Grid3X3 },
  { href: "/classify", label: "AI Sınıflandırma", icon: Brain },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.pendingUpdates || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 border-r bg-card flex flex-col z-30">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Competitor Lens</span>
          </Link>
        </div>

        <div className="p-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground rounded-md border hover:bg-accent transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Ara...</span>
            <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === "/admin" && pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            );
          })}

          {pendingCount > 0 && (
            <Link
              href="/admin/updates"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ml-4",
                pathname === "/admin/updates"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Bell className="h-4 w-4" />
              AI Öneriler
              <Badge variant="destructive" className="ml-auto text-xs">
                {pendingCount}
              </Badge>
            </Link>
          )}
        </nav>
      </aside>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
