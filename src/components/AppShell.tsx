import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { CommandPalette } from "./notes/CommandPalette";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/customize/ThemeProvider";
import { CustomizeButton } from "@/components/customize/CustomizeButton";
import { CustomizePanel } from "@/components/customize/CustomizePanel";
import { CanvasOverlay } from "@/components/customize/CanvasOverlay";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

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
      <SidebarProvider>
        <div className="min-h-screen flex w-full wp-host" data-themeable="app.shell">
          <WorkspaceSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header
              data-themeable="app.header"
              className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-3 gap-2 sticky top-0 z-40"
            >
              <SidebarTrigger />
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
              <CanvasOverlay />
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
