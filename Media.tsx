import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Video, FileText, Headphones } from 'lucide-react';

export default function Media() {
  const { locale, t } = useLanguage();

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('nav.media')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            {locale === 'fa' 
              ? 'کتابخانه رسانه‌های علمی - تصاویر، ویدیوها، فایل‌ها و محتوای چندرسانه‌ای'
              : 'Academic media library - images, videos, files and multimedia content'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Placeholder cards */}
          {[
            { type: 'image', icon: ImageIcon, label: locale === 'fa' ? 'تصاویر' : 'Images' },
            { type: 'video', icon: Video, label: locale === 'fa' ? 'ویدیوها' : 'Videos' },
            { type: 'pdf', icon: FileText, label: locale === 'fa' ? 'اسناد' : 'Documents' },
            { type: 'audio', icon: Headphones, label: locale === 'fa' ? 'صوت' : 'Audio' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.type} className="glass-surface p-6 text-center hover:shadow-elegant transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-[12px] bg-secondary flex items-center justify-center mx-auto mb-4 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.label}</h3>
                <Badge variant="secondary">Coming Soon</Badge>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}