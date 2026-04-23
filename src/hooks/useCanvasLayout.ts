import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CanvasElement } from "@/lib/canvas-types";
import type { CustomWidget } from "@/lib/customization-types";

const LOCAL_KEY = "tk-canvas-layouts-draft";

type Draft = Record<string, CanvasElement[]>; // scope_key -> elements

function loadDraft(): Draft {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function saveDraft(d: Draft) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

export function useCanvasLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const scopeKey = location.pathname;

  const [serverMap, setServerMap] = useState<Record<string, CanvasElement[]>>({});
  const [draftMap, setDraftMap] = useState<Draft>(() => loadDraft());
  const [loading, setLoading] = useState(true);

  // Load all canvas layouts for this user (small payload, indexed by scope_key)
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("canvas_layouts")
        .select("scope_key, elements")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) { console.error("Load canvas layouts failed:", error); setLoading(false); return; }
      const map: Record<string, CanvasElement[]> = {};
      (data || []).forEach((row: any) => {
        map[row.scope_key] = (row.elements as CanvasElement[]) || [];
      });
      setServerMap(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Migrate legacy widgets from theme_customizations to canvas_layouts (one-time per route).
  useEffect(() => {
    if (!user || loading) return;
    if ((serverMap[scopeKey]?.length ?? 0) > 0) return;
    if ((draftMap[scopeKey]?.length ?? 0) > 0) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("theme_customizations")
        .select("widgets")
        .eq("user_id", user.id)
        .eq("scope_type", "page")
        .eq("scope_key", scopeKey)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const legacyWidgets = ((data.widgets as CustomWidget[] | null) || []).filter(Boolean);
      if (legacyWidgets.length === 0) return;
      const migrated = legacyWidgets.map((w, i) => migrateLegacyWidget(w, i));
      setDraftMap(prev => {
        if ((prev[scopeKey]?.length ?? 0) > 0) return prev;
        const next = { ...prev, [scopeKey]: migrated };
        saveDraft(next);
        return next;
      });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, scopeKey, loading]);

  // Merged: draft overrides server
  const elements: CanvasElement[] =
    draftMap[scopeKey] ?? serverMap[scopeKey] ?? [];

  const setElements = useCallback((next: CanvasElement[]) => {
    setDraftMap(prev => {
      const merged = { ...prev, [scopeKey]: next };
      saveDraft(merged);
      return merged;
    });
  }, [scopeKey]);

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setElements(elements.map(e => e.id === id ? { ...e, ...patch } : e));
  }, [elements, setElements]);

  const addElement = useCallback((el: CanvasElement) => {
    setElements([...elements, el]);
  }, [elements, setElements]);

  const removeElement = useCallback((id: string) => {
    setElements(elements.filter(e => e.id !== id));
  }, [elements, setElements]);

  const reorderElements = useCallback((orderedIds: string[]) => {
    // top of list = front-most. zIndex = (n - 1 - index)
    const map = new Map(elements.map(e => [e.id, e]));
    const next = orderedIds
      .map((id, i) => {
        const e = map.get(id);
        if (!e) return null;
        return { ...e, zIndex: orderedIds.length - i };
      })
      .filter(Boolean) as CanvasElement[];
    setElements(next);
  }, [elements, setElements]);

  const hasDraft = Object.keys(draftMap).length > 0;

  const saveAll = useCallback(async () => {
    if (!user) return { ok: false, error: "Not authenticated" };
    const rows = Object.entries(draftMap).map(([k, v]) => ({
      user_id: user.id,
      scope_key: k,
      elements: v as any,
    }));
    if (rows.length === 0) return { ok: true };
    const { error } = await supabase
      .from("canvas_layouts")
      .upsert(rows, { onConflict: "user_id,scope_key" });
    if (error) return { ok: false, error: error.message };
    setServerMap(prev => {
      const next = { ...prev };
      Object.entries(draftMap).forEach(([k, v]) => { next[k] = v; });
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
    scopeKey,
    elements,
    setElements,
    addElement,
    updateElement,
    removeElement,
    reorderElements,
    saveAll,
    discardDraft,
    hasDraft,
  };
}

function migrateLegacyWidget(widget: CustomWidget, index: number): CanvasElement {
  const base: CanvasElement = {
    id: widget.id,
    type: widget.type,
    x: 10,
    y: 8 + index * 18,
    width: parseLegacyWidth(widget.width),
    height: widget.type === "image" || widget.type === "embed" ? 28 : widget.type === "divider" ? 2 : widget.type === "spacer" ? Math.max(4, (widget.height || 24) / 8) : 10,
    rotation: 0,
    zIndex: index + 1,
  };

  switch (widget.type) {
    case "image":
      return { ...base, src: widget.content || "", bg: widget.bg, color: widget.color, opacity: 1 };
    case "text":
      return { ...base, content: widget.content || "", align: widget.align, color: widget.color, bg: widget.bg, fontSize: 16 };
    case "heading":
      return { ...base, content: widget.content || "Heading", level: widget.level || 2, align: widget.align, color: widget.color, bg: widget.bg, fontSize: 32, bold: true };
    case "divider":
      return { ...base, color: widget.color };
    case "spacer":
      return { ...base, bg: widget.bg, height_px: widget.height || 24 };
    case "embed":
      return { ...base, content: widget.content || "" };
  }
}

function parseLegacyWidth(width?: string): number {
  if (!width) return 40;
  const pct = width.match(/^(\d+(?:\.\d+)?)%$/);
  if (pct) return Number(pct[1]);
  const px = width.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return Math.min(90, Math.max(10, Number(px[1]) / 12));
  return 40;
}
