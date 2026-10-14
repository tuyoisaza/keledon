const fs = require('node:fs');
const path = require('node:path');

function syncRendererVersion({ packagePath, rendererPath } = {}) {
  const packageFile = packagePath || path.resolve(__dirname, '../package.json');
  const rendererFile = rendererPath || path.resolve(__dirname, '../renderer/index.html');
  const version = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('Browser package version must be a semantic X.Y.Z version');
  }

  const html = fs.readFileSync(rendererFile, 'utf8');
  const versionRow = /(<span id="versionBtn">)v\d+\.\d+\.\d+(<\/span>)/g;
  const matches = html.match(versionRow) || [];
  if (matches.length !== 1) {
    throw new Error('Expected exactly one renderer version widget');
  }
  const updated = html.replace(versionRow, `$1v${version}$2`);
  if (updated !== html) fs.writeFileSync(rendererFile, updated);
  return version;
}

if (require.main === module) {
  console.log(`Synchronized Browser renderer version: v${syncRendererVersion()}`);
}

module.exports = { syncRendererVersion };
