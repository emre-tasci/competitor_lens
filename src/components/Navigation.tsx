"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Grid3X3,
  Settings,
  Bell,
  Search,
  Menu,
  Twitter,
  Megaphone,
  Newspaper,
  Brain,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Genel",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Gündem",
    items: [
      { href: "/tweets", label: "Tweet Takip", icon: Twitter },
      { href: "/announcements", label: "Duyurular", icon: Megaphone },
      { href: "/news", label: "Haberler", icon: Newspaper },
      { href: "/analysis", label: "AI Analizler", icon: Brain },
    ],
  },
  {
    label: "Ürün",
    items: [
      { href: "/exchanges", label: "Borsalar", icon: Building2 },
      { href: "/features", label: "Özellikler", icon: ListChecks },
      { href: "/matrix", label: "Feature Matrix", icon: Grid3X3 },
      { href: "/screens", label: "Ekranlar", icon: Images },
    ],
  },
];

const adminItems: NavItem[] = [
  { href: "/admin", label: "Admin", icon: Settings },
];

function NavLink({
  item,
  isActive,
  pendingCount,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  pendingCount?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      {/* Distinctive active indicator: a short red rule pinned to the rail */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        )}
        aria-hidden
      />
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
        )}
      />
      {item.label}
      {item.href === "/admin" && pendingCount && pendingCount > 0 ? (
        <Badge
          variant="destructive"
          className="ml-auto flex h-5 min-w-5 items-center justify-center text-xs"
        >
          {pendingCount}
        </Badge>
      ) : null}
    </Link>
  );
}

function SidebarContent({
  pathname,
  pendingCount,
  setSearchOpen,
  onNavClick,
}: {
  pathname: string;
  pendingCount: number;
  setSearchOpen: (open: boolean) => void;
  onNavClick?: () => void;
}) {
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={onNavClick}
        >
          <Logo className="h-9 w-9 rounded-xl shadow-sm" />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight">
              Product Terminali
            </span>
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">
              Ürün takibi
            </span>
          </div>
        </Link>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/15 hover:bg-accent/60"
        >
          <Search className="h-4 w-4" />
          <span>Ara</span>
          <kbd className="ml-auto rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mb-4">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Yönetim
          </p>
          <div className="space-y-0.5">
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={pathname.startsWith(item.href)}
                pendingCount={pendingCount}
                onClick={onNavClick}
              />
            ))}
            {pendingCount > 0 && (
              <Link
                href="/admin/updates"
                onClick={onNavClick}
                aria-current={pathname === "/admin/updates" ? "page" : undefined}
                className={cn(
                  "group relative ml-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname === "/admin/updates"
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Bell className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                AI Öneriler
                <Badge
                  variant="destructive"
                  className="ml-auto flex h-5 min-w-5 items-center justify-center text-xs"
                >
                  {pendingCount}
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="border-t px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Görünüm</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/stats/pending")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.pendingCount || 0))
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
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigasyon</SheetTitle>
            <SidebarContent
              pathname={pathname}
              pendingCount={pendingCount}
              setSearchOpen={setSearchOpen}
              onNavClick={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-bold tracking-tight">Product Terminali</span>
        </Link>
        <ThemeToggle />
      </div>
      {/* Mobile spacer */}
      <div className="md:hidden h-14" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 border-r bg-card flex-col z-30">
        <SidebarContent
          pathname={pathname}
          pendingCount={pendingCount}
          setSearchOpen={setSearchOpen}
        />
      </aside>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
