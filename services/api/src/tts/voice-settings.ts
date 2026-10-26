import { getSpeachesVoice, getSpeachesVoiceForLanguage } from './tts-language';
import { BadRequestException } from '@nestjs/common';
export type VoiceSettings = { voiceId?: string; locale: string; speed: number; style: 'neutral' | 'expressive' };
export function voiceCapabilities(provider: string) { return {speed:['elevenlabs','speaches','kokoro','openai'].includes(provider),styles:provider==='elevenlabs'?['neutral','expressive']:['neutral'],minSpeed:provider==='elevenlabs'?0.7:0.5,maxSpeed:provider==='elevenlabs'?1.2:2}; }
export function voiceSettings(value: any, provider?: string): VoiceSettings {
 if(typeof value==='string') {try{value=JSON.parse(value);}catch{throw new BadRequestException('Invalid voice settings');}}
 value=value??{};
 if(typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>!['voiceId','locale','speed','style'].includes(k))) throw new BadRequestException('Unsupported voice settings');
 const result:VoiceSettings={locale:value.locale??'es',speed:value.speed??(provider==='speaches'?1.15:1),style:value.style??'neutral',...(value.voiceId?{voiceId:value.voiceId}:{})};
 if(typeof result.locale!=='string' || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(result.locale) || typeof result.speed!=='number' || !Number.isFinite(result.speed) || result.speed<0.5 || result.speed>2 || !['neutral','expressive'].includes(result.style) || (value.voiceId!==undefined && (typeof value.voiceId!=='string' || !/^[A-Za-z0-9_+. -]{1,120}$/.test(value.voiceId)))) throw new BadRequestException('Invalid voice settings');
 if(provider && ['kokoro','speaches'].includes(provider) && !['es','en'].includes(result.locale.split('-')[0]) && !result.voiceId)throw new BadRequestException('A provider voice ID is required for this language');
 if(provider){const c=voiceCapabilities(provider); if(!c.styles.includes(result.style) || result.speed<c.minSpeed || result.speed>c.maxSpeed || (!c.speed && result.speed!==1)) throw new BadRequestException('Selected provider does not support these voice options');}
 return result;
}
export function elevenVoiceSettings(config:any) {const s=voiceSettings(config.settings,'elevenlabs'); return {stability:0.5,similarity_boost:0.8,style:s.style==='expressive'?0.7:0,speed:s.speed,use_speaker_boost:true};}
export function profileMatches(profile:any, provider:string) {const c=profile.providerCatalog;return profile.providerId===provider || c?.name?.toLowerCase()===provider;}

export function configuredSpeachesVoice(config:any,text:string,force=false):string {
 if(config.settings?.voiceId)return config.settings.voiceId;
 const language=config.settings?.locale?.split('-')[0];
 if(language && !['es','en'].includes(language))throw new BadRequestException('A provider voice ID is required for this language');
 return language?getSpeachesVoiceForLanguage(language):getSpeachesVoice(text,config.voiceId,force);
}
