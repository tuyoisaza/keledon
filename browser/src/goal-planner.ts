/**
 * Goal Planner - Decompose natural-language goals into browser actions
 *
 * This module provides heuristic and AI-powered goal decomposition for
 * the KELEDON browser automation engine. Goals like "find the cheapest flight
 * to Tokyo" are split into executable browser steps (navigate, click, fill, etc.).
 *
 * Two strategies are available:
 * 1. Heuristic planner (`planGoalActions`) — rule-based, fast, no network
 * 2. AI hybrid planner (`planGoalActionsWithAI`) — heuristic first, fallback to cloud LLM
 *
 * @module goal-planner
 * @version 0.3.80
 */

/**
 * Represents a single executable browser step.
 * Types cover navigation, interaction, extraction, and validation actions.
 */
export interface GoalPlannerAction {
  type: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit' | 'assert';
  /** CSS selector for the target element */
  selector?: string;
  /** Target text label (alternative to selector) */
  target?: string;
  /** Value to fill or parameter for the action */
  value?: string;
  /** URL for navigation actions */
  url?: string;
  /** Human-readable description of this step */
  description: string;
  /** Max wait time in ms (for wait_for actions) */
  timeout?: number;
  /** Scroll direction (up/down) */
  direction?: string;
}

/** Response shape from the cloud AI planner endpoint */
interface AiStepResponse {
  type: string;
  selector?: string;
  value?: string;
  url?: string;
  description?: string;
}

/** Response shape from the cloud AI planner API */
interface AiPlannerResponse {
  steps: AiStepResponse[];
  reasoning?: string;
  explanation?: string;
}

/** Required inputs for sensitive field flows (login, signup, etc.) */
interface GoalInputs {
  email?: string;
  password?: string;
  [key: string]: unknown;
}

// ==================== Helper Functions ====================

/** Normalize a URL by removing trailing slashes and whitespace. */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').trim();
}

/**
 * Check if two planned URLs are semantically equivalent.
 * Used to avoid redundant navigation steps.
 */
function equivalentPlannedUrl(current: string | undefined, planned: string): boolean {
  try {
    if (!current) return false;
    return normalizeUrl(current) === normalizeUrl(planned);
  } catch {
    return false;
  }
}

/** Check if a goal text contains any of the given keywords (case-insensitive). */
function goalHasAny(goal: string, keywords: string[]): boolean {
  const lower = goal.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

/** Check if the goal appears to be a Google-driven search or login flow. */
function goalLooksGoogleLike(goal: string): boolean {
  return /google|gmail|youtube|google\s+sign/i.test(goal);
}

/** Check if the goal mentions email creation or submission. */
function goalWantsEmailStep(goal: string): boolean {
  return /email|e-mail|mail/i.test(goal) && !goal.toLowerCase().includes('password');
}

/** Check if the goal mentions password creation (not just generic password entry). */
function goalWantsPasswordStep(goal: string): boolean {
  return /password/i.test(goal) && /creat|set|new|choose|pick/i.test(goal);
}

/**
 * Extract a likely URL from a goal text.
 * Looks for patterns like "go to x.com", "navigate to example.com/path", or raw URLs.
 */
function extractUrlFromText(text: string): string | null {
  const patterns = [
    /(?:go\s+to|navigate\s+to|open|visit|load)\s+(?:https?:\/\/)?([^\s,.;!?]+)/i,
    /https?:\/\/[^\s,.;!?]+/,
    /(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/[^\s,.;!?]*)?/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let url = match[1] || match[0];
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      return url;
    }
  }
  // Check for domain-like patterns with known TLDs
  const wordMatch = text.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|io|ai|app|dev|gov|edu))\b/);
  if (wordMatch) return `https://${wordMatch[1]}`;
  return null;
}

/**
 * Extract a quoted string or the entire trailing text after a keyword.
 * Used to parse natural-language targets from goal clauses.
 */
function quotedOrTrailingText(clause: string, keyword: string): string {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s+'([^']+)'|${escaped}\\s+"([^"]+)"|${escaped}\\s+(.+)`, 'i');
  const match = clause.match(regex);
  if (!match) return '';
  return (match[1] || match[2] || match[3] || '').replace(/['"]/g, '').trim();
}

/**
 * Map a text label to a CSS selector for form fields.
 * Searches by aria-label, placeholder, name, id, and type attributes.
 */
function fieldSelector(label: string): string {
  const clean = label.replace(/['"]/g, '').trim();
  if (!clean) return '';
  return [
    `[aria-label="${clean}" i]`,
    `[placeholder="${clean}" i]`,
    `[name="${clean}" i]`,
    `#${clean}`,
    `[type="${clean}"]`,
  ]
    .filter(Boolean)
    .join(',');
}

/**
 * Map a descriptive target to a simpler descriptive string for fill actions.
 */
function fieldTarget(label: string): string {
  const clean = label.replace(/['"]/g, '').trim();
  return [[clean, `'${clean}'`]].filter(Boolean).join(',');
}

/** Check if a field label suggests sensitive content (password, secret, etc.). */
function isSensitiveField(label: string): boolean {
  return /password|secret|token|pin|key/i.test(label);
}

/**
 * Generate a human-readable fill description.
 * Masks sensitive values, uses raw values for common fields.
 */
function visibleFillDescription(target: string, value: string): string {
  if (isSensitiveField(target)) return `Fill ${target} with [REDACTED]`;
  if (value.length > 30) return `Fill ${target}`;
  return `Fill ${target} with "${value}"`;
}

/** Create a click action step. */
function clickAction(selector: string, description: string): GoalPlannerAction {
  return { type: 'click', selector, description };
}

/** Create a "Next" click for Google-style multi-step forms. */
function googleNextClickAction(stepNumber: number): GoalPlannerAction {
  return { type: 'click', target: `'Next'`, description: `Click Next (step ${stepNumber})` };
}

/** Create a fill action step. */
function fillAction(selector: string, target: string, value: string): GoalPlannerAction {
  return {
    type: 'fill',
    selector,
    target,
    value,
    description: visibleFillDescription(target, value),
  };
}

/**
 * Normalize text by collapsing whitespace and removing zero-width characters.
 * Useful when comparing extracted page text against expected values.
 */
function normalizeContiguousText(text: string): string {
  // v0.3.79: Added zero-width space removal + extended whitespace normalization
  return text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Split a multi-clause goal string into individual action clauses.
 * Supports delimiters: |, ., ;, newlines, and numbered/emoji lists.
 * v0.3.80: Added support for numbered lists (1., 2.) and emoji list markers.
 */
function splitGoalIntoClauses(goal: string): string[] {
  // Normalize and split by common delimiters
  const text = goal.trim();

  // Try numbered list first (e.g., "1. Navigate to... 2. Click...")
  const numbered = text.split(/\n+\s*(?:\d+[.)]\s+)/).filter(Boolean);
  if (numbered.length > 2) return numbered;

  // Try emoji/symbol list markers (e.g., "👉 Navigate... ⚡ Click...")
  const emojiSplit = text.split(/\s+[👉⚡🔍📌📝✅🔗]\s+/).filter(Boolean);
  if (emojiSplit.length > 2) return emojiSplit;

  // Fall back to sentence/pipe splitting
  return text
    .split(/\s*[|]\s*/)
    .flatMap(s => s.split(/[.]\s*/))
    .filter(s => s.trim().length > 5);
}

// ==================== Clause Planners ====================

/**
 * Plan actions for a single goal clause.
 * Routes to specialized handlers for login, account creation, or generic browsing.
 */
function planClause(clause: string, inputs?: GoalInputs, currentUrl?: string): GoalPlannerAction[] {
  // v0.3.55 — Account creation via heuristics
  if (goalHasAny(clause, ['create account', 'sign up', 'register', 'new account'])) {
    return planAccountCreation(clause, inputs);
  }

  // v0.3.48 — Login/sign-in via heuristics
  if (goalHasAny(clause, ['sign in', 'log in', 'login', 'signin'])) {
    return planLogin(clause, inputs);
  }

  // Generic browsing/download clause
  const url = extractUrlFromText(clause);
  const actions: GoalPlannerAction[] = [];

  if (url && !equivalentPlannedUrl(currentUrl, url)) {
    actions.push({
      type: 'navigate',
      url,
      description: `Go to ${url}`,
    });
  }

  // v0.3.67: Add extraction for info-retrieval keywords
  if (goalHasAny(clause, ['list', 'count', 'what', 'how many', 'find', 'search for'])) {
    actions.push({
      type: 'extract',
      description: goalHasAny(clause, ['list', 'count']) ? 'Extract page data' : `Search: ${clause}`,
    });
  }

  return actions;
}

/**
 * Plan account creation steps with form field handling.
 * Handles email/password flow with optional name and phone fields.
 */
function planAccountCreation(clause: string, inputs?: GoalInputs): GoalPlannerAction[] {
  const actions: GoalPlannerAction[] = [];

  // v0.3.53: Handle 'with' keyword for inline field definitions
  const withMatch = clause.match(/with\s+(.+)/i);
  let email = inputs?.email as string | undefined;
  let password = inputs?.password as string | undefined;
  let name: string | undefined;
  let phone: string | undefined;

  if (withMatch) {
    const fields = withMatch[1];
    const emailMatch = fields.match(/email['"]?\s+([^\s,;.]+)/i);
    const passwordMatch = fields.match(/password['"]?\s+([^\s,;.]+)/i);
    const nameMatch = fields.match(/(?:name|fullname)['"]?\s+([^\s,;.]+)/i);
    const phoneMatch = fields.match(/phone['"]?\s+([^\s,;.]+)/i);
    if (emailMatch) email = emailMatch[1].replace(/['"]/g, '');
    if (passwordMatch) password = passwordMatch[1].replace(/['"]/g, '');
    if (nameMatch) name = nameMatch[1].replace(/['"]/g, '');
    if (phoneMatch) phone = phoneMatch[1].replace(/['"]/g, '');
  }

  const siteUrl = extractUrlFromText(clause);
  if (siteUrl) {
    actions.push({ type: 'navigate', url: siteUrl, description: `Go to ${siteUrl}` });
  }

  // Click sign-up button
  actions.push({
    type: 'click',
    target: "'Create account'",
    description: 'Click create account / sign up',
  });

  // Fill fields
  if (name) {
    actions.push(fillAction(fieldSelector('name'), fieldTarget('name'), name));
  }
  if (email) {
    actions.push(fillAction(fieldSelector('email'), fieldTarget('email'), email));
  }
  if (phone) {
    actions.push(fillAction(fieldSelector('phone'), fieldTarget('phone'), phone));
  }
  if (password) {
    actions.push(fillAction(fieldSelector('password'), fieldTarget('password'), password));
  }

  // Submit
  actions.push({ type: 'submit', description: 'Submit registration form' });

  return actions;
}

/**
 * Plan login steps including email/password fill and submission.
 * Handles Google-style multi-step login (email first, then password).
 */
function planLogin(clause: string, inputs?: GoalInputs): GoalPlannerAction[] {
  const actions: GoalPlannerAction[] = [];

  const url = extractUrlFromText(clause);
  if (url) {
    actions.push({ type: 'navigate', url, description: `Go to ${url}` });
  }

  const email = inputs?.email as string || 'user@example.com';
  const password = inputs?.password as string || '';

  // v0.3.48: Google Auth detection
  if (/(?:google|gmail|youtube).*sign/i.test(clause) || goalLooksGoogleLike(clause)) {
    actions.push(clickAction('#identifierLink', 'Click Google sign-in link'));
    actions.push(fillAction(fieldSelector('identifier'), fieldTarget('email'), email));
    actions.push(googleNextClickAction(1));
    actions.push(fillAction(fieldSelector('password'), fieldTarget('password'), password));
    actions.push(googleNextClickAction(2));
  } else {
    // Generic login
    actions.push(fillAction(fieldSelector('email'), fieldTarget('email'), email));
    actions.push(fillAction(fieldSelector('password'), fieldTarget('password'), password));
    actions.push({
      type: 'click',
      target: "'Sign in'",
      description: 'Click sign in',
    });
  }

  return actions;
}

// ==================== Public API ====================

/**
 * Decompose a natural-language goal into structured browser steps using heuristics.
 *
 * Handles login flows, account creation, navigation, search, extraction, and more.
 * Returns at minimum one action. For simple goals (single URL), returns a navigate step.
 *
 * @param goal - The natural-language goal string (e.g., "Go to google.com and search for cats")
 * @param inputs - Optional form field values (email, password, etc.)
 * @param currentUrl - Current page URL to avoid redundant navigation
 * @returns Ordered list of browser actions to execute
 *
 * @example
 * ```ts
 * const steps = planGoalActions("Find the cheapest flight to Tokyo");
 * // Returns: [{ type: 'navigate', url: 'https://google.com', description: 'Go to google.com' }, ...]
 * ```
 */
export function planGoalActions(goal: string, inputs?: Record<string, unknown>, currentUrl?: string): GoalPlannerAction[] {
  const clauses = splitGoalIntoClauses(goal);

  const allActions: GoalPlannerAction[] = [];
  for (const clause of clauses) {
    const actions = planClause(clause, inputs as GoalInputs | undefined, currentUrl);
    allActions.push(...actions);
  }

  // v0.3.50: If heuristic planning yielded no meaningful actions, emit a single search-navigate.
  if (allActions.length === 0) {
    const searchUrl = `https://google.com/search?q=${encodeURIComponent(goal)}`;
    allActions.push({
      type: 'navigate',
      url: searchUrl,
      description: `Search for: ${goal}`,
    });
  }

  return allActions;
}

/**
 * Heuristic + AI hybrid goal planner.
 *
 * Uses the heuristic planner first. If it produces ≤2 non-trivial steps,
 * calls the cloud AI planner API for a better decomposition.
 * Falls back to heuristic results on AI failure.
 *
 * @param goal - Natural-language goal string
 * @param currentUrl - Current page URL
 * @param pageState - Current page state snapshot (URL, title, content, interactive elements)
 * @param cloudUrl - API base URL for the cloud planner endpoint
 * @param authToken - Authentication token for the cloud API
 * @returns Structured steps from either heuristic or AI planner, with a flag indicating which source was used
 *
 * @example
 * ```ts
 * const result = await planGoalActionsWithAI("Buy concert tickets", url, pageState, cloudUrl, token);
 * if (result.source === 'ai') { // AI-generated steps }
 * ```
 */
export async function planGoalActionsWithAI(
  goal: string,
  currentUrl: string,
  pageState: string,
  cloudUrl: string,
  authToken: string,
): Promise<{ steps: GoalPlannerAction[]; source: 'heuristic' | 'ai' }> {
  // Step 1: Try heuristic first (fast, no network)
  const heuristicSteps = planGoalActions(goal, undefined, currentUrl);

  // Step 2: If heuristic gives a reasonable plan, use it
  const meaningfulSteps = heuristicSteps.filter(s => s.type !== 'wait');
  if (meaningfulSteps.length > 2) {
    return { steps: heuristicSteps, source: 'heuristic' };
  }

  // Step 3: Fall back to cloud AI planner
  try {
    const response = await fetch(`${cloudUrl}/api/planner/decompose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ goal, currentUrl, pageState }),
    });

    if (!response.ok) {
      throw new Error(`AI planner API returned ${response.status}`);
    }

    const data: AiPlannerResponse = await response.json() as AiPlannerResponse;

    // If AI returned fewer steps than heuristic, keep heuristic
    if (!data?.steps || data.steps.length <= 2) {
      return { steps: heuristicSteps, source: 'heuristic' };
    }

    const aiActions: GoalPlannerAction[] = data.steps
      .filter((s: AiStepResponse) => s?.type)
      .map((s: AiStepResponse) => ({
        type: s.type as GoalPlannerAction['type'],
        selector: s.selector,
        target: s.selector,
        value: s.value,
        url: s.url,
        description: s.description || `${s.type} step`,
      }));

    return { steps: aiActions, source: 'ai' };
  } catch (error) {
    console.warn('[GoalPlanner] AI planner failed, falling back to heuristic:', error);
    return { steps: heuristicSteps, source: 'heuristic' };
  }
}
