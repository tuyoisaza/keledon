export const DEFAULT_BROWSER_DOWNLOAD_URL =
  'https://github.com/tuyoisaza/keledon/releases/latest/download/KELEDON.Browser.Setup.exe';

export function getBrandsForCompany(brands, companyId) {
  if (!companyId) return [];
  return brands.filter((brand) => brand.companyId === companyId);
}

export function getTeamsForBrand(teams, brandId) {
  if (!brandId) return [];
  return teams.filter((team) => team.brandId === brandId);
}

export function getBrowserDownloadUrl(env = {}) {
  return (
    env.VITE_KELEDON_BROWSER_DOWNLOAD_URL ||
    env.KELEDON_BROWSER_DOWNLOAD_URL ||
    DEFAULT_BROWSER_DOWNLOAD_URL
  );
}

export const BROWSER_RELEASES_API =
  'https://api.github.com/repos/tuyoisaza/keledon/releases/latest';

export function getBrowserInstallerUrl(tagName) {
  return `https://github.com/tuyoisaza/keledon/releases/download/${tagName}/KELEDON.Browser.Setup.exe`;
}

export async function readPlainTextFile(file) {
  if (!file) {
    throw new Error('No file selected');
  }

  if (typeof file.text === 'function') {
    return await file.text();
  }

  if (typeof FileReader !== 'undefined') {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
      reader.readAsText(file);
    });
  }

  throw new Error('This browser does not support reading text files');
}
