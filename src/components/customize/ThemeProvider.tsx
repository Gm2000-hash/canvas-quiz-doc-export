import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useThemeCustomizations } from "@/hooks/useThemeCustomizations";
import { useCanvasLayout } from "@/hooks/useCanvasLayout";
import type { CustomWidget } from "@/lib/customization-types";
import type { CanvasElement } from "@/lib/canvas-types";

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
  // ----- Canva-style canvas editor -----
  canvasElements: CanvasElement[];
  addCanvasElement: (el: CanvasElement) => void;
  updateCanvasElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeCanvasElement: (id: string) => void;
  reorderCanvasElements: (orderedIds: string[]) => void;
  selectedWidgetId: string | null;
  setSelectedWidgetId: (id: string | null) => void;
  canvasHasDraft: boolean;
  saveCanvas: () => Promise<{ ok: boolean; error?: string }>;
  discardCanvasDraft: () => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

/** Build a stable structural path for an element scoped to <main>. */
function getStructuralPath(el: HTMLElement): string {
  const root = (document.querySelector("[data-themeable='app.main']") as HTMLElement) || document.body;
  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  let depth = 0;
  while (cur && cur !== root && depth < 12) {
    const parent: HTMLElement | null = cur.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter(
      c => c.tagName === cur!.tagName
    );
    const idx = siblings.indexOf(cur);
    parts.unshift(`${cur.tagName.toLowerCase()}[${idx}]`);
    cur = parent;
    depth++;
  }
  return parts.join(">");
}

/** Resolve a structural path back to the live element, if it still exists. */
function resolveStructuralPath(path: string): HTMLElement | null {
  const root = (document.querySelector("[data-themeable='app.main']") as HTMLElement) || document.body;
  const segs = path.split(">").filter(Boolean);
  let cur: HTMLElement | null = root;
  for (const seg of segs) {
    if (!cur) return null;
    const m = seg.match(/^([a-z0-9-]+)\[(\d+)\]$/i);
    if (!m) return null;
    const [, tag, idxStr] = m;
    const idx = Number(idxStr);
    const matches = Array.from(cur.children).filter(
      c => c.tagName.toLowerCase() === tag.toLowerCase()
    ) as HTMLElement[];
    cur = matches[idx] || null;
  }
  return cur;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const tc = useThemeCustomizations();
  const cl = useCanvasLayout();
  const location = useLocation();
  const pageScopeKey = location.pathname;
  const [editMode, setEditMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  // Toggle body class for edit mode visuals
  useEffect(() => {
    document.body.classList.toggle("tk-edit-mode", editMode);
    return () => document.body.classList.remove("tk-edit-mode");
  }, [editMode]);

  // Reset selected canvas widget when route changes
  useEffect(() => { setSelectedWidgetId(null); }, [location.pathname]);

  // Click handler: in edit mode, clicking ANY element auto-tags it with a
  // stable structural key so it can be themed — no per-page markup needed.
  useEffect(() => {
    if (!editMode) return;

    const isIgnored = (el: HTMLElement) =>
      el.closest(".tk-canvas-widget") ||
      el.closest("[data-tk-ignore]") ||
      el.closest("[role='dialog'], [data-radix-popper-content-wrapper]");

    // Block native control behaviour (dropdowns opening, links navigating,
    // forms submitting, etc.) BEFORE the browser/Radix can react.
    const swallow = (e: Event) => {
      const tgt = e.target as HTMLElement;
      if (!tgt || isIgnored(tgt)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const blockedEvents = ["pointerdown", "mousedown", "keydown", "submit"] as const;
    blockedEvents.forEach(ev => document.addEventListener(ev, swallow, true));

    const onClick = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement;
      if (!tgt || isIgnored(tgt)) return;
      e.preventDefault();
      e.stopPropagation();
      // Prefer an explicit data-themeable ancestor if present
      const explicit = tgt.closest("[data-themeable]") as HTMLElement | null;
      let key: string | null = null;
      if (explicit) {
        key = explicit.getAttribute("data-themeable");
      } else {
        const candidate = (tgt.closest(
          "button, a, input, textarea, select, label, h1, h2, h3, h4, h5, h6, p, li, " +
          "[role='button'], [role='tab'], [role='menuitem'], [role='option'], " +
          "[role='combobox'], [role='listbox'], " +
          ".bubble-glass, [class*='card'], [data-radix-collection-item]"
        ) as HTMLElement | null) || tgt;
        key = `auto:${pageScopeKey}::${getStructuralPath(candidate)}`;
        candidate.setAttribute("data-themeable", key);
      }
      if (!key) return;
      setSelectedElement(key);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      blockedEvents.forEach(ev => document.removeEventListener(ev, swallow, true));
    };
  }, [editMode, pageScopeKey]);

  // Re-apply auto-tags whenever the DOM changes so saved customizations
  // continue to find their elements after re-renders / route changes.
  useEffect(() => {
    const reapply = () => {
      Object.values(tc.all).forEach(c => {
        if (c.scope_type !== "element") return;
        const [key] = c.scope_key.split("|");
        if (!key.startsWith("auto:")) return;
        // Only reapply for the current page
        const prefix = `auto:${pageScopeKey}::`;
        if (!key.startsWith(prefix)) return;
        const path = key.slice(prefix.length);
        if (document.querySelector(`[data-themeable="${CSS.escape(key)}"]`)) return;
        const el = resolveStructuralPath(path);
        if (el) el.setAttribute("data-themeable", key);
      });
    };
    reapply();
    const obs = new MutationObserver(() => reapply());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [tc.all, pageScopeKey]);

  // Paint a [data-tk-selected] marker on the currently selected element so
  // CSS can give it a persistent highlight (and clear it from any old one).
  useEffect(() => {
    document.querySelectorAll("[data-tk-selected]").forEach(el => {
      el.removeAttribute("data-tk-selected");
    });
    if (!selectedElement) return;
    const apply = () => {
      const el = document.querySelector(`[data-themeable="${CSS.escape(selectedElement)}"]`);
      if (el) el.setAttribute("data-tk-selected", "true");
    };
    apply();
    // Re-apply if React re-renders and strips the attribute
    const obs = new MutationObserver(() => {
      if (!document.querySelector("[data-tk-selected]")) apply();
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-themeable"] });
    return () => obs.disconnect();
  }, [selectedElement]);

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
    // canvas
    canvasElements: cl.elements,
    addCanvasElement: cl.addElement,
    updateCanvasElement: cl.updateElement,
    removeCanvasElement: cl.removeElement,
    reorderCanvasElements: cl.reorderElements,
    selectedWidgetId, setSelectedWidgetId,
    canvasHasDraft: cl.hasDraft,
    saveCanvas: cl.saveAll,
    discardCanvasDraft: cl.discardDraft,
  }), [tc, cl, editMode, panelOpen, selectedElement, selectedWidgetId]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
