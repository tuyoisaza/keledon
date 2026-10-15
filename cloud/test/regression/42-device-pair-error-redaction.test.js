const assert = require('node:assert/strict');
const { DeviceController } = require('../../dist/devices/device.controller');

async function main() {
  const controller = new DeviceController({
    pairDevice: async () => {
      throw new Error('database URL and internal credential detail');
    },
  });

  assert.deepEqual(
    await controller.pairDevice({
      device_id: 'synthetic-device',
      machine_id: 'synthetic-machine',
      pairing_code: 'synthetic-proof',
      platform: 'windows',
      name: 'Synthetic Browser',
    }),
    { error: 'Invalid pairing request or expired proof' },
    'public pairing errors must not disclose database or internal error details',
  );

  console.log('PASS device pairing errors expose no internal exception detail.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
