import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useReducedMotion } from '@/hooks/useCreativeInteraction';

export function RevealOnScroll({ children, className = '', as: Tag = 'div' }: PropsWithChildren<{ className?: string; as?: 'div' | 'section' | 'article' | 'li' }>) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return <Tag ref={ref as never} className={`creative-reveal ${visible ? 'is-visible' : ''} ${className}`}>{children}</Tag>;
}
