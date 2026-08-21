import { useEffect, useRef, useState, type PropsWithChildren } from 'react';

export function RevealOnScroll({ children, className = '', as: Tag = 'div' }: PropsWithChildren<{ className?: string; as?: 'div' | 'section' | 'article' | 'li' }>) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
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
  }, []);

  return <Tag ref={ref as never} className={`creative-reveal ${visible ? 'is-visible' : ''} ${className}`}>{children}</Tag>;
}
