/**
 * Tracks the most recent quiz push to Canvas so the Canvas workspace can offer
 * one-click jumps to the matching Results and Analytics views.
 */

const STORAGE_KEY = "canvas_last_push";
export const CANVAS_LAST_PUSH_EVENT = "canvas-last-push-updated";

export interface CanvasPushTarget {
  courseId: string;
  courseName?: string;
  quizId: string;
}

export interface CanvasLastPush {
  quizTitle: string;
  questionCount: number;
  pushedAt: string;
  targets: CanvasPushTarget[];
}

export function getLastCanvasPush(): CanvasLastPush | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanvasLastPush;
    if (!parsed?.targets?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastCanvasPush(push: CanvasLastPush) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(push));
    window.dispatchEvent(new CustomEvent(CANVAS_LAST_PUSH_EVENT));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function clearLastCanvasPush() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CANVAS_LAST_PUSH_EVENT));
  } catch {
    /* ignore */
  }
}

/** Deep link into the unified Canvas workspace for a specific pushed quiz. */
export function canvasWorkspaceLink(tab: "results" | "analytics", target: CanvasPushTarget) {
  const params = new URLSearchParams({ tab, courseId: target.courseId, quizId: target.quizId });
  return `/canvas?${params.toString()}`;
}
