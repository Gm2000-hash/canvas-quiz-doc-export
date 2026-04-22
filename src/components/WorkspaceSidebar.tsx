import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  FileText,
  BookOpen,
  Layers,
  Library,
  Puzzle,
  BookOpenCheck,
  BarChart3,
  GraduationCap,
  Settings,
  LogOut,
  ShieldCheck,
  StickyNote,
  Plus,
  UserCircle,
  Brain,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateNote } from "@/hooks/useNotes";
import { NotesTree } from "./notes/NotesTree";
import { toast } from "sonner";

const tools = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Question Bank", path: "/question-bank", icon: BookOpen },
  { label: "Curriculum", path: "/lesson-planner", icon: Layers },
  { label: "Activities", path: "/activities", icon: Puzzle },
  { label: "Reading Library", path: "/reading-library", icon: BookOpenCheck },
  { label: "Canvas Export", path: "/canvas", icon: FileText },
  { label: "Canvas Results", path: "/canvas-results", icon: BarChart3 },
  { label: "Quiz Analytics", path: "/quiz-analytics", icon: BarChart3 },
  { label: "Standards", path: "/standards", icon: Library },
  { label: "Stress Navigator", path: "/stress-navigator", icon: Brain },
];

export function WorkspaceSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useProfile();
  const createNote = useCreateNote();

  const handleNewNote = async () => {
    try {
      const note = await createNote.mutateAsync({});
      navigate(`/notes/${note.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create note");
    }
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              Teaching Toolkit
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Notes section */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            <span className="flex items-center gap-1.5">
              <StickyNote className="h-3 w-3" />
              {!collapsed && "Notes"}
            </span>
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleNewNote}
                disabled={createNote.isPending}
                title="New note"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {collapsed ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/notes")} tooltip="Notes">
                    <StickyNote className="h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <NotesTree />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools section */}
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Tools"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((t) => (
                <SidebarMenuItem key={t.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(t.path)}
                    tooltip={t.label}
                  >
                    <NavLink to={t.path} end={t.path === "/"}>
                      <t.icon className="h-4 w-4" />
                      {!collapsed && <span>{t.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile" isActive={isActive("/profile")}>
              <NavLink to="/profile">
                <UserCircle className="h-4 w-4" />
                {!collapsed && <span>Profile</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin" isActive={isActive("/admin")}>
                <NavLink to="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} tooltip="Sign out">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
