// Coordinates pausing Canvas API calls on a 401, prompting the user for a new
// token, and resuming the original request transparently.
//
// Flow:
//   1. canvasRequest() catches a 401 and calls `requestTokenRefresh(currentConfig)`.
//   2. That dispatches a `canvas-token-refresh-request` event picked up by the
//      <CanvasTokenRefreshDialog/> mounted at the app shell level.
//   3. The dialog collects a new token from the user, validates it, persists it,
//      and calls `resolveTokenRefresh(newConfig)` (or `rejectTokenRefresh()`).
//   4. canvasRequest() retries the original call once with the new credentials.
//
// All in-flight 401s share a single prompt — concurrent failures wait on the
// same promise instead of stacking dialogs.

import type { CanvasConfig } from './canvas-api';

export const STORAGE_KEY = 'canvas_config';
export const REFRESH_REQUEST_EVENT = 'canvas-token-refresh-request';

let pending: Promise<CanvasConfig> | null = null;
let resolver: ((cfg: CanvasConfig) => void) | null = null;
let rejecter: ((err: Error) => void) | null = null;

export interface RefreshRequestDetail {
  currentConfig: CanvasConfig | null;
}

export function requestTokenRefresh(currentConfig: CanvasConfig | null): Promise<CanvasConfig> {
  if (pending) return pending;

  pending = new Promise<CanvasConfig>((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });

  // Defer dispatch so listeners mounted in the same tick still receive it.
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent<RefreshRequestDetail>(REFRESH_REQUEST_EVENT, {
        detail: { currentConfig },
      })
    );
  });

  return pending;
}

export function resolveTokenRefresh(newConfig: CanvasConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  } catch {
    /* ignore */
  }
  resolver?.(newConfig);
  reset();
}

export function rejectTokenRefresh(reason: string = 'Token refresh cancelled') {
  rejecter?.(new Error(reason));
  reset();
}

function reset() {
  pending = null;
  resolver = null;
  rejecter = null;
}
