import { useState, useRef, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Camera, User, Mail, Phone, Globe, ArrowLeft, Save } from "lucide-react";
import { useProfile, SUBJECT_OPTIONS } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AppNavSheet } from "@/components/AppNavSheet";
import { AvatarPicker, PRESET_AVATARS } from "@/components/AvatarPicker";
import LtiSettings from "@/components/LtiSettings";

const GRADE_OPTIONS = [
  { value: "6", label: "Grade 6" },
  { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
];

export default function Profile() {
  usePageTitle("Profile");
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio((profile as any).bio || "");
      setPhone((profile as any).phone || "");
      setWebsite((profile as any).website || "");
      setSelectedSubjects(profile.subjects || []);
      setSelectedGrades((profile as any).grade_levels || []);
      setAvatarUrl((profile as any).avatar_url || "");
    }
  }, [profile]);

  const toggleSubject = (value: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const toggleGrade = (value: string) => {
    setSelectedGrades((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload image.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    await supabase
      .from("profiles")
      .update({ avatar_url: url, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);

    toast.success("Profile photo updated!");
    setUploading(false);
  };

  const handlePresetAvatar = async (src: string) => {
    if (!user) return;
    setAvatarUrl(src);

    await supabase
      .from("profiles")
      .update({ avatar_url: src, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);

    toast.success("Avatar updated!");
  };

  const handleSave = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one content area.");
      return;
    }
    setSaving(true);

    const { error } = (await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        subjects: selectedSubjects,
        bio: bio.trim(),
        phone: phone.trim(),
        website: website.trim(),
        grade_levels: selectedGrades,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", user!.id)) ?? {};

    if (error) {
      toast.error("Failed to save profile.");
    } else {
      toast.success("Profile saved!");
    }
    setSaving(false);
  };

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <AppNavSheet />
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground flex-1">Profile Settings</h1>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-xl gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 bg-page-green">
        {/* Avatar Section */}
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
                  ) : (
                    <Camera className="h-5 w-5 text-primary-foreground" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {displayName || "Your Name"}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-xl text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Change Photo"}
                </Button>
              </div>
            </div>
            <AvatarPicker selected={avatarUrl} onSelect={handlePresetAvatar} />
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-sm">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Mr. Marsden"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself, your teaching philosophy, etc."
                className="rounded-xl resize-none min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription className="text-sm">Optional — visible only to you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="h-11 rounded-xl opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(208) 555-0123"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-sm flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Website
              </Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://myteachersite.com"
                className="h-11 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Teaching Preferences */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Teaching Preferences</CardTitle>
            <CardDescription className="text-sm">
              These set your default standards framework and filters across the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm">Content Area(s)</Label>
              <div className="grid grid-cols-1 gap-2">
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

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm">Grade Level(s)</Label>
              <p className="text-xs text-muted-foreground">Select all grade levels you teach</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {GRADE_OPTIONS.map((grade) => (
                  <button
                    key={grade.value}
                    type="button"
                    onClick={() => toggleGrade(grade.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      selectedGrades.includes(grade.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {grade.label}
                  </button>
                ))}
              </div>
            </div>

            {(selectedSubjects.length > 0 || selectedGrades.length > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Your defaults</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSubjects.map((s) => {
                      const opt = SUBJECT_OPTIONS.find((o) => o.value === s);
                      return (
                        <Badge key={s} variant="secondary" className="rounded-lg text-xs">
                          {opt?.label || s} ({opt?.standards})
                        </Badge>
                      );
                    })}
                    {selectedGrades.map((g) => (
                      <Badge key={g} variant="outline" className="rounded-lg text-xs">
                        Grade {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* LTI 1.3 Integration */}
        <LtiSettings />

        {/* Save button at bottom for mobile */}
        <div className="pb-6">
          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-medium">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
          </Button>
        </div>
      </main>
    </div>
  );
}
