import { useCallback, useEffect, useId, useReducer, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type PropsWithChildren } from 'react';
import { useMotion } from './MotionContext';
import { shelfReducer, type ShelfState } from './shelf-state';

type ArticleShelfProps = PropsWithChildren<{ direction?: 'ltr' | 'rtl'; label: string }>;

const interactiveSelector = 'a, button, input, select, textarea, [role="button"], [role="link"]';

function isInteractiveEventTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(interactiveSelector));
}

export function ArticleShelf({ children, direction = 'ltr', label }: ArticleShelfProps) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const instructionsId = useId();
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; index: number } | null>(null);
  const { reducedMotion } = useMotion();
  const [state, dispatch] = useReducer(shelfReducer, { phase: 'idle', activeIndex: null, intentId: 0 } satisfies ShelfState);

  const cards = useCallback(() => Array.from(shelfRef.current?.querySelectorAll<HTMLElement>('[data-shelf-card]') ?? []), []);
  const focusCard = useCallback((index: number, behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth') => {
    const items = cards();
    if (!items.length) return;
    const next = Math.min(Math.max(index, 0), items.length - 1);
    dispatch({ type: 'FOCUS_CARD', index: next });
    items[next]?.focus({ preventScroll: true });
    items[next]?.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
  }, [cards, reducedMotion]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Native controls inside a card must retain their own click and Enter behavior.
    if (isInteractiveEventTarget(event.target)) return;
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const index = state.activeIndex ?? 0;
    if (event.key === forward) { event.preventDefault(); focusCard(index + 1); }
    else if (event.key === backward) { event.preventDefault(); focusCard(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusCard(0, 'auto'); }
    else if (event.key === 'End') { event.preventDefault(); focusCard(cards().length - 1, 'auto'); }
    else if (event.key === 'Enter') { event.preventDefault(); cards()[index]?.querySelector<HTMLElement>('a,button')?.click(); dispatch({ type: 'READ_START', index }); }
    else if (event.key === 'Escape') dispatch({ type: 'RESET' });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Do not capture a pointer that originates from a real link or control.
    // Otherwise the card animation can prevent the link from navigating.
    if (isInteractiveEventTarget(event.target)) return;
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-shelf-card]');
    if (!card) return;
    const index = cards().indexOf(card);
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, index };
    card.setPointerCapture?.(event.pointerId);
    dispatch({ type: 'POINTER_DOWN', index });
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => dispatch({ type: 'OPEN_SUCCESS', index }), reducedMotion ? 0 : 280);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = pointerRef.current;
    pointerRef.current = null;
    if (!pointer || pointer.id !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
    if (moved > 12) dispatch({ type: 'OPEN_CANCEL' });
  };

  useEffect(() => () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); }, []);

  return (
    <div
      ref={shelfRef}
      className="creative-shelf grid gap-6 md:grid-cols-2 lg:flex lg:flex-nowrap lg:gap-7 lg:overflow-x-auto lg:overscroll-x-contain lg:pb-4"
      role="list"
      aria-label={label}
      aria-describedby={instructionsId}
      data-shelf-phase={state.phase}
      data-shelf-active={state.activeIndex ?? undefined}
      data-shelf-intent={state.intentId}
      dir={direction}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerRef.current = null; dispatch({ type: 'OPEN_CANCEL' }); }}
      onMouseLeave={() => dispatch({ type: 'RESET' })}
    >
      {children}
      <span id={instructionsId} className="sr-only">Use arrow keys, Home and End to move between articles. Press Enter to open the focused article. Press Escape to cancel.</span>
      <span className="sr-only" role="status" aria-live="polite">{state.activeIndex === null ? '' : `Article ${state.activeIndex + 1} ${state.phase}`}</span>
    </div>
  );
}
