import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";
import { SUBJECT_OPTIONS, useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AvatarPicker } from "@/components/AvatarPicker";

export default function Onboarding() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleSubject = (value: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one content area.");
      return;
    }
    setSaving(true);
    const { error } = (await updateProfile({
      display_name: displayName.trim(),
      subjects: selectedSubjects,
    })) ?? {};
    if (error) {
      toast.error("Failed to save profile.");
    } else {
      toast.success("Welcome aboard! 🎉");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Welcome to Teaching Toolkit</h1>
          <p className="text-sm text-muted-foreground">Tell us about yourself to get started</p>
        </div>

        <Card className="shadow-md border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Your Profile</CardTitle>
            <CardDescription className="text-sm">
              This helps us tailor the app to your teaching needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">Display Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Mr. Marsden"
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Content Area(s)</Label>
                <p className="text-xs text-muted-foreground">Select all subjects you teach</p>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <label
                      key={subject.value}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                        selectedSubjects.includes(subject.value)
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <Checkbox
                        checked={selectedSubjects.includes(subject.value)}
                        onCheckedChange={() => toggleSubject(subject.value)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{subject.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Standards: {subject.standards}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl font-medium" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Started"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
