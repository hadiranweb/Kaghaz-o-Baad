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
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const profileSchema = z.object({
  first_name: z.string().trim().min(2, { message: "نام باید حداقل ۲ کاراکتر باشد" }).max(50),
  last_name: z.string().trim().min(2, { message: "نام خانوادگی باید حداقل ۲ کاراکتر باشد" }).max(50),
  phone: z.string().trim().min(10, { message: "شماره تلفن باید حداقل ۱۰ رقم باشد" }).max(15),
  bio_en: z.string().max(500).optional(),
  bio_fa: z.string().max(500).optional(),
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
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      // Pre-fill from user metadata
      const meta = user.user_metadata || {};
      setProfileData(prev => ({
        ...prev,
        first_name: meta.first_name || prev.first_name,
        last_name: meta.last_name || prev.last_name,
        phone: meta.phone || prev.phone,
      }));
      // Also try to load existing profile
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

      // Try update first, if no rows affected then insert
      const { error: updateError, count } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user?.id)
        .select();

      if (updateError) {
        // If update fails, try insert (profile might not exist yet)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ ...profileData, user_id: user?.id });
        if (insertError) throw insertError;
      } else if (count === 0) {
        // No rows updated, insert new
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ ...profileData, user_id: user?.id });
        if (insertError) throw insertError;
      }

      toast({
        title: locale === 'fa' ? 'موفق' : 'Success',
        description: locale === 'fa' ? 'پروفایل شما با موفقیت تکمیل شد' : 'Your profile has been completed successfully',
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="glass-surface">
        <CardHeader>
          <CardTitle>
            {locale === 'fa' ? 'تکمیل اطلاعات پروفایل' : 'Complete Your Profile'}
          </CardTitle>
          <CardDescription>
            {locale === 'fa' 
              ? 'برای ایجاد مقاله، لطفاً اطلاعات زیر را تکمیل کنید'
              : 'Please complete the following information to create articles'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
