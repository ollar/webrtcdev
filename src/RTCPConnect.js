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

class RTCPConnect {
  constructor(connectionId) {
    this.uid = uuid();

    this.peers = {};
    window.peers = this.peers;
    window.uid = this.uid;

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;
  }

  createConnection(uid, connFromUid = this.uid, connToUid = uid) {
    trace('Using SCTP based data channels');
    const connection = new RTCPeerConnection(servers, this.pcConstraint);

    connection.ondatachannel = (event) =>
      this._receiveChannelCallback(event, connToUid);

    if (this.uid !== connToUid) {
      connection.onicecandidate = (event) =>
        this._onIceCandidate(event, uid, connFromUid, connToUid);
    }

    this.peers[connToUid] = {};
    this.peers[connToUid].connection = connection;
    console.log(this.peers);

    trace('Created local peer connection object localConnection');
    return connection;
  }

  createChannel(uid) {
    const connection = this.peers[uid].connection;
    const channel = connection.createDataChannel(this.connectionId,
      this.dataConstraint);
    trace(`Created send data channel with id: ${this.connectionId}`);

    this.peers[uid].channel = channel;

    this._bindChannelEvents(channel);

    return channel;
  }

  createOffer(uid, connFromUid = this.uid, connToUid = uid) {
    const connection = this.peers[connToUid].connection;

    connection.createOffer().then(
      (offer) => {
        connection.setLocalDescription(offer);
        Sync.trigger('ws:send', _str({
          type: 'offer',
          fromUid: this.uid,
          toUid: uid,
          connFromUid: connFromUid,
          connToUid: connToUid,
          offer: _str(offer.toJSON()),
        }));
      },
      this._onCreateSessionDescriptionError
    );
  }

  handleOffer(message) {
    let offer = new RTCSessionDescription(JSON.parse(message.offer));

    let _connection = this.createConnection(message.fromUid,
      message.connToUid, message.connFromUid);
    this.createChannel(message.connFromUid);

    _connection.setRemoteDescription(offer);

    _connection.createAnswer().then(
      (answer) => {
        _connection.setLocalDescription(answer);
        Sync.trigger('ws:send', _str({
          type: 'answer',
          fromUid: this.uid,
          toUid: message.fromUid,
          connFromUid: message.connToUid,
          connToUid: message.connFromUid,
          answer: _str(answer.toJSON()),
        }));
      },
      this._onCreateSessionDescriptionError
    );
  }

  handleAnswer(message) {
    const connection = this.peers[message.connFromUid].connection;

    let answer = new RTCSessionDescription(JSON.parse(message.answer));
    connection.setRemoteDescription(answer);
  }

  handleIceCandidate(message) {
    const connection = this.peers[message.connFromUid].connection;
    connection.addIceCandidate(new RTCIceCandidate(JSON.parse(message.iceCandidate)));
  }

  _onIceCandidate(event, uid, connFromUid, connToUid) {
    trace('local ice callback');
    if (event.candidate) {
      Sync.trigger('ws:send', _str({
        type: 'iceCandidate',
        fromUid: this.uid,
        toUid: uid,
        connFromUid: connFromUid,
        connToUid: connToUid,
        iceCandidate: _str(event.candidate.toJSON()),
      }));
    }
  }

  _receiveChannelCallback(event, uid) {
    trace('Receive Channel Callback');
    const channel = event.channel;

    this.peers[uid].channel = channel;

    this._bindChannelEvents(channel);
  }

  _bindChannelEvents(channel) {
    channel.onopen = () => this._onSendChannelStateChange(channel);
    channel.onclose = () => this._onSendChannelStateChange(channel);

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
            this.dropConnection(_filePeer);
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

  _onSendChannelStateChange(channel) {
    trace('Send channel state is: ' + channel.readyState);

    if (channel.readyState === 'open') {
      Sync.trigger('channelOpen', channel);
    } else if (channel.readyState === 'closed') {
      if (_.size(this.peers) === 0)
        Sync.trigger('channelClose');
    }
  }

  _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  dropConnection(uid) {
    const connection = this.peers[uid].connection;
    const channel = this.peers[uid].channel;

    setTimeout(() => {
      if (channel) channel.close();

      setTimeout(() => {
        if (connection) connection.close();

        setTimeout(() => {
          delete this.peers[uid];
        }, 10);
      }, 10);
    }, 10);

  }
}

module.exports = RTCPConnect;
