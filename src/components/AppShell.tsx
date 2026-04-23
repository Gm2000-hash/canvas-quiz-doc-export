import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { CommandPalette } from "./notes/CommandPalette";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ThemeProvider } from "@/components/customize/ThemeProvider";
import { CustomizeButton } from "@/components/customize/CustomizeButton";
import { CustomizePanel } from "@/components/customize/CustomizePanel";

interface AppShellProps {
  children: ReactNode;
}

const PILL_NAV = [
  { label: "Curriculum", path: "/lesson-planner" },
  { label: "Questions", path: "/question-bank" },
  { label: "Activities", path: "/activities" },
  { label: "Standards", path: "/standards" },
];

export function AppShell({ children }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ThemeProvider>
      {/* key forces SidebarProvider to remount when toggling between home and inner pages,
          so defaultOpen takes effect (collapsed on home, expanded elsewhere). */}
      <SidebarProvider key={isHome ? "home" : "inner"} defaultOpen={!isHome}>
        <div className="min-h-screen flex w-full wp-host" data-themeable="app.shell">
          <WorkspaceSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header
              data-themeable="app.header"
              className="h-16 border-b border-border bg-background flex items-center px-4 gap-3 sticky top-0 z-40"
            >
              <SidebarTrigger />

              {/* Brand chip */}
              <NavLink
                to="/"
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] hover:bg-neutral-100 transition-colors"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
                <span>Teacherkit / Toolkit</span>
              </NavLink>

              {/* Pill nav */}
              <nav className="hidden md:flex items-center gap-1.5 ml-2">
                {PILL_NAV.map((item) => {
                  const active =
                    location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/");
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={
                        "pill-btn " + (active ? "pill-btn--ink" : "")
                      }
                    >
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                className="ml-auto text-muted-foreground gap-2 rounded-full bg-card/60 hover:bg-card border border-border px-3"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Search</span>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded-full border border-border bg-muted px-1.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </Button>
            </header>
            <main className="flex-1 min-w-0 overflow-x-hidden relative" data-themeable="app.main">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <CustomizeButton />
        <CustomizePanel />
      </SidebarProvider>
    </ThemeProvider>
  );
}
