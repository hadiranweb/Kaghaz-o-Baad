import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMotion } from './MotionContext';

export interface EditorialDockItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

type SylvaDockState = 'idle' | 'nearby' | 'focused' | 'active' | 'touch-fallback';

type DockPoint = { x: number; y: number };
type DockRect = { x: number; y: number };

interface EditorialDockProps {
  items: EditorialDockItem[];
  ariaLabel: string;
  className?: string;
}

/**
 * Source-level port of MengTo/sylva dock proximity behavior.
 * Geometry is cached outside render; pointer writes are coalesced into one rAF.
 * Keyboard, touch and reduced-motion paths intentionally remain stable.
 */
export function EditorialDock({ items, ariaLabel, className = '' }: EditorialDockProps) {
  const dockRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const geometryRef = useRef<DockRect[]>([]);
  const pointRef = useRef<DockPoint | null>(null);
  const rafRef = useRef<number | null>(null);
  const [pointer, setPointer] = useState<DockPoint | null>(null);
  const [dockState, setDockState] = useState<SylvaDockState>('idle');
  const { reducedMotion, pageVisible } = useMotion();

  const canMagnify = !reducedMotion && pageVisible;

  const measure = useCallback(() => {
    geometryRef.current = itemRefs.current.map((item) => {
      if (!item) return { x: -Infinity, y: -Infinity };
      const rect = item.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
  }, []);

  useEffect(() => {
    measure();
    const observer = typeof ResizeObserver !== 'undefined' && dockRef.current
      ? new ResizeObserver(measure)
      : null;
    if (observer && dockRef.current) observer.observe(dockRef.current);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items.length, measure]);

  useEffect(() => () => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || !canMagnify) {
      if (event.pointerType === 'touch') setDockState('touch-fallback');
      return;
    }
    pointRef.current = { x: event.clientX, y: event.clientY };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const nextPoint = pointRef.current;
      setPointer(nextPoint);
      if (!nextPoint) return;
      const nearest = geometryRef.current.reduce((best, rect, index) => {
        const distance = Math.hypot(nextPoint.x - rect.x, nextPoint.y - rect.y);
        return distance < best.distance ? { distance, index } : best;
      }, { distance: Infinity, index: -1 });
      setDockState(nearest.distance < 180 ? 'nearby' : 'idle');
    });
  };

  const clearPointer = () => {
    pointRef.current = null;
    setPointer(null);
    if (canMagnify) setDockState('idle');
  };

  return (
    <nav
      ref={dockRef}
      className={`kb-editorial-dock ${className}`}
      aria-label={ariaLabel}
      data-sylva-state={dockState}
      onPointerMove={handlePointerMove}
      onPointerLeave={clearPointer}
    >
      {items.map((item, index) => {
        const rect = geometryRef.current[index];
        const distance = pointer && rect
          ? Math.hypot(pointer.x - rect.x, pointer.y - rect.y)
          : Infinity;
        const influence = canMagnify ? Math.max(0, 1 - Math.min(distance / 180, 1)) : 0;
        const scale = 1 + influence * 0.12;
        return (
          <Link
            key={item.id}
            ref={(node) => { itemRefs.current[index] = node; }}
            to={item.href}
            className={`kb-dock-item ${item.active ? 'is-active' : ''}`}
            aria-current={item.active ? 'page' : undefined}
            data-dock-state={item.active ? 'active' : dockState}
            onFocus={() => setDockState(item.active ? 'active' : 'focused')}
            onBlur={() => { if (canMagnify) setDockState('idle'); }}
            style={{ '--dock-scale': scale, '--dock-influence': influence } as React.CSSProperties}
          >
            <span className="kb-dock-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
