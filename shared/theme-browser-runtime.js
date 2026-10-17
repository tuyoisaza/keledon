import { loadThemeConfiguration } from './theme-runtime.js';

async function applyCloudTheme() {
  try {
    const runtime = window.keledon?.runtime;
    const status = await runtime?.getStatus?.();
    await loadThemeConfiguration(status?.cloudUrl);
  } catch {
    // The shared CSS defaults remain active while the Browser is disconnected.
  }
}

void applyCloudTheme();
