import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, Trash2, Eye, Save, Plus, FileText, Users, Video, ScrollText, LayoutDashboard } from 'lucide-react';
import UsersManager from '@/components/admin/UsersManager';
import LiveSessionsManager from '@/components/admin/LiveSessionsManager';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canAccessAdmin, isAdmin, loading: checkingAdmin } = useRole();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [projectSections, setProjectSections] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'articles' | 'project' | 'users' | 'live'>('articles');
  const isRTL = locale === 'fa';
  const side = isRTL ? 'right' as const : 'left' as const;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!checkingAdmin && !loading && user) {
      if (canAccessAdmin) {
        loadAllArticles();
        loadProjectSections();
      } else {
        toast({
          variant: "destructive",
          title: locale === 'fa' ? "دسترسی غیرمجاز" : "Unauthorized",
          description: locale === 'fa' ? "شما دسترسی مدیریت یا ویرایشگر ندارید" : "You don't have admin or editor access",
        });
        navigate('/dashboard');
      }
    }
  }, [canAccessAdmin, checkingAdmin, loading, user]);

  const loadProjectSections = async () => {
    const { data } = await supabase
      .from('project_description')
      .select('*')
      .order('order_num', { ascending: true });
    setProjectSections(data || []);
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
    if (error) {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'خطا' : 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: locale === 'fa' ? 'ذخیره شد' : 'Saved',
        description: locale === 'fa' ? 'بخش با موفقیت به‌روزرسانی شد' : 'Section updated successfully',
      });
    }
  };

  const addSection = async () => {
    const nextOrder =
      projectSections.reduce((max, s) => Math.max(max, s.order_num || 0), 0) + 1;
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
    if (error) {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'خطا' : 'Error',
        description: error.message,
      });
    } else {
      setProjectSections((prev) => [...prev, data]);
      toast({
        title: locale === 'fa' ? 'اضافه شد' : 'Added',
        description: locale === 'fa' ? 'بخش جدید ایجاد شد' : 'New section created',
      });
    }
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from('project_description').delete().eq('id', id);
    if (error) {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'خطا' : 'Error',
        description: error.message,
      });
    } else {
      setProjectSections((prev) => prev.filter((s) => s.id !== id));
    }
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

    if (error) {
      toast({
        variant: "destructive",
        title: locale === 'fa' ? "خطا" : "Error",
        description: locale === 'fa' ? "خطا در بارگذاری مقالات" : "Error loading articles",
      });
    } else {
      setArticles(data || []);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      toast({
        variant: "destructive",
        title: locale === 'fa' ? "خطا" : "Error",
        description: locale === 'fa' ? "خطا در حذف مقاله" : "Error deleting article",
      });
    } else {
      toast({
        title: locale === 'fa' ? "موفق" : "Success",
        description: locale === 'fa' ? "مقاله با موفقیت حذف شد" : "Article deleted successfully",
      });
      loadAllArticles();
    }
  };

  const toggleArticleStatus = async (articleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('articles')
      .update({ 
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null
      })
      .eq('id', articleId);

    if (error) {
      toast({
        variant: "destructive",
        title: locale === 'fa' ? "خطا" : "Error",
        description: locale === 'fa' ? "خطا در تغییر وضعیت" : "Error changing status",
      });
    } else {
      toast({
        title: locale === 'fa' ? "موفق" : "Success",
        description: locale === 'fa' ? "وضعیت مقاله تغییر کرد" : "Article status changed",
      });
      loadAllArticles();
    }
  };

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccessAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <Sidebar side={side} collapsible="offcanvas" className="border-border/40">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold font-[IRANSharp]">{locale === 'fa' ? 'پنل ادمین' : 'Admin Panel'}</span>
                <span className="text-xs text-muted-foreground">{locale === 'fa' ? 'کاغذ و باد' : 'KaghazBaad'}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{locale === 'fa' ? 'ابزار مدیریت' : 'Admin Tools'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={activeView === 'articles'} onClick={() => setActiveView('articles')}>
                      <FileText className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'همه مقالات' : 'All Articles'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={activeView === 'project'} onClick={() => setActiveView('project')}>
                      <ScrollText className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'شرح پروژه' : 'Project'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={activeView === 'users'} onClick={() => setActiveView('users')}>
                      <Users className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'کاربران' : 'Users'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={activeView === 'live'} onClick={() => setActiveView('live')}>
                      <Video className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'پخش‌های زنده' : 'Live'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{locale === 'fa' ? 'میانبر' : 'Quick'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="h-4 w-4" />
                      <span>{locale === 'fa' ? 'داشبورد کاربری' : 'User Dashboard'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <div className="p-2 text-xs text-muted-foreground text-center">
              {isAdmin
                ? (locale === 'fa' ? 'دسترسی ادمین' : 'Admin access')
                : (locale === 'fa' ? 'دسترسی ویرایشگر' : 'Editor access')
              }
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex h-12 items-center gap-2 border-b bg-background/80 backdrop-blur px-4">
            <SidebarTrigger className="-ms-1" />
            <div className="h-4 w-px bg-border" />
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              {activeView === 'articles' && (locale === 'fa' ? 'همه مقالات' : 'All Articles')}
              {activeView === 'project' && (locale === 'fa' ? 'شرح پروژه' : 'Project Description')}
              {activeView === 'users' && (locale === 'fa' ? 'کاربران' : 'Users')}
              {activeView === 'live' && (locale === 'fa' ? 'پخش‌های زنده' : 'Live Sessions')}
            </h1>
          </div>

          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {activeView === 'articles' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold font-[IRANSharp]">
                    {locale === 'fa' ? 'همه مقالات' : 'All Articles'} ({articles.length})
                  </h2>
                </div>

                {articles.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {locale === 'fa' ? 'هنوز مقاله‌ای وجود ندارد' : 'No articles yet'}
                    </CardContent>
                  </Card>
                ) : (
                  articles.map((article) => (
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
                                {locale === 'fa' ? 'نویسنده:' : 'Author:'}{' '}
                                {article.profiles?.first_name} {article.profiles?.last_name}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(article.created_at).toLocaleDateString(locale)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm text-center whitespace-nowrap ${
                              article.status === 'published' 
                                ? 'bg-accent/15 text-accent' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {article.status === 'published' 
                                ? (locale === 'fa' ? 'منتشر شده' : 'Published')
                                : (locale === 'fa' ? 'پیش‌نویس' : 'Draft')
                              }
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
                                    <AlertDialogTitle>
                                      {locale === 'fa' ? 'حذف مقاله' : 'Delete Article'}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {locale === 'fa' 
                                        ? 'آیا از حذف این مقاله اطمینان دارید؟ این عملیات قابل بازگشت نیست.'
                                        : 'Are you sure you want to delete this article? This action cannot be undone.'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {locale === 'fa' ? 'لغو' : 'Cancel'}
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteArticle(article.id)}>
                                      {locale === 'fa' ? 'حذف' : 'Delete'}
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

            {activeView === 'project' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {locale === 'fa'
                    ? 'محتوای صفحه «شرح پروژه» را ویرایش کنید. از Markdown پشتیبانی می‌شود.'
                    : 'Edit the content of the “Project Description” page. Markdown is supported.'}
                </p>
                {projectSections.map((s) => (
                  <Card key={s.id} className="glass-surface">
                    <CardHeader>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {locale === 'fa' ? 'شناسه بخش (Key)' : 'Section Key'}
                        </label>
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
                            rows={8}
                            onChange={(e) => updateSectionField(s.id, 'body_en', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">متن (FA) — Markdown</label>
                          <Textarea
                            value={s.body_fa}
                            rows={8}
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
                              <AlertDialogTitle>
                                {locale === 'fa' ? 'حذف بخش' : 'Delete Section'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {locale === 'fa'
                                  ? 'آیا از حذف این بخش اطمینان دارید؟'
                                  : 'Are you sure you want to delete this section?'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {locale === 'fa' ? 'لغو' : 'Cancel'}
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSection(s.id)}>
                                {locale === 'fa' ? 'حذف' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" onClick={() => saveSection(s)}>
                          <Save className="w-4 h-4" />
                          {locale === 'fa' ? 'ذخیره' : 'Save'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-center pt-2">
                  <Button size="sm" onClick={addSection}>
                    <Plus className="w-4 h-4" />
                    {locale === 'fa' ? 'افزودن بخش جدید' : 'Add New Section'}
                  </Button>
                </div>
              </div>
            )}

            {activeView === 'users' && <UsersManager />}

            {activeView === 'live' && <LiveSessionsManager />}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
