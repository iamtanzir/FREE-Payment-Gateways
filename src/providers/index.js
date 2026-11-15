'use strict';
const demo = require('./demo');
const manual = require('./manual');
const banglaqr = require('./banglaqr');
const stripe = require('./stripe');
const bkash = require('./bkash');

const ALL = [demo, manual, banglaqr, stripe, bkash];

function enabledProviders(settings) {
  return ALL.filter((p) => p.isEnabled(settings));
}

function getProvider(id) {
  return ALL.find((p) => p.id === id) || null;
}

module.exports = { ALL, enabledProviders, getProvider };
