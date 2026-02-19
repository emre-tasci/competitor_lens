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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tweets", label: "Tweet Takip", icon: Twitter },
  { href: "/announcements", label: "Duyurular", icon: Megaphone },
  { href: "/news", label: "Haberler", icon: Newspaper },
  { href: "/analysis", label: "AI Analizler", icon: Brain },
  { href: "/exchanges", label: "Borsalar", icon: Building2 },
  { href: "/features", label: "Özellikler", icon: ListChecks },
  { href: "/matrix", label: "Feature Matrix", icon: Grid3X3 },
];

const adminItems = [
  { href: "/admin", label: "Admin", icon: Settings },
];

function NavLink({
  item,
  isActive,
  pendingCount,
  onClick,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
  pendingCount?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative",
        isActive
          ? "bg-primary/10 text-primary font-medium border-l-[3px] border-primary ml-0 pl-[calc(0.75rem-3px)]"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
      {item.href === "/admin" && pendingCount && pendingCount > 0 ? (
        <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center">
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
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b">
        <Link href="/" className="flex items-center gap-3" onClick={onNavClick}>
          <div className="bg-primary/10 rounded-xl p-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg">Competitor Lens</span>
        </Link>
      </div>

      <div className="p-3">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground rounded-lg border hover:bg-accent/50 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Ara...</span>
          <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
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
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive}
              onClick={onNavClick}
            />
          );
        })}

        <Separator className="my-3" />

        {adminItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive}
              pendingCount={pendingCount}
              onClick={onNavClick}
            />
          );
        })}

        {pendingCount > 0 && (
          <Link
            href="/admin/updates"
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ml-4",
              pathname === "/admin/updates"
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Bell className="h-4 w-4" />
            AI Öneriler
            <Badge variant="destructive" className="ml-auto text-xs h-5 min-w-5 flex items-center justify-center">
              {pendingCount}
            </Badge>
          </Link>
        )}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-muted-foreground">Tema</span>
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
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 z-40">
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
          <div className="bg-primary/10 rounded-lg p-1.5">
            <Grid3X3 className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-sm">Competitor Lens</span>
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
