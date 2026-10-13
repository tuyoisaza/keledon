export type MediaType = 'audio' | 'video';

export interface PermissionDetails {
  requestingUrl?: string;
  securityOrigin?: string;
  mediaTypes?: string[];
  mediaType?: string;
  isMainFrame?: boolean;
}

export interface MediaPermissionContext {
  origin: string;
  requestingHost: string;
  tabUrl: string;
  tabHost: string;
  mediaTypes: MediaType[];
}

export interface MediaPermissionPrompt {
  title: string;
  message: string;
  detail: string;
  buttons: [string, string];
}

export type PermissionGrants = Map<string, Set<MediaType>>;
export interface PermissionWebContents {
  getURL(): string;
  isDestroyed(): boolean;
}

export interface PermissionHandlers {
  grants: PermissionGrants;
  check(permission: string, requestingOrigin: string, details: PermissionDetails): boolean;
  request(
    webContents: PermissionWebContents,
    permission: string,
    callback: (allowed: boolean) => void,
    details: PermissionDetails,
  ): void;
}

function secureOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.origin : null;
  } catch {
    return null;
  }
}

export function getMediaPermissionContext(
  permission: string,
  details: PermissionDetails,
  tabUrl: string,
): MediaPermissionContext | null {
  if (permission !== 'media' || !Array.isArray(details.mediaTypes) || details.mediaTypes.length === 0) return null;
  if (details.mediaTypes.some(type => type !== 'audio' && type !== 'video')) return null;

  const origin = secureOrigin(details.securityOrigin || details.requestingUrl || '');
  const requestingUrlOrigin = secureOrigin(details.requestingUrl || '');
  const tabOrigin = secureOrigin(tabUrl);
  if (!origin || origin !== requestingUrlOrigin || !tabOrigin) return null;

  const mediaTypes = [...new Set(details.mediaTypes)] as MediaType[];
  return {
    origin,
    requestingHost: new URL(origin).host,
    tabUrl,
    tabHost: new URL(tabOrigin).host,
    mediaTypes,
  };
}

export function hasMediaPermission(
  grants: PermissionGrants,
  permission: string,
  requestingOrigin: string,
  details: PermissionDetails,
): boolean {
  const mediaTypes = details.mediaTypes || (details.mediaType ? [details.mediaType] : []);
  if (permission !== 'media' || mediaTypes.length === 0) return false;
  const origin = secureOrigin(requestingOrigin);
  if (!origin || origin !== requestingOrigin) return false;
  const requested = mediaTypes;
  if (requested.some(type => type !== 'audio' && type !== 'video')) return false;
  const granted = grants.get(origin);
  return Boolean(granted && requested.every(type => granted.has(type as MediaType)));
}

export function rememberMediaPermission(grants: PermissionGrants, context: MediaPermissionContext): void {
  const granted = grants.get(context.origin) || new Set<MediaType>();
  context.mediaTypes.forEach(type => granted.add(type));
  grants.set(context.origin, granted);
}

export function getMediaPermissionPrompt(context: MediaPermissionContext, language: string): MediaPermissionPrompt {
  const spanish = language.toLowerCase().startsWith('es');
  const mediaLabel = context.mediaTypes.map(type => spanish
    ? (type === 'audio' ? 'micrófono' : 'cámara')
    : (type === 'audio' ? 'microphone' : 'camera')).join(spanish ? ' y ' : ' and ');
  return spanish ? {
    title: 'Permiso del sitio',
    message: `¿Permitir ${mediaLabel} a ${context.requestingHost}?`,
    detail: `La página ${context.tabHost} solicita acceso para ${context.requestingHost}. El permiso dura mientras KELEDON Browser esté abierto.`,
    buttons: ['Permitir durante esta sesión', 'Denegar'],
  } : {
    title: 'Site permission',
    message: `Allow ${mediaLabel} for ${context.requestingHost}?`,
    detail: `The ${context.tabHost} page is requesting access for ${context.requestingHost}. Access lasts while KELEDON Browser is open.`,
    buttons: ['Allow for this session', 'Deny'],
  };
}

export function createPermissionHandlers(
  requestConsent: (context: MediaPermissionContext) => Promise<boolean>,
): PermissionHandlers {
  const grants: PermissionGrants = new Map();
  return {
    grants,
    check: (permission, origin, details) => hasMediaPermission(grants, permission, origin, details),
    request: (webContents, permission, callback, details) => {
      const context = getMediaPermissionContext(permission, details, webContents.getURL());
      if (!context || webContents.isDestroyed()) return callback(false);

      void requestConsent(context).then(approved => {
        const stillSamePage = !webContents.isDestroyed() && webContents.getURL() === context.tabUrl;
        if (approved && stillSamePage) rememberMediaPermission(grants, context);
        callback(approved && stillSamePage);
      }).catch(() => callback(false));
    },
  };
}
