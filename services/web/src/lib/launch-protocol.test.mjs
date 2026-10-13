import test from 'node:test';
import assert from 'node:assert/strict';
import { requestKeledonLaunch as web } from './launch-protocol.js';
import { requestKeledonLaunch as legacy } from '../../../../landing/src/lib/launch-protocol.js';

for (const [name, launch] of [['web', web], ['landing', legacy]]) {
  test(`${name}: delegates one valid launch request without claiming handler availability`, () => {
    const requests = [];
    assert.equal(launch('keledon://launch?code=synthetic&signature=test', url => requests.push(url)), true);
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0]).protocol, 'keledon:');
  });
  test(`${name}: rejects unrelated and malformed targets without navigation`, () => {
    for (const target of [undefined, '', 'javascript:alert(1)', 'https://launch', 'file:///launch', 'keledon://other', 'keledon://launch/other', 'keledon://user:pass@launch', 'keledon://launch#fragment', ' keledon://launch', 'keledon://launch\n']) {
      assert.equal(launch(target, () => assert.fail('must not navigate')), false);
    }
  });
  test(`${name}: preserves synchronous handoff failure for caller handling`, () => {
    assert.throws(() => launch('keledon://launch', () => { throw new Error('denied'); }), /denied/);
  });
}
