import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Handshake, Network, GraduationCap, Heart } from 'lucide-react';
import { BrainAnimation } from '@/components/BrainAnimation';

type Collaborator = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio_en: string | null;
  bio_fa: string | null;
};

export default function Community() {
  const { locale } = useLanguage();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('public_profiles')
        .select('id, display_name, first_name, last_name, avatar_url, bio_en, bio_fa')
        .eq('show_in_community', true)
        .order('display_name', { ascending: true });
      if (data) setCollaborators(data as any);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    document.title = locale === 'fa' ? 'جامعه — کاغذ و باد' : 'Community — KaghazBaad';
  }, [locale]);

  // Duplicate for seamless infinite scroll
  const orbitList = collaborators.length > 0 ? [...collaborators, ...collaborators, ...collaborators] : [];

  return (
    <div className="min-h-screen" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      {/* Hero — مغز ثابت + مدار بی‌نهایت همکاران */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 lg:px-8 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-3xl md:text-5xl font-bold font-[IRANSharp] mb-4">
              {locale === 'fa' ? 'جامعه‌ی کاغذ و باد' : 'KaghazBaad Community'}
            </h1>
            <p className="text-muted-foreground leading-7 font-light">
              {locale === 'fa'
                ? 'شبکه‌ای کوچک از خوانندگان، نویسندگان و همراهانِ دقیق — هر کس که بخواهد بماند، با یک تیک ساده به مدارِ همکاران می‌پیوندد و چهره‌اش پیرامونِ مغزِ مشترک می‌چرخد.'
                : 'A small network of readers, writers and precise companions — anyone who wishes to stay joins the orbit with a single toggle, circling the shared brain.'}
            </p>
          </div>

          {/* Orbit */}
          <div className="relative mx-auto w-full max-w-[720px] aspect-square flex items-center justify-center">
            {/* Center brain — stays */}
            <div className="relative z-10 w-[220px] md:w-[260px] bg-card rounded-full p-6 shadow-elegant border border-border/50">
              <BrainAnimation />
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />
            </div>

            {/* Orbit rings */}
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : orbitList.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-muted-foreground bg-card/80 backdrop-blur px-4 py-2 rounded-full border">
                  {locale === 'fa' ? 'هنوز همکارِ نمایانی ثبت نشده' : 'No visible collaborators yet'}
                </p>
              </div>
            ) : (
              <>
                {/* Two orbits — outer and inner for depth */}
                <div className="absolute inset-0 animate-[spin_80s_linear_infinite] will-change-transform" style={{ animationDirection: 'normal' }}>
                  {orbitList.slice(0, Math.ceil(orbitList.length / 2)).map((person, i) => {
                    const total = Math.ceil(orbitList.length / 2);
                    const angle = (i / total) * 360;
                    const radius = 260; // px
                    return (
                      <div
                        key={`outer-${person.id}-${i}`}
                        className="absolute left-1/2 top-1/2"
                        style={{ transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)` }}
                      >
                        <div className="flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2">
                          <Avatar className="h-12 w-12 md:h-14 md:w-14 border-2 border-background shadow-soft">
                            <AvatarImage src={person.avatar_url || undefined} alt={person.display_name || ''} />
                            <AvatarFallback className="text-xs">{(person.display_name || person.first_name || '?').slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-medium bg-card/90 backdrop-blur px-2 py-0.5 rounded-full border shadow-sm whitespace-nowrap max-w-[110px] truncate">
                            {person.display_name || `${person.first_name || ''} ${person.last_name || ''}`.trim()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-0 animate-[spin_120s_linear_infinite_reverse] will-change-transform">
                  {orbitList.slice(Math.ceil(orbitList.length / 2)).map((person, i) => {
                    const total = Math.ceil(orbitList.length / 2);
                    const angle = (i / total) * 360;
                    const radius = 170;
                    return (
                      <div
                        key={`inner-${person.id}-${i}`}
                        className="absolute left-1/2 top-1/2"
                        style={{ transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)` }}
                      >
                        <div className="flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2">
                          <Avatar className="h-10 w-10 md:h-11 md:w-11 border-2 border-background shadow-soft">
                            <AvatarImage src={person.avatar_url || undefined} alt={person.display_name || ''} />
                            <AvatarFallback className="text-[10px]">{(person.display_name || person.first_name || '?').slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] bg-background/80 backdrop-blur px-1.5 py-0.5 rounded-full border text-muted-foreground whitespace-nowrap max-w-[90px] truncate">
                            {person.display_name || `${person.first_name || ''} ${person.last_name || ''}`.trim()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Glow */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {locale === 'fa'
              ? 'نمایش بر اساس تیکِ «نمایش در مدار جامعه» در تنظیمات پروفایل — بی‌نهایت و پیوسته'
              : 'Shown from those who enabled “Show in community orbit” in profile settings — infinite and seamless'}
          </p>
        </div>
      </section>

      {/* Literary structured sections */}
      <section className="container mx-auto px-4 lg:px-8 py-12 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {locale === 'fa' ? 'کاربران' : 'Users'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground font-light">
              {locale === 'fa'
                ? 'هر خواننده‌ای که وارد می‌شود، پیش از هر چیز «کاربر» است: می‌خواند، می‌جوید و در سکوتِ متن می‌ماند. برای کاربر، سادگی و سرعت مهم است؛ نه ابزارِ اضافی. به همین دلیل کارتِ نوشته‌ها تا زمانی که خودِ او نخواهد، چهره‌ای نشان نمی‌دهد.'
                : 'Every visitor first arrives as a “user”: reading, searching and lingering in silence. For users, simplicity and speed matter — not extra tools. That is why cards show no face until they choose to.'}
            </CardContent>
          </Card>

          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                {locale === 'fa' ? 'همکاران' : 'Collaborators'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground font-light">
              {locale === 'fa'
                ? 'همکار کسی است که تیکِ «نمایش در کارت» را روشن می‌کند: نام و تصویرش در پایِ هر نوشته‌ای که پدید آورده می‌نشیند — نه برای نمایش، برای مسئولیت. همکار می‌گوید: «این متن را من نوشته‌ام و پایِ آن می‌ایستم.»'
                : 'A collaborator is one who enables “Show on cards”: their name and avatar sit at the foot of each piece they authored — not for show, but for responsibility.'}
            </CardContent>
          </Card>

          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Handshake className="h-5 w-5 text-primary" />
                {locale === 'fa' ? 'شرکا' : 'Partners'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground font-light">
              {locale === 'fa'
                ? 'شریک، همکارِ مانا است: نه یک مقاله، بلکه یک مسیر را همراهی می‌کند. شرکا در مدارِ مغز می‌چرخند، در جلساتِ زنده می‌مانند و در ویراستِ نهایی نظر می‌دهند. حضورشان پیوسته است.'
                : 'A partner is a lasting collaborator: not one article, but a trajectory. Partners orbit the brain, stay in live sessions and weigh in on final edits. Their presence is continuous.'}
            </CardContent>
          </Card>

          <Card className="glass-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="h-5 w-5 text-primary" />
                {locale === 'fa' ? 'جامعه' : 'Community'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground font-light">
              {locale === 'fa'
                ? 'جامعه، جمعِ هر سه است — اما نه جمعِ عددی، جمعِ معنایی. جامعه جایی است که متنِ منفرد به حافظه‌ی مشترک تبدیل می‌شود: پرسش‌ها می‌مانند، پاسخ‌ها اصلاح می‌شوند و مدارِ مغز هر روز پررنگ‌تر می‌شود.'
                : 'Community is the sum of all three — not a numeric sum, but a semantic one. It is where a single text becomes shared memory: questions remain, answers are refined, and the brain’s orbit grows denser each day.'}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 glass-surface border-dashed">
          <CardContent className="py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <p className="text-sm leading-6">
                {locale === 'fa'
                  ? 'می‌خواهی دیده شوی؟ در «تکمیل پروفایل» تیکِ نمایش را فعال کن — چهره‌ات به مدار می‌پیوندد.'
                  : 'Want to be seen? Enable the visibility toggles in “Complete Profile” — your face joins the orbit.'}
              </p>
            </div>
            <a href="/complete-profile" className="text-sm font-medium text-primary hover:underline">
              {locale === 'fa' ? 'رفتن به تنظیمات →' : 'Go to settings →'}
            </a>
          </CardContent>
        </Card>

        {/* Grid of collaborators */}
        {collaborators.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-4 font-[IRANSharp]">
              {locale === 'fa' ? 'چهره‌های مدار' : 'Faces of the orbit'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {collaborators.map((p) => (
                <Card key={p.id} className="glass-surface text-center p-4">
                  <Avatar className="h-16 w-16 mx-auto">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback>{(p.display_name || p.first_name || '?').slice(0,2)}</AvatarFallback>
                  </Avatar>
                  <div className="mt-3 font-medium text-sm truncate">{p.display_name || `${p.first_name} ${p.last_name}`}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                    {locale === 'fa' ? p.bio_fa : p.bio_en}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin_reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        .animate-[spin_80s_linear_infinite] { animation: spin 80s linear infinite; }
        .animate-[spin_120s_linear_infinite_reverse] { animation: spin_reverse 120s linear infinite; }
      `}</style>
    </div>
  );
}
