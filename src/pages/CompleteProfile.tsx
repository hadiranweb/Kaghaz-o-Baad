import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const profileSchema = z.object({
  first_name: z.string().trim().min(2, { message: "نام باید حداقل ۲ کاراکتر باشد" }).max(50),
  last_name: z.string().trim().min(2, { message: "نام خانوادگی باید حداقل ۲ کاراکتر باشد" }).max(50),
  phone: z.string().trim().min(10, { message: "شماره تلفن باید حداقل ۱۰ رقم باشد" }).max(15),
  bio_en: z.string().max(500).optional(),
  bio_fa: z.string().max(500).optional(),
  display_name: z.string().trim().max(60).optional(),
  avatar_url: z.string().trim().url({ message: "آدرس تصویر معتبر نیست" }).optional().or(z.literal('')),
});

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio_en: '',
    bio_fa: '',
    display_name: '',
    avatar_url: '',
    show_on_cards: false,
    show_in_community: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      const meta = user.user_metadata || {};
      setProfileData(prev => ({
        ...prev,
        first_name: meta.first_name || prev.first_name,
        last_name: meta.last_name || prev.last_name,
        phone: meta.phone || prev.phone,
      }));
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setProfileData({
              first_name: data.first_name || meta.first_name || '',
              last_name: data.last_name || meta.last_name || '',
              phone: data.phone || meta.phone || '',
              bio_en: data.bio_en || '',
              bio_fa: data.bio_fa || '',
              display_name: (data as any).display_name || '',
              avatar_url: (data as any).avatar_url || '',
              show_on_cards: (data as any).show_on_cards || false,
              show_in_community: (data as any).show_in_community || false,
            });
          }
        });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      profileSchema.parse(profileData);

      const payload: any = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        bio_en: profileData.bio_en || null,
        bio_fa: profileData.bio_fa || null,
        display_name: profileData.display_name?.trim() || null,
        avatar_url: profileData.avatar_url?.trim() || null,
        show_on_cards: profileData.show_on_cards,
        show_in_community: profileData.show_in_community,
      };

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      let error;
      if (existing) {
        const res = await supabase.from('profiles').update(payload).eq('user_id', user?.id);
        error = res.error;
      } else {
        const res = await supabase.from('profiles').insert({ ...payload, user_id: user?.id });
        error = res.error;
      }
      if (error) throw error;

      toast({
        title: locale === 'fa' ? 'موفق' : 'Success',
        description: locale === 'fa' ? 'پروفایل شما با موفقیت ذخیره شد' : 'Your profile has been saved successfully',
      });

      navigate('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        console.error('Error updating profile:', error);
        toast({
          variant: "destructive",
          title: locale === 'fa' ? 'خطا' : 'Error',
          description: locale === 'fa' ? 'خطا در ذخیره اطلاعات' : 'Error saving profile',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayNamePreview = profileData.display_name?.trim() || `${profileData.first_name} ${profileData.last_name}`.trim() || '—';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="glass-surface">
        <CardHeader>
          <CardTitle>
            {locale === 'fa' ? 'تکمیل اطلاعات پروفایل' : 'Complete Your Profile'}
          </CardTitle>
          <CardDescription>
            {locale === 'fa' 
              ? 'برای ایجاد مقاله و حضور در جامعه، لطفاً اطلاعات زیر را تکمیل کنید'
              : 'Please complete the following information to create articles and join the community'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                {locale === 'fa' ? 'نام (انگلیسی)' : 'First Name (English)'}
              </Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                placeholder="John"
                dir="ltr"
                required
              />
              {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                {locale === 'fa' ? 'نام خانوادگی (انگلیسی)' : 'Last Name (English)'}
              </Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                placeholder="Doe"
                dir="ltr"
                required
              />
              {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                {locale === 'fa' ? 'شماره تلفن' : 'Phone Number'}
              </Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+98 912 345 6789"
                dir="ltr"
                required
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">
                  {locale === 'fa' ? 'نام نمایشی' : 'Display Name'}
                </Label>
                <Input
                  id="display_name"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                  placeholder={locale === 'fa' ? 'مثال: سینا رضوی' : 'e.g. Sina Razavi'}
                />
                <p className="text-xs text-muted-foreground">
                  {locale === 'fa' ? 'در کارت‌ها و مدار جامعه نمایش داده می‌شود' : 'Shown on cards and community orbit'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar_url">
                  {locale === 'fa' ? 'آدرس تصویر (URL)' : 'Avatar URL'}
                </Label>
                <Input
                  id="avatar_url"
                  value={profileData.avatar_url}
                  onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
                {errors.avatar_url && <p className="text-sm text-destructive">{errors.avatar_url}</p>}
              </div>
            </div>

            {profileData.avatar_url && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profileData.avatar_url} alt={displayNamePreview} />
                  <AvatarFallback>{displayNamePreview.slice(0,2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{displayNamePreview}</span>
                  <span className="text-xs text-muted-foreground">{locale === 'fa' ? 'پیش‌نمایش' : 'Preview'}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bio_en">
                {locale === 'fa' ? 'بیوگرافی (انگلیسی)' : 'Bio (English)'}
              </Label>
              <Textarea
                id="bio_en"
                value={profileData.bio_en}
                onChange={(e) => setProfileData({ ...profileData, bio_en: e.target.value })}
                placeholder="A short bio about yourself..."
                dir="ltr"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio_fa">
                {locale === 'fa' ? 'بیوگرافی (فارسی)' : 'Bio (Persian)'}
              </Label>
              <Textarea
                id="bio_fa"
                value={profileData.bio_fa}
                onChange={(e) => setProfileData({ ...profileData, bio_fa: e.target.value })}
                placeholder="بیوگرافی کوتاه درباره خودتان..."
                dir="rtl"
                rows={3}
              />
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
              <h4 className="text-sm font-semibold">
                {locale === 'fa' ? 'نمایش عمومی' : 'Public Visibility'}
              </h4>
              <p className="text-xs text-muted-foreground leading-5">
                {locale === 'fa'
                  ? 'با فعال‌سازی، تصویر و نام نمایشی شما در کارت مقالات/رسانه‌ها و در صفحه‌ی جامعه (مدار مغز) برای همه نمایش داده می‌شود.'
                  : 'When enabled, your avatar and display name appear on article/media cards and on the community orbit for everyone.'}
              </p>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="show_on_cards" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium">{locale === 'fa' ? 'نمایش در کارت نوشته‌ها' : 'Show on cards'}</span>
                  <span className="block text-xs text-muted-foreground font-normal">{locale === 'fa' ? 'مقالات، مدیا و هر محتوای عمومی' : 'Articles, media and any public content'}</span>
                </Label>
                <Switch
                  id="show_on_cards"
                  checked={profileData.show_on_cards}
                  onCheckedChange={(v) => setProfileData({ ...profileData, show_on_cards: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="show_in_community" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium">{locale === 'fa' ? 'نمایش در مدار جامعه' : 'Show in community orbit'}</span>
                  <span className="block text-xs text-muted-foreground font-normal">{locale === 'fa' ? 'اسکرول بی‌نهایت اطراف مغز در صفحه‌ی جامعه' : 'Infinite orbit around brain on community page'}</span>
                </Label>
                <Switch
                  id="show_in_community"
                  checked={profileData.show_in_community}
                  onCheckedChange={(v) => setProfileData({ ...profileData, show_in_community: v })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setProfileData({ ...profileData, show_on_cards: true, show_in_community: true })}>
                  {locale === 'fa' ? 'فعال‌سازی هر دو' : 'Enable both'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setProfileData({ ...profileData, show_on_cards: false, show_in_community: false })}>
                  {locale === 'fa' ? 'غیرفعال' : 'Disable'}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting 
                ? (locale === 'fa' ? 'در حال ذخیره...' : 'Saving...')
                : (locale === 'fa' ? 'ذخیره و ادامه' : 'Save and Continue')
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
