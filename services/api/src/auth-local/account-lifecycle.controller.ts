import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, Param, Put, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAccountActive } from './account-lifecycle.policy';
@Controller('api/admin/accounts')
export class AccountLifecycleController {
  constructor(private readonly prisma: PrismaService) {}
  private async actor(req: any) {
    const actor=req.user?.userId && await this.prisma.user.findUnique({where:{id:req.user.userId}});
    if(!isAccountActive(actor) || !['superadmin','admin','coordinator'].includes(actor.role)) throw new ForbiddenException('Account administration denied');
    return actor;
  }
  @Get() @Header('Cache-Control','no-store')
  async list(@Req() req: any) {
    const actor=await this.actor(req);
    if(actor.role!=='superadmin' && !actor.companyId) throw new ForbiddenException('Company required');
    return this.prisma.user.findMany({where:actor.role==='superadmin'?{}:{companyId:actor.companyId},select:{id:true,name:true,email:true,role:true,companyId:true,isActive:true},take:200,orderBy:{email:'asc'}});
  }
  @Put(':id/lifecycle') @Header('Cache-Control','no-store')
  async change(@Req() req: any,@Param('id') id:string,@Body() body:any) {
    if(!body || Object.keys(body).some(k=>!['isActive','revokeSessions'].includes(k)) || (body.isActive!==undefined && typeof body.isActive!=='boolean') || (body.revokeSessions!==undefined && body.revokeSessions!==true) || (body.isActive===undefined && body.revokeSessions!==true)) throw new BadRequestException('Choose active state or session revocation');
    const actor=await this.actor(req);
    return this.prisma.$transaction(async tx=>{
      const current=await tx.user.findUnique({where:{id:actor.id}}), target=await tx.user.findUnique({where:{id}});
      if(!isAccountActive(current) || current.role!==actor.role || current.companyId!==actor.companyId || !target || target.id===actor.id || target.uatFixtureRunId || (actor.role!=='superadmin' && (!actor.companyId || target.companyId!==actor.companyId || !['user','agent'].includes(target.role)))) throw new ForbiddenException('Account scope denied');
      const updated=await tx.user.update({where:{id},data:{...(body.isActive!==undefined?{isActive:body.isActive}:{}),authAfter:new Date()},select:{id:true,isActive:true}});
      await tx.device.updateMany({where:{userId:id},data:{authToken:null,status:'unpaired'}});
      await tx.auditLog.create({data:{userId:actor.id,entity:'USER_LIFECYCLE',entityId:id,action:body.isActive===undefined?'REVOKE_SESSIONS':body.isActive?'REACTIVATE':'SUSPEND',changes:JSON.stringify({isActive:updated.isActive,devicesRevoked:true})}});
      return updated;
    }, {isolationLevel:'Serializable'});
  }
}
