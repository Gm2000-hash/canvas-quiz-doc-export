import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { CommandPalette } from "./notes/CommandPalette";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useEffect } from "react";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <WorkspaceSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b border-border/60 bg-card/80 backdrop-blur flex items-center px-2 gap-2 sticky top-0 z-40">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              className="ml-auto text-muted-foreground gap-2 rounded-xl"
            >
              <Search className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </Button>
          </header>
          <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
}
