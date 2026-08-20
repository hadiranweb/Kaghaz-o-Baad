import { useEffect, useState } from 'react';

export type ProgressItem = {
  id: string;
  fa: string;
  en: string;
};

export const aboutProgressItems: ProgressItem[] = [
  { id: 'problem', fa: 'مسئله و راه‌حل', en: 'Problem and solution' },
  { id: 'workflow', fa: 'سه گام', en: 'Three steps' },
  { id: 'benefits', fa: 'مزیت‌ها', en: 'Benefits' },
  { id: 'audiences', fa: 'مخاطبان', en: 'Audiences' },
  { id: 'faq', fa: 'پرسش‌ها', en: 'FAQ' },
  { id: 'technical', fa: 'کالبد فنی', en: 'Technical details' },
];

export function useActiveSection(items: ProgressItem[]) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.2, 0.6] },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  return activeId;
}
