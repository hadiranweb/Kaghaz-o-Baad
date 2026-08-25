import { useEffect, useMemo, useRef, useState } from 'react';

interface StaggeredWordRevealProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  disabled?: boolean;
}

/**
 * Port of MengTo/Skills staggered-word-reveal.
 * Source contract: 20px rise, 0.8s expo-like ease, 70ms word stagger, once-only IO.
 * The complete sentence remains available to assistive technology through aria-label.
 */
export function StaggeredWordReveal({ text, as = 'h1', className = '', disabled = false }: StaggeredWordRevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(disabled);
  const words = useMemo(() => text.split(/(\s+)/), [text]);

  useEffect(() => {
    if (disabled || !elementRef.current) {
      setIsVisible(true);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsVisible(true);
      observer.disconnect();
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [disabled]);

  const Tag = as;
  return (
    <Tag
      ref={elementRef as React.RefObject<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      className={`kb-word-reveal ${isVisible ? 'is-visible' : ''} ${className}`}
      aria-label={text}
      data-source="MengTo/Skills/staggered-word-reveal"
    >
      {words.map((part, index) => part.trim() ? (
        <span key={`${part}-${index}`} className="kb-word-reveal__word" aria-hidden="true" style={{ '--word-index': index } as React.CSSProperties}>{part}</span>
      ) : <span key={`space-${index}`} aria-hidden="true">{part}</span>)}
    </Tag>
  );
}
