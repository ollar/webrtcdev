var jsdom = require('jsdom');
var sinon = require('sinon');
var utils = require('./src/utils');
var _ = require('underscore');

utils.trace = sinon.stub(utils, 'trace');

var performance = {
  now: sinon.stub(),
};

var RTCPeerConnection = {
  ondatachannel: sinon.stub(),
  onicecandidate: sinon.stub(),
};

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
_.extend(global, document.defaultView);
global.expect = require('expect.js');
global._ = _;
global.Backbone = require('./src/backboneConfig.js');
global.RTCPeerConnection = sinon.stub().returns(RTCPeerConnection);
