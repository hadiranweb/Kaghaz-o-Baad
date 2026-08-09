import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus, Edit, Trash2, LayoutDashboard, FileText, Video, User, Settings } from 'lucide-react';
import { z } from 'zod';
import MDEditor from '@uiw/react-md-editor';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset, SidebarHeader, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';

const articleSchema = z.object({
  title_fa: z.string().trim().min(3, { message: "عنوان فارسی باید حداقل ۳ کاراکتر باشد" }).max(200),
  title_en: z.string().trim().min(3, { message: "English title must be at least 3 characters" }).max(200),
  summary_fa: z.string().trim().max(500).optional(),
  summary_en: z.string().trim().max(500).optional(),
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+$/, { message: "اسلاگ فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد" }),
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<'articles' | 'live' | 'settings'>('articles');

  // Slide management
  const [slides, setSlides] = useState<any[]>([]);
  const [managingSlidesFor, setManagingSlidesFor] = useState<string | null>(null);

  const [newArticle, setNewArticle] = useState({
    title_fa: '',
    title_en: '',
    summary_fa: '',
    summary_en: '',
    slug: '',
    status: 'draft' as 'draft' | 'published',
  });

  const isRTL = locale === 'fa';
  const side = isRTL ? 'right' as const : 'left' as const;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkProfileCompletion();
    }
  }, [user]);

  const checkProfileCompletion = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error checking profile:', error);
      return;
    }

    if (!data.first_name || !data.last_name || !data.phone) {
      navigate('/complete-profile');
      return;
    }

    loadArticles();
  };

  const loadArticles = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading articles:', error);
      toast({ variant: "destructive", title: "خطا", description: "خطا در بارگذاری مقالات" });
    } else {
      setArticles(data || []);
    }
  };

  const loadSlides = async (articleId: string) => {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('article_id', articleId)
      .order('order_num', { ascending: true });

    if (error) {
      console.error('Error loading slides:', error);
    } else {
      setSlides(data || []);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      articleSchema.parse(newArticle);

      if (editingArticle) {
        const { error } = await supabase
          .from('articles')
          .update({
            ...newArticle,
            published_at: newArticle.status === 'published' ? new Date().toISOString() : null,
          })
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast({ title: "موفق", description: locale === 'fa' ? "مقاله ویرایش شد" : "Article updated" });
      } else {
        const { error } = await supabase
          .from('articles')
          .insert({
            ...newArticle,
            author_id: user?.id,
            published_at: newArticle.status === 'published' ? new Date().toISOString() : null,
          });

        if (error) {
          if (error.code === '23505') {
            toast({ variant: "destructive", title: "خطا", description: "این اسلاگ قبلاً استفاده شده" });
            return;
          }
          throw error;
        }
        toast({ title: "موفق", description: "مقاله ایجاد شد" });
      }

      setShowForm(false);
      setEditingArticle(null);
      setNewArticle({ title_fa: '', title_en: '', summary_fa: '', summary_en: '', slug: '', status: 'draft' });
      loadArticles();
      setActiveView('articles');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
        });
        setErrors(newErrors);
      } else {
        console.error('Error saving article:', error);
        toast({ variant: "destructive", title: "خطا", description: "خطا در ذخیره مقاله" });
      }
    }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setNewArticle({
      title_fa: article.title_fa,
      title_en: article.title_en,
      summary_fa: article.summary_fa || '',
      summary_en: article.summary_en || '',
      slug: article.slug,
      status: article.status,
    });
    setShowForm(true);
    setActiveView('articles');
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingArticle(null);
    setNewArticle({ title_fa: '', title_en: '', summary_fa: '', summary_en: '', slug: '', status: 'draft' });
    setErrors({});
  };

  const handleManageSlides = async (articleId: string) => {
    setManagingSlidesFor(articleId);
    await loadSlides(articleId);
    setActiveView('articles');
  };

  const handleAddSlide = async () => {
    if (!managingSlidesFor) return;
    const orderNum = slides.length + 1;
    const { error } = await supabase
      .from('slides')
      .insert({ article_id: managingSlidesFor, order_num: orderNum, title_en: '', title_fa: '', body_en: '', body_fa: '' });
    if (error) {
      console.error('Error adding slide:', error);
      return;
    }
    await loadSlides(managingSlidesFor);
  };

  const handleUpdateSlide = async (slideId: string, field: string, value: string) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, [field]: value } : s));
  };

  const handleSaveSlide = async (slide: any) => {
    const { error } = await supabase
      .from('slides')
      .update({
        title_en: slide.title_en,
        title_fa: slide.title_fa,
        body_en: slide.body_en,
        body_fa: slide.body_fa,
      })
      .eq('id', slide.id);

    if (error) {
      toast({ variant: "destructive", title: "خطا", description: "خطا در ذخیره اسلاید" });
    } else {
      toast({ title: "موفق", description: "اسلاید ذخیره شد" });
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    const { error } = await supabase.from('slides').delete().eq('id', slideId);
    if (!error && managingSlidesFor) {
      await loadSlides(managingSlidesFor);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        {/* ابزار — در فارسی راست، در انگلیسی چپ */}
        <Sidebar side={side} collapsible="offcanvas" className="border-border/40">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold font-[IRANSharp]">{locale === 'fa' ? 'داشبورد' : 'Dashboard'}</span>
                <span className="text-xs text-muted-foreground">{locale === 'fa' ? 'کاغذ و باد' : 'KaghazBaad'}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{locale === 'fa' ? 'ابزار' : 'Tools'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={activeView === 'articles' && !showForm && !managingSlidesFor} onClick={() => { setActiveView('articles'); setShowForm(false); setManagingSlidesFor(null); }}>
                      <FileText className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'مقالات من' : 'My Articles'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { setShowForm(true); setEditingArticle(null); setManagingSlidesFor(null); }}>
                      <Plus className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'مقاله جدید' : 'New Article'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={activeView === 'live'} onClick={() => navigate('/live')}>
                      <Video className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'جلسات زنده' : 'Live Sessions'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/complete-profile')}>
                      <User className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'پروفایل' : 'Profile'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{locale === 'fa' ? 'حساب' : 'Account'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/dashboard')}>
                      <Settings className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'تنظیمات' : 'Settings'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <div className="p-2">
              <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 me-2" />
                {locale === 'fa' ? 'خروج' : 'Sign Out'}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex-1">
            <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/80 backdrop-blur px-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <SidebarTrigger className="-ms-1" />
              <div className="h-4 w-px bg-border" />
              <h1 className="text-sm font-semibold">
                {activeView === 'live' ? (locale === 'fa' ? 'جلسات زنده' : 'Live') : (locale === 'fa' ? 'مدیریت محتوا' : 'Content Manager')}
              </h1>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-6xl" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-[IRANSharp]">
                    {locale === 'fa' ? 'داشبورد مدیریت' : 'Dashboard'}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {locale === 'fa' ? 'مدیریت مقالات و محتوا' : 'Manage your articles and content'}
                  </p>
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/read')}>
                    {locale === 'fa' ? 'مشاهده سایت' : 'View Site'}
                  </Button>
                </div>
              </div>

              {/* Slide Manager */}
              {managingSlidesFor && (
                <Card className="mb-8">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{locale === 'fa' ? 'مدیریت اسلایدها' : 'Manage Slides'}</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddSlide}>
                          <Plus className="w-4 h-4 me-1" />
                          {locale === 'fa' ? 'اسلاید جدید' : 'Add Slide'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setManagingSlidesFor(null)}>
                          {locale === 'fa' ? 'بستن' : 'Close'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {slides.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        {locale === 'fa' ? 'هنوز اسلایدی اضافه نشده' : 'No slides yet'}
                      </p>
                    )}
                    {slides.map((slide, idx) => (
                      <Card key={slide.id} className="border-dashed">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              {locale === 'fa' ? `اسلاید ${idx + 1}` : `Slide ${idx + 1}`}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleSaveSlide(slide)}>
                                {locale === 'fa' ? 'ذخیره' : 'Save'}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteSlide(slide.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>{locale === 'fa' ? 'عنوان فارسی' : 'Title FA'}</Label>
                              <Input
                                value={slide.title_fa || ''}
                                onChange={(e) => handleUpdateSlide(slide.id, 'title_fa', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>{locale === 'fa' ? 'عنوان انگلیسی' : 'Title EN'}</Label>
                              <Input
                                value={slide.title_en || ''}
                                onChange={(e) => handleUpdateSlide(slide.id, 'title_en', e.target.value)}
                                dir="ltr"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>{locale === 'fa' ? 'متن فارسی (مارکدون)' : 'Body FA (Markdown)'}</Label>
                            <div data-color-mode="light">
                              <MDEditor
                                value={slide.body_fa || ''}
                                onChange={(val) => handleUpdateSlide(slide.id, 'body_fa', val || '')}
                                height={200}
                                preview="edit"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>{locale === 'fa' ? 'متن انگلیسی (مارکدون)' : 'Body EN (Markdown)'}</Label>
                            <div data-color-mode="light">
                              <MDEditor
                                value={slide.body_en || ''}
                                onChange={(val) => handleUpdateSlide(slide.id, 'body_en', val || '')}
                                height={200}
                                preview="edit"
                                direction="ltr"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!showForm && !managingSlidesFor && (
                <Button onClick={() => setShowForm(true)} className="mb-6">
                  <Plus className="w-4 h-4 me-2" />
                  {locale === 'fa' ? 'مقاله جدید' : 'New Article'}
                </Button>
              )}

              {showForm && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>
                      {editingArticle
                        ? (locale === 'fa' ? 'ویرایش مقاله' : 'Edit Article')
                        : (locale === 'fa' ? 'ایجاد مقاله جدید' : 'Create New Article')
                      }
                    </CardTitle>
                    <CardDescription>
                      {locale === 'fa' ? 'اطلاعات مقاله را وارد کنید' : 'Enter article information'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateArticle} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{locale === 'fa' ? 'عنوان فارسی' : 'Title (Farsi)'}</Label>
                          <Input value={newArticle.title_fa} onChange={(e) => setNewArticle({ ...newArticle, title_fa: e.target.value })} />
                          {errors.title_fa && <p className="text-sm text-destructive">{errors.title_fa}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>{locale === 'fa' ? 'عنوان انگلیسی' : 'Title (English)'}</Label>
                          <Input value={newArticle.title_en} onChange={(e) => setNewArticle({ ...newArticle, title_en: e.target.value })} dir="ltr" />
                          {errors.title_en && <p className="text-sm text-destructive">{errors.title_en}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{locale === 'fa' ? 'اسلاگ (URL)' : 'Slug (URL)'}</Label>
                        <Input value={newArticle.slug} onChange={(e) => setNewArticle({ ...newArticle, slug: e.target.value.toLowerCase() })} placeholder="my-article-slug" dir="ltr" />
                        {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{locale === 'fa' ? 'خلاصه فارسی (مارکدون)' : 'Summary FA (Markdown)'}</Label>
                          <div data-color-mode="light">
                            <MDEditor value={newArticle.summary_fa} onChange={(val) => setNewArticle({ ...newArticle, summary_fa: val || '' })} height={150} preview="edit" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{locale === 'fa' ? 'خلاصه انگلیسی (مارکدون)' : 'Summary EN (Markdown)'}</Label>
                          <div data-color-mode="light">
                            <MDEditor value={newArticle.summary_en} onChange={(val) => setNewArticle({ ...newArticle, summary_en: val || '' })} height={150} preview="edit" direction="ltr" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{locale === 'fa' ? 'وضعیت' : 'Status'}</Label>
                        <Select value={newArticle.status} onValueChange={(value: 'draft' | 'published') => setNewArticle({ ...newArticle, status: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">{locale === 'fa' ? 'پیش‌نویس' : 'Draft'}</SelectItem>
                            <SelectItem value="published">{locale === 'fa' ? 'منتشر شده' : 'Published'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit">
                          {editingArticle ? (locale === 'fa' ? 'ذخیره تغییرات' : 'Save Changes') : (locale === 'fa' ? 'ایجاد مقاله' : 'Create Article')}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>
                          {locale === 'fa' ? 'لغو' : 'Cancel'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                <h2 className="text-2xl font-bold font-[IRANSharp]">{locale === 'fa' ? 'مقالات من' : 'My Articles'}</h2>
                {articles.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {locale === 'fa' ? 'هنوز مقاله‌ای ایجاد نکرده‌اید' : 'No articles yet'}
                    </CardContent>
                  </Card>
                ) : (
                  articles.map((article) => (
                    <Card key={article.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <CardTitle>{locale === 'fa' ? article.title_fa : article.title_en}</CardTitle>
                            <CardDescription className="mt-2">
                              {locale === 'fa' ? article.summary_fa : article.summary_en}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <span className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                              article.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {article.status === 'published' ? (locale === 'fa' ? 'منتشر شده' : 'Published') : (locale === 'fa' ? 'پیش‌نویس' : 'Draft')}
                            </span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleEditArticle(article)}>
                                <Edit className="w-4 h-4 me-1" />
                                {locale === 'fa' ? 'ویرایش' : 'Edit'}
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleManageSlides(article.id)}>
                                {locale === 'fa' ? 'اسلایدها' : 'Slides'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
