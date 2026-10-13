import { waitForElementSelector } from './genesys-dom.utils';

interface CustomerInfoSelectors {
  customerInfo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

export async function readCustomerInfo(selectors: CustomerInfoSelectors, timeout: number) {
  const panel = await waitForElementSelector(selectors.customerInfo, timeout);
  if (!panel) throw new Error('Customer information panel not found');

  return {
    name: panel.querySelector(selectors.customerName)?.textContent?.trim() || '',
    phone: panel.querySelector(selectors.customerPhone)?.textContent?.trim() || '',
    email: panel.querySelector(selectors.customerEmail)?.textContent?.trim() || '',
  };
}
