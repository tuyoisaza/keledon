import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { User, Building2, Tag, Users, Calendar, Clock, Shield } from 'lucide-react';
import { RolePreviewUatPanel } from '@/components/layout/RolePreviewUatPanel';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const role = user?.role;
  const knownRoles = ['user', 'agent', 'coordinator', 'admin', 'superadmin'];
  const roleKey = role && knownRoles.includes(role) ? role : 'unknown';

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('profile.unavailable');
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return t('profile.unavailable');
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('profile.title')}</h1>
      {user?.uatRoleOperator && <RolePreviewUatPanel />}

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        {/* Profile Picture & Basic Info */}
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || t('profile.avatar')}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user?.name || t('profile.unknownUser')}</h2>
            <p className="text-muted-foreground">{user?.email || t('profile.noEmail')}</p>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t(`profile.role.${roleKey}`)}</span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          {/* Company */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">{t('profile.company')}</p>
              <p className="font-medium">{user?.company_name || t('profile.notAssigned')}</p>
            </div>
          </div>

          {/* Brand */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">{t('profile.brand')}</p>
              <p className="font-medium">{user?.brand_name || t('profile.notAssigned')}</p>
            </div>
          </div>

          {/* Team */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">{t('profile.team')}</p>
              <p className="font-medium">{user?.team_name || t('profile.notAssigned')}</p>
            </div>
          </div>

          {/* Day of Registry */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">{t('profile.memberSince')}</p>
              <p className="font-medium">{formatDate(user?.created_at)}</p>
            </div>
          </div>

          {/* Last Session */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 md:col-span-2">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">{t('profile.lastActive')}</p>
              <p className="font-medium">{formatDateTime(user?.last_session)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
