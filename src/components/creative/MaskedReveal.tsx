import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useMotion } from './MotionContext';

type MaskedRevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  once?: boolean;
};

export function MaskedReveal({ children, as: Tag = 'div', className = '', delay = 0, once = true }: MaskedRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const { reducedMotion } = useMotion();

  useEffect(() => {
    if (reducedMotion || !('IntersectionObserver' in window) || !ref.current) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      if (once) observer.disconnect();
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [once, reducedMotion]);

  return (
    <Tag
      ref={ref}
      className={`kb-masked-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      <span className="kb-masked-reveal__content">{children}</span>
    </Tag>
  );
}
