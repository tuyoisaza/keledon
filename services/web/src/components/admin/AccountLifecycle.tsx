import { useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { useTranslation } from '@/context/I18nContext';
export function AccountLifecycle({id,active,onChanged}:{id:string;active:boolean;onChanged:()=>void}) {
 const {t}=useTranslation();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function change(body:unknown){setBusy(true);setMessage('');try{const r=await apiFetch(`/api/admin/accounts/${encodeURIComponent(id)}/lifecycle`,{method:'PUT',body:JSON.stringify(body)});if(!r.ok)throw Error();onChanged();setMessage(t('account.saved'));}catch{setMessage(t('account.failed'));}finally{setBusy(false);}}
 return <span className="inline-flex flex-wrap items-center gap-2"><button type="button" className="rounded border border-border px-2 py-1" disabled={busy} onClick={()=>void change({isActive:!active})}>{t(active?'account.suspend':'account.reactivate')}</button><button type="button" className="rounded border border-border px-2 py-1" disabled={busy} onClick={()=>void change({revokeSessions:true})}>{t('account.revoke')}</button><span role="status">{message}</span></span>;
}
