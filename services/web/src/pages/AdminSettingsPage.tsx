import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { Activity, Bot, Building2, Database, KeyRound, Palette, Settings, Users, Workflow } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const platformAdmin = user?.role === 'superadmin';
  const entries = [
    ...(platformAdmin ? [{ icon: Building2, title: t('adminSettings.companies'), description: t('adminSettings.companiesDescription'), href: '/management/companies' }] : []),
    { icon: Users, title: t('adminSettings.users'), description: t('adminSettings.usersDescription'), href: '/management/users' },
    { icon: Workflow, title: t('adminSettings.flows'), description: t('adminSettings.flowsDescription'), href: '/management/flow-definitions' },
    { icon: KeyRound, title: t('adminSettings.providers'), description: t('adminSettings.providersDescription'), href: '/management/providers' },
    { icon: Database, title: t('adminSettings.crm'), description: t('adminSettings.crmDescription'), href: '/management/vendors' },
    ...(platformAdmin ? [{ icon: Bot, title: t('adminSettings.ai'), description: t('adminSettings.aiDescription'), href: '/admin/prompts' }] : []),
    ...(platformAdmin ? [{ icon: Palette, title: t('adminSettings.themes'), description: t('adminSettings.themesDescription'), href: '/admin/settings/templates' }] : []),
    ...(platformAdmin ? [{ icon: Activity, title: t('adminSettings.audit'), description: t('adminSettings.auditDescription'), href: '/admin/audit' }] : []),
    ...(platformAdmin ? [{ icon: Activity, title: t('adminSettings.system'), description: t('adminSettings.systemDescription'), href: '/management/status' }] : []),
  ];
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <header className="flex items-start gap-3"><Settings className="mt-1 h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold">{t('nav.settings')}</h1><p className="text-muted-foreground">{t(platformAdmin ? 'adminSettings.platformDescription' : 'adminSettings.tenantDescription')}</p></div></header>
    <nav aria-label={t('adminSettings.navigationLabel')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{entries.map(entry => <Link key={entry.href} to={entry.href} className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"><entry.icon className="mb-3 h-5 w-5 text-primary"/><h2 className="font-semibold">{entry.title}</h2><p className="mt-2 text-sm text-muted-foreground">{entry.description}</p><span className="mt-4 inline-block text-sm text-primary">{t('adminSettings.open')}</span></Link>)}</nav>
    {!platformAdmin && <Link to="/admin/team-settings" className="inline-flex rounded border border-border px-4 py-2">{t('adminSettings.voiceSettings')}</Link>}
  </main>;
}
