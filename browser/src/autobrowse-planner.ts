import log from 'electron-log';
import { runtimeStatus } from './runtime-state';
import type { GoalPlannerAction as GoalAction } from './goal-planner';

/**
 * Goal Mapper — translates a natural-language goal into a sequence of actions.
 */
export function mapGoalToActions(goal: string, inputs?: Record<string, unknown>): GoalAction[] {
  const actions: GoalAction[] = [];
  const goalLower = goal.toLowerCase();
  const wantsAccountCreation = goalLower.includes('create an account') || goalLower.includes('create account') || goalLower.includes('sign up') || goalLower.includes('signup') || goalLower.includes('register');
  const googleLikeLogin = goalLower.includes('google') || goalLower.includes('meet.google') || goalLower.includes('meet ');
  const wantsNextAfterEmail = googleLikeLogin || goalLower.includes('next screen') || goalLower.includes('advancing to the next') || goalLower.includes('clicking in advance') || goalLower.includes('clicking advance');

  // If inputs contain a URL, navigate first
  const url = (inputs?.url as string) || (inputs?.targetUrl as string);
  if (url) {
    actions.push({ type: 'navigate', url, description: `Navigate to ${url}` });
  }

  // Navigate goals
  if (goalLower.includes('navigate to') || goalLower.includes('go to') || goalLower.includes('open')) {
    const urlMatch = goal.match(/(?:navigate to|go to|open)\s+(https?:\/\/[^\s]+|[^\s]+\.[^\s]+)/i);
    if (urlMatch && !url) {
      let targetUrl = urlMatch[1];
      if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
      actions.push({ type: 'navigate', url: targetUrl, description: `Navigate to ${targetUrl}` });
    }
  }

  // Account creation goals
  if (wantsAccountCreation) {
    actions.push({ type: 'wait', value: '1500', description: 'Wait for account page to render' });
    actions.push({ type: 'click', selector: 'a[href*="signup"], a[href*="sign-up"], a[href*="create"], button, a', target: "button 'Create account'", description: 'Click create account / sign up entry point' });
    actions.push({ type: 'wait', value: '2500', description: 'Wait for account creation form' });
  }

  // Login goals — Google-style
  const handledGoogleStyleLogin = (goalLower.includes('login') || goalLower.includes('sign in') || goalLower.includes('log in')) && wantsNextAfterEmail;
  if (handledGoogleStyleLogin) {
    const username = (inputs?.username as string) || (inputs?.email as string) || '';
    const password = (inputs?.password as string) || '';
    if (username) {
      actions.push({ type: 'fill', selector: 'input[type="email"], input[name="identifier"], input[id="identifierId"], input[autocomplete="username"], input[name="Email"], input[name="email"]', target: "textbox 'Email'", value: username, description: `Fill username/email: ${username}` });
      actions.push({ type: 'click', selector: '#identifierNext button, button[type="button"], button, [role="button"]', target: "button 'Next'", description: 'Advance to password screen' });
      actions.push({ type: 'wait', value: '2500', description: 'Wait for password challenge' });
    }
    if (password) {
      actions.push({ type: 'fill', selector: 'input[type="password"], input[name="Passwd"], input[name="password"], input[id="password"], input[autocomplete="current-password"]', target: "textbox 'Password'", value: password, description: 'Fill password' });
      actions.push({ type: 'click', selector: '#passwordNext button, button[type="button"], button, [role="button"]', target: "button 'Next'", description: 'Submit password / continue' });
      actions.push({ type: 'wait', value: '4000', description: 'Wait after password submit' });
    }
  }

  // Login goals — generic
  if (!handledGoogleStyleLogin && (goalLower.includes('login') || goalLower.includes('sign in') || goalLower.includes('log in'))) {
    const username = (inputs?.username as string) || (inputs?.email as string) || '';
    const password = (inputs?.password as string) || '';
    if (username) {
      actions.push({ type: 'fill', selector: 'input[type="email"], input[name="user"], input[name="email"], input[id="user"], input[id="email"], input[autocomplete="username"]', target: "textbox 'Email'", value: username, description: `Fill username: ${username}` });
      actions.push({ type: 'press_key', selector: 'input[type="email"], input[name="user"], input[name="email"]', value: 'Tab', description: 'Move to password field' });
    }
    if (password) {
      actions.push({ type: 'fill', selector: 'input[type="password"], input[name="pass"], input[id="pass"]', target: "textbox 'Password'", value: password, description: 'Fill password' });
    }
    actions.push({ type: 'click', selector: 'button[type="submit"], input[type="submit"]', target: "button 'Sign in'", description: 'Click submit/login button' });
    actions.push({ type: 'wait', value: '3000', description: 'Wait for page to load after login' });
  }

  // Click goals
  if (goalLower.includes('click') || goalLower.includes('press button')) {
    const clickMatch = goal.match(/(?:click|press)\s+(?:on\s+)?["']?([^"']+)["']?/i);
    if (clickMatch) {
      const text = clickMatch[1].trim();
      actions.push({ type: 'click', selector: `button:has-text("${text}"), a:has-text("${text}"), [has-text("${text}")]`, description: `Click "${text}"` });
    }
  }

  // Fill / type goals
  if (goalLower.includes('fill') || goalLower.includes('type') || goalLower.includes('enter')) {
    const fillMatch = goal.match(/(?:fill|type|enter)\s+["']?([^"']+)["']?\s+(?:in|into|on)\s+["']?([^"']+)["']?/i);
    if (fillMatch) {
      actions.push({ type: 'fill', selector: fillMatch[2], value: fillMatch[1], description: `Fill "${fillMatch[1]}" into ${fillMatch[2]}` });
    }
  }

  // Search goals
  if (goalLower.includes('search') || goalLower.includes('find')) {
    const searchMatch = goal.match(/(?:search|find)\s+(?:for\s+)?["']?([^"']+)["']?/i);
    if (searchMatch) {
      const query = searchMatch[1];
      if (!url && !goalLower.includes('navigate to')) {
        actions.push({ type: 'navigate', url: 'https://www.google.com', description: 'Navigate to Google' });
      }
      actions.push({ type: 'fill', selector: 'input[name="q"], input[type="search"], textarea[name="q"]', value: query, description: `Type search: "${query}"` });
      actions.push({ type: 'press_key', selector: 'input[name="q"], input[type="search"]', value: 'Enter', description: 'Press Enter to search' });
      actions.push({ type: 'wait', value: '2000', description: 'Wait for search results' });
    }
  }

  // Extract / scrape goals
  if (goalLower.includes('extract') || goalLower.includes('scrape') || goalLower.includes('get text')) {
    actions.push({ type: 'wait', value: '1000', description: 'Wait for page to be ready' });
    actions.push({ type: 'extract', description: 'Extract page content' });
  }

  // Scroll goals
  if (goalLower.includes('scroll down') || goalLower.includes('scroll up') || (goalLower.includes('scroll') && !goalLower.includes('scrollbar'))) {
    const direction = goalLower.includes('up') ? 'up' : 'down';
    const amountMatch = goal.match(/scroll\s+(?:by\s+)?(\d+)/i);
    const amount = amountMatch ? amountMatch[1] : '500';
    actions.push({ type: 'scroll', direction, value: amount, description: `Scroll ${direction}` });
  }

  // Hover goals
  if (goalLower.includes('hover') || goalLower.includes('mouse over')) {
    const hoverMatch = goal.match(/(?:hover|mouse over)\s+(?:on\s+)?["']?([^"']+)["']?/i);
    if (hoverMatch) {
      actions.push({ type: 'hover', selector: hoverMatch[1], description: `Hover over ${hoverMatch[1]}` });
    }
  }

  // Submit / press button goals
  if ((goalLower.includes('press') || goalLower.includes('click')) && (goalLower.includes('button') || goalLower.includes('submit'))) {
    const btnMatch = goal.match(/(?:press|click)\s+(?:the\s+)?["']?([^"']+)?["']?\s*(?:button|submit)?/i);
    if (btnMatch?.[1] && btnMatch[1].length > 0 && btnMatch[1].length < 50) {
      const text = btnMatch[1].trim();
      actions.push({ type: 'click', selector: `button:has-text("${text}"), input[type="submit"]:has-text("${text}")`, description: `Click button: ${text}` });
    } else {
      actions.push({ type: 'submit', description: 'Submit form' });
    }
  }

  // Wait goals
  if (goalLower.includes('wait')) {
    const waitMatch = goal.match(/wait\s+(?:for\s+)?(\d+)\s*(seconds?|ms|s|m)?/i);
    if (waitMatch) {
      let ms = parseInt(waitMatch[1], 10);
      if (waitMatch[2]?.match(/second|sec/i)) ms *= 1000;
      if (waitMatch[2] === 'm' && !waitMatch[2]?.match(/ms/i)) ms *= 60000;
      actions.push({ type: 'wait', value: String(Math.min(ms, 30000)), description: `Wait ${ms}ms` });
    } else if (goalLower === 'wait' || goalLower === 'wait a bit') {
      actions.push({ type: 'wait', value: '2000', description: 'Wait 2s' });
    }
  }

  // Refresh / reload goals
  if (goalLower.includes('reload') || goalLower === 'refresh page') {
    actions.push({ type: 'wait', value: '500', description: 'Reload page' });
  }

  // If no actions were mapped, try as a URL or search
  if (actions.length === 0) {
    if (goal.match(/^https?:\/\//i) || goal.match(/\.[a-z]{2,}$/i)) {
      const targetUrl = goal.startsWith('http') ? goal : 'https://' + goal;
      actions.push({ type: 'navigate', url: targetUrl, description: `Navigate to ${targetUrl}` });
    } else {
      actions.push({ type: 'navigate', url: `https://www.google.com/search?q=${encodeURIComponent(goal)}`, description: `Search for: "${goal}"` });
    }
  }

  // Always screenshot at end
  actions.push({ type: 'screenshot', description: 'Capture final state' });

  return actions;
}

/**
 * Call the AI Planner API to decompose a goal into steps.
 */
export async function callPlannerAPI(
  goal: string,
  url: string,
  pageContext: string,
  pageTitle: string,
  previousActions: string[]
): Promise<{ steps: GoalAction[]; reasoning?: string; explanation?: string }> {
  try {
    const cloudUrl = runtimeStatus.cloudUrl || 'https://keledon.tuyoisaza.com';
    const res = await fetch(`${cloudUrl}/api/planner/decompose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        url,
        pageContext,
        pageTitle,
        previousActions,
        maxSteps: 8,
      }),
    });
    if (!res.ok) {
      log.warn(`[AI Planner] API returned ${res.status}`);
      return { steps: [] };
    }
    const data = await res.json();
    if (!data.success || !Array.isArray(data.steps) || data.steps.length === 0) {
      log.warn('[AI Planner] No steps returned from API');
      return { steps: [] };
    }
    return {
      steps: data.steps
        .filter((s: GoalAction) => s?.type)
        .map((s: GoalAction) => ({
          type: s.type,
          selector: s.selector,
          target: s.selector,
          value: s.value,
          url: s.url,
          description: s.description || `${s.type} step`,
        })),
      reasoning: data.reasoning,
      explanation: data.explanation,
    };
  } catch (error) {
    log.warn(`[AI Planner] API call failed: ${error}`);
    return { steps: [] };
  }
}
