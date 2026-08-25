import { lazy, Suspense, type ComponentProps } from 'react';

const MarkdownEditor = lazy(() => import('@uiw/react-md-editor'));

type LazyMarkdownEditorProps = ComponentProps<typeof MarkdownEditor>;

export function LazyMarkdownEditor(props: LazyMarkdownEditorProps) {
  return (
    <Suspense fallback={<div className="min-h-[150px] rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground" role="status">Loading editor…</div>}>
      <MarkdownEditor {...props} />
    </Suspense>
  );
}
