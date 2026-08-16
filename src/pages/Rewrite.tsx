import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPublicArticles, rewriteArticle, backendRequest } from '@/lib/backend-api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Save, Wand2 } from 'lucide-react';

interface ArticleOption {
  id: string;
  title_fa: string;
  title_en: string;
  summary_fa: string | null;
  summary_en: string | null;
}

export default function Rewrite() {
  const { user, loading: authLoading } = useAuth();
  const { locale, direction } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isFa = locale === 'fa';

  const [mode, setMode] = useState<'existing' | 'custom'>('existing');
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string>('');
  const [customText, setCustomText] = useState('');

  const [tone, setTone] = useState('formal');
  const [targetLang, setTargetLang] = useState<'fa' | 'en'>(isFa ? 'fa' : 'en');
  const [length, setLength] = useState('medium');
  const [customPrompt, setCustomPrompt] = useState('');

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    listPublicArticles({ limit: 50 })
      .then(({ articles: data }) => setArticles(data as ArticleOption[]))
      .catch((error) => console.error('Error loading rewrite sources:', error));
  }, []);

  const sourceText = useMemo(() => {
    if (mode === 'custom') return customText.trim();
    const a = articles.find((x) => x.id === selectedArticle);
    if (!a) return '';
    const title = isFa ? a.title_fa : a.title_en;
    const summary = isFa ? a.summary_fa : a.summary_en;
    return [title, summary].filter(Boolean).join('\n\n');
  }, [mode, customText, articles, selectedArticle, isFa]);

  const handleGenerate = async () => {
    if (sourceText.length < 30) {
      toast({
        variant: 'destructive',
        title: isFa ? 'متن ناکافی' : 'Input too short',
        description: isFa ? 'حداقل ۳۰ کاراکتر لازم است' : 'At least 30 characters required',
      });
      return;
    }
    setGenerating(true);
    setResult('');
    try {
      const data = await rewriteArticle({ source: sourceText, tone, targetLang, length, customPrompt });
      setResult(data.content);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: isFa ? 'خطا در بازنویسی' : 'Rewrite failed',
        description: e?.message ?? String(e),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    toast({ title: isFa ? 'کپی شد' : 'Copied' });
  };

  const handleSaveDraft = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      const slug = `rewrite-${Date.now()}`;
      const firstLine = result.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').slice(0, 120) ?? 'Untitled';
      await backendRequest('/articles', {
        method: 'POST',
        body: JSON.stringify({
          slug,
          titleFa: firstLine,
          titleEn: firstLine,
          contentFa: targetLang === 'fa' ? result : '',
          contentEn: targetLang === 'en' ? result : '',
        }),
      });
      toast({
        title: isFa ? 'ذخیره شد' : 'Saved',
        description: isFa ? 'به عنوان پیش‌نویس ذخیره شد' : 'Saved as draft',
      });
      navigate('/dashboard');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: isFa ? 'خطا در ذخیره' : 'Save failed',
        description: e?.message ?? String(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const toneOptions = [
    { value: 'formal', label: isFa ? 'رسمی' : 'Formal' },
    { value: 'friendly', label: isFa ? 'صمیمی' : 'Friendly' },
    { value: 'humorous', label: isFa ? 'طنز' : 'Humorous' },
    { value: 'poetic', label: isFa ? 'شاعرانه' : 'Poetic' },
    { value: 'journalistic', label: isFa ? 'خبری' : 'Journalistic' },
    { value: 'educational', label: isFa ? 'آموزشی' : 'Educational' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl" dir={direction}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-primary" />
          {isFa ? 'بازنویسی مقاله' : 'Article Rewriter'}
        </h1>
        <p className="text-muted-foreground">
          {isFa
            ? 'یک مقاله را با لحن، طول و زبان دلخواه از نو بنویسید'
            : 'Rewrite an article with a custom tone, length, and language'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isFa ? 'منبع' : 'Source'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'custom')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">
                  {isFa ? 'از سایت' : 'From site'}
                </TabsTrigger>
                <TabsTrigger value="custom">
                  {isFa ? 'متن دلخواه' : 'Custom text'}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="mt-4">
                <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                  <SelectTrigger>
                    <SelectValue placeholder={isFa ? 'یک مقاله انتخاب کنید' : 'Select an article'} />
                  </SelectTrigger>
                  <SelectContent>
                    {articles.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {isFa ? a.title_fa : a.title_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedArticle && (
                  <div className="mt-3 p-3 rounded-md bg-muted text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {sourceText}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="custom" className="mt-4">
                <Textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={isFa ? 'متن مقاله را اینجا بچسبانید...' : 'Paste your article text here...'}
                  rows={10}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {customText.length} / 20000
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isFa ? 'تنظیمات' : 'Options'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{isFa ? 'لحن' : 'Tone'}</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {toneOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isFa ? 'زبان مقصد' : 'Target language'}</Label>
              <Select value={targetLang} onValueChange={(v) => setTargetLang(v as 'fa' | 'en')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fa">فارسی</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isFa ? 'طول خروجی' : 'Output length'}</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">{isFa ? 'کوتاه (~۱۵۰)' : 'Short (~150)'}</SelectItem>
                  <SelectItem value="medium">{isFa ? 'متوسط (~۴۰۰)' : 'Medium (~400)'}</SelectItem>
                  <SelectItem value="long">{isFa ? 'بلند (~۸۰۰)' : 'Long (~800)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isFa ? 'پرامپت سفارشی (اختیاری)' : 'Custom prompt (optional)'}</Label>
              <Input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={isFa ? 'مثلاً: یک مقدمه احساسی اضافه کن' : 'e.g. add an emotional intro'}
                maxLength={500}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || sourceText.length < 30}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isFa ? 'در حال بازنویسی...' : 'Rewriting...'}</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" />{isFa ? 'بازنویسی کن' : 'Rewrite'}</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isFa ? 'خروجی' : 'Output'}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />{isFa ? 'کپی' : 'Copy'}
              </Button>
              <Button size="sm" onClick={handleSaveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isFa ? 'ذخیره پیش‌نویس' : 'Save as draft'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={18}
              className="font-mono text-sm"
              dir={targetLang === 'fa' ? 'rtl' : 'ltr'}
            />
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-6 text-center">
        <Link to="/dashboard" className="underline">
          {isFa ? 'بازگشت به داشبورد' : 'Back to dashboard'}
        </Link>
      </p>
    </div>
  );
}