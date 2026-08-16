const assert = require('node:assert/strict');
const test = require('node:test');

function loadTracking(overrides = {}) {
  const modulePath = require.resolve('./google-ads.js');
  delete require.cache[modulePath];
  delete global.AdaptiveGoogleAds;
  delete global.dataLayer;
  delete global.gtag;
  global.ADAPTIVE_GOOGLE_ADS_CONFIG = {
    conversionId: 'AW-123456789',
    leadConversionLabel: 'websiteLeadLabel'
  };
  global.document = overrides.document || {
    querySelector: () => null,
    createElement: () => ({ dataset: {} }),
    head: { appendChild: () => {} }
  };
  return require('./google-ads.js');
}

test.afterEach(() => {
  delete global.ADAPTIVE_GOOGLE_ADS_CONFIG;
  delete global.AdaptiveGoogleAds;
  delete global.dataLayer;
  delete global.gtag;
  delete global.document;
});

test('successful API submission triggers exactly one conversion event', () => {
  const tracking = loadTracking();
  const response = { ok: true };

  assert.equal(tracking.recordLeadConversionForSubmission(response, { ok: true }), true);
  assert.equal(tracking.recordLeadConversionForSubmission(response, { ok: true }), false);

  const conversions = global.dataLayer.filter(args => args[0] === 'event' && args[1] === 'conversion');
  assert.equal(conversions.length, 1);
  assert.equal(conversions[0][2].send_to, 'AW-123456789/websiteLeadLabel');
});

test('failed or invalid submissions trigger no conversion event', () => {
  const tracking = loadTracking();

  assert.equal(tracking.recordLeadConversionForSubmission({ ok: false }, { ok: true }), false);
  assert.equal(tracking.recordLeadConversionForSubmission({ ok: true }, { ok: false }), false);
  assert.equal(tracking.recordLeadConversionForSubmission(undefined, undefined), false);

  const conversions = global.dataLayer.filter(args => args[0] === 'event' && args[1] === 'conversion');
  assert.equal(conversions.length, 0);
});

test('tracking failure is contained and cannot break lead success handling', () => {
  const tracking = loadTracking();
  global.gtag = () => { throw new Error('blocked by browser'); };

  assert.doesNotThrow(() => tracking.recordLeadConversionForSubmission({ ok: true }, { ok: true }));
  assert.equal(tracking.recordLeadConversionForSubmission({ ok: true }, { ok: true }), false);
});
