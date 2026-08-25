import type { ProgressItem } from './aboutProgressData';

type ProgressDockProps = {
  items: ProgressItem[];
  locale: 'fa' | 'en';
  activeId: string;
  compact?: boolean;
};

export function ProgressDock({ items, locale, activeId, compact = false }: ProgressDockProps) {
  const isFa = locale === 'fa';

  return (
    <nav
      aria-label={isFa ? 'فهرست بخش‌های صفحه' : 'Page sections'}
      className={`kb-progress-dock ${compact ? 'kb-progress-dock-compact' : ''}`}
    >
      <div className="kb-progress-track" aria-hidden="true">
        <span style={{ height: `${Math.max(8, ((items.findIndex((item) => item.id === activeId) + 1) / items.length) * 100)}%` }} />
      </div>
      <ol className="kb-progress-list">
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? 'step' : undefined}
                className={`kb-progress-link ${active ? 'is-active' : ''}`}
              >
                <span className="kb-progress-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{isFa ? item.fa : item.en}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

