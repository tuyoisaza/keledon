export interface GoalPlannerAction {
  type: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit' | 'assert';
  selector?: string;
  target?: string;
  value?: string;
  url?: string;
  description: string;
  timeout?: number;
  direction?: string;
}

const LOGIN_WORDS = ['login', 'log in', 'sign in'];

function normalizeUrl(raw: string): string {
  const clean = raw.trim().replace(/[),.;]+$/g, '');
  return clean.match(/^https?:\/\//i) ? clean : `https://${clean}`;
}

function goalHasAny(goalLower: string, words: string[]): boolean {
  return words.some((word) => goalLower.includes(word));
}

function extractUrlFromText(text: string): string | null {
  const match = text.match(/(?:navigate to|go to|open|visit|browse to)\s+(https?:\/\/[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i)
    || text.match(/(https?:\/\/[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i);
  return match ? normalizeUrl(match[1]) : null;
}

function quotedOrTrailingText(text: string, verbs: string[]): string | null {
  const quoted = text.match(/["'“”‘’]([^"'“”‘’]+)["'“”‘’]/);
  if (quoted?.[1]) return quoted[1].trim();
  const verbPattern = verbs.map((verb) => verb.replace(/\s+/g, '\\s+')).join('|');
  const trailing = text.match(new RegExp(`(?:${verbPattern})(?:\\s+on|\\s+the)?\\s+(.+)$`, 'i'));
  if (!trailing?.[1]) return null;
  return trailing[1]
    .replace(/\b(?:button|link|field|textbox|input)$/i, '')
    .replace(/[),.;]+$/g, '')
    .trim();
}

function fieldSelector(field: string): string {
  const lower = field.toLowerCase();
  if (lower.includes('password')) {
    return 'input[type="password"], input[name*="pass" i], input[id*="pass" i], input[autocomplete="current-password"]';
  }
  if (lower.includes('email') || lower.includes('user') || lower.includes('login')) {
    return 'input[type="email"], input[name*="email" i], input[id*="email" i], input[name*="user" i], input[id*="user" i], input[name*="login" i], input[id*="login" i], input[placeholder*="login" i], input[autocomplete="username"]';
  }
  if (lower.includes('search')) {
    return 'input[name="q"], input[type="search"], textarea[name="q"], input[placeholder*="search" i]';
  }
  return `input[name*="${field}" i], input[id*="${field}" i], input[placeholder*="${field}" i], textarea[name*="${field}" i], textarea[placeholder*="${field}" i], [contenteditable="true"]`;
}

function fieldTarget(field: string): string {
  const label = field.trim() || 'Field';
  return `textbox '${label.replace(/'/g, '')}'`;
}

function isSensitiveField(field: string): boolean {
  return /password|passcode|secret|token|api\s*key|credential/i.test(field);
}

function visibleFillDescription(value: string, field: string): string {
  return isSensitiveField(field) ? `Fill ${field} with [REDACTED]` : `Fill ${field} with ${value}`;
}

function clickAction(label: string, description?: string): GoalPlannerAction {
  const safe = label.replace(/"/g, '\\"');
  return {
    type: 'click',
    // v0.3.39 safety: keep matching semantic/label-specific. The legacy broad fallback
    // (`button, a, [role="button"]`) is intentionally not used here because it can click
    // the first arbitrary button/link when text matching fails.
    selector: `button[aria-label*="${safe}" i], a[aria-label*="${safe}" i], input[aria-label*="${safe}" i], input[value*="${safe}" i]`,
    target: `button '${label.replace(/'/g, '')}'`,
    description: description || `Click ${label}`,
  };
}

function fillAction(value: string, field: string): GoalPlannerAction {
  return {
    type: 'fill',
    selector: fieldSelector(field),
    target: fieldTarget(field),
    value,
    description: visibleFillDescription(value, field),
  };
}

function splitGoalIntoClauses(goal: string): string[] {
  const numbered = goal
    .replace(/\r?\n+/g, ' then ')
    .replace(/\b(?:first|second|third|finally)[:,]?\s+/gi, ' then ')
    .replace(/\b\d+[.)]\s+/g, ' then ');
  // v0.3.38 additive guard: do not split on the word "Next" by itself because it is also a button label.
  return numbered
    .split(/\s+(?:then|and then|after that)\s+|[;\n]+/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function planClause(clause: string): GoalPlannerAction[] {
  const actions: GoalPlannerAction[] = [];
  const lower = clause.toLowerCase();
  // v0.3.38 additive guard: only treat dotted text as a URL when the clause is explicitly navigational.
  // This prevents emails like tuyo@example.com in a fill step from becoming accidental navigation.
  const isExplicitNavigationClause = /^(?:go to|open|visit|navigate to|browse to)\b/i.test(clause.trim()) || /^https?:\/\//i.test(clause.trim());
  const url = isExplicitNavigationClause ? extractUrlFromText(clause) : null;
  if (url) {
    actions.push({ type: 'navigate', url, description: `Navigate to ${url}` });
    return actions;
  }

  const fillMatch = clause.match(/(?:fill|type|enter|put)\s+["'“”‘’]?([^"'“”‘’]+?)["'“”‘’]?\s+(?:in|into|on|for)\s+(?:the\s+)?["'“”‘’]?([^"'“”‘’]+?)["'“”‘’]?$/i);
  if (fillMatch?.[1] && fillMatch?.[2]) {
    actions.push(fillAction(fillMatch[1].trim(), fillMatch[2].trim()));
    return actions;
  }

  const fieldFirstMatch = clause.match(/(?:fill|type|enter|put)\s+(?:the\s+)?([a-z0-9 _-]+?)\s+(?:field|textbox|input)?\s+(?:with|as|=)\s+["'“”‘’]?([^"'“”‘’]+?)["'“”‘’]?$/i);
  if (fieldFirstMatch?.[1] && fieldFirstMatch?.[2]) {
    actions.push(fillAction(fieldFirstMatch[2].trim(), fieldFirstMatch[1].trim()));
    return actions;
  }

  if (lower.includes('search')) {
    const query = quotedOrTrailingText(clause, ['search for', 'search']);
    if (query) {
      actions.push({ type: 'navigate', url: 'https://www.google.com', description: 'Navigate to Google search' });
      actions.push(fillAction(query, 'search'));
      actions.push({ type: 'press_key', selector: fieldSelector('search'), value: 'Enter', description: `Submit search for ${query}` });
      actions.push({ type: 'wait', value: '2000', description: 'Wait for search results' });
      return actions;
    }
  }

  if (lower.includes('wait')) {
    const waitMatch = clause.match(/wait\s+(?:for\s+)?(\d+)\s*(seconds?|ms|s|m)?/i);
    let ms = 2000;
    if (waitMatch) {
      ms = parseInt(waitMatch[1], 10);
      if (waitMatch[2]?.match(/second|s/i) && !waitMatch[2]?.match(/ms/i)) ms *= 1000;
      if (waitMatch[2] === 'm') ms *= 60000;
    }
    actions.push({ type: 'wait', value: String(Math.min(ms, 30000)), description: `Wait ${Math.min(ms, 30000)}ms` });
    return actions;
  }

  if (lower.includes('scroll')) {
    const direction = lower.includes('up') ? 'up' : 'down';
    const amountMatch = clause.match(/scroll\s+(?:by\s+)?(\d+)/i);
    actions.push({ type: 'scroll', direction, value: amountMatch?.[1] || '500', description: `Scroll ${direction}` });
    return actions;
  }

  if (lower.includes('extract') || lower.includes('scrape') || lower.includes('get text') || lower.includes('page content')) {
    actions.push({ type: 'wait', value: '1000', description: 'Wait for page to be ready' });
    actions.push({ type: 'extract', description: 'Extract page content' });
    return actions;
  }

  if (/(click|press|tap|select|choose)/i.test(clause)) {
    const label = quotedOrTrailingText(clause, ['click', 'press', 'tap', 'select', 'choose']);
    if (label) {
      actions.push(clickAction(label));
      return actions;
    }
  }

  if (lower.includes('submit')) {
    actions.push({ type: 'submit', description: 'Submit form' });
  }

  return actions;
}

function planAccountCreation(goalLower: string): GoalPlannerAction[] {
  const wantsAccountCreation = goalLower.includes('create an account') || goalLower.includes('create account') || goalLower.includes('sign up') || goalLower.includes('signup') || goalLower.includes('register');
  if (!wantsAccountCreation) return [];
  return [
    { type: 'wait', value: '1500', description: 'Wait for account page to render' },
    { ...clickAction('Create account', 'Click create account / sign up entry point'), selector: 'a[href*="signup"], a[href*="sign-up"], a[href*="create"], button, a' },
    { type: 'wait', value: '2500', description: 'Wait for account creation form' },
  ];
}

function planLogin(goal: string, inputs?: Record<string, unknown>): GoalPlannerAction[] {
  const goalLower = goal.toLowerCase();
  if (!goalHasAny(goalLower, LOGIN_WORDS)) return [];
  const actions: GoalPlannerAction[] = [];
  const username = (inputs?.username as string) || (inputs?.email as string) || '';
  const password = (inputs?.password as string) || '';
  const googleLikeLogin = goalLower.includes('google') || goalLower.includes('meet.google') || goalLower.includes('meet ');
  const wantsNextAfterEmail = googleLikeLogin || goalLower.includes('next screen') || goalLower.includes('advance') || goalLower.includes('click next');

  if (wantsNextAfterEmail) {
    if (username) {
      actions.push(fillAction(username, 'Email'));
      actions.push({ ...clickAction('Next'), selector: '#identifierNext button, button[type="button"], button, [role="button"]', description: 'Advance to password screen' });
      actions.push({ type: 'wait', value: '2500', description: 'Wait for password challenge' });
    }
    if (password) {
      actions.push(fillAction(password, 'Password'));
      actions.push({ ...clickAction('Next'), selector: '#passwordNext button, button[type="button"], button, [role="button"]', description: 'Submit password / continue' });
      actions.push({ type: 'wait', value: '4000', description: 'Wait after password submit' });
    }
    return actions;
  }

  if (username) {
    actions.push(fillAction(username, 'Email'));
    actions.push({ type: 'press_key', selector: fieldSelector('email'), value: 'Tab', description: 'Move to password field' });
  }
  if (password) actions.push(fillAction(password, 'Password'));
  actions.push({ ...clickAction('Sign in'), selector: 'button[type="submit"][aria-label*="sign" i], input[type="submit"][value*="sign" i], button[aria-label*="login" i], input[type="submit"][value*="login" i]', description: 'Click submit/login button' });
  actions.push({ type: 'wait', value: '3000', description: 'Wait for page to load after login' });
  return actions;
}

export function planGoalActions(goal: string, inputs?: Record<string, unknown>): GoalPlannerAction[] {
  const actions: GoalPlannerAction[] = [];
  const goalLower = goal.toLowerCase();
  const inputUrl = (inputs?.url as string) || (inputs?.targetUrl as string);
  if (inputUrl) actions.push({ type: 'navigate', url: normalizeUrl(inputUrl), description: `Navigate to ${normalizeUrl(inputUrl)}` });

  for (const clause of splitGoalIntoClauses(goal)) {
    actions.push(...planClause(clause));
  }

  const hasExplicitFormFill = actions.some((action) => action.type === 'fill');
  const hasExplicitInteractiveStep = actions.some((action) => action.type === 'click' || action.type === 'fill' || action.type === 'submit');
  const hasCredentialInputs = Boolean((inputs?.username as string) || (inputs?.email as string) || (inputs?.password as string));
  actions.push(...planAccountCreation(goalLower));
  if (goalHasAny(goalLower, LOGIN_WORDS) && (hasCredentialInputs || !hasExplicitInteractiveStep) && !hasExplicitFormFill) {
    actions.push(...planLogin(goal, inputs));
  }

  if (actions.length === 0) {
    const directUrl = extractUrlFromText(goal);
    if (directUrl) actions.push({ type: 'navigate', url: directUrl, description: `Navigate to ${directUrl}` });
    else actions.push({ type: 'navigate', url: `https://www.google.com/search?q=${encodeURIComponent(goal)}`, description: `Search for: "${goal}"` });
  }

  if (actions.length === 1 && actions[0].type === 'navigate' && !inputUrl && !goal.match(/^https?:\/\//i)) {
    actions.push({ type: 'wait', value: '1500', description: 'Wait for page to render before continuing' });
  }

  actions.push({ type: 'screenshot', description: 'Capture final state' });
  return actions;
}
