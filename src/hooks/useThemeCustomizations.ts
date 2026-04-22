import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Customization, CustomWidget, ScopeType, WallpaperFilters } from "@/lib/customization-types";

const LOCAL_KEY = "tk-customizations-draft";

type Row = {
  scope_type: ScopeType;
  scope_key: string;
  color: string | null;
  wallpaper_path: string | null;
  wallpaper_filters: WallpaperFilters | null;
  widgets: CustomWidget[] | null;
  hidden_sections: string[] | null;
};

type Map = Record<string, Customization>; // key = `${scope_type}:${scope_key}`

const k = (t: ScopeType, key: string) => `${t}:${key}`;

function emptyCustomization(scope_type: ScopeType, scope_key: string): Customization {
  return {
    scope_type, scope_key,
    color: null,
    wallpaper_path: null,
    wallpaper_filters: {},
    widgets: [],
    hidden_sections: [],
  };
}

function loadDraft(): Map {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function saveDraft(map: Map) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(map)); } catch {/* ignore */}
}

export function useThemeCustomizations() {
  const { user } = useAuth();
  const location = useLocation();
  const pageScopeKey = location.pathname;

  const [serverMap, setServerMap] = useState<Map>({});
  const [draftMap, setDraftMap] = useState<Map>(() => loadDraft());
  const [loading, setLoading] = useState(true);

  // Load server customizations
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("theme_customizations")
        .select("scope_type, scope_key, color, wallpaper_path, wallpaper_filters, widgets, hidden_sections")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) { console.error("Load customizations failed:", error); setLoading(false); return; }
      const map: Map = {};
      (data as Row[] || []).forEach(r => {
        map[k(r.scope_type, r.scope_key)] = {
          scope_type: r.scope_type,
          scope_key: r.scope_key,
          color: r.color,
          wallpaper_path: r.wallpaper_path,
          wallpaper_filters: (r.wallpaper_filters as WallpaperFilters) || {},
          widgets: (r.widgets as CustomWidget[]) || [],
          hidden_sections: (r.hidden_sections as string[]) || [],
        };
      });
      setServerMap(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Merged view — draft overrides server
  const merged: Map = useMemo(() => {
    const out: Map = { ...serverMap };
    for (const key of Object.keys(draftMap)) out[key] = draftMap[key];
    return out;
  }, [serverMap, draftMap]);

  // Public read helpers
  const get = useCallback(
    (scope_type: ScopeType, scope_key: string): Customization =>
      merged[k(scope_type, scope_key)] ?? emptyCustomization(scope_type, scope_key),
    [merged]
  );

  // Mutate draft (local preview)
  const mutate = useCallback((scope_type: ScopeType, scope_key: string,
    patch: Partial<Customization> | ((prev: Customization) => Partial<Customization>)) => {
    setDraftMap(prev => {
      const key = k(scope_type, scope_key);
      const base = prev[key] ?? merged[key] ?? emptyCustomization(scope_type, scope_key);
      const p = typeof patch === "function" ? patch(base) : patch;
      const next = { ...prev, [key]: { ...base, ...p } };
      saveDraft(next);
      return next;
    });
  }, [merged]);

  const hasDraft = Object.keys(draftMap).length > 0;

  // Save all drafts to server
  const saveAll = useCallback(async () => {
    if (!user) return { ok: false, error: "Not authenticated" };
    const rows = Object.values(draftMap).map(c => ({
      user_id: user.id,
      scope_type: c.scope_type,
      scope_key: c.scope_key,
      color: c.color ?? null,
      wallpaper_path: c.wallpaper_path ?? null,
      wallpaper_filters: c.wallpaper_filters ?? {},
      widgets: c.widgets ?? [],
      hidden_sections: c.hidden_sections ?? [],
    }));
    if (rows.length === 0) return { ok: true };
    const { error } = await supabase
      .from("theme_customizations")
      .upsert(rows, { onConflict: "user_id,scope_type,scope_key" });
    if (error) return { ok: false, error: error.message };
    // Promote drafts to server map, clear drafts
    setServerMap(prev => {
      const next = { ...prev };
      Object.values(draftMap).forEach(c => { next[k(c.scope_type, c.scope_key)] = c; });
      return next;
    });
    setDraftMap({});
    saveDraft({});
    return { ok: true };
  }, [user, draftMap]);

  const discardDraft = useCallback(() => {
    setDraftMap({});
    saveDraft({});
  }, []);

  return {
    loading,
    pageScopeKey,
    get,
    mutate,
    saveAll,
    discardDraft,
    hasDraft,
    all: merged,
  };
}
