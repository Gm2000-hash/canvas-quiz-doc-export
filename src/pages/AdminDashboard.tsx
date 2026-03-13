import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, SUBJECT_OPTIONS } from "@/hooks/useProfile";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, Users, Loader2, GraduationCap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type UserRow = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  subjects: string[];
  created_at: string;
  roles: string[];
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);

    if (profilesRes.error) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }

    const rolesMap = new Map<string, string[]>();
    (rolesRes.data || []).forEach((r: any) => {
      const existing = rolesMap.get(r.user_id) || [];
      existing.push(r.role);
      rolesMap.set(r.user_id, existing);
    });

    const merged: UserRow[] = (profilesRes.data || []).map((p: any) => ({
      ...p,
      roles: rolesMap.get(p.user_id) || [],
    }));

    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      fetchUsers();
    }
  }, [profileLoading, isAdmin, fetchUsers]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-1">You need admin privileges to view this page.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      if (newRole === "none") {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Remove existing roles first, then insert new one
        await supabase.from("user_roles").delete().eq("user_id", userId);
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole as any });
        if (error) throw error;
      }
      toast.success("Role updated");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  const subjectCounts = SUBJECT_OPTIONS.map((s) => ({
    ...s,
    count: users.filter((u) => u.subjects.includes(s.value)).length,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 h-14 border-b border-border/60 bg-card/80 glass-header flex items-center px-4 gap-4">
        <AppNavSheet />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold text-foreground">Admin Dashboard</span>
        </div>
      </header>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Users className="h-6 w-6 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-xs text-muted-foreground">Total Teachers</div>
            </CardContent>
          </Card>
          {subjectCounts.map((s) => (
            <Card key={s.value}>
              <CardContent className="pt-5 pb-4 text-center">
                <GraduationCap className="h-6 w-6 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">All Users</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.display_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.email || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.subjects.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">Not set</span>
                              ) : (
                                user.subjects.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-[11px]">
                                    {s}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.roles[0] || "none"}
                              onValueChange={(v) => handleRoleChange(user.user_id, v)}
                              disabled={updating === user.user_id}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
