import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CanvasElement } from "@/lib/canvas-types";

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
