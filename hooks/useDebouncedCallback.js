import { useCallback, useEffect, useRef } from "react";

/** Debounced function with flush() and cancel(). Always calls the latest callback. */
export function useDebouncedCallback(fn, delay) {
  const fnRef = useRef(fn);
  const timer = useRef(null);
  const pending = useRef(null);
  useEffect(() => { fnRef.current = fn; });
  const cancel = useCallback(() => { clearTimeout(timer.current); timer.current = null; pending.current = null; }, []);
  const flush = useCallback(() => {
    if (!timer.current) return;
    clearTimeout(timer.current); timer.current = null;
    const args = pending.current; pending.current = null;
    return fnRef.current(...args);
  }, []);
  const call = useCallback((...args) => {
    pending.current = args;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; fnRef.current(...pending.current); pending.current = null; }, delay);
  }, [delay]);
  useEffect(() => cancel, [cancel]);
  return { call, flush, cancel };
}
