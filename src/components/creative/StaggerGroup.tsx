import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { useMotion } from './MotionContext';

type StaggerGroupProps = {
  children: ReactNode;
  className?: string;
  step?: number;
  as?: 'div' | 'section' | 'ul';
};

export function StaggerGroup({ children, className = '', step = 70, as: Tag = 'div' }: StaggerGroupProps) {
  const { reducedMotion } = useMotion();
  const items = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child, {
      className: `${child.props.className ?? ''} kb-stagger-item`.trim(),
      style: {
        ...child.props.style,
        '--stagger-index': index,
        '--stagger-step': `${step}ms`,
      } as React.CSSProperties,
    });
  });

  return <Tag className={`kb-stagger-group ${reducedMotion ? 'is-reduced' : ''} ${className}`}>{items}</Tag>;
}
