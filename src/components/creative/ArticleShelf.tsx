import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PropsWithChildren } from 'react';

export type ShelfPhase = 'idle' | 'focused' | 'opening' | 'open' | 'reading' | 'closing';

type ArticleShelfProps = PropsWithChildren<{
  direction?: 'ltr' | 'rtl';
  label: string;
}>;

export function ArticleShelf({ children, direction = 'ltr', label }: ArticleShelfProps) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<ShelfPhase>('idle');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const cards = useCallback(() => Array.from(shelfRef.current?.querySelectorAll<HTMLElement>('[data-shelf-card]') ?? []), []);
  const scrollCard = useCallback((offset: number) => {
    const items = cards();
    if (!items.length) return;
    const current = activeIndex ?? 0;
    const next = Math.min(Math.max(current + offset, 0), items.length - 1);
    setActiveIndex(next);
    setPhase('focused');
    items[next]?.focus({ preventScroll: true });
    items[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeIndex, cards]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) { event.preventDefault(); scrollCard(1); }
    if (event.key === backward) { event.preventDefault(); scrollCard(-1); }
    if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); cards()[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); const items = cards(); setActiveIndex(items.length - 1); items.at(-1)?.focus(); }
    if (event.key === 'Escape') setPhase('idle');
  };

  useEffect(() => {
    const node = shelfRef.current;
    if (!node) return;
    const onFocusIn = (event: FocusEvent) => {
      const card = (event.target as HTMLElement).closest('[data-shelf-card]');
      if (!card) return;
      setActiveIndex(cards().indexOf(card as HTMLElement));
      setPhase('focused');
    };
    const onPointerDown = (event: PointerEvent) => {
      const card = (event.target as HTMLElement).closest('[data-shelf-card]');
      if (card) setPhase('opening');
    };
    const onPointerUp = () => setPhase((previous) => previous === 'opening' ? 'open' : previous);
    node.addEventListener('focusin', onFocusIn);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointerup', onPointerUp);
    return () => {
      node.removeEventListener('focusin', onFocusIn);
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointerup', onPointerUp);
    };
  }, [cards]);

  return (
    <div
      ref={shelfRef}
      className="creative-shelf grid gap-6 md:grid-cols-2 lg:flex lg:flex-nowrap lg:gap-7 lg:overflow-x-auto lg:overscroll-x-contain lg:pb-4"
      role="list"
      aria-label={label}
      aria-describedby="article-shelf-instructions"
      data-shelf-phase={phase}
      data-shelf-active={activeIndex ?? undefined}
      dir={direction}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setPhase('idle')}
    >
      {children}
      <span id="article-shelf-instructions" className="sr-only">
        Use the arrow keys to move between articles, Home and End to jump to the shelf boundaries, and Enter to open a focused action.
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {activeIndex === null ? '' : `Article ${activeIndex + 1} focused`}
      </span>
    </div>
  );
}
