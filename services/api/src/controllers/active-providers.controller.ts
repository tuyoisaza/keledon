import { Controller, Get, Patch, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderConfigService } from '../providers/provider-config.service';

@Controller('active-providers')
export class ActiveProvidersController {
  private readonly logger = new Logger(ActiveProvidersController.name);

  constructor(private readonly configService: ProviderConfigService) {}

  @Get()
  async getActiveProviders() {
    try {
      const companyId = process.env.COMPANY_ID || 'default';
      const config = await this.configService.fetchActiveConfig(companyId);
      return config;
    } catch (error) {
      this.logger.error('Error fetching active providers:', error);
      throw new HttpException('Failed to fetch provider config', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('available-llm')
  getAvailableLLMProviders() {
    const providers: Array<{ id: string; name: string; available: boolean }> = [
      { id: 'openai', name: 'OpenAI', available: !!process.env.OPENAI_API_KEY },
      { id: 'google', name: 'Google Gemini', available: !!process.env.GOOGLE_AI_API_KEY },
      { id: 'anthropic', name: 'Anthropic Claude', available: !!process.env.ANTHROPIC_API_KEY },
      { id: 'ollama', name: 'Ollama (Local)', available: !!process.env.OLLAMA_URL },
    ];
    return { providers };
  }

  @Patch('tts')
  async updateTTSProvider(@Body() body: { providerId: string; apiKey?: string; voiceId?: string }) {
    try {
      const companyId = process.env.COMPANY_ID || 'default';
      const success = await this.configService.saveTTSConfig(companyId, {
        providerId: body.providerId,
        apiKey: body.apiKey,
        voiceId: body.voiceId,
      });
      if (!success) {
        throw new HttpException('Failed to save TTS config', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return { success: true, providerId: body.providerId };
    } catch (error) {
      this.logger.error('Error saving TTS provider:', error);
      throw new HttpException('Failed to save TTS config', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('llm')
  async updateLLMProvider(@Body() body: { providerId: string }) {
    try {
      const companyId = process.env.COMPANY_ID || 'default';
      const success = await this.configService.saveLLMConfig(companyId, {
        providerId: body.providerId,
      });
      if (!success) {
        throw new HttpException('Failed to save LLM config', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return { success: true, providerId: body.providerId };
    } catch (error) {
      this.logger.error('Error saving LLM provider:', error);
      throw new HttpException('Failed to save LLM config', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
