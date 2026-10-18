import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/context/I18nContext';
import { ManagedInterfacesPanel } from '@/components/superadmin/ManagedInterfacesPanel';

export default function AdminManagedInterfacesPage() {
  const { t } = useTranslation();
  return <main className="mx-auto max-w-6xl space-y-5 p-6">
    <Link to="/admin/settings" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('adminSettings.backToSettings')}
    </Link>
    <ManagedInterfacesPanel />
  </main>;
}
