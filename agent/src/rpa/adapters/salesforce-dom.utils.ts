export async function navigateToCase(caseId: string): Promise<void> {
  const currentUrl = window.location.href;
  const caseUrl = `${window.location.origin}/${caseId}`;
  if (currentUrl !== caseUrl) {
    window.location.href = caseUrl;
    await waitForTimeout(3000);
  }
}

export async function waitForElementSelector(selector: string, timeout: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) return resolve(element);
      if (Date.now() - startTime > timeout) return resolve(null);
      setTimeout(checkElement, 100);
    };
    checkElement();
  });
}

export async function fillInputField(element: Element, value: string): Promise<void> {
  const input = element as HTMLInputElement | HTMLTextAreaElement;
  input.focus();
  input.value = '';
  input.dispatchEvent(new Event('focus', { bubbles: true }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  for (let i = 0; i < value.length; i++) {
    input.value += value[i];
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForTimeout(50);
  }
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

export async function selectDropdownOption(element: Element, option: string): Promise<void> {
  const select = element as HTMLSelectElement;
  let targetOption: HTMLOptionElement | null = null;
  for (let i = 0; i < select.options.length; i++) {
    const candidate = select.options[i];
    if (candidate.text.toLowerCase().includes(option.toLowerCase()) ||
        candidate.value.toLowerCase().includes(option.toLowerCase())) {
      targetOption = candidate;
      break;
    }
  }
  if (!targetOption) throw new Error(`Option '${option}' not found in dropdown`);
  select.value = targetOption.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export function waitForTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
