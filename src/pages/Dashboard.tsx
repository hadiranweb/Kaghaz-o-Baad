import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  LogOut, Plus, Edit, Trash2, LayoutDashboard, FileText, Video, User, Settings, Globe, HardDrive,
  Shield, Users, Activity, ScrollText, BookOpen, Eye, Save
} from 'lucide-react';
import { z } from 'zod';
import MDEditor from '@uiw/react-md-editor';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset, SidebarHeader,
  SidebarFooter, SidebarSeparator
} from '@/components/ui/sidebar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import UsersManager from '@/components/admin/UsersManager';
import LiveSessionsManager from '@/components/admin/LiveSessionsManager';
import CircuitBreakerMonitor from '@/components/admin/CircuitBreakerMonitor';
import SystemWiki from '@/components/admin/SystemWiki';

type DashboardView =
  | 'articles'
  | 'all_articles'
  | 'users'
  | 'resilience'
  | 'all_live'
  | 'project'
  | 'wiki';

const articleSchema = z.object({
  title_fa: z.string().trim().min(3, { message: "عنوان فارسی باید حداقل ۳ کاراکتر باشد" }).max(200),
  title_en: z.string().trim().min(3, { message: "English title must be at least 3 characters" }).max(200),
  summary_fa: z.string().trim().max(500).optional(),
  summary_en: z.string().trim().max(500).optional(),
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+$/, { message: "اسلاگ فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد" }),
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut, loading } = useAuth();
  const { canAccessAdmin, isAdmin, isContributor } = useRole();
  const { locale } = useLanguage();
  const { toast } = useToast();

  const viewParam = searchParams.get('view') as DashboardView | null;
  const defaultView: DashboardView = canAccessAdmin ? 'all_articles' : 'articles';
  const [activeView, setActiveView] = useState<DashboardView>(viewParam || defaultView);

  const [articles, setArticles] = useState<any[]>([]);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [projectSections, setProjectSections] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

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

  useEffect(() => {
    if (viewParam && viewParam !== activeView) {
      setActiveView(viewParam);
    }
  }, [viewParam]);

  const checkProfileCompletion = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking profile:', error);
      return;
    }

    if (!data?.first_name || !data?.last_name) {
      navigate('/complete-profile');
      return;
    }

    loadMyArticles();
    if (canAccessAdmin) {
      loadAllArticles();
      loadProjectSections();
    }
  };

  const handleSelectView = (view: DashboardView) => {
    setActiveView(view);
    setSearchParams({ view });
    setShowForm(false);
    setManagingSlidesFor(null);
    if (view === 'all_articles') loadAllArticles();
    if (view === 'project') loadProjectSections();
  };

  const loadMyArticles = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setArticles(data || []);
  };

  const loadAllArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        profiles:author_id (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) setAllArticles(data || []);
  };

  const loadProjectSections = async () => {
    const { data } = await supabase
      .from('project_description')
      .select('*')
      .order('order_num', { ascending: true });
    setProjectSections(data || []);
  };

  const loadSlides = async (articleId: string) => {
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .eq('article_id', articleId)
      .order('order_num', { ascending: true });

    if (!error) setSlides(data || []);
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
        toast({ title: t('موفق', 'Success'), description: t('مقاله ویرایش شد', 'Article updated') });
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
            toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('این اسلاگ قبلاً استفاده شده', 'Slug already used') });
            return;
          }
          throw error;
        }
        toast({ title: t('موفق', 'Success'), description: t('مقاله ایجاد شد', 'Article created') });
      }

      setShowForm(false);
      setEditingArticle(null);
      setNewArticle({ title_fa: '', title_en: '', summary_fa: '', summary_en: '', slug: '', status: 'draft' });
      loadMyArticles();
      if (canAccessAdmin) loadAllArticles();
      handleSelectView('articles');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
        });
        setErrors(newErrors);
      } else {
        toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('خطا در ذخیره مقاله', 'Error saving article') });
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
    if (!error) await loadSlides(managingSlidesFor);
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
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: t('خطا در ذخیره اسلاید', 'Error saving slide') });
    } else {
      toast({ title: t('موفق', 'Success'), description: t('اسلاید ذخیره شد', 'Slide saved') });
    }
  };

  const handleDeleteSlide = async (slideId: string) => {
    const { error } = await supabase.from('slides').delete().eq('id', slideId);
    if (!error && managingSlidesFor) {
      await loadSlides(managingSlidesFor);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (!error) {
      toast({ title: t('موفق', 'Success'), description: t('مقاله حذف شد', 'Article deleted') });
      loadMyArticles();
      if (canAccessAdmin) loadAllArticles();
    }
  };

  const toggleArticleStatus = async (articleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('articles')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', articleId);

    if (!error) {
      toast({ title: t('موفق', 'Success'), description: t('وضعیت مقاله تغییر کرد', 'Article status updated') });
      loadMyArticles();
      if (canAccessAdmin) loadAllArticles();
    }
  };

  const updateSectionField = (id: string, field: string, value: string) => {
    setProjectSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const saveSection = async (section: any) => {
    const { error } = await supabase
      .from('project_description')
      .update({
        section_key: section.section_key,
        title_en: section.title_en,
        title_fa: section.title_fa,
        body_en: section.body_en,
        body_fa: section.body_fa,
      })
      .eq('id', section.id);
    if (!error) {
      toast({ title: t('ذخیره شد', 'Saved'), description: t('بخش شرح پروژه به‌روزرسانی شد', 'Section updated') });
    }
  };

  const addSection = async () => {
    const nextOrder = projectSections.reduce((max, s) => Math.max(max, s.order_num || 0), 0) + 1;
    const baseKey = `section_${nextOrder}`;
    const { data, error } = await supabase
      .from('project_description')
      .insert({
        section_key: baseKey,
        title_en: 'New Section',
        title_fa: 'بخش جدید',
        body_en: '',
        body_fa: '',
        order_num: nextOrder,
      })
      .select()
      .single();
    if (!error && data) {
      setProjectSections((prev) => [...prev, data]);
      toast({ title: t('اضافه شد', 'Added') });
    }
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from('project_description').delete().eq('id', id);
    if (!error) {
      setProjectSections((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const getPageTitle = () => {
    if (activeView === 'all_articles') return t('بررسی همه مقالات سامانه', 'All Articles (System Review)');
    if (activeView === 'users') return t('مدیریت کاربران و نقش‌ها', 'Users & Roles');
    if (activeView === 'resilience') return t('تاب‌آوری و مدارشکن‌ها', 'Resilience & Breakers');
    if (activeView === 'all_live') return t('پایش پخش‌های زنده', 'Live Sessions (Monitor)');
    if (activeView === 'project') return t('ویرایش شرح پروژه', 'Project Description');
    if (activeView === 'wiki') return t('ویکی و راهنمای سامانه', 'System Wiki & Etiquette');
    return t('میز کار کاربری', 'User Workspace');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        {/* ابزار — در فارسی راست، در انگلیسی چپ (معماری کلودفلر: یکپارچه و تودرتو با جداکننده) */}
        <Sidebar side={side} collapsible="offcanvas" className="border-border/40">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold font-[IRANSharp]">
                  {canAccessAdmin ? t('داشبورد مدیریت یکپارچه', 'Unified Console') : isContributor ? t('داشبورد نویسنده', 'Contributor Console') : t('داشبورد کاربر', 'User Console')}
                </span>
                <span className="text-xs text-muted-foreground">{t('کاغذ و باد', 'KaghazBaad')}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            {/* GROUP 1: ابزارهای من (My Workspace) */}
            <SidebarGroup>
              <SidebarGroupLabel>{t('ابزارهای من', 'My Workspace')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeView === 'articles' && !showForm && !managingSlidesFor}
                      onClick={() => handleSelectView('articles')}
                    >
                      <FileText className="h-4 w-4" />
                      <span>{t('مقالات من', 'My Articles')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {(isContributor || canAccessAdmin) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveView('articles');
                          setShowForm(true);
                          setEditingArticle(null);
                          setManagingSlidesFor(null);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('مقاله جدید', 'New Article')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/media')}>
                      <HardDrive className="h-4 w-4" />
                      <span>{t('درایو ۱۵ گیگابایتی', '15GB Media Drive')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/live')}>
                      <Video className="h-4 w-4" />
                      <span>{t('جلسات زنده من', 'Live Sessions')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/complete-profile')}>
                      <User className="h-4 w-4" />
                      <span>{t('پروفایل کاربری', 'My Profile')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* GROUP 2: مدیریت کلان سامانه (System Administration) — فقط برای مدیر و ویراستار */}
            {canAccessAdmin && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>
                    {t('مدیریت کلان سامانه', 'System Administration')}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeView === 'all_articles'}
                          onClick={() => handleSelectView('all_articles')}
                        >
                          <Shield className="h-4 w-4 text-primary" />
                          <span>{t('بررسی همه مقالات', 'All Articles (Review)')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeView === 'users'}
                          onClick={() => handleSelectView('users')}
                        >
                          <Users className="h-4 w-4 text-accent" />
                          <span>{t('کاربران و نقش‌ها', 'Users & Roles')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeView === 'resilience'}
                          onClick={() => handleSelectView('resilience')}
                        >
                          <Activity className="h-4 w-4 text-amber-500" />
                          <span>{t('تاب‌آوری و مدارشکن‌ها', 'Resilience & Breakers')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeView === 'all_live'}
                          onClick={() => handleSelectView('all_live')}
                        >
                          <Video className="h-4 w-4 text-emerald-500" />
                          <span>{t('پایش پخش‌های زنده', 'Live Monitor (System)')}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {isAdmin && (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            isActive={activeView === 'project'}
                            onClick={() => handleSelectView('project')}
                          >
                            <ScrollText className="h-4 w-4" />
                            <span>{t('ویرایش شرح پروژه', 'Project Description')}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* GROUP 3: راهنما و ویکی (Wiki & Etiquette) */}
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{t('راهنما و ویکی', 'Wiki & Support')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeView === 'wiki'}
                      onClick={() => handleSelectView('wiki')}
                    >
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>{t('ویکی و راهنمای سامانه', 'System Wiki & Etiquette')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/change-password')}>
                      <Settings className="h-4 w-4" />
                      <span>{t('تنظیمات امنیتی', 'Security Settings')}</span>
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
                {t('خروج از حساب', 'Sign Out')}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex-1">
            <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background/80 backdrop-blur px-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ms-1" />
                <div className="h-4 w-px bg-border" />
                <h1 className="text-sm font-semibold">{getPageTitle()}</h1>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" />
                <span>{t('سایت عمومی (SEO)', 'Public SEO Site')}</span>
              </Button>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-6xl" dir={isRTL ? 'rtl' : 'ltr'}>
              {/* VIEW: 'wiki' (ویکی و راهنما در داخل کنسول) */}
              {activeView === 'wiki' && <SystemWiki />}

              {/* VIEW: 'users' (مدیریت کاربران و نقش‌های RBAC) */}
              {activeView === 'users' && canAccessAdmin && <UsersManager />}

              {/* VIEW: 'resilience' (مدارشکن‌ها و تاب‌آوری) */}
              {activeView === 'resilience' && canAccessAdmin && <CircuitBreakerMonitor />}

              {/* VIEW: 'all_live' (پایش پخش‌های زنده — بدون دکمه ایجاد جلسه مدیریتی) */}
              {activeView === 'all_live' && canAccessAdmin && <LiveSessionsManager />}

              {/* VIEW: 'project' (ویرایش بخش‌های شرح پروژه) */}
              {activeView === 'project' && isAdmin && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'محتوای صفحه «شرح پروژه» را ویرایش کنید. از Markdown پشتیبانی می‌شود.',
                      'Edit Project Description sections (Markdown supported).'
                    )}
                  </p>
                  {projectSections.map((s) => (
                    <Card key={s.id} className="glass-surface">
                      <CardHeader>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Section Key</label>
                          <Input
                            value={s.section_key}
                            className="font-mono text-sm"
                            onChange={(e) => updateSectionField(s.id, 'section_key', e.target.value)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Title (EN)</label>
                            <Input
                              value={s.title_en}
                              onChange={(e) => updateSectionField(s.id, 'title_en', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">عنوان (FA)</label>
                            <Input
                              value={s.title_fa}
                              dir="rtl"
                              onChange={(e) => updateSectionField(s.id, 'title_fa', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Body (EN) — Markdown</label>
                            <Textarea
                              value={s.body_en}
                              rows={6}
                              onChange={(e) => updateSectionField(s.id, 'body_en', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">متن (FA) — Markdown</label>
                            <Textarea
                              value={s.body_fa}
                              rows={6}
                              dir="rtl"
                              onChange={(e) => updateSectionField(s.id, 'body_fa', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('حذف بخش', 'Delete Section')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('آیا از حذف این بخش اطمینان دارید؟', 'Are you sure you want to delete this section?')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('لغو', 'Cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSection(s.id)}>
                                  {t('حذف', 'Delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button size="sm" onClick={() => saveSection(s)}>
                            <Save className="w-4 h-4" />
                            {t('ذخیره', 'Save')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="flex justify-center pt-2">
                    <Button size="sm" onClick={addSection}>
                      <Plus className="w-4 h-4 me-1" />
                      {t('افزودن بخش جدید', 'Add Section')}
                    </Button>
                  </div>
                </div>
              )}

              {/* VIEW: 'all_articles' (بررسی همه مقالات سامانه توسط ادمین و ویراستار) */}
              {activeView === 'all_articles' && canAccessAdmin && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold font-[IRANSharp]">
                      {t('همه مقالات سامانه (پایش و داوری)', 'All Articles (System Review)')} ({allArticles.length})
                    </h2>
                  </div>

                  {allArticles.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        {t('هنوز مقاله‌ای وجود ندارد', 'No articles found')}
                      </CardContent>
                    </Card>
                  ) : (
                    allArticles.map((article) => (
                      <Card key={article.id} className="glass-surface hover:shadow-elegant transition-all">
                        <CardHeader>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <CardTitle className="mb-2">
                                {locale === 'fa' ? article.title_fa : article.title_en}
                              </CardTitle>
                              <CardDescription>
                                {locale === 'fa' ? article.summary_fa : article.summary_en}
                              </CardDescription>
                              <div className="flex gap-2 mt-3 text-sm text-muted-foreground">
                                <span>
                                  {t('نویسنده:', 'Author:')}{' '}
                                  {article.profiles?.first_name} {article.profiles?.last_name}
                                </span>
                                <span>•</span>
                                <span>{new Date(article.created_at).toLocaleDateString(locale)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                                article.status === 'published' ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
                              }`}>
                                {article.status === 'published' ? t('منتشر شده', 'Published') : t('پیش‌نویس', 'Draft')}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleArticleStatus(article.id, article.status)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('حذف مقاله', 'Delete Article')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('آیا از حذف این مقاله اطمینان دارید؟', 'Are you sure you want to delete this article?')}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('لغو', 'Cancel')}</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteArticle(article.id)}>
                                        {t('حذف', 'Delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* VIEW: 'articles' (میز کار شخصی کاربر / مقالات من) */}
              {activeView === 'articles' && (
                <>
                  {/* برای کاربر عادی که نویسنده نیست کارت خلاصه ابزارها نمایش داده شود */}
                  {!isContributor && !canAccessAdmin && !showForm && (
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <Card className="glass-surface">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" />
                            <span>{t('درایو شخصی ۱۵ گیگابایتی', 'Personal 15GB Drive')}</span>
                          </CardTitle>
                          <CardDescription>
                            {t('ذخیره و مدیریت فایل‌های صوتی، ویدیویی، تصاویر و اسناد PDF', 'Store and manage audio, video, images, PDFs')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button onClick={() => navigate('/media')} className="w-full">
                            {t('ورود به کتابخانه چندرسانه‌ای', 'Open Media Drive')}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="glass-surface">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-accent" />
                            <span>{t('جلسات زنده و کارگاه‌ها', 'Live Sessions & Workshops')}</span>
                          </CardTitle>
                          <CardDescription>
                            {t('حضور در جلسات گفت‌وگوی زنده مقالات با صدا و تصویر', 'Participate in live audio/video article workshops')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" onClick={() => navigate('/live')} className="w-full">
                            {t('مشاهده لیست جلسات', 'View Live Sessions')}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Slide Manager */}
                  {managingSlidesFor && (
                    <Card className="mb-8">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>{t('مدیریت اسلایدها', 'Manage Slides')}</CardTitle>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddSlide}>
                              <Plus className="w-4 h-4 me-1" />
                              {t('اسلاید جدید', 'Add Slide')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setManagingSlidesFor(null)}>
                              {t('بستن', 'Close')}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {slides.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">
                            {t('هنوز اسلایدی اضافه نشده', 'No slides yet')}
                          </p>
                        )}
                        {slides.map((slide, idx) => (
                          <Card key={slide.id} className="border-dashed">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base">
                                  {t(`اسلاید ${idx + 1}`, `Slide ${idx + 1}`)}
                                </CardTitle>
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => handleSaveSlide(slide)}>
                                    {t('ذخیره', 'Save')}
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
                                  <Label>{t('عنوان فارسی', 'Title FA')}</Label>
                                  <Input
                                    value={slide.title_fa || ''}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'title_fa', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label>{t('عنوان انگلیسی', 'Title EN')}</Label>
                                  <Input
                                    value={slide.title_en || ''}
                                    onChange={(e) => handleUpdateSlide(slide.id, 'title_en', e.target.value)}
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>{t('متن فارسی (مارکدون)', 'Body FA (Markdown)')}</Label>
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
                                <Label>{t('متن انگلیسی (مارکدون)', 'Body EN (Markdown)')}</Label>
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

                  {(isContributor || canAccessAdmin) && !showForm && !managingSlidesFor && (
                    <Button onClick={() => setShowForm(true)} className="mb-6">
                      <Plus className="w-4 h-4 me-2" />
                      {t('مقاله جدید', 'New Article')}
                    </Button>
                  )}

                  {showForm && (
                    <Card className="mb-8">
                      <CardHeader>
                        <CardTitle>
                          {editingArticle ? t('ویرایش مقاله', 'Edit Article') : t('ایجاد مقاله جدید', 'Create New Article')}
                        </CardTitle>
                        <CardDescription>
                          {t('اطلاعات مقاله را وارد کنید', 'Enter article information')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateArticle} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t('عنوان فارسی', 'Title (Farsi)')}</Label>
                              <Input value={newArticle.title_fa} onChange={(e) => setNewArticle({ ...newArticle, title_fa: e.target.value })} />
                              {errors.title_fa && <p className="text-sm text-destructive">{errors.title_fa}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label>{t('عنوان انگلیسی', 'Title (English)')}</Label>
                              <Input value={newArticle.title_en} onChange={(e) => setNewArticle({ ...newArticle, title_en: e.target.value })} dir="ltr" />
                              {errors.title_en && <p className="text-sm text-destructive">{errors.title_en}</p>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>{t('اسلاگ (URL)', 'Slug (URL)')}</Label>
                            <Input value={newArticle.slug} onChange={(e) => setNewArticle({ ...newArticle, slug: e.target.value.toLowerCase() })} placeholder="my-article-slug" dir="ltr" />
                            {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t('خلاصه فارسی (مارکدون)', 'Summary FA (Markdown)')}</Label>
                              <div data-color-mode="light">
                                <MDEditor value={newArticle.summary_fa} onChange={(val) => setNewArticle({ ...newArticle, summary_fa: val || '' })} height={150} preview="edit" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>{t('خلاصه انگلیسی (مارکدون)', 'Summary EN (Markdown)')}</Label>
                              <div data-color-mode="light">
                                <MDEditor value={newArticle.summary_en} onChange={(val) => setNewArticle({ ...newArticle, summary_en: val || '' })} height={150} preview="edit" direction="ltr" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>{t('وضعیت', 'Status')}</Label>
                            <Select value={newArticle.status} onValueChange={(value: 'draft' | 'published') => setNewArticle({ ...newArticle, status: value })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">{t('پیش‌نویس', 'Draft')}</SelectItem>
                                <SelectItem value="published">{t('منتشر شده', 'Published')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-2">
                            <Button type="submit">
                              {editingArticle ? t('ذخیره تغییرات', 'Save Changes') : t('ایجاد مقاله', 'Create Article')}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancelEdit}>
                              {t('لغو', 'Cancel')}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {(isContributor || canAccessAdmin) && (
                    <div className="grid gap-4">
                      <h2 className="text-2xl font-bold font-[IRANSharp]">{t('مقالات من', 'My Articles')}</h2>
                      {articles.length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center text-muted-foreground">
                            {t('هنوز مقاله‌ای ایجاد نکرده‌اید', 'No articles yet')}
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
                                    {article.status === 'published' ? t('منتشر شده', 'Published') : t('پیش‌نویس', 'Draft')}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" onClick={() => handleEditArticle(article)}>
                                      <Edit className="w-4 h-4 me-1" />
                                      {t('ویرایش', 'Edit')}
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => handleManageSlides(article.id)}>
                                      {t('اسلایدها', 'Slides')}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
