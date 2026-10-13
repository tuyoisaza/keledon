export class UIDomMethods {
  protected async waitForElement(
    selector: string,
    timeout: number = 5000,
  ): Promise<Element | null> {
    if (typeof document === 'undefined') {
      throw new Error('UI automation requires a browser document');
    }

    return new Promise<Element | null>((resolve, reject) => {
      let settled = false;
      const finish = (element: Element | null) => {
        if (settled) return;
        settled = true;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        if (element) resolve(element);
        else
          reject(
            new Error(`Element not found within ${timeout}ms: ${selector}`),
          );
      };
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) finish(element);
      };

      const intervalId = setInterval(checkElement, 100);
      const timeoutId = setTimeout(() => finish(null), timeout);
      checkElement();
    });
  }

  protected async scrollIntoView(element: Element): Promise<void> {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
    await this.waitForPageStability(1000);
  }

  protected async waitForPageStability(timeout: number = 1000): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  protected async waitForPageLoad(timeout: number = 5000): Promise<void> {
    if (typeof document === 'undefined' || document.readyState === 'complete')
      return;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        if (document.readyState === 'complete') finish();
      };
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Page load timeout'));
      }, timeout);
      const cleanup = () => {
        clearTimeout(timeoutId);
        document.removeEventListener('readystatechange', onReady);
      };
      const finish = () => {
        cleanup();
        resolve();
      };
      document.addEventListener('readystatechange', onReady);
      onReady();
    });
  }

  protected async waitForCondition(
    condition: string,
    timeout: number,
  ): Promise<void> {
    if (this.evaluateCondition(condition)) return;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        if (error) reject(error);
        else resolve();
      };
      const intervalId = setInterval(() => {
        if (this.evaluateCondition(condition)) finish();
      }, 100);
      const timeoutId = setTimeout(
        () =>
          finish(
            new Error(`Condition not met within ${timeout}ms: ${condition}`),
          ),
        timeout,
      );
    });
  }

  protected evaluateCondition(condition: string): boolean {
    try {
      // Simple condition evaluation (can be extended)

      return Boolean(eval(condition));
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  protected findParentForm(selector: string): HTMLFormElement | null {
    let element = document.querySelector(selector);

    while (element && element.tagName !== 'FORM') {
      element = element.parentElement;
    }

    return element instanceof HTMLFormElement ? element : null;
  }

  protected findSubmitButton(
    form: HTMLFormElement,
  ): HTMLButtonElement | HTMLInputElement | null {
    const buttons = form.querySelectorAll(
      'button[type="submit"], input[type="submit"]',
    );

    return buttons.length > 0
      ? (buttons[0] as HTMLButtonElement | HTMLInputElement)
      : null;
  }

  protected fillFormField(
    form: HTMLFormElement,
    fieldName: string,
    value: string,
  ): void {
    const input = form.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(
      `input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`,
    );

    if (input) {
      input.focus?.();
      input.value = value;

      // Trigger change events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  protected isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  /**
   * Get description of action for logging
   */
}
