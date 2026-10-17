const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '../../..');
const dashboardPaths = [
  path.join(repositoryRoot, 'services/web/src/components/dashboard/AgentControlCenter.tsx'),
  path.join(repositoryRoot, 'landing/src/components/dashboard/AgentControlCenter.tsx'),
];

for (const dashboardPath of dashboardPaths) {
  test(`${path.relative(repositoryRoot, dashboardPath)} exposes keyboard agent selection`, () => {
    const source = fs.readFileSync(dashboardPath, 'utf8');
    const cardStart = source.indexOf('<div\n                  key={agent.id}');
    const audioSection = source.indexOf('{/* Audio Level Indicator */}', cardStart);
    const cardContainer = source.slice(cardStart, source.indexOf('{/* Agent Header */}', cardStart));
    const cardHeader = source.slice(cardStart, audioSection);

    assert.notEqual(cardStart, -1, 'agent card should exist');
    assert.doesNotMatch(cardContainer, /onClick=/, 'the non-interactive card container should not handle clicks');
    assert.match(cardHeader, /<button\s+type="button"[\s\S]*?aria-label=\{`Select agent \$\{agent\.name\}`\}[\s\S]*?aria-pressed=\{agent\.id === selectedAgent\}[\s\S]*?onClick=\{\(\) => selectAgent\(agent\.id\)\}/);
    assert.match(cardHeader, /min-h-11[\s\S]*?focus-visible:ring-2/);
    assert.match(cardHeader, /agent\.id === selectedAgent \? 'Selected' : 'Select agent'/);
  });
}
