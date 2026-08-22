import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export interface EditorialDockItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

interface EditorialDockProps {
  items: EditorialDockItem[];
  ariaLabel: string;
  className?: string;
}

/**
 * Source-level port of MengTo/sylva dock proximity behavior.
 * Fine pointers receive bounded magnification; keyboard and touch remain plain navigation.
 */
export function EditorialDock({ items, ariaLabel, className = '' }: EditorialDockProps) {
  const dockRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [canMagnify, setCanMagnify] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanMagnify(query.matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!canMagnify || event.pointerType === 'touch') return;
    setPointer({ x: event.clientX, y: event.clientY });
  };

  const clearPointer = () => setPointer(null);

  return (
    <nav
      ref={dockRef}
      className={`kb-editorial-dock ${className}`}
      aria-label={ariaLabel}
      onPointerMove={handlePointerMove}
      onPointerLeave={clearPointer}
    >
      {items.map((item, index) => {
        const rect = itemRefs.current[index]?.getBoundingClientRect();
        const distance = pointer && rect
          ? Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2))
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
