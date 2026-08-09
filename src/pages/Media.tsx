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
import { Image as ImageIcon, Video, FileText, Headphones, Upload, HardDrive, Share2, Lock, Globe, Trash2, Eye } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
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
  const fileRef = useRef<HTMLInputElement>(null);

  const title = locale === 'fa' ? 'چندرسانه‌ای' : 'Media';

  // اگر کاربر لاگین نیست و وارد صفحه شد، پاپ‌آپ نمایش ده
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setShowLoginDialog(true), 400);
      return () => clearTimeout(timer);
    } else {
      setShowLoginDialog(false);
    }
  }, [user]);

  const loadMedia = async () => {
    if (!user) {
      // فقط عمومی
      const { data } = await supabase.from('media').select('*').eq('visibility', 'public').order('created_at', { ascending: false }).limit(50);
      if (data) setPublicMedia(data as any);
      return;
    }
    // شخصی
    const { data: mine } = await supabase.from('media').select('*').or(`owner_id.eq.${user.id},created_by.eq.${user.id}`).order('created_at', { ascending: false });
    if (mine) {
      setMyMedia(mine as any);
      const sum = (mine as any[]).reduce((s, m) => s + (m.file_size || 0), 0);
      setUsedBytes(sum);
    }
    // عمومی
    const { data: pub } = await supabase.from('media').select('*').eq('visibility', 'public').order('created_at', { ascending: false }).limit(50);
    if (pub) setPublicMedia(pub as any);
  };

  useEffect(() => {
    loadMedia();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // بررسی 4 نوع
    const typeMap: Record<string, 'image' | 'video' | 'audio' | 'pdf'> = {
      'image/': 'image',
      'video/': 'video',
      'audio/': 'audio',
      'application/pdf': 'pdf',
    };
    let detected: typeof activeTab = activeTab;
    if (file.type.startsWith('image/')) detected = 'image';
    else if (file.type.startsWith('video/')) detected = 'video';
    else if (file.type.startsWith('audio/')) detected = 'audio';
    else if (file.type === 'application/pdf') detected = 'pdf';
    else {
      toast({ variant: 'destructive', title: locale === 'fa' ? 'فرمت ناشناخته' : 'Unknown type' });
      return;
    }

    if (detected !== activeTab) {
      setActiveTab(detected);
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
      const profileId = (profile.data as any)?.id || null;

      const filePath = `${user.id}/${detected}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('media').upload(filePath, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

      const { error: dbErr } = await supabase.from('media').insert({
        title_en: file.name,
        title_fa: file.name,
        type: detected,
        src_url: urlData.publicUrl,
        file_size: file.size,
        owner_id: user.id,
        created_by: profileId,
        visibility: 'private',
      } as any);
      if (dbErr) throw dbErr;

      toast({ title: locale === 'fa' ? 'آپلود شد' : 'Uploaded' });
      loadMedia();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطا', description: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updateVisibility = async (id: string, visibility: string) => {
    const { error } = await supabase.from('media').update({ visibility } as any).eq('id', id);
    if (!error) {
      toast({ title: locale === 'fa' ? 'اشتراک به‌روزرسانی شد' : 'Sharing updated' });
      loadMedia();
    }
  };

  const handleDelete = async (id: string, src: string) => {
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (!error) {
      // حذف از storage هم تلاش کن
      try {
        const path = src.split('/media/')[1];
        if (path) await supabase.storage.from('media').remove([decodeURIComponent(path.split('?')[0])]);
      } catch {}
      loadMedia();
    }
  };

  const pct = Math.min(100, Math.round((usedBytes / QUOTA_BYTES) * 100));

  const filteredMine = myMedia.filter(m => m.type === activeTab);
  const filteredPublic = publicMedia.filter(m => m.type === activeTab);

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
              ? 'کتابخانه‌ی چندرسانه‌ای — فضای شخصی ۱۵ گیگابایتی برای هر کاربر، الهام‌گرفته از Google Drive. هر فایل را خصوصی نگه دارید یا با عموم/افرادِ منتخب به اشتراک بگذارید. نمایش عمومیِ همین بخش، فقط محتوای اشتراکیِ «عمومی» است.'
              : 'Multimedia library — 15GB personal drive per user, inspired by Google Drive. Keep files private or share with everyone/selected people. The public view here shows only “public” shares.'}
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
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
                  <span className="text-xs font-normal text-muted-foreground">— {filteredMine.length} {locale === 'fa' ? 'فایل' : 'files'}</span>
                </h3>
                {!user ? (
                  <Card className="p-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">{locale === 'fa' ? 'برای استفاده از فضای شخصی ۱۵ گیگابایتی وارد شوید' : 'Sign in to use your 15GB personal drive'}</p>
                    <Button onClick={() => setShowLoginDialog(true)}>{locale === 'fa' ? 'ورود' : 'Sign In'}</Button>
                  </Card>
                ) : filteredMine.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground text-sm">
                    {locale === 'fa' ? 'هنوز فایلی در این بخش ندارید — آپلود کنید' : 'No files in this section yet — upload one'}
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMine.map(item => (
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
                )}
              </div>

              {/* کتابخانه عمومی — همین بخش media */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {locale === 'fa' ? 'کتابخانه‌ی عمومی' : 'Public library'}
                  <span className="text-xs font-normal text-muted-foreground">— {locale === 'fa' ? 'نمایشِ همین بخش' : 'shown here'}</span>
                </h3>
                {filteredPublic.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    {locale === 'fa' ? 'هنوز محتوای عمومی در این دسته منتشر نشده' : 'No public content in this category yet'}
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPublic.map(item => (
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
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

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
