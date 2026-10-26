import { BadRequestException } from '@nestjs/common';
export type InterfaceRule = { id: string; kind: 'search-field' | 'search-submit' | 'navigate' | 'accept-call' | 'end-call'; name: string; role: string; elementId?: string; inputName?: string; automationId?: string; path?: string };
export type InterfacePolicy = { version: 1; rules: InterfaceRule[]; incoming?: { text: string; requiresAcoustic: boolean; answerRuleId?: string; connectedText?:string; endText?: string } };
export function interfacePolicy(value: any): InterfacePolicy {
  if (value === undefined || value === null) return { version: 1, rules: [] };
  const fail = (): never => { throw new BadRequestException('Invalid read-only interface policy'); };
  if (value.version !== 1 || Object.keys(value).some(k => !['version','rules','incoming'].includes(k)) || !Array.isArray(value.rules) || value.rules.length > 40) fail();
  const ids = new Set<string>();
  const rules = value.rules.map((r: any) => {
    if (!r || Object.keys(r).some(k => !['id','kind','name','role','elementId','inputName','automationId','path'].includes(k)) || !/^[a-z0-9_-]{1,40}$/.test(r.id) || ids.has(r.id) || !['search-field','search-submit','navigate','accept-call','end-call'].includes(r.kind)) fail();
    ids.add(r.id);
    for (const key of ['name','role']) if (typeof r[key] !== 'string' || !r[key].trim() || r[key].length > 160) fail();
    for (const key of ['elementId','inputName','automationId']) if (r[key] !== undefined && (typeof r[key] !== 'string' || !r[key] || r[key].length > 160 || /[\x00-\x1f]/.test(r[key]))) fail();
    if (r.kind === 'navigate') { if (typeof r.path !== 'string' || !/^\/(?!\/)/.test(r.path) || r.path.length > 2048 || /[\x00-\x20#\\]/.test(r.path)) fail(); }
    if(r.path!==undefined){if(typeof r.path!=='string' || !/^\/(?!\/)/.test(r.path) || r.path.length>2048 || /[\x00-\x20#\\]/.test(r.path))fail();const path=new URL(r.path,'https://policy.invalid');if([...path.searchParams.keys()].some(k=>/token|secret|password|api.?key|auth|session/i.test(k)))fail();}
    if (r.kind!=='navigate' && !r.elementId && !r.inputName && !r.automationId) fail();
    return { ...r } as InterfaceRule;
  });
  let incoming: InterfacePolicy['incoming'];
  if (value.incoming !== undefined) {
    const i=value.incoming;
    if (!i || Object.keys(i).some(k=>!['text','requiresAcoustic','answerRuleId','connectedText','endText'].includes(k)) || typeof i.text !== 'string' || !i.text.trim() || i.text.length>160 || typeof i.requiresAcoustic!=='boolean' || (i.endText!==undefined && (typeof i.endText!=='string' || !i.endText.trim() || i.endText.length>160)) || (i.answerRuleId!==undefined && !rules.some((r: InterfaceRule)=>r.id===i.answerRuleId && r.kind==='accept-call'))) fail();
    if(i.answerRuleId && (typeof i.connectedText!=='string' || !i.connectedText.trim() || i.connectedText.length>160)) fail();
    incoming={...i};
  }
  return {version:1,rules,...(incoming?{incoming}:{})};
}
