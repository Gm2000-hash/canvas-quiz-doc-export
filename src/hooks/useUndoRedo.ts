import { useState, useCallback, useRef } from 'react';

export function useUndoRedo<T>(initial: T | null) {
  const [state, setState] = useState<T | null>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const set = useCallback((next: T | null | ((prev: T | null) => T | null)) => {
    setState(prev => {
      const resolved = typeof next === 'function' ? (next as (p: T | null) => T | null)(prev) : next;
      if (prev != null) {
        pastRef.current = [...pastRef.current, prev];
        futureRef.current = [];
      }
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (pastRef.current.length === 0) return prev;
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      if (prev != null) futureRef.current = [prev, ...futureRef.current];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (futureRef.current.length === 0) return prev;
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      if (prev != null) pastRef.current = [...pastRef.current, prev];
      return next;
    });
  }, []);

  const reset = useCallback((value: T | null) => {
    pastRef.current = [];
    futureRef.current = [];
    setState(value);
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
