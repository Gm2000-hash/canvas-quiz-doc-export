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
  BookOpen,
  Layers,
  Library,
  Puzzle,
  BookOpenCheck,
  BarChart3,
  GraduationCap,
  LogOut,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const tools = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Question Bank", path: "/question-bank", icon: BookOpen },
  { label: "Curriculum", path: "/lesson-planner", icon: Layers },
  { label: "Activities", path: "/activities", icon: Puzzle },
  { label: "Reading Library", path: "/reading-library", icon: BookOpenCheck },
  { label: "Canvas Workspace", path: "/canvas", icon: BarChart3 },
  { label: "Standards", path: "/standards", icon: Library },
];

export function WorkspaceSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useProfile();

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
