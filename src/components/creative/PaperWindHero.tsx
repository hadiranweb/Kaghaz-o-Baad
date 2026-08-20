import { useEffect, useRef } from 'react';

type PaperWindHeroProps = {
  reducedMotion?: boolean;
};

export function PaperWindHero({ reducedMotion = false }: PaperWindHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const render = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      root.style.setProperty('--wind-x', `${currentX.toFixed(2)}px`);
      root.style.setProperty('--wind-y', `${currentY.toFixed(2)}px`);
      frame = requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
    };

    const reset = () => {
      targetX = 0;
      targetY = 0;
    };

    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', reset, { passive: true });
    frame = requestAnimationFrame(render);

    return () => {
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', reset);
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="kb-paper-wind-hero" aria-hidden="true">
      <span className="kb-paper kb-paper-one" />
      <span className="kb-paper kb-paper-two" />
      <span className="kb-paper kb-paper-three" />
      <span className="kb-wind-ring kb-wind-ring-one" />
      <span className="kb-wind-ring kb-wind-ring-two" />
      <span className="kb-kite-mark">
        <span className="kb-kite-body" />
        <span className="kb-kite-tail" />
      </span>
      <span className="kb-wind-caption">paper / wind / kite</span>
    </div>
  );
}
