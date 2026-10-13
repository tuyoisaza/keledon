/** Validate an external launch target without probing the OS protocol handler. */
export function requestKeledonLaunch(value, navigate) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return false;
  let target;
  try { target = new URL(value); } catch { return false; }
  if (target.protocol !== 'keledon:' || target.hostname !== 'launch' ||
      (target.pathname !== '' && target.pathname !== '/') ||
      target.username || target.password || target.port || target.hash) return false;
  navigate(target.href);
  return true;
}
