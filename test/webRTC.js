var WebRTC = require('../src/RTCPConnect');
var sinon = require('sinon');
var sandbox = sinon.sandbox.create();
var _ = require('lodash');

describe('WebRTC', function() {
  var createChannel;
  var createConnection;
  var createOffer;
  var dropConnection;

  beforeEach(function() {
    createConnection = sandbox.spy(WebRTC, 'createConnection');
    createChannel = sandbox.spy(WebRTC, 'createChannel');
    createOffer = sandbox.spy(WebRTC, 'createOffer');
    dropConnection = sandbox.spy(WebRTC, 'dropConnection');
  });

  afterEach(function() {
    _.each(WebRTC.getPeers(), (peer, key) => WebRTC.dropConnection(key));

    sandbox.restore();
  });

  describe('init function', function() {
    it('should return undefined', function() {
      expect(WebRTC.init('connID')).to.be(undefined);
    });
  });

  describe('test createConnection function', function() {
    it('returns RTCPeerConnection', function() {
      expect(createConnection('1')).to.be.a(RTCPeerConnection);
    });

    it('test peers adding', function() {
      createConnection('serverToUid', 'connFromUid', 'connToUid');

      expect(_.last(_.keys(WebRTC.getPeers())))
        .to.eql(createConnection.lastCall.args[2]);
    });
  });

  describe('test createChannel function', function() {
    it('returns RTCDataChannel', function (){
      createConnection('connToUid');
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

  describe('test createOffer function', function () {
    var myUid = 'creates offer myUid';
    var toUid = 'creates offer toUid';
    var connFromUid = 'creates offer connFromUid';
    var connToUid = 'creates offer connToUid';

    it('creates offer to right connection', function() {
      createConnection(toUid, connFromUid, connToUid);
      createChannel(connToUid);
      createOffer(toUid, connFromUid, connToUid);

      expect(createOffer.lastCall.args[2])
        .to.be(_.last(_.keys(WebRTC.getPeers())));
    });
  });

  describe('test dropConnection', function () {
    var peerUid1 = '1';  // me
    var peerUid2 = '2';  // friend 1
    var peerUid3 = '3';  // friend 2

    it('drop connection correctly', function() {
      // creating base connections
      createConnection(peerUid2, peerUid1, peerUid2);
      createChannel(peerUid2);
      createConnection(peerUid3, peerUid1, peerUid3);
      createChannel(peerUid3);

      // create files connections
      createConnection(peerUid2, peerUid1, peerUid2 + '_file');
      createChannel(peerUid2 + '_file');
      createConnection(peerUid3, peerUid1, peerUid3 + '_file');
      createChannel(peerUid3 + '_file');

      dropConnection(peerUid2 + '_file');
      expect(_.keys(WebRTC.getPeers())).not.contain(peerUid2 + '_file');
      expect(_.keys(WebRTC.getPeers())).to.contain(peerUid3 + '_file');

      dropConnection(peerUid3 + '_file');
      expect(_.keys(WebRTC.getPeers())).not.contain(peerUid3 + '_file');
      expect(_.keys(WebRTC.getPeers())).to.contain(peerUid2);
      expect(_.keys(WebRTC.getPeers())).to.contain(peerUid3);
    });
  });
});
