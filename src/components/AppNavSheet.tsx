import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, FileText, BookOpen, Layers, Settings, LogOut, Home, ShieldCheck, Library, UserCircle, Puzzle, BookOpenCheck } from "lucide-react";

const navItems = [
  { label: "Home", path: "/", icon: Home, description: "Dashboard" },
  { label: "Canvas Export", path: "/canvas", icon: FileText, description: "Export quizzes from Canvas" },
  { label: "Curriculum", path: "/lesson-planner", icon: Layers, description: "Units, lessons & readings" },
  { label: "Question Bank", path: "/question-bank", icon: BookOpen, description: "Browse & manage questions" },
  { label: "Activity Builder", path: "/activities", icon: Puzzle, description: "Create interactive activities" },
  { label: "Standards Browser", path: "/standards", icon: Library, description: "Browse Idaho & NGSS standards" },
  { label: "Reading Library", path: "/reading-library", icon: BookOpenCheck, description: "Shared readings & PDFs" },
];

interface AppNavSheetProps {
  onOpenSettings?: () => void;
  showSettings?: boolean;
}

export const AppNavSheet = React.forwardRef<HTMLDivElement, AppNavSheetProps>(function AppNavSheet(
  { onOpenSettings, showSettings },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useProfile();

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div ref={ref} className="contents">
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
              Teaching Toolkit
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map((item) => {
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
            <button
              onClick={() => go("/profile")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                location.pathname === "/profile"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              <UserCircle className={`h-5 w-5 shrink-0 ${location.pathname === "/profile" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Profile</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => go("/admin")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  location.pathname === "/admin"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <ShieldCheck className={`h-5 w-5 shrink-0 ${location.pathname === "/admin" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Admin Dashboard</span>
              </button>
            )}
            {showSettings && onOpenSettings && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Canvas Settings</span>
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
