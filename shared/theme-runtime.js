const tokenNames = {
  background: 'background', foreground: 'foreground', primary: 'primary',
  primaryForeground: 'primary-foreground', accent: 'accent',
  accentForeground: 'accent-foreground', muted: 'muted',
  mutedForeground: 'muted-foreground', border: 'border', ring: 'ring',
  popover: 'popover', card: 'card', cardForeground: 'card-foreground',
  sidebar: 'sidebar', sidebarForeground: 'sidebar-foreground', sidebarActive: 'sidebar-active',
};
const tokenKeys = Object.keys(tokenNames);
const presets = ['light', 'dark', 'corporate'];
const safeColor = /^#[0-9a-f]{6}$/i;

function validateThemeConfiguration(configuration) {
  if (!configuration || typeof configuration !== 'object' || typeof configuration.corporateEnabled !== 'boolean') return false;
  return presets.every((theme) => {
    const palette = configuration.presets?.[theme];
    return palette && tokenKeys.every((key) => typeof palette[key] === 'string' && safeColor.test(palette[key]));
  });
}

export function applyThemeConfiguration(configuration) {
  if (!validateThemeConfiguration(configuration)) throw new TypeError('Invalid KELEDON theme configuration');
  const css = presets.map((theme) => {
    const declarations = Object.entries(tokenNames)
      .map(([key, token]) => `--color-${token}:${configuration.presets[theme][key]}`);
    for (const [key, token] of Object.entries({ background: 'background', foreground: 'foreground', primary: 'primary', primaryForeground: 'primary-foreground', accent: 'accent', muted: 'muted', border: 'border', ring: 'ring', popover: 'popover' })) {
      declarations.push(`--${token}:${configuration.presets[theme][key]}`);
    }
    return `:root[data-keledon-theme="${theme}"]{${declarations.join(';')}}`;
  }).join('\n');
  let style = document.getElementById('keledon-theme-runtime');
  if (!style) {
    style = document.createElement('style');
    style.id = 'keledon-theme-runtime';
    document.head.append(style);
  }
  style.textContent = css;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('keledon-theme-configuration', { detail: configuration }));
  return configuration;
}

export async function loadThemeConfiguration(baseUrl) {
  try {
    let url = '/api/theme';
    if (baseUrl) {
      const origin = new URL(baseUrl);
      if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) return { corporateEnabled: true };
      url = new URL('/api/theme', origin.origin).toString();
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    let response;
    try {
      response = await fetch(url, { credentials: baseUrl ? 'omit' : 'same-origin', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return { corporateEnabled: true };
    const configuration = await response.json();
    if (!validateThemeConfiguration(configuration)) return { corporateEnabled: true };
    applyThemeConfiguration(configuration);
    return configuration;
  } catch {
    return { corporateEnabled: true };
  }
}
