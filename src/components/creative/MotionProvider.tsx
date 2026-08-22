import { useMemo, type PropsWithChildren } from 'react';
import { usePageVisibility, useReducedMotion } from '../../hooks/useCreativeInteraction';
import { MotionContext } from './MotionContext';

export type MotionTokens = {
  duration: { instant: number; fast: number; base: number; slow: number };
  distance: { subtle: number; base: number; dramatic: number };
  blur: { subtle: number; base: number };
  stagger: { tight: number; base: number; loose: number };
};

const defaultTokens: MotionTokens = {
  duration: { instant: 0, fast: 180, base: 420, slow: 760 },
  distance: { subtle: 8, base: 20, dramatic: 48 },
  blur: { subtle: 4, base: 12 },
  stagger: { tight: 40, base: 70, loose: 120 },
};

export function MotionProvider({ children }: PropsWithChildren) {
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisibility();
  const value = useMemo(() => ({
    reducedMotion,
    pageVisible,
    enabled: !reducedMotion && pageVisible,
    tokens: defaultTokens,
  }), [pageVisible, reducedMotion]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export { useMotion } from './MotionContext';
