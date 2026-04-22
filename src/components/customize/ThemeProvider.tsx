import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useThemeCustomizations } from "@/hooks/useThemeCustomizations";
import type { CustomWidget } from "@/lib/customization-types";

type Ctx = ReturnType<typeof useThemeCustomizations> & {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  selectedElement: string | null;
  setSelectedElement: (v: string | null) => void;
  publicUrl: (path: string | null | undefined) => Promise<string | null>;
  getPageWidgets: () => CustomWidget[];
  isSectionHidden: (sectionKey: string) => boolean;
  toggleSection: (sectionKey: string) => void;
  addWidget: (w: Omit<CustomWidget, "id" | "sort_order">) => void;
  updateWidget: (id: string, patch: Partial<CustomWidget>) => void;
  deleteWidget: (id: string) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const tc = useThemeCustomizations();
  const location = useLocation();
  const pageScopeKey = location.pathname;
  const [editMode, setEditMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Toggle body class for edit mode visuals
  useEffect(() => {
    document.body.classList.toggle("tk-edit-mode", editMode);
    return () => document.body.classList.remove("tk-edit-mode");
  }, [editMode]);

  // Click handler: in edit mode, clicking a [data-themeable] selects it
  useEffect(() => {
    if (!editMode) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-themeable]") as HTMLElement | null;
      if (!target) return;
      const key = target.getAttribute("data-themeable");
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedElement(key);
      setPanelOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [editMode]);

  // Resolve wallpaper signed URL cache
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});
  const publicUrl = async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null;
    if (urlCache[path]) return urlCache[path];
    const { data, error } = await supabase.storage.from("wallpapers").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return null;
    setUrlCache(prev => ({ ...prev, [path]: data.signedUrl }));
    return data.signedUrl;
  };

  // Apply wallpaper + element colors to the document
  useEffect(() => {
    const root = document.documentElement;
    // Page wallpaper
    const page = tc.get("page", pageScopeKey);
    const global = tc.get("global", "global");
    const wp = page.wallpaper_path ? page : global;
    let cancelled = false;
    (async () => {
      const url = await publicUrl(wp.wallpaper_path);
      if (cancelled) return;
      if (url) {
        root.style.setProperty("--wp-image", `url("${url}")`);
        document.body.classList.add("wp-host");
      } else {
        root.style.setProperty("--wp-image", "none");
      }
      const f = wp.wallpaper_filters || {};
      root.style.setProperty("--wp-blur", `${f.blur ?? 0}px`);
      root.style.setProperty("--wp-brightness", `${f.brightness ?? 1}`);
      root.style.setProperty("--wp-contrast", `${f.contrast ?? 1}`);
      root.style.setProperty("--wp-saturate", `${f.saturate ?? 1}`);
      root.style.setProperty("--wp-opacity", `${f.opacity ?? 1}`);
    })();
    return () => { cancelled = true; };
  }, [tc.all, pageScopeKey]);

  // Apply per-element colors as inline overrides via a stylesheet
  useEffect(() => {
    const styleId = "tk-element-colors";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    const rules: string[] = [];
    Object.values(tc.all).forEach(c => {
      if (c.scope_type !== "element" || !c.color) return;
      // Parse "{key}|{prop}" e.g. "home.banner|bg" / default to bg
      const [key, prop = "bg"] = c.scope_key.split("|");
      const sel = `[data-themeable="${CSS.escape(key)}"]`;
      if (prop === "opacity") {
        const v = parseFloat((c.color || "").replace("opacity:", ""));
        if (!isNaN(v)) rules.push(`${sel}{opacity:${v} !important;}`);
      }
      else if (prop === "text") rules.push(`${sel}{color:${c.color} !important;}`);
      else if (prop === "border") rules.push(`${sel}{border-color:${c.color} !important;}`);
      else rules.push(`${sel}{background-color:${c.color} !important;}`);
    });
    style.textContent = rules.join("\n");
  }, [tc.all]);

  // Apply hidden sections
  useEffect(() => {
    const styleId = "tk-hidden-sections";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    const page = tc.get("page", pageScopeKey);
    const rules = (page.hidden_sections || []).map(
      s => `[data-section="${CSS.escape(s)}"]{display:none !important;}`
    );
    style.textContent = rules.join("\n");
  }, [tc.all, pageScopeKey]);

  const getPageWidgets = (): CustomWidget[] => {
    const page = tc.get("page", pageScopeKey);
    return [...(page.widgets || [])].sort((a, b) => a.sort_order - b.sort_order);
  };

  const isSectionHidden = (sectionKey: string): boolean => {
    const page = tc.get("page", pageScopeKey);
    return (page.hidden_sections || []).includes(sectionKey);
  };

  const toggleSection = (sectionKey: string) => {
    tc.mutate("page", pageScopeKey, prev => {
      const cur = prev.hidden_sections || [];
      const next = cur.includes(sectionKey)
        ? cur.filter(s => s !== sectionKey)
        : [...cur, sectionKey];
      return { hidden_sections: next };
    });
  };

  const addWidget = (w: Omit<CustomWidget, "id" | "sort_order">) => {
    tc.mutate("page", pageScopeKey, prev => {
      const widgets = prev.widgets || [];
      const next: CustomWidget = {
        ...w,
        id: crypto.randomUUID(),
        sort_order: widgets.length,
      };
      return { widgets: [...widgets, next] };
    });
  };

  const updateWidget = (id: string, patch: Partial<CustomWidget>) => {
    tc.mutate("page", pageScopeKey, prev => ({
      widgets: (prev.widgets || []).map(w => w.id === id ? { ...w, ...patch } : w),
    }));
  };

  const deleteWidget = (id: string) => {
    tc.mutate("page", pageScopeKey, prev => ({
      widgets: (prev.widgets || []).filter(w => w.id !== id),
    }));
  };

  const value: Ctx = useMemo(() => ({
    ...tc, editMode, setEditMode, panelOpen, setPanelOpen,
    selectedElement, setSelectedElement, publicUrl,
    getPageWidgets, isSectionHidden, toggleSection,
    addWidget, updateWidget, deleteWidget,
  }), [tc, editMode, panelOpen, selectedElement]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
