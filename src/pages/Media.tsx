import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Image as ImageIcon, Video, FileText, Headphones, Upload, HardDrive, Share2, Lock, Globe, Trash2, Eye, UserPlus, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type MediaItem = {
  id: string;
  title_en: string;
  title_fa: string;
  type: string;
  src_url: string;
  thumb_url: string | null;
  file_size: number | null;
  visibility: string | null;
  shared_with?: string[];
  created_at: string;
  owner_id: string | null;
  created_by: string | null;
};

const QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // 15GB

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

function extractStoragePath(srcUrl: string): string | null {
  try {
    const match = srcUrl.match(/\/media\/(.+)$/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].split('?')[0]);
    }
    return null;
  } catch {
    return null;
  }
}

export default function Media() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'audio' | 'pdf'>('image');
  const [myMedia, setMyMedia] = useState<MediaItem[]>([]);
  const [publicMedia, setPublicMedia] = useState<MediaItem[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [sharingItem, setSharingItem] = useState<MediaItem | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingBusy, setSharingBusy] = useState(false);

  // مکان‌نمای صفحه‌بندی (Cursor-based Pagination state)
  const [hasMoreMine, setHasMoreMine] = useState(false);
  const [hasMorePublic, setHasMorePublic] = useState(false);
  const [loadingMoreMine, setLoadingMoreMine] = useState(false);
  const [loadingMorePublic, setLoadingMorePublic] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const title = locale === 'fa' ? 'چندرسانه‌ای' : 'Media';

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setShowLoginDialog(true), 400);
      return () => clearTimeout(timer);
    } else {
      setShowLoginDialog(false);
    }
  }, [user]);

  const loadMedia = useCallback(async () => {
    if (!user) {
      const { data } = await supabase.rpc('paginate_media', {
        p_type: activeTab,
        p_scope: 'public',
        p_cursor_time: null,
        p_cursor_id: null,
        p_limit: 12,
      });
      const rows = (data as MediaItem[]) || [];
      const more = rows.length > 12;
      const items = more ? rows.slice(0, 12) : rows;
      setPublicMedia(items);
      setHasMorePublic(more);
      return;
    }

    // شخصی (با صفحه‌بندی مکان‌نما)
    const { data: mine } = await supabase.rpc('paginate_media', {
      p_type: activeTab,
      p_scope: 'mine',
      p_cursor_time: null,
      p_cursor_id: null,
      p_limit: 12,
    });
    if (mine) {
      const rows = (mine as MediaItem[]) || [];
      const more = rows.length > 12;
      const items = more ? rows.slice(0, 12) : rows;
      setMyMedia(items);
      setHasMoreMine(more);
    }

    // خواندن حجم مصرفی دقیق از جدول user_storage (که توسط تریگر خودکار دیتابیس tr_media_storage_quota به‌روز می‌شود)
    const { data: storageRow } = await supabase
      .from('user_storage')
      .select('used_bytes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storageRow && typeof storageRow.used_bytes === 'number') {
      setUsedBytes(storageRow.used_bytes);
    }

    // عمومی (با صفحه‌بندی مکان‌نما)
    const { data: pub } = await supabase.rpc('paginate_media', {
      p_type: activeTab,
      p_scope: 'public',
      p_cursor_time: null,
      p_cursor_id: null,
      p_limit: 12,
    });
    if (pub) {
      const rows = (pub as MediaItem[]) || [];
      const more = rows.length > 12;
      const items = more ? rows.slice(0, 12) : rows;
      setPublicMedia(items);
      setHasMorePublic(more);
    }
  }, [user, activeTab]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleLoadMoreMedia = async (scope: 'mine' | 'public') => {
    const list = scope === 'mine' ? myMedia : publicMedia;
    if (list.length === 0) return;
    const last = list[list.length - 1];

    if (scope === 'mine') setLoadingMoreMine(true);
    else setLoadingMorePublic(true);

    try {
      const { data, error } = await supabase.rpc('paginate_media', {
        p_type: activeTab,
        p_scope: scope,
        p_cursor_time: last.created_at,
        p_cursor_id: last.id,
        p_limit: 12,
      });
      if (error) throw error;
      const rows = (data as MediaItem[]) || [];
      const more = rows.length > 12;
      const items = more ? rows.slice(0, 12) : rows;

      if (scope === 'mine') {
        setMyMedia((prev) => [...prev, ...items]);
        setHasMoreMine(more);
      } else {
        setPublicMedia((prev) => [...prev, ...items]);
        setHasMorePublic(more);
      }
    } catch (err) {
      console.error('Error loading more media:', err);
    } finally {
      if (scope === 'mine') setLoadingMoreMine(false);
      else setLoadingMorePublic(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedTab: typeof activeTab =
      file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : file.type === 'application/pdf'
        ? 'pdf'
        : 'image';

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && file.type !== 'application/pdf') {
      toast({ variant: 'destructive', title: locale === 'fa' ? 'فرمت ناشناخته' : 'Unknown type' });
      return;
    }

    if (detectedTab !== activeTab) {
      setActiveTab(detectedTab);
    }

    if (usedBytes + file.size > QUOTA_BYTES) {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'فضای شما پر است' : 'Quota exceeded',
        description: locale === 'fa' ? `شما ۱۵ گیگابایت دارید. برای ادامه باید پلن بخرید (به‌زودی).` : `You have 15GB. Buy a plan to continue (soon).`,
      });
      return;
    }

    setUploading(true);
    try {
      const profile = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      const profileId = (profile.data as { id?: string })?.id || null;

      const filePath = `${user.id}/${detectedTab}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('media').upload(filePath, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

      const { error: dbErr } = await supabase.from('media').insert({
        title_en: file.name,
        title_fa: file.name,
        type: detectedTab,
        src_url: urlData.publicUrl,
        file_size: file.size,
        owner_id: user.id,
        created_by: profileId,
        visibility: 'private',
      });
      if (dbErr) throw dbErr;

      toast({ title: locale === 'fa' ? 'آپلود شد' : 'Uploaded' });
      loadMedia();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ variant: 'destructive', title: 'خطا', description: message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updateVisibility = async (id: string, visibility: string) => {
    const { error } = await supabase.from('media').update({ visibility }).eq('id', id);
    if (!error) {
      toast({ title: locale === 'fa' ? 'اشتراک به‌روزرسانی شد' : 'Sharing updated' });
      loadMedia();
    }
  };

  const handleDelete = async (id: string, src: string) => {
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (!error) {
      try {
        const path = extractStoragePath(src);
        if (path) {
          await supabase.storage.from('media').remove([path]);
        }
      } catch (err) {
        console.error('Error removing storage object:', err);
      }
      toast({ title: locale === 'fa' ? 'حذف شد' : 'Deleted' });
      loadMedia();
    } else {
      toast({
        variant: 'destructive',
        title: locale === 'fa' ? 'خطا در حذف' : 'Delete error',
        description: error.message,
      });
    }
  };

  const handleShareWithEmail = async () => {
    if (!sharingItem || !shareEmail.trim()) return;
    setSharingBusy(true);
    const { data, error } = await supabase.rpc('share_media_with_email', {
      p_media_id: sharingItem.id,
      p_email: shareEmail.trim(),
    });
    setSharingBusy(false);

    if (error || (data as Record<string, unknown>)?.ok === false) {
      const msg = error?.message || String((data as Record<string, unknown>)?.error || 'Error sharing file');
      toast({ variant: 'destructive', title: locale === 'fa' ? 'خطا در اشتراک‌گذاری' : 'Sharing Error', description: msg });
    } else {
      toast({
        title: locale === 'fa' ? 'به اشتراک گذاشته شد' : 'File Shared',
        description: locale === 'fa' ? `فایل با موفقیت با ${shareEmail} به اشتراک گذاشته شد.` : `File shared with ${shareEmail}.`,
      });
      setShareEmail('');
      loadMedia();
      setSharingItem(null);
    }
  };

  const pct = Math.min(100, Math.round((usedBytes / QUOTA_BYTES) * 100));

  const tabs = [
    { value: 'image', icon: ImageIcon, label: locale === 'fa' ? 'تصاویر' : 'Images' },
    { value: 'video', icon: Video, label: locale === 'fa' ? 'ویدیوها' : 'Videos' },
    { value: 'audio', icon: Headphones, label: locale === 'fa' ? 'صوت' : 'Audio' },
    { value: 'pdf', icon: FileText, label: locale === 'fa' ? 'اسناد' : 'Documents' },
  ] as const;

  return (
    <div className="min-h-screen py-8" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 font-[IRANSharp]">{title}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-7">
            {locale === 'fa'
              ? 'کتابخانه‌ی چندرسانه‌ای — فضای شخصی ۱۵ گیگابایتی برای هر کاربر، الهام‌گرفته از Google Drive. هر فایل را خصوصی نگه دارید یا با عموم/افرادِ منتخب به اشتراک بگذارید (به همراه صفحه‌بندی مکان‌نما).'
              : 'Multimedia library — 15GB personal drive per user, inspired by Google Drive. Keep files private or share with everyone/selected people (with Keyset Pagination).'}
          </p>
        </div>

        {/* نوار سهمیه — فقط برای لاگین */}
        {user && (
          <Card className="glass-surface mb-6">
            <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{locale === 'fa' ? 'فضای شخصی شما' : 'Your drive'}</span>
                    <span className="font-medium">{fmtBytes(usedBytes)} / 15 GB • {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*,audio/*,application/pdf" />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 me-2" />
                  {uploading ? (locale === 'fa' ? 'در حال آپلود…' : 'Uploading…') : (locale === 'fa' ? 'آپلود فایل' : 'Upload')}
                </Button>
                <Badge variant="outline" className="hidden sm:inline-flex">{locale === 'fa' ? '۱۵ گیگ رایگان' : '15GB free'}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'image' | 'video' | 'audio' | 'pdf')} className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto mb-6">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  <Icon className="h-4 w-4" /> {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-8">
              {/* فضای من */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {locale === 'fa' ? 'فضای من' : 'My drive'}
                  <span className="text-xs font-normal text-muted-foreground">— {myMedia.length} {locale === 'fa' ? 'فایل' : 'files'}</span>
                </h3>
                {!user ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">{locale === 'fa' ? 'برای استفاده از فضای شخصی ۱۵ گیگابایتی وارد شوید' : 'Sign in to use your 15GB personal drive'}</p>
                    <Button onClick={() => setShowLoginDialog(true)}>{locale === 'fa' ? 'ورود' : 'Sign In'}</Button>
                  </Card>
                ) : myMedia.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground text-sm">
                    {locale === 'fa' ? 'هنوز فایلی در این بخش ندارید — آپلود کنید' : 'No files in this section yet — upload one'}
                  </Card>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myMedia.map(item => (
                        <Card key={item.id} className="glass-surface overflow-hidden">
                          <div className="h-36 bg-muted flex items-center justify-center overflow-hidden">
                            {item.type === 'image' && item.src_url ? (
                              <img src={item.src_url} alt={item.title_fa} className="h-full w-full object-cover" />
                            ) : item.type === 'video' ? (
                              <Video className="h-10 w-10 text-muted-foreground" />
                            ) : item.type === 'audio' ? (
                              <Headphones className="h-10 w-10 text-muted-foreground" />
                            ) : (
                              <FileText className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm truncate" title={locale === 'fa' ? item.title_fa : item.title_en}>
                              {locale === 'fa' ? item.title_fa : item.title_en}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{item.file_size ? fmtBytes(item.file_size) : '—'}</span>
                              <Badge variant={item.visibility === 'public' ? 'default' : item.visibility === 'shared' ? 'secondary' : 'outline'} className="text-[10px]">
                                {item.visibility === 'public' ? (locale === 'fa' ? 'عمومی' : 'Public') : item.visibility === 'shared' ? (locale === 'fa' ? 'اشتراکی' : 'Shared') : (locale === 'fa' ? 'خصوصی' : 'Private')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select value={item.visibility || 'private'} onValueChange={v => updateVisibility(item.id, v)}>
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="private"><span className="flex items-center gap-1.5"><Lock className="h-3 w-3" />{locale === 'fa' ? 'خصوصی' : 'Private'}</span></SelectItem>
                                  <SelectItem value="public"><span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />{locale === 'fa' ? 'عمومی' : 'Public'}</span></SelectItem>
                                  <SelectItem value="shared"><span className="flex items-center gap-1.5"><Share2 className="h-3 w-3" />{locale === 'fa' ? 'اشتراکی' : 'Shared'}</span></SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={locale === 'fa' ? 'اشتراک با کاربر (ایمیل)' : 'Share with user'}
                                onClick={() => setSharingItem(item)}
                              >
                                <UserPlus className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id, item.src_url)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={item.src_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {hasMoreMine && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadMoreMedia('mine')}
                          disabled={loadingMoreMine}
                        >
                          {loadingMoreMine ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {locale === 'fa' ? 'در حال بارگذاری...' : 'Loading more...'}
                            </>
                          ) : (
                            locale === 'fa' ? 'بیشتر...' : 'Load more'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* کتابخانه عمومی — همین بخش media */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {locale === 'fa' ? 'کتابخانه‌ی عمومی' : 'Public library'}
                  <span className="text-xs font-normal text-muted-foreground">— {locale === 'fa' ? 'نمایشِ همین بخش' : 'shown here'}</span>
                </h3>
                {publicMedia.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    {locale === 'fa' ? 'هنوز محتوای عمومی در این دسته منتشر نشده' : 'No public content in this category yet'}
                  </Card>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {publicMedia.map(item => (
                        <Card key={item.id} className="glass-surface overflow-hidden">
                          <div className="h-36 bg-muted flex items-center justify-center overflow-hidden">
                            {item.type === 'image' && (
                              <img src={item.src_url} alt={item.title_fa} className="h-full w-full object-cover" />
                            )}
                            {item.type === 'video' && <Video className="h-10 w-10 text-muted-foreground" />}
                            {item.type === 'audio' && <Headphones className="h-10 w-10 text-muted-foreground" />}
                            {item.type === 'pdf' && <FileText className="h-10 w-10 text-muted-foreground" />}
                          </div>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm truncate">{locale === 'fa' ? item.title_fa : item.title_en}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{item.file_size ? fmtBytes(item.file_size) : ''}</span>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={item.src_url} target="_blank" rel="noreferrer">{locale === 'fa' ? 'نمایش' : 'View'}</a>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {hasMorePublic && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadMoreMedia('public')}
                          disabled={loadingMorePublic}
                        >
                          {loadingMorePublic ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {locale === 'fa' ? 'در حال بارگذاری...' : 'Loading more...'}
                            </>
                          ) : (
                            locale === 'fa' ? 'بیشتر...' : 'Load more'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* پاپ‌آپ اشتراک‌گذاری رسانه با کاربر */}
        <Dialog open={!!sharingItem} onOpenChange={(o) => !o && setSharingItem(null)}>
          <DialogContent className="glass-surface max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                <span>{locale === 'fa' ? 'اشتراک‌گذاری رسانه با کاربر' : 'Share Media with User'}</span>
              </DialogTitle>
              <DialogDescription>
                {locale === 'fa'
                  ? 'ایمیل کاربری که می‌خواهید این فایل با او به اشتراک گذاشته شود را وارد کنید. سطح دسترسی به طور خودکار روی «اشتراکی» تنظیم می‌شود.'
                  : 'Enter the user email to share this file with. Visibility will automatically switch to “Shared”.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{locale === 'fa' ? 'ایمیل کاربر هدف' : 'Target User Email'}</Label>
                <Input
                  dir="ltr"
                  type="email"
                  placeholder="user@kaghazbaad.test"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleShareWithEmail()}
                />
              </div>
              {sharingItem?.shared_with && sharingItem.shared_with.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-muted-foreground font-medium">
                    {locale === 'fa' ? 'کاربران دارای دسترسی:' : 'Users with access:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sharingItem.shared_with.map((uid) => (
                      <Badge key={uid} variant="secondary" className="font-mono text-[10px]">
                        {uid.slice(0, 8)}...
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSharingItem(null)}>
                {locale === 'fa' ? 'لغو' : 'Cancel'}
              </Button>
              <Button onClick={handleShareWithEmail} disabled={sharingBusy || !shareEmail.trim()}>
                {sharingBusy
                  ? (locale === 'fa' ? 'در حال اشتراک...' : 'Sharing...')
                  : (locale === 'fa' ? 'اشتراک‌گذاری' : 'Share')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* پاپ‌آپ اجباری ورود */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{locale === 'fa' ? 'کتابخانه‌ی چندرسانه‌ای' : 'Multimedia Library'}</DialogTitle>
              <DialogDescription className="leading-6">
                {locale === 'fa'
                  ? 'برای دسترسی به کتابخانه‌ی چندرسانه‌ای کاغذ و باد — فضای شخصی ۱۵ گیگابایتی، آپلود ۴ نوع رسانه و اشتراک‌گذاری — باید وارد شوید.'
                  : 'To access the KaghazBaad multimedia library — 15GB personal drive, 4 media types and sharing — you must sign in.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLoginDialog(false)}>{locale === 'fa' ? 'بعداً' : 'Later'}</Button>
              <Button onClick={() => navigate('/auth')}>{locale === 'fa' ? 'ورود / ثبت‌نام' : 'Sign In'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
