import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { apiJson } from '@/lib/api-fetch';
import ManagementModal from '@/components/common/ManagementModal';

interface DeviceSummary {
  id: string;
  name: string;
  status?: string;
  platform?: string | null;
  lastSeen?: string | null;
  version?: string | null;
}

function isDeviceSummary(value: unknown): value is DeviceSummary {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

export default function DevicesPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceSummary | null>(null);
  const [revoking, setRevoking] = useState(false);
  const canManageDevices = ['admin', 'coordinator', 'superadmin'].includes(user?.role || '');

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiJson<unknown>('/api/devices', {
        headers: user?.id ? { 'x-user-id': user.id } : {}
      });
      setDevices(Array.isArray(response) ? response.filter(isDeviceSummary) : []);
    } catch (error) {
      console.error('Failed to load devices:', error);
      setError(t('devices.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, t]);

  const revokeDevice = async () => {
    if (!deviceToRevoke) return;
    setRevoking(true);
    setActionError(null);
    try {
      await apiJson(`/api/devices/${encodeURIComponent(deviceToRevoke.id)}`, {
        method: 'DELETE',
      });
      setDevices(current => current.filter(device => device.id !== deviceToRevoke.id));
      setDeviceToRevoke(null);
    } catch {
      setActionError(t('devices.revokeFailed'));
    } finally {
      setRevoking(false);
    }
  };

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paired': return 'bg-green-500/10 text-status-success-foreground';
      case 'pending': return 'bg-yellow-500/10 text-status-warning-foreground';
      case 'disconnected': return 'bg-muted text-muted-foreground';
      case 'revoked': return 'bg-red-500/10 text-status-danger-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'paired':
      case 'pending':
      case 'disconnected':
      case 'revoked':
        return t(`devices.status.${status}`);
      default:
        return t('devices.status.unknown');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('devices.title')}</h1>
        <Link
          to="/launch-keledon"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          {t('devices.openLauncher')}
        </Link>
      </div>

      {error ? (
        <div role="alert" className="py-4 text-destructive">
          <p>{error}</p>
          <button type="button" onClick={() => void loadDevices()} className="mt-2 underline">
            {t('devices.retry')}
          </button>
        </div>
      ) : loading ? (
        <div role="status" aria-label={t('devices.loading')} className="flex justify-center py-8">
          <span className="sr-only">{t('devices.loading')}</span>
          <div aria-hidden="true" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('devices.noDevices')} {t('devices.addFirstDevice')}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-card border border-border rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{device.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(device.status || '')}`}>
                  {getStatusLabel(device.status)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">{t('devices.platform')}:</span> {device.platform || t('devices.unknown')}</p>
                <p><span className="font-medium text-foreground">{t('devices.lastSeen')}:</span> {device.lastSeen ? new Date(device.lastSeen).toLocaleString(locale) : t('devices.never')}</p>
                <p><span className="font-medium text-foreground">{t('devices.version')}:</span> {device.version || t('devices.unknown')}</p>
              </div>
              {canManageDevices && (
                <div className="mt-4 flex justify-end border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => { setActionError(null); setDeviceToRevoke(device); }}
                    aria-label={`${t('devices.revoke')} ${device.name}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('devices.revoke')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {deviceToRevoke && (
        <ManagementModal
          title={t('devices.revokeTitle')}
          onClose={() => { if (!revoking) setDeviceToRevoke(null); }}
        >
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">{t('devices.revokeTitle')}</h2>
            <p>{t('devices.revokePrompt')} <strong>{deviceToRevoke.name}</strong></p>
            <p className="text-sm text-muted-foreground">{t('devices.revokeEffect')}</p>
            {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={revoking}
                onClick={() => setDeviceToRevoke(null)}
                className="rounded-md border border-border px-4 py-2 disabled:opacity-50"
              >
                {t('devices.cancel')}
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={() => void revokeDevice()}
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
              >
                {revoking ? t('devices.revoking') : t('devices.confirmRevoke')}
              </button>
            </div>
          </div>
        </ManagementModal>
      )}
    </div>
  );
}
