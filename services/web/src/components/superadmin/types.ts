import type { ProviderConfig, TenantConfig, VoiceProfile } from './SettingsTab';

export interface SettingsTabProps {
    onSaveProviderCatalog?: (configs: ProviderConfig[]) => Promise<void>;
    onSaveTenantConfig?: (configs: TenantConfig[]) => Promise<void>;
    onSaveVoiceProfiles?: (profiles: VoiceProfile[]) => Promise<void>;
    onCreateVoiceProfile?: (profile: Omit<VoiceProfile, 'id' | 'config'>) => Promise<void>;
}

export default function SettingsTab(_props: SettingsTabProps) {
    return null;
}