import { ReactNode, useEffect } from 'react';
import { setNoIndexMetadata } from '@/lib/seo';

export function SeoGuard({ children }: { children: ReactNode }) {
  useEffect(() => setNoIndexMetadata(), []);
  return <>{children}</>;
}
