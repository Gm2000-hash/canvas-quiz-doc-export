import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LayoutItem } from "react-grid-layout";

const LAYOUT_KEY = "reading_dashboard";
const LOCAL_STORAGE_KEY = "reading_dashboard_layout";
const DEBOUNCE_MS = 1000;

export function useDashboardLayout(userId: string | undefined) {
  const [layout, setLayout] = useState<LayoutItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load layout from DB on mount
  useEffect(() => {
    if (!userId) {
      // Fall back to localStorage for unauthenticated (shouldn't happen but safe)
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) setLayout(JSON.parse(stored));
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("dashboard_layouts")
        .select("layout_data")
        .eq("user_id", userId)
        .eq("layout_key", LAYOUT_KEY)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data?.layout_data) {
        setLayout(data.layout_data as unknown as LayoutItem[]);
      } else {
        // Try migrating from localStorage
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as LayoutItem[];
            setLayout(parsed);
            // Save to DB
            await supabase.from("dashboard_layouts").upsert({
              user_id: userId,
              layout_key: LAYOUT_KEY,
              layout_data: parsed as any,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,layout_key" });
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const saveLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);

    if (!userId) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newLayout));
      return;
    }

    // Debounce DB writes
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase.from("dashboard_layouts").upsert({
        user_id: userId,
        layout_key: LAYOUT_KEY,
        layout_data: newLayout as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,layout_key" });
    }, DEBOUNCE_MS);
  }, [userId]);

  const resetLayout = useCallback(async () => {
    setLayout(null);
    if (userId) {
      await supabase
        .from("dashboard_layouts")
        .delete()
        .eq("user_id", userId)
        .eq("layout_key", LAYOUT_KEY);
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, [userId]);

  return { layout, loading, saveLayout, resetLayout };
}
