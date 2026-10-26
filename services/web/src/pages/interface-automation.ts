import type { State } from './interface-control.types';
export interface AutomaticContext {
 read:()=>State|null;write:(s:State)=>void;connected:boolean;phase:string;acousticAt:number;
 pendingGoal:{current:string|null};setPhase:(p:string)=>void;reply:(text:string)=>void;ended?:()=>void;
 command:(operation:'open'|'observe'|'act',signal:AbortSignal)=>Promise<any>;
 api:(path:string,body?:unknown,signal?:AbortSignal)=>Promise<any>;
}
/** Foreground only: bounded, explicitly armed, server-policy-authorized actions. */
export async function runAutomaticCycle(ctx:AutomaticContext,signal:AbortSignal):Promise<void>{

    const s=ctx.read();if(!s || !s.automatic)return;
    if(s.transport==='extension' && !ctx.connected)return;
    await ctx.command('observe',signal);let now=ctx.read();if(!now?.observation || signal.aborted)return;
    const incoming=now.target.policy?.incoming;
    if(ctx.phase==='standby'){
      if(!incoming || !now.observation.text.includes(incoming.text) || (incoming.requiresAcoustic && Date.now()-ctx.acousticAt>3000))return;
      if(incoming.answerRuleId){const e=now.observation.elements.find(e=>e.policyRuleId===incoming.answerRuleId && e.actions.includes('activate'));if(!e)return;const plan=await ctx.api(`${now.id}/manual-plan`,{type:'activate',ref:e.ref,effect:'call',expected:incoming.endText||''},signal);ctx.write(plan);const accepted=await ctx.command('act',signal);if(!incoming.connectedText || !accepted?.observation?.text.includes(incoming.connectedText)){ctx.setPhase('attention');return;}}
      ctx.setPhase('active');const greeting=await ctx.api(`${s.id}/greeting`,{},signal);if(!signal.aborted)ctx.reply(greeting.reply);return;
    }
    if(incoming?.endText && now.observation.text.includes(incoming.endText)){ctx.pendingGoal.current=null;ctx.setPhase('standby');await ctx.api(`${s.id}/cancel`,{keepAutomatic:true},signal).then(ctx.write);ctx.ended?.();return;}
    const objective=ctx.pendingGoal.current;if(!objective || ctx.phase==='attention')return;ctx.pendingGoal.current=null;ctx.setPhase('working');
    for(let step=0;step<4 && !signal.aborted;step++){
      now=ctx.read();if(!now?.observation)break;
      const plan=await ctx.api(`${now.id}/plan`,{goal:objective},signal);if(signal.aborted)return;ctx.write(plan);
      if(plan.plannerStatus!=='action'){
        ctx.setPhase(plan.plannerStatus==='goal_observed'?'active':'attention');
        const answer=await ctx.api(`${now.id}/reply`,{goal:objective},signal);if(!signal.aborted)ctx.reply(answer.reply);return;
      }
      const result=await ctx.command('act',signal);
      if(!result?.observation || !['OBSERVED','OBSERVED_AFTER_ACTION'].includes(result.code)){ctx.setPhase('attention');return;}
    }
    ctx.setPhase('attention');

}
