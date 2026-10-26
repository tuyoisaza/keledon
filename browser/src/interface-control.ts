import { app, BrowserWindow, dialog } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execFile } from 'child_process';
import type { TabManager, Tab } from './tab-manager';
import { runtimeStatus } from './runtime-state';

let manager: TabManager | undefined;
type Local = { token: string; expires: number; tab?: Tab; window?: any; refs?: Record<string, any>; revision?: string; generation: number };
const controls = new Map<string, Local>();
export function setInterfaceTabManager(value: TabManager) { manager = value; }
function asset(name: string) { return app.isPackaged ? join(process.resourcesPath, 'interface-control', name) : join(__dirname, '../../experiments/meet-audio', name); }
function native(input: any): Promise<any> {
  return new Promise(resolve => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', asset('native-uia.ps1')], { windowsHide: true, timeout: 10000, maxBuffer: 500000, encoding: 'utf8' }, (error, stdout) => {
      if (error) { resolve({ code: 'NATIVE_EXECUTOR_UNAVAILABLE' }); return; }
      try { resolve(JSON.parse(stdout.replace(/^\uFEFF/, ''))); } catch { resolve({ code: 'NATIVE_EXECUTOR_UNAVAILABLE' }); }
    }); child.stdin?.end(JSON.stringify(input));
  });
}
async function grant(commandId: string) {
  if (!runtimeStatus.authToken || !runtimeStatus.deviceId) throw new Error('DEVICE_SESSION_REQUIRED');
  const url = new URL(`/api/browser/devices/${encodeURIComponent(runtimeStatus.deviceId)}/interface-authorize`, runtimeStatus.cloudUrl);
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${runtimeStatus.authToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ commandId }), redirect: 'error', signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error('CONTROL_REVOKED');
  const value: any = await response.json(); if (value.teamId !== runtimeStatus.teamId || value.expires <= Date.now()) throw new Error('CONTROL_REVOKED'); return value;
}
/** Uses the existing paired-device poller; no new worker or polling loop. */
export async function executeInterfaceCommand(commandId: string, parent: BrowserWindow | null): Promise<any> {
  for (const [id, local] of controls) if (local.expires <= Date.now() || local.token !== runtimeStatus.authToken) { controls.delete(id); }
  try {
    let permission = await grant(commandId); let local = controls.get(permission.controlId);
    if (permission.operation === 'open') {
      if (permission.target.kind === 'web') {
        if (!manager || !permission.target.url || new URL(permission.target.url).origin !== permission.target.origin) throw new Error('WEB_EXECUTOR_UNAVAILABLE');
        const tab = manager.createTab('Interfaz autorizada', permission.target.url, [permission.target.origin]);
        local = { tab, token: runtimeStatus.authToken, expires: permission.sessionExpires, generation: permission.generation };
      } else {
        if (process.platform !== 'win32') throw new Error('WINDOWS_EXECUTOR_REQUIRED');
        const listing = await native({ operation: 'windows', executable: permission.target.executable });
        const windows = Array.isArray(listing.windows) ? listing.windows.slice(0, 10) : []; if (!windows.length) throw new Error('NO_AUTHORIZED_WINDOW');
        const options = { type: 'question' as const, title: 'KELEDON · autorizar interfaz local', message: 'Elige la ventana ficticia que autorizas observar y controlar durante dos minutos.', detail: 'Solo la aplicación configurada por tu equipo. No se capturan otras ventanas ni contraseñas.', buttons: [...windows.map(w => String(w.label || 'Ventana').slice(0, 120)), 'Cancelar'], cancelId: windows.length, noLink: true };
        const choice = parent ? await dialog.showMessageBox(parent, options) : await dialog.showMessageBox(options);
        if (choice.response >= windows.length) throw new Error('LOCAL_CONSENT_REQUIRED'); permission = await grant(commandId);
        local = { window: windows[choice.response], token: runtimeStatus.authToken, expires: permission.sessionExpires, generation: permission.generation };
      }
      controls.set(permission.controlId, local); return { code: 'SURFACE_OPENED', verified: false };
    }
    if (!local || local.token !== runtimeStatus.authToken || local.expires <= Date.now()) throw new Error('OPEN_SURFACE_REQUIRED');
    if (permission.operation === 'act' && local.generation !== permission.generation) throw new Error('STALE_OBSERVATION'); local.generation = permission.generation;
    let result: any;
    if (permission.target.kind === 'web') {
      const view = local.tab?.view;
      if (!view || view.webContents.isDestroyed() || new URL(view.webContents.getURL()).origin !== permission.target.origin) throw new Error('SURFACE_SCOPE_DENIED');
      await view.webContents.executeJavaScriptInIsolatedWorld(1004, [{ code: readFileSync(asset('surface-dom.js'), 'utf8') }]);
      if (permission.operation === 'observe') result = { code: 'OBSERVED', observation: await view.webContents.executeJavaScriptInIsolatedWorld(1004, [{ code: `globalThis.keledonSurfaceEngine.open(${JSON.stringify({ origin: permission.target.origin, expires: local.expires, policy: permission.target.policy, allowInteraction: permission.allowInteraction })})` }]), verified: false };
      else { await grant(commandId); result = await view.webContents.executeJavaScriptInIsolatedWorld(1004, [{ code: `globalThis.keledonSurfaceEngine.act(${JSON.stringify({ revision: permission.revision, action: permission.action })})` }]); }
    } else {
      if (permission.operation === 'act' && (permission.revision !== local.revision || !local.refs?.[permission.action?.ref])) throw new Error('STALE_OBSERVATION');
      await grant(commandId); result = await native({ operation: permission.operation, executable: permission.target.executable, window: local.window, policy: permission.target.policy, allowInteraction: permission.allowInteraction, action: permission.action, ref: permission.action ? local.refs?.[permission.action.ref] : undefined });
      local.refs = result.privateRefs; delete result.privateRefs;
    }
    if (result.observation) local.revision = result.observation.revision;
    await grant(commandId); return result;
  } catch (error) { const message = error instanceof Error ? error.message : ''; return { code: /^[A-Z_]{1,48}$/.test(message) ? message : 'EXECUTOR_UNAVAILABLE', verified: false }; }
}
