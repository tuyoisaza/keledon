export async function waitForElementSelector(selector: string, timeout: number): Promise<Element | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) return element;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

export function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null;
}

export function isGenesysPage(): boolean {
  return window.location.hostname.includes('genesys.com') ||
    window.location.hostname.includes('mypurecloud.com') ||
    document.querySelector<HTMLMetaElement>('meta[name="generator"]')?.content?.includes('genesys') ||
    document.querySelector('[data-app="genesys-cloud"]') !== null;
}
