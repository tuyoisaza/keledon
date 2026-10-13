import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Public discovery metadata never includes tenant, record or query data. */
export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isPublicHome = pathname === '/';
    document.title = isPublicHome ? 'KELEDON | Cloud-governed contact center runtime' : 'KELEDON | Application';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = isPublicHome ? 'index, follow' : 'noindex, nofollow';
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (isPublicHome) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
      canonical.href = 'https://keledon.tuyoisaza.com/';
    } else canonical?.remove();
  }, [pathname]);
  return null;
}
