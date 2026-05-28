import { ProviderConfig, TenantConfig, VoiceProfile } from '@/types';

export interface SettingsTabProps {
    onSaveProviderCatalog?: (configs: ProviderConfig[]) => Promise<void>;
    onSaveTenantConfig?: (configs: TenantConfig[]) => Promise<void>;
    onSaveVoiceProfiles?: (profiles: VoiceProfile[]) => Promise<void>;
    onCreateVoiceProfile?: (profile: Omit<VoiceProfile, 'id' | 'config'>) => Promise<void>;
}

export default function SettingsTab({
    onSaveProviderCatalog,
    onSaveTenantConfig,
    onSaveVoiceProfiles,
    onCreateVoiceProfile
}: SettingsTabProps) {
    return null;
}