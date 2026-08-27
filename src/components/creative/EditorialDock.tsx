import { Link } from 'react-router-dom';

export interface EditorialDockItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
}

interface EditorialDockProps {
  items: EditorialDockItem[];
  ariaLabel: string;
  className?: string;
}

/**
 * Stable primary navigation dock.
 *
 * Navigation labels must not magnify on pointer movement: transforms expand their
 * visual bounds without reserving layout space and caused neighbouring labels to
 * overlap. Hover is intentionally a color/surface affordance; keyboard focus is
 * provided by the CSS :focus-visible rule.
 */
export function EditorialDock({ items, ariaLabel, className = '' }: EditorialDockProps) {
  return (
    <nav className={`kb-editorial-dock ${className}`} aria-label={ariaLabel}>
      {items.map((item, index) => (
        <Link
          key={item.id}
          to={item.href}
          className={`kb-dock-item ${item.active ? 'is-active' : ''}`}
          aria-current={item.active ? 'page' : undefined}
        >
          <span className="kb-dock-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
