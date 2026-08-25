import { useLanguage } from '@/contexts/LanguageContext';
import { setSeoMetadata } from '@/lib/seo';

export default function Terms() {
  const { locale } = useLanguage();
  setSeoMetadata({
    title: locale === 'fa' ? 'شرایط استفاده — کاغذ و باد' : 'Terms of Service — KaghazBaad',
    description: locale === 'fa' ? 'شرایط خدمات پلتفرم کاغذ و باد شامل مالکیت معنوی، سیاست محتوا و مسئولیت محدود.' : 'Terms of service for the KaghazBaad platform.',
    canonicalPath: locale === 'fa' ? '/fa/terms/' : '/en/terms/',
    indexing: 'index',
    public: true,
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-reading-fg leading-relaxed">
      <h1 className="text-hero mb-10">{locale === 'fa' ? 'شرایط استفاده' : 'Terms of Service'}</h1>
      <div className="prose-reading space-y-6">
        <h2>1. Intellectual Property</h2>
        <p>Articles and slides remain the property of their authors. The platform holds a non-exclusive license for hosting and indexing.</p>
        <h2>2. Content Policy</h2>
        <p>No plagiarism, fabricated citations, or unsupported claims. AI-generated suggestions must be reviewed by a human before publication.</p>
        <h2>3. User Accounts</h2>
        <p>Verified identity is required for publication. Accounts may be suspended for policy violations.</p>
        <h2>4. Subscription and Billing</h2>
        <p>Subscriptions are managed through the billing engine. Refunds follow the subscription lifecycle policy.</p>
        <h2>5. Limitation of Liability</h2>
        <p>Services are provided "as-is". Maximum liability is limited to one year of subscription fees or zero for free users.</p>
        <h2>6. Governing Law</h2>
        <p>These terms are governed by the laws of the Islamic Republic of Iran. Disputes are resolved through arbitration in Tehran.</p>
      </div>
    </main>
  );
}
