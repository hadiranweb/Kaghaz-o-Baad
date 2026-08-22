import { lazy, Suspense, useEffect, useState } from 'react';

const AmbientPaperParticles = lazy(() => import('./AmbientPaperParticles').then((module) => ({ default: module.AmbientPaperParticles })));

export function DeferredAmbientParticles({ count = 30 }: { count?: number }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reveal = () => { if (!cancelled) setReady(true); };
    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(reveal, { timeout: 2200 })
      : window.setTimeout(reveal, 1400);
    return () => {
      cancelled = true;
      if (typeof schedule === 'number') window.clearTimeout(schedule);
      else window.cancelIdleCallback?.(schedule);
    };
  }, []);

  if (!ready) return null;
  return <Suspense fallback={null}><AmbientPaperParticles count={count} /></Suspense>;
}
