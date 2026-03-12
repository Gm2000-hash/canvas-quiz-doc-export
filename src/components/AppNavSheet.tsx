import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Menu, FileText, BookOpen, Layers, PenLine, Settings, LogOut, Home } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", path: "/", icon: Home, description: "Dashboard & Quiz Export" },
  { label: "Question Bank", path: "/question-bank", icon: BookOpen, description: "Browse & manage questions" },
  { label: "Create Question", path: "/create-question", icon: PenLine, description: "Build a new question" },
  { label: "Lesson Planner", path: "/lesson-planner", icon: Layers, description: "Units, lessons & pacing" },
];

interface AppNavSheetProps {
  onOpenSettings?: () => void;
  showSettings?: boolean;
}

export function AppNavSheet({ onOpenSettings, showSettings }: AppNavSheetProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent rounded-xl h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3">
          <SheetTitle className="flex items-center gap-2.5 text-base">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Canvas Quiz Exporter
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-3 space-y-0.5 border-t border-border/60">
          {showSettings && onOpenSettings && (
            <button
              onClick={() => { setOpen(false); onOpenSettings(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Canvas Settings</span>
            </button>
          )}
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
