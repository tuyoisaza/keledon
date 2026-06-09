import {
  Module,
  Global,
} from '@nestjs/common';
import { ProviderConfigService } from './providers/provider-config.service';

/**
 * Global module that provides ProviderConfigService to all modules
 * without needing to import it explicitly.
 */
@Global()
@Module({
  providers: [ProviderConfigService],
  exports: [ProviderConfigService],
})
export class ProviderConfigGlobalModule {}
