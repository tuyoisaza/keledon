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
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'superadmin' || user.uatTestProfile) {
      setProfiles([]);
      return () => { active = false; };
    }

    const token = sessionStorage.getItem('auth_token');
    if (!token) return () => { active = false; };
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/auth/uat-test-profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) throw new Error('Profile list unavailable');
      return response.json();
    }).then((data) => {
      if (active && Array.isArray(data?.profiles)) setProfiles(data.profiles);
    }).catch(() => {
      if (active) {
        setProfiles([]);
        setError(t('uatTestProfiles.loadFailed'));
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [user?.id, user?.role, user?.uatTestProfile, reload, t]);

  const prepareProfiles = async () => {
    setPending(true);
    setError('');
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/auth/uat-test-profiles/prepare`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 409) {
        setError(t('uatTestProfiles.fixtureConflict'));
        return;
      }
      if (!response.ok) throw new Error('Preparation failed');
      setReload(value => value + 1);
    } catch {
      setError(t('uatTestProfiles.prepareFailed'));
    } finally {
      setPending(false);
    }
  };

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
      <div className="mt-3 rounded-md border border-primary bg-muted p-2" role="region" aria-label={t('uatTestProfiles.active')}>
        <p className="mb-2 text-xs font-medium">{t('uatTestProfiles.active')} · {user.role}</p>
        {!collapsed && <p className="mb-2 text-xs text-muted-foreground">{t('uatTestProfiles.readOnly')}</p>}
        <button
          type="button"
          onClick={returnProfile}
          disabled={pending}
          aria-label={t('uatTestProfiles.return')}
          className="flex w-full items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && (pending ? t('uatTestProfiles.working') : t('uatTestProfiles.return'))}
        </button>
        {error && <p className="mt-1 text-xs text-destructive" role="alert">{error}</p>}
      </div>
    );
  }

  if (user?.role !== 'superadmin') return null;

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border p-2" data-testid="uat-test-profile-control">
      {!collapsed && <label htmlFor="uat-test-profile-select" className="flex items-center gap-1 text-xs font-medium">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
        {t('uatTestProfiles.label')}
      </label>}
      {!collapsed && <p className="text-xs text-muted-foreground">{t('uatTestProfiles.readOnly')}</p>}
      {loading && <p className="text-xs" role="status">{t('uatTestProfiles.working')}</p>}
      {!loading && !error && profiles.length === 0 && <>
        <p className="text-xs text-muted-foreground">{t('uatTestProfiles.empty')}</p>
        <button type="button" onClick={prepareProfiles} disabled={pending}
          className="w-full rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-50">
          {pending ? t('uatTestProfiles.working') : t('uatTestProfiles.prepare')}
        </button>
      </>}
      {profiles.length > 0 && <>
      <select
        id="uat-test-profile-select"
        aria-label={t('uatTestProfiles.label')}
        value={selectedId}
        disabled={pending || loading}
        onChange={(event) => setSelectedId(event.target.value)}
        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground"
      >
        <option value="">{collapsed ? t('uatTestProfiles.shortLabel') : t('uatTestProfiles.choose')}</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {t(`uatTestProfiles.roles.${profile.role}`)} · {profile.name}
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
      </>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      {error && <button type="button" onClick={() => setReload(value => value + 1)} disabled={pending}
        className="text-xs underline">{t('uatTestProfiles.retry')}</button>}
    </div>
  );
}
