const adapter = require('webrtc-adapter');

const trace = require('./utils').trace;
const uuid = require('./utils').uuid;
const _str = require('./utils')._str;

const Sync = require('./sync');

const servers = {
  iceServers: [
    {url:'stun:stun01.sipphone.com'},
    {url:'stun:stun.ekiga.net'},
    {url:'stun:stun.fwdnet.net'},
    {url:'stun:stun.ideasip.com'},
    {url:'stun:stun.iptel.org'},
    {url:'stun:stun.rixtelecom.se'},
    {url:'stun:stun.schlund.de'},
    {url:'stun:stun.l.google.com:19302'},
    {url:'stun:stun1.l.google.com:19302'},
    {url:'stun:stun2.l.google.com:19302'},
    {url:'stun:stun3.l.google.com:19302'},
    {url:'stun:stun4.l.google.com:19302'},
    {url:'stun:stunserver.org'},
    {url:'stun:stun.softjoys.com'},
    {url:'stun:stun.voiparound.com'},
    {url:'stun:stun.voipbuster.com'},
    {url:'stun:stun.voipstunt.com'},
    {url:'stun:stun.voxgratia.org'},
    {url:'stun:stun.xten.com'},
    {
    	url: 'turn:numb.viagenie.ca',
    	credential: 'muazkh',
    	username: 'webrtc@live.com'
    },
    {
    	url: 'turn:192.158.29.39:3478?transport=udp',
    	credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    	username: '28224511:1379330808'
    },
    {
    	url: 'turn:192.158.29.39:3478?transport=tcp',
    	credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
    	username: '28224511:1379330808'
    },
  ]
};

var RTCPConnect = (function() {
  var uid = uuid();
  var peers = {};
  var pcConstraint = null;
  var dataConstraint = null;
  var connectionId;

  function init(cId) {
    window.peers = peers;
    window.uid = uid;

    connectionId = cId;
  }

  function createConnection(toUid, connFromUid = uid, connToUid = toUid) {
    trace('Using SCTP based data channels');
    const connection = new RTCPeerConnection(servers, pcConstraint);

    connection.ondatachannel = (event) =>
      _receiveChannelCallback(event, connToUid);

    if (uid !== connToUid) {
      connection.onicecandidate = (event) =>
        _onIceCandidate(event, toUid, connFromUid, connToUid);
    }

    peers[connToUid] = {};
    peers[connToUid].connection = connection;
    console.log(peers);

    trace('Created local peer connection object localConnection');
    return connection;
  }

  function createChannel(toUid) {
    const connection = peers[toUid].connection;
    const channel = connection.createDataChannel(connectionId, dataConstraint);
    trace(`Created send data channel with id: ${connectionId}`);

    peers[toUid].channel = channel;

    _bindChannelEvents(channel);

    return channel;
  }

  function createOffer(toUid, connFromUid = uid, connToUid = toUid) {
    const connection = peers[connToUid].connection;

    connection.createOffer().then(
      (offer) => {
        connection.setLocalDescription(offer);
        Sync.trigger('ws:send', _str({
          type: 'offer',
          fromUid: uid,
          toUid: toUid,
          connFromUid: connFromUid,
          connToUid: connToUid,
          offer: _str(offer.toJSON()),
        }));
      },
      _onCreateSessionDescriptionError
    );
  }

  function handleOffer(message) {
    let offer = new RTCSessionDescription(JSON.parse(message.offer));

    let _connection = createConnection(message.fromUid,
      message.connToUid, message.connFromUid);
    createChannel(message.connFromUid);

    _connection.setRemoteDescription(offer);

    _connection.createAnswer().then(
      (answer) => {
        _connection.setLocalDescription(answer);
        Sync.trigger('ws:send', _str({
          type: 'answer',
          fromUid: uid,
          toUid: message.fromUid,
          connFromUid: message.connToUid,
          connToUid: message.connFromUid,
          answer: _str(answer.toJSON()),
        }));
      },
      _onCreateSessionDescriptionError
    );
  }

  function handleAnswer(message) {
    const connection = peers[message.connFromUid].connection;

    let answer = new RTCSessionDescription(JSON.parse(message.answer));
    connection.setRemoteDescription(answer);
  }

  function handleIceCandidate(message) {
    const connection = peers[message.connFromUid].connection;
    connection.addIceCandidate(new RTCIceCandidate(JSON.parse(message.iceCandidate)));
  }

  function _onIceCandidate(event, toUid, connFromUid, connToUid) {
    trace('local ice callback');
    if (event.candidate) {
      Sync.trigger('ws:send', _str({
        type: 'iceCandidate',
        fromUid: uid,
        toUid: toUid,
        connFromUid: connFromUid,
        connToUid: connToUid,
        iceCandidate: _str(event.candidate.toJSON()),
      }));
    }
  }

  function _receiveChannelCallback(event, toUid) {
    trace('Receive Channel Callback');
    const channel = event.channel;

    peers[toUid].channel = channel;

    _bindChannelEvents(channel);
  }

  function _bindChannelEvents(channel) {
    channel.onopen = () => _onSendChannelStateChange(channel);
    channel.onclose = () => _onSendChannelStateChange(channel);

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data.indexOf('__fileDescription') > -1) {
          event.target['__fileDescription'] = JSON.parse(event.data.split('::')[1]);

        } else if (event.data.indexOf('__fileTransferComplete') > -1) {
          if (channel._receiveBuffer) {
            console.log(channel.__fileDescription);
            var received = new window.Blob(channel._receiveBuffer, {type: channel.__fileDescription.type});
            var href = URL.createObjectURL(received);

            Sync.trigger('message', {
              type: 'file',
              data: href,
              __fileDescription: channel.__fileDescription || {},
              outgoing: false,
            });

            let _filePeer = JSON.parse(event.data.split('::')[1]).connFromUid;
            dropConnection(_filePeer);
          }
        } else {
          Sync.trigger('message', {
            type: 'text',
            data: event.data,
            outgoing: false,
          });
        }
      } else if (event.data instanceof ArrayBuffer) {
        event.target._receiveBuffer = event.target._receiveBuffer || [];
        event.target._receiveBuffer.push(event.data);
      }
    };
  }

  function _onSendChannelStateChange(channel) {
    trace('Send channel state is: ' + channel.readyState);

    if (channel.readyState === 'open') {
      Sync.trigger('channelOpen', channel);
    } else if (channel.readyState === 'closed') {
      if (_.size(peers) === 0)
        Sync.trigger('channelClose');
    }
  }

  function _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  function dropConnection(uid) {
    const connection = peers[uid].connection;
    const channel = peers[uid].channel;

    setTimeout(() => {
      if (channel) channel.close();

      setTimeout(() => {
        if (connection) connection.close();

        setTimeout(() => {
          delete peers[uid];
        }, 10);
      }, 10);
    }, 10);
  }

  return {
    init: init,
    createConnection: createConnection,
    createChannel: createChannel,
    createOffer: createOffer,
    handleOffer: handleOffer,
    handleAnswer: handleAnswer,
    handleIceCandidate: handleIceCandidate,
    dropConnection: dropConnection,
    getUid: function() {
      return uid;
    },
    getPeers: function() {
      return peers;
    },
  };
})();

module.exports = RTCPConnect;
