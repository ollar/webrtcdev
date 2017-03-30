var jsdom = require('jsdom');
var sinon = require('sinon');
var utils = require('../src/utils');
var _ = require('underscore');

utils.trace = sinon.stub(utils, 'trace');

var performance = {
  now: sinon.stub(),
};

function RTCDataChannel(id) {
  this.id = id;
  this.onopen = sinon.spy();
  this.onclose = sinon.spy();
  this.onmessage = sinon.spy();
}

RTCDataChannel.constructor = RTCDataChannel;

function RTCPeerConnection() {
  this.ondatachannel = sinon.stub();
  this.onicecandidate = sinon.stub();
  this.createDataChannel = sinon.stub().returns(new RTCDataChannel());
}

RTCPeerConnection.constructor = RTCPeerConnection;

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
_.extend(global, document.defaultView);
global.expect = require('expect.js');
global._ = _;
global.Backbone = require('../src/backboneConfig.js');
global.RTCPeerConnection = RTCPeerConnection;
global.RTCDataChannel = RTCDataChannel;
