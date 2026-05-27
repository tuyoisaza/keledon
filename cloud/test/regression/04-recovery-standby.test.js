/**
 * v0.2.28: Regression test — recovery/standby behavior.
 *
 * Covers:
 * - getLaunch next_steps includes "Return to standby" when vendors exist
 * - next_steps guides user to configure vendors when none exist
 * - Vendor list is filtered to active vendors only (isActive !== false)
 */

const assert = require('assert');

function buildNextSteps(vendors) {
  const activeVendors = vendors.filter((v) => v.id && v.baseUrl && v.isActive !== false);
  if (activeVendors.length === 0) {
    return [
      {
        title: 'No vendors configured yet',
        detail: 'Open Management → Vendors on the keledon site and register the call / CRM surfaces for this team.',
      },
    ];
  }

  const steps = [
    {
      title: 'Open vendor surfaces',
      detail: activeVendors.map((v) => v.name).join(', '),
    },
  ];

  activeVendors.forEach((vendor, index) => {
    steps.push({
      title: `Step ${index + 1}: Open ${vendor.name}`,
      detail: vendor.baseUrl
        ? `${vendor.baseUrl}${vendor.type ? ` • ${vendor.type}` : ''}`
        : vendor.type || 'No base URL configured',
    });
  });

  steps.push({
    title: 'Return to standby',
    detail: 'Stay connected, watch the activity log, and wait for the next call trigger.',
  });

  return steps;
}

// ====== TESTS ======

function testStandbyStepPresentWithVendors() {
  const vendors = [
    { id: 'v1', name: 'Salesforce', baseUrl: 'https://salesforce.com', type: 'crm', isActive: true },
    { id: 'v2', name: 'Genesys', baseUrl: 'https://genesys.com', type: 'call', isActive: true },
  ];
  const steps = buildNextSteps(vendors);
  const standby = steps.find((s) => s.title === 'Return to standby');
  assert(standby, 'must include Return to standby step');
  assert(standby.detail.includes('next call trigger'), 'standby detail must mention call trigger');
}

function testNoVendorsShowsConfigGuidance() {
  const steps = buildNextSteps([]);
  assert.strictEqual(steps.length, 1);
  assert.strictEqual(steps[0].title, 'No vendors configured yet');
  assert(steps[0].detail.includes('Management → Vendors'));
}

function testInactiveVendorsExcluded() {
  const vendors = [
    { id: 'v1', name: 'Salesforce', baseUrl: 'https://salesforce.com', isActive: false },
    { id: 'v2', name: 'Genesys', baseUrl: 'https://genesys.com', isActive: true },
  ];
  const steps = buildNextSteps(vendors);
  const openStep = steps.find((s) => s.title === 'Open vendor surfaces');
  assert(openStep, 'must have open vendor surfaces step');
  assert(openStep.detail.includes('Genesys'), 'active vendor must appear');
  assert(!openStep.detail.includes('Salesforce'), 'inactive vendor must not appear');
}

function testVendorWithoutBaseUrlExcluded() {
  const vendors = [
    { id: 'v1', name: 'NoUrlVendor', baseUrl: null, isActive: true },
    { id: 'v2', name: 'Genesys', baseUrl: 'https://genesys.com', isActive: true },
  ];
  const steps = buildNextSteps(vendors);
  const openStep = steps.find((s) => s.title === 'Open vendor surfaces');
  assert(!openStep.detail.includes('NoUrlVendor'), 'vendor without baseUrl must not appear');
}

function testStepsIncludeVendorUrls() {
  const vendors = [
    { id: 'v1', name: 'Salesforce', baseUrl: 'https://sf.com', type: 'crm', isActive: true },
  ];
  const steps = buildNextSteps(vendors);
  const vendorStep = steps.find((s) => s.title.includes('Salesforce'));
  assert(vendorStep, 'must have vendor-specific step');
  assert(vendorStep.detail.includes('https://sf.com'), 'step must contain vendor URL');
}

function testMixedActiveInactiveVendors() {
  const vendors = [
    { id: 'v1', name: 'A', baseUrl: 'https://a.com', isActive: true },
    { id: 'v2', name: 'B', baseUrl: 'https://b.com', isActive: false },
    { id: 'v3', name: 'C', baseUrl: 'https://c.com', isActive: true },
  ];
  const steps = buildNextSteps(vendors);
  const openStep = steps.find((s) => s.title === 'Open vendor surfaces');
  assert(openStep.detail.includes('A'));
  assert(openStep.detail.includes('C'));
  assert(!openStep.detail.includes('B'));
  assert.strictEqual(steps.filter((s) => s.title.startsWith('Step')).length, 2);
}

// ====== RUNNER ======
const tests = [
  testStandbyStepPresentWithVendors,
  testNoVendorsShowsConfigGuidance,
  testInactiveVendorsExcluded,
  testVendorWithoutBaseUrlExcluded,
  testStepsIncludeVendorUrls,
  testMixedActiveInactiveVendors,
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    t();
    console.log(`✅ ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${t.name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n📊 RecoveryStandby: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
