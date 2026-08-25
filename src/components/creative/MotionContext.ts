import { createContext, useContext } from 'react';
import type { MotionTokens } from './MotionProvider';

export type MotionContextValue = {
  reducedMotion: boolean;
  pageVisible: boolean;
  enabled: boolean;
  tokens: MotionTokens;
};

export const MotionContext = createContext<MotionContextValue>({
  reducedMotion: false,
  pageVisible: true,
  enabled: true,
  tokens: {
    duration: { instant: 0, fast: 180, base: 420, slow: 760 },
    distance: { subtle: 8, base: 20, dramatic: 48 },
    blur: { subtle: 4, base: 12 },
    stagger: { tight: 40, base: 70, loose: 120 },
  },
});

export function useMotion() {
  return useContext(MotionContext);
}
