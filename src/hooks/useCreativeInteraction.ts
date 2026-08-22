import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

export function usePointerIntent(enabled = true) {
  const [point, setPoint] = useState({ x: 0, y: 0, active: false });
  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({ x: ((event.clientX - rect.left) / rect.width - 0.5) * 2, y: ((event.clientY - rect.top) / rect.height - 0.5) * 2, active: true });
  }, [enabled]);
  const onPointerLeave = useCallback(() => setPoint((previous) => ({ ...previous, active: false })), []);
  return { point, onPointerMove, onPointerLeave };
}

export function useRafLoop(callback: (time: number) => void, enabled = true) {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  callbackRef.current = callback;
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const tick = (time: number) => {
      callbackRef.current(time);
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [enabled]);
}

type SwipeDirection = 'next' | 'previous';
type SwipeState = { startX: number; startY: number; pointerId: number } | null;

type SwipeOptions = {
  enabled?: boolean;
  threshold?: number;
  dominanceRatio?: number;
  onSwipe?: (direction: SwipeDirection, distance: number) => void;
};

export function useSwipeGesture({ enabled = true, threshold = 48, dominanceRatio = 1.15, onSwipe }: SwipeOptions = {}) {
  const stateRef = useRef<SwipeState>(null);
  const suppressClickRef = useRef(false);
  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType === 'mouse') return;
    stateRef.current = { startX: event.clientX, startY: event.clientY, pointerId: event.pointerId };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [enabled]);
  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = stateRef.current;
    stateRef.current = null;
    if (!enabled || !start || event.pointerType === 'mouse') return;
    const dx = event.clientX - start.startX;
    const dy = event.clientY - start.startY;
    const horizontal = Math.abs(dx);
    if (horizontal < threshold || horizontal < Math.abs(dy) * dominanceRatio) return;
    suppressClickRef.current = true;
    onSwipe?.(dx < 0 ? 'next' : 'previous', horizontal);
  }, [dominanceRatio, enabled, onSwipe, threshold]);
  const onPointerCancel = useCallback(() => { stateRef.current = null; }, []);
  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);
  return { onPointerDown, onPointerUp, onPointerCancel, onClickCapture };
}
