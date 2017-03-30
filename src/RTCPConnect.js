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

  /**
   * Initialize function
   * @param  {String} cId - connection ID
   */
  function init(cId) {
    window.peers = peers;
    window.uid = uid;

    connectionId = cId;
  }

  /**
   * Create new connection.
   * @param  {String} toUid             recipient uid stored on server
   * @param  {String} [connFromUid=uid] sender connection uid
   * @param  {String} [connToUid=toUid] recipient connection uid
   * @return {RTCPeerConnection}        new PeerConnection
   */
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

    trace('Created local peer connection object localConnection');
    return connection;
  }

  /**
   * Create new channel
   * @param  {String} connToUid   recipient connection uid
   * @return {RTCDataChannel} new data channel
   */
  function createChannel(connToUid) {
    const connection = peers[connToUid].connection;
    const channel = connection.createDataChannel(connToUid, dataConstraint);
    trace(`Created send data channel with id: ${connToUid}`);

    peers[connToUid].channel = channel;

    _bindChannelEvents(channel);

    return channel;
  }

  /**
   * Create RTCOffer
   * @param  {String} toUid             recipient uid stored on server
   * @param  {String} [connFromUid=uid] sender connection uid
   * @param  {String} [connToUid=toUid] recipient connection uid
   */
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

  /**
   * Handle offer
   * @param  {Object} message - offer message
   */
  function handleOffer(message) {
    let offer = new RTCSessionDescription(JSON.parse(message.offer));

    // need to switch UIDs here
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

  /**
   * Answer handler
   * @param  {Object} message answer message
   */
  function handleAnswer(message) {
    const connection = peers[message.connFromUid].connection;

    let answer = new RTCSessionDescription(JSON.parse(message.answer));
    connection.setRemoteDescription(answer);
  }

  function handleIceCandidate(message) {
    const connection = peers[message.connFromUid].connection;
    connection.addIceCandidate(new RTCIceCandidate(JSON.parse(message.iceCandidate)));
  }

  /**
   * Handle local ice candidate
   * @param  {Event} event        iceCandidate event
   * @param  {String} toUid       recipient uid stored on server
   * @param  {String} connFromUid sender connection uid
   * @param  {String} connToUid   recipient connection uid
   */
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

  /**
   * channel callback handler
   * @param  {Event} event  channel event
   * @param  {String} toUid recipient connection uid stored on server
   */
  function _receiveChannelCallback(event, toUid) {
    trace('Receive Channel Callback');
    const channel = event.channel;

    peers[toUid].channel = channel;

    console.log(toUid);

    _bindChannelEvents(channel);
  }

  /**
   * Bind channel events helper function
   * @param  {RTCDataChannel} channel RTC data channel
   */
  function _bindChannelEvents(channel) {
    channel.onopen = () => _onSendChannelStateChange(channel);
    channel.onclose = () => _onSendChannelStateChange(channel);

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data.indexOf('__fileDescription') > -1) {
          event.target['__fileDescription'] = JSON.parse(event.data.split('::')[1]);
          console.log(1, event.target);
        } else if (event.data.indexOf('__fileTransferComplete') > -1) {
          if (event.target._receiveBuffer) {
            console.log(2, event.target, event.target.__fileDescription, peers);
            var received = new window.Blob(event.target._receiveBuffer, {type: event.target.__fileDescription.type});
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

  /**
   * channel state change handler
   * @param  {RTCDataChannel} channel RTCDataChannel
   */
  function _onSendChannelStateChange(channel) {
    trace('Send channel state is: ' + channel.readyState);

    if (channel.readyState === 'open') {
      Sync.trigger('channelOpen', channel);
    } else if (channel.readyState === 'closed') {
      // if (_.size(peers) === 0) Sync.trigger('channelClose');
    }
  }

  /**
   * _onCreateSessionDescriptionError helper function
   * @param  {Error} error Error
   */
  function _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  /**
   * Drop connection.
   * @param  {String} toUid connection uid
   */
  function dropConnection(toUid) {
    const connection = peers[toUid].connection;
    const channel = peers[toUid].channel;

    setTimeout(() => {
      if (channel) channel.close();

      setTimeout(() => {
        if (connection) connection.close();

        setTimeout(() => {
          delete peers[toUid];
          if (_.size(peers) === 0) Sync.trigger('channelClose');
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
