import { lazy, Suspense, useEffect, useState } from 'react';

const Toaster = lazy(() => import('./ui/toaster').then((module) => ({ default: module.Toaster })));
const Sonner = lazy(() => import('./ui/sonner').then((module) => ({ default: module.Toaster })));

export function DeferredNotifications() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => { if (!cancelled) setReady(true); }, { timeout: 1800 })
      : window.setTimeout(() => { if (!cancelled) setReady(true); }, 1200);
    return () => {
      cancelled = true;
      if (typeof schedule === 'number') window.clearTimeout(schedule);
      else window.cancelIdleCallback?.(schedule);
    };
  }, []);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
    </Suspense>
  );
}
