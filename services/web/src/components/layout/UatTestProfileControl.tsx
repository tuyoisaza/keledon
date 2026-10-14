import { useEffect, useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { API_URL } from '@/lib/config';

interface UatTestProfile {
  id: string;
  name: string | null;
  role: string;
}

export function UatTestProfileControl({ collapsed = false }: { collapsed?: boolean }) {
  const { user, switchToUatTestProfile, returnToSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<UatTestProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (user?.role !== 'superadmin' || user.uatTestProfile) {
      setProfiles([]);
      return () => { active = false; };
    }

    const token = sessionStorage.getItem('auth_token');
    if (!token) return () => { active = false; };

    fetch(`${API_URL}/api/auth/uat-test-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) return null;
      return response.json();
    }).then((data) => {
      if (active && Array.isArray(data?.profiles)) setProfiles(data.profiles);
    }).catch(() => {
      if (active) setProfiles([]);
    });

    return () => { active = false; };
  }, [user?.id, user?.role, user?.uatTestProfile]);

  const switchProfile = async () => {
    if (!selectedId || pending) return;
    setPending(true);
    setError('');
    try {
      await switchToUatTestProfile(selectedId);
      setSelectedId('');
    } catch {
      setError(t('uatTestProfiles.switchFailed'));
    } finally {
      setPending(false);
    }
  };

  const returnProfile = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await returnToSuperAdmin();
    } catch {
      setError(t('uatTestProfiles.returnFailed'));
    } finally {
      setPending(false);
    }
  };

  if (user?.uatTestProfile) {
    return (
      <div className="mt-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-2">
        {!collapsed && <p className="mb-2 text-xs font-medium">{t('uatTestProfiles.active')}</p>}
        <button
          type="button"
          onClick={returnProfile}
          disabled={pending}
          aria-label={t('uatTestProfiles.return')}
          className="flex w-full items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-foreground hover:bg-amber-500/20 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && (pending ? t('uatTestProfiles.working') : t('uatTestProfiles.return'))}
        </button>
        {error && !collapsed && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}
      </div>
    );
  }

  if (user?.role !== 'superadmin' || profiles.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border p-2" data-testid="uat-test-profile-control">
      {!collapsed && <label htmlFor="uat-test-profile-select" className="flex items-center gap-1 text-xs font-medium">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
        {t('uatTestProfiles.label')}
      </label>}
      <select
        id="uat-test-profile-select"
        aria-label={t('uatTestProfiles.label')}
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground"
      >
        <option value="">{collapsed ? t('uatTestProfiles.shortLabel') : t('uatTestProfiles.choose')}</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {[profile.name, profile.role].filter(Boolean).join(' · ')}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={switchProfile}
        disabled={!selectedId || pending}
        className="w-full rounded bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? t('uatTestProfiles.working') : t('uatTestProfiles.switch')}
      </button>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
