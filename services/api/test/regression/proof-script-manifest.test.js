const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '../../..', '..');
const packageRoots = ['services/api', 'cloud'];
let checked = 0;

for (const packageRoot of packageRoots) {
  const packagePath = path.join(repositoryRoot, packageRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  for (const [name, command] of Object.entries(packageJson.scripts || {})) {
    if (!name.startsWith('proof:') || !name.endsWith(':local')) continue;

    const match = command.match(/^node\s+(\S+)/);
    assert(match, `${packageRoot} ${name} must invoke a Node script`);
    const scriptPath = path.resolve(repositoryRoot, packageRoot, match[1]);
    assert(fs.existsSync(scriptPath), `${packageRoot} ${name} references missing file ${match[1]}`);
    checked += 1;
  }
}

assert(checked > 0, 'expected at least one local proof script');
console.log(`✅ Local proof script manifest: ${checked}/${checked} targets exist across API and Cloud`);
