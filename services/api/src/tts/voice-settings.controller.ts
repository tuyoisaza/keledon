import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, Put, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../guards/public.decorator';
import { BrainMeetGuard } from '../controllers/brain-meet.guard';
import { isAccountActive } from '../auth-local/account-lifecycle.policy';
import { voiceSettings, voiceCapabilities, profileMatches } from './voice-settings';
@Controller('api/brain/voice-config/:teamId') @Public() @UseGuards(BrainMeetGuard)
export class VoiceSettingsController {
 constructor(private readonly prisma:PrismaService){}
 @Get() @Header('Cache-Control','no-store')
 async get(@Req() req:any){
  const team=await this.prisma.team.findUnique({where:{id:req.runtimeIdentity.teamId}});
  const rows=await this.prisma.tenantVoiceProfile.findMany({where:{companyId:req.runtimeIdentity.companyId,isEnabled:true},include:{providerCatalog:true},take:100});
  if(!team)throw new ForbiddenException('Voice team unavailable');
  const profiles=rows.filter(p=>profileMatches(p,team.ttsProvider)).flatMap(p=>{try{return [{id:p.id,name:p.name,language:p.language,settings:voiceSettings({locale:p.language,...(p.config?JSON.parse(p.config):{})},team.ttsProvider)}];}catch{return [];}});
  return {teamId:team.id,provider:team.ttsProvider,capabilities:voiceCapabilities(team.ttsProvider),settings:voiceSettings(team.ttsVoiceSettings,team.ttsProvider),profileId:team.ttsVoiceProfileId,profiles};
 }
 @Put() @Header('Cache-Control','no-store')
 async save(@Req() req:any,@Body() body:any){
  const actor=await this.prisma.user.findUnique({where:{id:req.runtimeIdentity.userId}});
  if(!isAccountActive(actor) || !['superadmin','admin','coordinator'].includes(actor.role)) throw new ForbiddenException('Voice configuration denied');
  if(!body || Object.keys(body).some(k=>!['settings','profileId'].includes(k)) || (body.profileId!==null && body.profileId!==undefined && typeof body.profileId!=='string')) throw new BadRequestException('Invalid voice configuration');
  return this.prisma.$transaction(async tx=>{
    const currentActor=await tx.user.findUnique({where:{id:actor.id}});if(!isAccountActive(currentActor) || currentActor.role!==actor.role || currentActor.companyId!==actor.companyId)throw new ForbiddenException('Voice actor changed');
    const team=await tx.team.findUnique({where:{id:req.runtimeIdentity.teamId},include:{brand:true}});
    if(team?.brand?.companyId!==req.runtimeIdentity.companyId) throw new ForbiddenException('Voice team changed');
    if(body.profileId){const profile=await tx.tenantVoiceProfile.findUnique({where:{id:body.profileId},include:{providerCatalog:true}});if(!profile || profile.companyId!==req.runtimeIdentity.companyId || !profile.isEnabled || !profileMatches(profile,team.ttsProvider)) throw new ForbiddenException('Voice profile not available for this team');voiceSettings(profile.config,team.ttsProvider);}
    const settings=voiceSettings(body.settings,team.ttsProvider);
    await tx.team.update({where:{id:team.id},data:{ttsVoiceSettings:JSON.stringify(settings),ttsVoiceProfileId:body.profileId||null}});
    await tx.auditLog.create({data:{userId:actor.id,entity:'TEAM_VOICE_SETTINGS',entityId:team.id,action:'UPDATE',changes:JSON.stringify({provider:team.ttsProvider,locale:settings.locale,speed:settings.speed,style:settings.style})}});
    return {teamId:team.id,saved:true};
  });
 }
}
