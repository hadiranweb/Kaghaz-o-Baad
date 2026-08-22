import { useMemo } from 'react';

type MarkdownReadonlyProps = {
  source?: string | null;
  className?: string;
  dir?: 'rtl' | 'ltr' | 'auto';
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let inCode = false;
  let code: string[] = [];
  let listOpen = false;
  const inline = (value: string) => escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noreferrer noopener">$1</a>');
  const closeList = () => { if (listOpen) { output.push('</ul>'); listOpen = false; } };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCode) { output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = []; }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (!line.trim()) { closeList(); return; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { closeList(); const level = heading[1].length; output.push(`<h${level}>${inline(heading[2])}</h${level}>`); return; }
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) { if (!listOpen) { output.push('<ul>'); listOpen = true; } output.push(`<li>${inline(item[1])}</li>`); return; }
    closeList();
    output.push(`<p>${inline(line)}</p>`);
  });
  closeList();
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return output.join('');
}

export function MarkdownReadonly({ source, className = '', dir = 'auto' }: MarkdownReadonlyProps) {
  const html = useMemo(() => renderMarkdown(source || ''), [source]);
  if (!source?.trim()) return <p className={`text-muted-foreground ${className}`}>No content available.</p>;
  return <div className={`prose-reading ${className}`} dir={dir} dangerouslySetInnerHTML={{ __html: html }} />;
}
