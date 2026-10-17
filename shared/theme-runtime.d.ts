export interface ThemeConfiguration {
  corporateEnabled: boolean;
  revision?: number;
  presets?: Record<string, Record<string, string>>;
}
export function applyThemeConfiguration(configuration: ThemeConfiguration): ThemeConfiguration;
export function loadThemeConfiguration(): Promise<ThemeConfiguration>;
