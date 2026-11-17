'use strict';
const demo = require('./demo');
const manual = require('./manual');
const banglaqr = require('./banglaqr');

// Free rails only — deliberately no per-transaction-fee providers (Stripe, bKash Tokenized).
const ALL = [demo, manual, banglaqr];

function enabledProviders(settings) {
  return ALL.filter((p) => p.isEnabled(settings));
}

function getProvider(id) {
  return ALL.find((p) => p.id === id) || null;
}

module.exports = { ALL, enabledProviders, getProvider };
