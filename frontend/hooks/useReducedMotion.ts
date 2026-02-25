// Frontend/hooks/useReducedMotion.ts
// Reads the `prefers-reduced-motion: reduce` media query.
// Returns true when the OS/browser requests reduced motion.
// Used by all animation components to suppress transform-based effects.
//
// Safe for SSR: defaults to false on the server (no window access).
// Updates reactively if the user changes their system preference at runtime.

'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    setReduced(mql.matches); // sync on mount in case SSR default differs
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}