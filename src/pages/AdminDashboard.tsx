import { useState, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, SUBJECT_OPTIONS } from "@/hooks/useProfile";
import { AppNavSheet } from "@/components/AppNavSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, Users, Loader2, GraduationCap, Search, Trash2, KeyRound, Eye, BookOpenCheck, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MathText } from "@/components/MathText";

type UserRow = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  subjects: string[];
  created_at: string;
  roles: string[];
};

type UserQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  dok_level: number | null;
  blooms_level: string | null;
  created_at: string;
  standards: { ngss_code: string; ngss_description: string }[];
};

export default function AdminDashboard() {
  usePageTitle("Admin Dashboard");
  const navigate = useNavigate();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // User detail dialog
  const [viewingUser, setViewingUser] = useState<UserRow | null>(null);
  const [userQuestions, setUserQuestions] = useState<UserQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionFilter, setQuestionFilter] = useState("all");

  // Delete / reset dialogs
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Invite user
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

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
    if (!profileLoading && isAdmin) fetchUsers();
  }, [profileLoading, isAdmin, fetchUsers]);

  const callAdminFunction = async (action: string, userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("admin-users", {
      body: { action, userId },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  // View user questions & standards
  const handleViewUser = async (user: UserRow) => {
    setViewingUser(user);
    setQuestionsLoading(true);
    setQuestionFilter("all");
    try {
      const data = await callAdminFunction("get_user_questions", user.user_id);
      const stdMap = new Map<string, { ngss_code: string; ngss_description: string }[]>();
      (data.standards || []).forEach((s: any) => {
        const arr = stdMap.get(s.question_bank_id) || [];
        arr.push({ ngss_code: s.ngss_code, ngss_description: s.ngss_description });
        stdMap.set(s.question_bank_id, arr);
      });
      const questions: UserQuestion[] = (data.questions || []).map((q: any) => ({
        ...q,
        standards: stdMap.get(q.id) || [],
      }));
      setUserQuestions(questions);
    } catch (err: any) {
      toast.error(err.message || "Failed to load user data");
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await callAdminFunction("delete_user", deleteTarget.user_id);
      toast.success(`User "${deleteTarget.display_name || deleteTarget.email}" has been removed`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setActionLoading(true);
    try {
      const data = await callAdminFunction("reset_password", resetTarget.user_id);
      toast.success(`Password reset link generated for ${data.email || resetTarget.email}`);
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const res = await supabase.functions.invoke("admin-users", {
        body: { action: "invite_user", email: inviteEmail.trim(), password: invitePassword || undefined },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`User "${inviteEmail}" has been created!`);
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePassword("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setInviteLoading(false);
    }
  };

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
        await supabase.from("user_roles").delete().eq("user_id", userId);
      } else {
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

  // Filter questions by content area
  const getFilteredQuestions = () => {
    if (questionFilter === "all") return userQuestions;
    if (questionFilter === "no-standards") return userQuestions.filter((q) => q.standards.length === 0);
    // Filter by standards prefix patterns
    const prefixMap: Record<string, string[]> = {
      science: ["MS-", "HS-", "K-", "1-", "2-", "3-", "4-", "5-"],
      ela: ["ELA"],
      math: ["MA", "MATH"],
      "social-studies": ["SS", "SOC"],
    };
    const prefixes = prefixMap[questionFilter] || [];
    return userQuestions.filter((q) =>
      q.standards.some((s) => prefixes.some((p) => s.ngss_code.toUpperCase().startsWith(p)))
    );
  };

  const filteredQuestions = getFilteredQuestions();

  // Count standards by area
  const allStandards = userQuestions.flatMap((q) => q.standards);
  const uniqueStandards = [...new Map(allStandards.map((s) => [s.ngss_code, s])).values()];

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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-primary/20"
            onClick={() => navigate("/admin/library")}
          >
            <CardContent className="pt-5 pb-4 text-center">
              <BookOpenCheck className="h-6 w-6 text-primary mx-auto mb-1" />
              <div className="text-sm font-semibold text-foreground">Manage Library</div>
              <div className="text-xs text-muted-foreground">Upload & manage PDFs</div>
            </CardContent>
          </Card>
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
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, subject..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl"
                  />
                </div>
                <Button size="sm" className="h-9 rounded-xl gap-1.5" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Invite</span>
                </Button>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View questions & standards"
                                onClick={() => handleViewUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Reset password"
                                onClick={() => setResetTarget(user)}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Remove user"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* View User Questions Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {viewingUser?.display_name || viewingUser?.email} — Questions & Standards
            </DialogTitle>
            <DialogDescription>
              {userQuestions.length} questions · {uniqueStandards.length} unique standards tagged
            </DialogDescription>
          </DialogHeader>

          <Tabs value={questionFilter} onValueChange={setQuestionFilter} className="flex-1 min-h-0">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-xs">All ({userQuestions.length})</TabsTrigger>
              <TabsTrigger value="science" className="text-xs">Science</TabsTrigger>
              <TabsTrigger value="ela" className="text-xs">ELA</TabsTrigger>
              <TabsTrigger value="math" className="text-xs">Math</TabsTrigger>
              <TabsTrigger value="social-studies" className="text-xs">Social Studies</TabsTrigger>
              <TabsTrigger value="no-standards" className="text-xs">Untagged</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-3" style={{ maxHeight: "55vh" }}>
              {questionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No questions found in this category.
                </p>
              ) : (
                <div className="space-y-3 pr-4">
                  {filteredQuestions.map((q) => (
                    <Card key={q.id} className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                         <MathText text={q.question_text} className="text-sm font-medium leading-snug flex-1" inline />
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {q.question_type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {q.dok_level && (
                          <Badge variant="secondary" className="text-[10px]">
                            DOK {q.dok_level}
                          </Badge>
                        )}
                        {q.blooms_level && (
                          <Badge variant="secondary" className="text-[10px]">
                            {q.blooms_level}
                          </Badge>
                        )}
                        {q.standards.map((s) => (
                          <Badge key={s.ngss_code} className="text-[10px] bg-primary/10 text-primary border-0">
                            {s.ngss_code}
                          </Badge>
                        ))}
                        {q.standards.length === 0 && (
                          <span className="text-[10px] text-muted-foreground italic">No standards tagged</span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.display_name || deleteTarget?.email}</strong> and all their data (questions, lesson plans, profile). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Generate a password reset link for <strong>{resetTarget?.display_name || resetTarget?.email}</strong>. The user will receive instructions to set a new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Send Reset Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) { setInviteOpen(false); setInviteEmail(""); setInvitePassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Create a new account. The user can sign in immediately with these credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                placeholder="teacher@school.edu"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Temporary Password</label>
              <Input
                type="text"
                placeholder="Leave blank to auto-generate"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">If left blank, a random password will be generated. Share it with the user so they can sign in.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteLoading}>Cancel</Button>
            <Button onClick={handleInviteUser} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
