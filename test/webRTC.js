var WebRTC = require('../src/RTCPConnect');
var sinon = require('sinon');

describe('WebRTC test', function() {
  describe('init function', function() {
    it('should return undefined', function() {
      expect(WebRTC.init()).to.be(undefined);
    });
  });

  describe('createConnection function', function() {
    it('returns RTCPeerConnection', function() {
      var trace = sinon.stub().returns(false);
      expect(WebRTC.createConnection()).to.be(undefined);
    })
  });
});
