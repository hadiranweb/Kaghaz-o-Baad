import { useEffect, useState } from 'react';
import { adminUsers } from '@/lib/backend-api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, Search, UserCog, Pencil, KeyRound } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Role = 'admin' | 'editor' | 'contributor' | 'user';
const ALL_ROLES: Role[] = ['admin', 'editor', 'contributor', 'user'];

interface AdminUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: Role[];
  profile: { first_name?: string; last_name?: string; phone?: string } | null;
}

interface EditForm {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
}

interface ApiResponse {
  error?: string;
  users?: AdminUser[];
  forcedPasswordChange?: boolean;
}

export default function UsersManager() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<EditForm>({ email: '', first_name: '', last_name: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showTestCreds, setShowTestCreds] = useState(false);

  const t = (fa: string, en: string) => (locale === 'fa' ? fa : en);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminUsers({ action: 'list' });
      setUsers((data.users || []) as AdminUser[]);
    } catch (error) {
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: error instanceof Error ? error.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seedTestUsers = async () => {
    toast({ variant: 'destructive', title: t('غیرفعال', 'Unavailable'), description: t('ایجاد کاربر تستی در محیط مستقل هنوز فعال نشده است.', 'Test-user seeding is disabled until an explicit provisioning flow is added.') });
  };

  const toggleRole = async (u: AdminUser, role: Role, enabled: boolean) => {
    setBusy(u.id + role);
    try {
      await adminUsers({ action: 'setRole', userId: u.id, role, enabled });
    } catch (error) {
      setBusy(null);
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: error instanceof Error ? error.message : 'Role update failed' });
      return;
    }
    setBusy(null);
    setUsers((prev) => prev.map((x) => x.id === u.id
      ? { ...x, roles: enabled ? Array.from(new Set([...x.roles, role])) : x.roles.filter((r) => r !== role) }
      : x));
    toast({ title: t('به‌روزرسانی شد', 'Updated') });
  };

  const deleteUser = async (u: AdminUser) => {
    setBusy(u.id + 'del');
    try {
      await adminUsers({ action: 'deleteUser', userId: u.id });
    } catch (error) {
      setBusy(null);
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: error instanceof Error ? error.message : 'Delete failed' });
      return;
    }
    setBusy(null);
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    toast({ title: t('کاربر حذف شد', 'User deleted') });
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({
      email: u.email ?? '',
      first_name: u.profile?.first_name ?? '',
      last_name: u.profile?.last_name ?? '',
      phone: u.profile?.phone ?? '',
      password: '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      action: 'updateUser',
      userId: editing.id,
      email: form.email !== (editing.email ?? '') ? form.email : undefined,
      firstName: form.first_name,
      lastName: form.last_name,
      phone: form.phone,
    };
    if (form.password) payload.password = form.password;
    let data: { forcedPasswordChange?: boolean };
    try {
      data = await adminUsers(payload);
    } catch (error) {
      setSaving(false);
      toast({ variant: 'destructive', title: t('خطا', 'Error'), description: error instanceof Error ? error.message : 'Update failed' });
      return;
    }
    setSaving(false);
    toast({
      title: t('ذخیره شد', 'Saved'),
      description: data.forcedPasswordChange
        ? t('کاربر در ورود بعدی باید رمز را تغییر دهد.', 'User must change password on next sign-in.')
        : undefined,
    });
    setEditing(null);
    load();
  };

  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.profile?.first_name?.toLowerCase().includes(q) ||
      u.profile?.last_name?.toLowerCase().includes(q) ||
      u.profile?.phone?.includes(q)
    );
  });

  const roleLabel = (r: Role) => {
    if (locale !== 'fa') return r;
    return { admin: 'مدیر', editor: 'ویرایشگر', contributor: 'نویسنده', user: 'کاربر' }[r];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {t('مدیریت کاربران و نقش‌ها', 'Users & Roles')}
            <span className="text-muted-foreground text-sm mr-2 ml-2">({users.length})</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTestCreds(true)}
            className="flex items-center gap-1.5"
          >
            <KeyRound className="w-4 h-4 text-primary" />
            <span>{t('رمزهای تستی (۴ نقش)', 'Test Accounts (4 Roles)')}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={seedTestUsers}
            disabled={seeding || loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
            <span>{t('ایجاد/بازنشانی کاربران تستی', 'Seed 4 Test Users')}</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('جستجو ایمیل، نام، تلفن...', 'Search email, name, phone...')}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          {t('کاربری یافت نشد', 'No users found')}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((u) => {
            const isSelf = u.id === user?.id;
            const fullName = [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ');
            return (
              <Card key={u.id} className="glass-surface">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <span className="truncate">{fullName || t('بدون نام', 'No name')}</span>
                        {isSelf && <Badge variant="secondary">{t('شما', 'You')}</Badge>}
                        {!u.email_confirmed_at && (
                          <Badge variant="outline" className="text-xs">
                            {t('تأیید نشده', 'Unverified')}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground mt-1 space-x-2 rtl:space-x-reverse">
                        <span dir="ltr">{u.email}</span>
                        {u.profile?.phone && <span>· {u.profile.phone}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('عضویت:', 'Joined:')} {new Date(u.created_at).toLocaleDateString(locale)}
                        {u.last_sign_in_at && ` · ${t('آخرین ورود:', 'Last sign in:')} ${new Date(u.last_sign_in_at).toLocaleDateString(locale)}`}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={isSelf || busy === u.id + 'del'}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('حذف کاربر', 'Delete user')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('این عملیات کاربر و تمام دسترسی‌هایش را حذف می‌کند و قابل بازگشت نیست.',
                              'This will permanently delete the user and all their access. This cannot be undone.')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('لغو', 'Cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(u)}>
                            {t('حذف', 'Delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t('نقش‌ها', 'Roles')}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ALL_ROLES.map((role) => {
                      const enabled = u.roles.includes(role);
                      const disabled = busy === u.id + role || (isSelf && role === 'admin' && enabled);
                      return (
                        <label
                          key={role}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--glass-border))] bg-secondary/30 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-secondary/50'}`}
                        >
                          <Checkbox
                            checked={enabled}
                            disabled={disabled}
                            onCheckedChange={(v) => toggleRole(u, role, !!v)}
                          />
                          <span className="text-sm">{roleLabel(role)}</span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-surface max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('ویرایش کاربر', 'Edit user')}</DialogTitle>
            <DialogDescription>
              {t('در صورت تنظیم رمز جدید، کاربر در اولین ورود باید رمز خود را تغییر دهد.',
                 'If you set a new password, the user will be forced to change it on next sign-in.')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{t('ایمیل', 'Email')}</Label>
              <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t('نام', 'First name')}</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t('نام خانوادگی', 'Last name')}</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t('تلفن', 'Phone')}</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('رمز جدید (اختیاری)', 'New password (optional)')}</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('در صورت خالی بودن تغییر نمی‌کند', 'Leave blank to keep current')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('لغو', 'Cancel')}</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? t('در حال ذخیره...', 'Saving...') : t('ذخیره', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTestCreds} onOpenChange={setShowTestCreds}>
        <DialogContent className="glass-surface max-w-md">
          <DialogHeader>
            <DialogTitle>{t('حساب‌های تستی ۴ نقش رسمی', 'Test Accounts (4 Official Roles)')}</DialogTitle>
            <DialogDescription>
              {t('حساب‌های زیر برای تست سطوح دسترسی (RBAC) آماده شده‌اند.', 'The following test accounts are available for testing RBAC levels.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/20 space-y-1">
              <div className="font-semibold text-primary">1. Admin (مدیر)</div>
              <div className="font-mono text-xs" dir="ltr">email: admin@kaghazbaad.test</div>
              <div className="font-mono text-xs" dir="ltr">password: [hidden; set through backend]</div>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/20 space-y-1">
              <div className="font-semibold text-primary">2. Editor (ویرایشگر)</div>
              <div className="font-mono text-xs" dir="ltr">email: editor@kaghazbaad.test</div>
              <div className="font-mono text-xs" dir="ltr">password: [hidden; set through backend]</div>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/20 space-y-1">
              <div className="font-semibold text-primary">3. Contributor (نویسنده)</div>
              <div className="font-mono text-xs" dir="ltr">email: contributor@kaghazbaad.test</div>
              <div className="font-mono text-xs" dir="ltr">password: [hidden; set through backend]</div>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/20 space-y-1">
              <div className="font-semibold text-primary">4. User (کاربر عادی)</div>
              <div className="font-mono text-xs" dir="ltr">email: user@kaghazbaad.test</div>
              <div className="font-mono text-xs" dir="ltr">password: [hidden; set through backend]</div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTestCreds(false)}>{t('بستن', 'Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
