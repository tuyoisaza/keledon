export declare const DEFAULT_BROWSER_DOWNLOAD_URL: string;

export declare function getBrandsForCompany<T extends { companyId: string }>(
  brands: T[],
  companyId: string,
): T[];

export declare function getTeamsForBrand<T extends { brandId?: string | null }>(
  teams: T[],
  brandId: string,
): T[];

export declare function getBrowserDownloadUrl(
  env?: Record<string, string | undefined>,
): string;

export declare const BROWSER_RELEASES_API: string;

export declare function getBrowserInstallerUrl(tagName: string): string;

export declare function readPlainTextFile(file: { text?: () => Promise<string> | string } | null | undefined): Promise<string>;
