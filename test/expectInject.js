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
  this.close = sinon.spy();
}

RTCDataChannel.prototype.constructor = RTCDataChannel;

function RTCPeerConnection() {
  this.createDataChannel = function(connToUid, dataConstraint) {
    return new RTCDataChannel(connToUid);
  };
  this.createOffer = sinon.stub().returns(new Promise(() => true));

  this.setLocalDescription = sinon.spy();
  this.close = sinon.spy();
}

RTCPeerConnection.prototype.constructor = RTCPeerConnection;

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
_.extend(global, document.defaultView);
global.expect = require('expect.js');
global._ = _;
global.Backbone = require('../src/backboneConfig.js');
global.RTCPeerConnection = RTCPeerConnection;
global.RTCDataChannel = RTCDataChannel;
