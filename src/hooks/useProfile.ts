import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  subjects: string[];
  avatar_url: string;
  bio: string;
  phone: string;
  website: string;
  grade_levels: string[];
  created_at: string;
  updated_at: string;
};

export const SUBJECT_OPTIONS = [
  { value: "Science", label: "Science", standards: "NGSS" },
  { value: "ELA", label: "English Language Arts", standards: "Idaho" },
  { value: "Math", label: "Mathematics", standards: "Idaho" },
  { value: "Social Studies", label: "Social Studies", standards: "Idaho" },
  { value: "Careers", label: "Careers (CTE)", standards: "Idaho" },
] as const;

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setProfile(null);
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);

      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id),
      ]);

      setProfile((profileRes.data as Profile) ?? null);
      setIsAdmin((roleRes.data ?? []).some((r: any) => r.role === "admin"));
      setLoading(false);
    };

    fetchProfile();
  }, [user, authLoading]);

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "subjects">>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select()
      .single();

    if (data) setProfile(data as Profile);
    return { data, error };
  };

  const needsOnboarding = !authLoading && !loading && user && profile && profile.subjects.length === 0;

  return { profile, loading, isAdmin, updateProfile, needsOnboarding };
}
