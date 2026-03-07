import { useState, useCallback } from 'react';
import type { CanvasConfig } from '@/lib/canvas-api';

const STORAGE_KEY = 'canvas_config';

export function useCanvasConfig() {
  const [config, setConfigState] = useState<CanvasConfig | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setConfig = useCallback((newConfig: CanvasConfig | null) => {
    setConfigState(newConfig);
    if (newConfig) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { config, setConfig, isConfigured: !!config };
}
