import { useLanguage } from '@/contexts/LanguageContext';
import { setSeoMetadata } from '@/lib/seo';

export default function Privacy() {
  const { locale } = useLanguage();
  setSeoMetadata({
    title: locale === 'fa' ? 'حریم خصوصی — کاغذ و باد' : 'Privacy Policy — KaghazBaad',
    description: locale === 'fa' ? 'سیاست‌های حریم خصوصی پلتفرم کاغذ و باد.' : 'Privacy policy for the KaghazBaad platform.',
    canonicalPath: locale === 'fa' ? '/fa/privacy/' : '/en/privacy/',
    indexing: 'index',
    public: true,
  });

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-reading-fg leading-relaxed">
      <h1 className="text-hero mb-10">{locale === 'fa' ? 'حریم خصوصی' : 'Privacy Policy'}</h1>
      <div className="prose-reading space-y-6">
        <h2>Data Collection</h2>
        <p>We collect only the data necessary to provide services: user identity, article content, session records, and usage metrics for quota enforcement.</p>
        <h2>Data Protection</h2>
        <p>All personal data is encrypted in transit (TLS 1.3) and at rest. We do not share user data with third-party advertisers.</p>
        <h2>User Rights</h2>
        <p>Users may request access, correction, or deletion of their personal data through the dashboard or by contacting support.</p>
      </div>
    </main>
  );
}
