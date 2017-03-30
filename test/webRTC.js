var WebRTC = require('../src/RTCPConnect');
var sinon = require('sinon');
var sandbox = sinon.sandbox.create();
var _ = require('lodash');

describe('WebRTC test', function() {
  describe('init function', function() {
    it('should return undefined', function() {
      expect(WebRTC.init('connID')).to.be(undefined);
    });
  });

  describe('createConnection function', function() {
    var createConnection;

    beforeEach(function() {
      createConnection = sandbox.spy(WebRTC, 'createConnection');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('returns RTCPeerConnection', function() {
      expect(createConnection('1')).to.be.a(RTCPeerConnection);
    });

    it('test peers adding', function() {
      createConnection('serverToUid', 'connFromUid', 'connToUid');

      expect(_.last(_.keys(WebRTC.getPeers())))
        .to.eql(createConnection.lastCall.args[2]);
    });
  });

  describe('Test createChannel function', function() {
    var createChannel;
    var createConnection;

    beforeEach(function() {
      createChannel = sandbox.spy(WebRTC, 'createChannel');
      createConnection = sandbox.spy(WebRTC, 'createConnection');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('returns RTCDataChannel', function (){
      expect(createChannel('connToUid')).to.be.a(RTCDataChannel);
    });

    it('check channel uid', function() {
      createConnection('check channel uid');
      var channel = createChannel('check channel uid');

      expect(WebRTC.getPeers()[createChannel.lastCall.args[0]].channel)
        .to.eql(channel);
    });

    it('check channels are not same', function() {
      createConnection('check channels are not same1');
      var channel1 = createChannel('check channels are not same1');
      createConnection('check channels are not same2');
      var channel2 = createChannel('check channels are not same2');

      expect(channel1).not.to.be(channel2);
    });
  });
});
