import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudCog, Network, Plus, RefreshCw, ShieldAlert, Trash2, UploadCloud } from 'lucide-react';
import { adminOpenWebUiAccess, type OpenWebUiAllowlistEntry, type OpenWebUiAllowlistSync } from '@/lib/backend-api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const EMPTY_SYNC: OpenWebUiAllowlistSync = {
  edgeConfigured: false,
  desiredRevision: 0,
  appliedRevision: 0,
  isInSync: false,
  lastSyncStatus: 'not_configured',
  lastSyncAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
};

export default function OpenWebUiAccessManager() {
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [entries, setEntries] = useState<OpenWebUiAllowlistEntry[]>([]);
  const [sync, setSync] = useState<OpenWebUiAllowlistSync>(EMPTY_SYNC);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cidr, setCidr] = useState('');
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(true);

  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);
  const enabledCount = useMemo(() => entries.filter((entry) => entry.enabled).length, [entries]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminOpenWebUiAccess({ action: 'list' });
      setEntries(response.entries ?? []);
      setSync(response.sync ?? EMPTY_SYNC);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('بارگذاری ناموفق بود', 'Unable to load'),
        description: error instanceof Error ? error.message : t('وضعیت دسترسی Open WebUI خوانده نشد.', 'Open WebUI access status could not be read.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createEntry = async () => {
    if (!cidr.trim()) {
      toast({ variant: 'destructive', title: t('IP یا CIDR لازم است', 'IP or CIDR is required') });
      return;
    }
    setCreating(true);
    try {
      await adminOpenWebUiAccess({ action: 'create', cidr: cidr.trim(), label: label.trim(), enabled });
      setCidr('');
      setLabel('');
      setEnabled(true);
      toast({ title: t('آدرس ثبت شد', 'Address saved'), description: t('برای اعمال روی لبه، «اعمال در لبه» را جداگانه تأیید کنید.', 'Confirm Apply at edge separately to enforce this change.') });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: t('ثبت ناموفق بود', 'Save failed'), description: error instanceof Error ? error.message : 'entry_create_failed' });
    } finally {
      setCreating(false);
    }
  };

  const toggleEntry = async (entry: OpenWebUiAllowlistEntry, nextEnabled: boolean) => {
    setBusyId(entry.id);
    try {
      await adminOpenWebUiAccess({ action: 'update', entryId: entry.id, enabled: nextEnabled });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: t('به‌روزرسانی ناموفق بود', 'Update failed'), description: error instanceof Error ? error.message : 'entry_update_failed' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteEntry = async (entry: OpenWebUiAllowlistEntry) => {
    setBusyId(entry.id);
    try {
      await adminOpenWebUiAccess({ action: 'delete', entryId: entry.id });
      toast({ title: t('آدرس از فهرست مدیریتی حذف شد', 'Address removed from desired state') });
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: t('حذف ناموفق بود', 'Delete failed'), description: error instanceof Error ? error.message : 'entry_delete_failed' });
    } finally {
      setBusyId(null);
    }
  };

  const synchronize = async () => {
    setSyncing(true);
    try {
      const response = await adminOpenWebUiAccess({ action: 'sync', confirmation: 'SYNC_OPENWEBUI_ALLOWLIST' });
      setSync(response.sync ?? EMPTY_SYNC);
      toast({ title: t('قواعد لبه به‌روزرسانی شد', 'Edge rules synchronized') });
      await load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('اعمال در لبه ناموفق بود', 'Edge apply failed'),
        description: error instanceof Error ? error.message : 'cloudflare_sync_failed',
      });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const syncBadge = sync.isInSync
    ? { variant: 'default' as const, text: t('همگام و فعال', 'Applied and in sync'), icon: CheckCircle2 }
    : sync.lastSyncStatus === 'failed'
      ? { variant: 'destructive' as const, text: t('آخرین اعمال ناموفق', 'Last apply failed'), icon: ShieldAlert }
      : { variant: 'secondary' as const, text: t('نیازمند اعمال در لبه', 'Pending edge apply'), icon: CloudCog };
  const SyncIcon = syncBadge.icon;

  return (
    <div className="space-y-5">
      <Card className="glass-surface border-primary/20">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Network className="h-5 w-5 text-primary" />
                {t('دسترسی شبکه‌ای Open WebUI', 'Open WebUI Network Access')}
              </CardTitle>
              <CardDescription>
                {t(
                  'فقط مدیران سامانه می‌توانند IP/CIDRهای مجاز را مدیریت کنند. ثبت تغییر در این صفحه تا تأیید جداگانهٔ «اعمال در لبه» به Cloudflare ارسال نمی‌شود.',
                  'Only system administrators can manage allowed IP/CIDRs. Changes remain desired state until Apply at edge is separately confirmed.',
                )}
              </CardDescription>
            </div>
            <Badge variant={syncBadge.variant} className="gap-1.5 py-1.5">
              <SyncIcon className="h-3.5 w-3.5" />
              {syncBadge.text}
            </Badge>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2">
              {t('آدرس‌های فعال:', 'Enabled entries:')} <strong className="text-foreground" dir="ltr">{enabledCount}</strong>
            </div>
            <div className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2">
              {t('نسخهٔ مورد نظر:', 'Desired revision:')} <strong className="text-foreground" dir="ltr">{sync.desiredRevision}</strong>
            </div>
            <div className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2">
              {t('نسخهٔ اعمال‌شده:', 'Applied revision:')} <strong className="text-foreground" dir="ltr">{sync.appliedRevision}</strong>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="text-base">{t('افزودن IP یا CIDR مجاز', 'Add allowed IP or CIDR')}</CardTitle>
          <CardDescription>
            {t('IPv4/IPv6 عمومی وارد کنید. شبکه‌های داخلی، loopback و multicast پذیرفته نمی‌شوند.', 'Enter a public IPv4/IPv6 address. Private, loopback and multicast ranges are rejected.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="openwebui-cidr">{t('IP یا CIDR', 'IP or CIDR')}</Label>
            <Input id="openwebui-cidr" dir="ltr" value={cidr} onChange={(event) => setCidr(event.target.value)} placeholder="203.0.113.24/32" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="openwebui-label">{t('عنوان یا دلیل', 'Label or reason')}</Label>
            <Input id="openwebui-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('مثلاً دفتر مرکزی', 'For example, HQ')} />
          </div>
          <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
            <Checkbox checked={enabled} onCheckedChange={(value) => setEnabled(Boolean(value))} />
            {t('فعال', 'Enabled')}
          </label>
          <Button onClick={createEntry} disabled={creating} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {creating ? t('در حال ثبت...', 'Saving...') : t('افزودن', 'Add')}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-surface">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">{t('فهرست مورد نظر', 'Desired allowlist')}</CardTitle>
            <CardDescription>{t('این فهرست قبل از اعمال روی لبه قابل ویرایش است.', 'Edit this desired list before applying it to the edge.')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || syncing} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('بازخوانی', 'Refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t('هنوز هیچ IP یا CIDR مجازی ثبت نشده است. اعمال لیست خالی در لبه مسدود است تا مدیر به‌صورت اتفاقی خود را خارج نکند.', 'No allowed address is registered yet. Applying an empty list is blocked to prevent administrator lockout.')}
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/10 px-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="font-mono text-sm" dir="ltr">{entry.cidr}</div>
                    <div className="text-xs text-muted-foreground">{entry.label || t('بدون عنوان', 'No label')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs">
                      <Checkbox checked={entry.enabled} disabled={busyId === entry.id} onCheckedChange={(value) => void toggleEntry(entry, Boolean(value))} />
                      {entry.enabled ? t('فعال', 'Enabled') : t('غیرفعال', 'Disabled')}
                    </label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="destructive" disabled={busyId === entry.id} aria-label={t('حذف آدرس', 'Delete address')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('حذف از فهرست مورد نظر', 'Remove from desired list')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('این تغییر تا زمانی که جداگانه در لبه اعمال نشود، Cloudflare را تغییر نمی‌دهد.', 'This does not change Cloudflare until Apply at edge is separately confirmed.')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('لغو', 'Cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void deleteEntry(entry)}>{t('حذف', 'Remove')}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-surface border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UploadCloud className="h-5 w-5 text-amber-500" />{t('اعمال کنترل‌شده در لبه', 'Controlled edge apply')}</CardTitle>
          <CardDescription>
            {sync.edgeConfigured
              ? t('این عمل IPهای فعال را در custom list Cloudflare جایگزین و یک WAF rule فقط برای hostname Open WebUI ایجاد یا به‌روزرسانی می‌کند.', 'This replaces active entries in the Cloudflare custom list and creates or updates a WAF rule only for the Open WebUI hostname.')
              : t('runtime Cloudflare هنوز در backend پیکربندی نشده است. ابتدا token محدود، account ID و zone ID فقط در secrets backend تنظیم شوند.', 'Cloudflare runtime is not configured on the backend. First set a scoped token, account ID and zone ID only in backend secrets.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sync.lastErrorMessage && (
            <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{sync.lastErrorMessage}</span>
            </div>
          )}
          {sync.lastSyncAt && <p className="text-xs text-muted-foreground">{t('آخرین اعمال:', 'Last apply:')} {new Date(sync.lastSyncAt).toLocaleString(locale)}</p>}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!sync.edgeConfigured || enabledCount === 0 || syncing} className="gap-1.5">
                <UploadCloud className="h-4 w-4" />
                {syncing ? t('در حال اعمال...', 'Applying...') : t('اعمال در لبه', 'Apply at edge')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('اعمال allowlist در Cloudflare', 'Apply allowlist to Cloudflare')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(`فقط ${enabledCount} IP/CIDR فعال روی hostname Open WebUI اعمال می‌شود. هر بازدیدکنندهٔ دیگر پاسخ 403 دریافت می‌کند؛ قبل از تأیید مطمئن شوید IP فعلی مدیر در فهرست است.`, `Only ${enabledCount} active IP/CIDR entries will be applied to the Open WebUI hostname. All other visitors receive 403; ensure the administrator’s current IP is included before confirming.`)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('لغو', 'Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void synchronize()}>{t('تأیید و اعمال', 'Confirm and apply')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
