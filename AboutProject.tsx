import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

type Section = {
  id: string;
  section_key: string;
  title_en: string;
  title_fa: string;
  body_en: string;
  body_fa: string;
  order_num: number;
};

export default function AboutProject() {
  const { locale } = useLanguage();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('project_description')
        .select('*')
        .order('order_num', { ascending: true });
      setSections((data as Section[]) || []);
      setLoading(false);
    })();
  }, []);

  const pageTitle = locale === 'fa' ? 'شرح پروژه — کاغذ و باد' : 'Project Description — Kaghaz-o-Baad';
  const pageDesc = locale === 'fa'
    ? 'شرح کامل پروژه کاغذ و باد: هدف، کاربران، دامنه، معماری، طرحواره داده، APIها و قوانین پروژه.'
    : 'Full description of Kaghaz-o-Baad: purpose, audience, scope, architecture, schema, APIs, and project rules.';

  useEffect(() => {
    document.title = pageTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', pageDesc);
  }, [pageTitle, pageDesc]);

  return (
    <div className="min-h-screen py-10 md:py-14" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="glass-surface rounded-2xl p-3">
                <FileText className="h-6 w-6 text-foreground/80" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {locale === 'fa' ? 'شرح پروژه' : 'Project Description'}
            </h1>
            <p className="text-foreground/60 mt-3 text-sm md:text-base font-light">
              {locale === 'fa'
                ? 'مرجع کامل برای درک این پروژه — برای انسان‌ها و هوش مصنوعی'
                : 'Complete reference to understand this project — for humans and AI'}
            </p>
          </header>

          {loading ? (
            <div className="text-center text-foreground/50 py-12">…</div>
          ) : (
            <div className="space-y-5">
              {sections.map((s) => {
                const title = locale === 'fa' ? s.title_fa : s.title_en;
                const body = locale === 'fa' ? s.body_fa : s.body_en;
                return (
                  <Card key={s.id} className="glass-surface">
                    <CardHeader>
                      <CardTitle className="text-xl md:text-2xl font-semibold">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-semibold prose-p:font-light prose-li:font-light prose-strong:text-foreground prose-code:text-foreground prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown>{body}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
