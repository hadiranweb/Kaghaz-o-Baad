import { useEffect, useState } from 'react';

export interface ScrollChapter { id: string; label: string; }

export function ScrollChapterProgress({ chapters, className = '' }: { chapters: ScrollChapter[]; className?: string }) {
  const [activeId, setActiveId] = useState(chapters[0]?.id || '');

  useEffect(() => {
    const elements = chapters.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!elements.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveId(visible[0].target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.1, 0.35, 0.7] });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <nav aria-label="بخش‌های صفحه" className={`creative-chapter-progress ${className}`}>
      {chapters.map((chapter, index) => (
        <a key={chapter.id} href={`#${chapter.id}`} className={activeId === chapter.id ? 'is-active' : ''} aria-current={activeId === chapter.id ? 'step' : undefined}>
          <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span>{chapter.label}</span>
        </a>
      ))}
    </nav>
  );
}
