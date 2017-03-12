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

// const servers = null;

class RTCPConnect {
  constructor(connectionId) {
    this.uid = uuid();

    this.peers = {};
    window.peers = this.peers;
    window.uid = this.uid;

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;

    Sync.on('sendMessage', this.send, this);
    Sync.on('channelClose', (uid) => {
      trace(`Channel close ${uid}`);

      this.ws.send(_str({
        type: 'channelClose',
        uid: uid || this.uid,
      }));
    });

    // this.ws = new WebSocket('ws://localhost:8765/' + connectionId);
    this.ws = new WebSocket('ws://188.166.36.35:8765/' + connectionId);
    this.ws.onopen = () => {
      this.enterRoom();
    }

    this.ws.onmessage = (event) => {
      let message = JSON.parse(event.data);

      switch (message.type) {
        case 'newUser':
          let uid = message.uid
          // someone entered room
          // we create connection with him
          this.createConnection(uid);
          // create channels
          this.createChannel(uid);
          // send offer
          this.createOffer(uid);
          break;

        case 'offerFrom':
          this.handleOffer(message);
          break;

        case 'answerFrom':
          this.handleAnswer(message);
          break;

        case 'iceCandidateFrom':
          this.handleIceCandidate(message);
          break;
      }
    }
  }

  enterRoom() {
    this.ws.send(_str({
      type: 'enterRoom',
      uid: this.uid,
    }));
  }

  createConnection(uid) {
    trace('Using SCTP based data channels');
    const connection = new RTCPeerConnection(servers, this.pcConstraint);

    connection.ondatachannel = (event) =>
      this._receiveChannelCallback(event, uid);

    if (this.uid !== uid) {
      connection.onicecandidate = (event) =>
        this._onIceCandidate(event, uid);
    }

    this.peers[uid] = {};
    this.peers[uid].connection = connection;
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

  createOffer(uid) {
    const connection = this.peers[uid].connection;

    connection.createOffer().then(
      (offer) => {
        connection.setLocalDescription(offer);
        this.ws.send(_str({
          type: 'offer',
          fromUid: this.uid,
          toUid: uid,
          offer: _str(offer.toJSON()),
        }));
      },
      this._onCreateSessionDescriptionError
    );
  }

  handleOffer(message) {
    const _uid = message.fromUid;
    let offer = new RTCSessionDescription(JSON.parse(message.offer));

    let _connection = this.createConnection(_uid);
    this.createChannel(_uid);

    _connection.setRemoteDescription(offer);

    _connection.createAnswer().then(
      (answer) => {
        _connection.setLocalDescription(answer);
        this.ws.send(_str({
          type: 'answer',
          fromUid: this.uid,
          toUid: _uid,
          answer: _str(answer.toJSON()),
        }));
        // this.answerReady(answer, _uid),
      },
      this._onCreateSessionDescriptionError
    );
  }

  handleAnswer(message) {
    const connection = this.peers[message.fromUid].connection;

    let answer = new RTCSessionDescription(JSON.parse(message.answer));
    connection.setRemoteDescription(answer);
  }

  handleIceCandidate(message) {
    const connection = this.peers[message.fromUid].connection;
    connection.addIceCandidate(new RTCIceCandidate(JSON.parse(message.iceCandidate)));
  }

  _onIceCandidate(event, uid) {
    trace('local ice callback');
    if (event.candidate) {
      this.ws.send(_str({
        type: 'iceCandidate',
        fromUid: this.uid,
        toUid: uid,
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
    channel.onmessage = (event) => {
      this.messageHistoryUpdate({
        data: event.data,
        outgoing: false,
      });
    };
    channel.onopen = () => this._onSendChannelStateChange(channel);
    channel.onclose = () => this._onSendChannelStateChange(channel);
  }

  _onSendChannelStateChange(channel) {
    trace('Send channel state is: ' + channel.readyState);

    if (channel.readyState === 'open') {
      Sync.trigger('channelOpen');
    } else if (channel.readyState === 'closed') {
      Sync.trigger('channelClose');
    }
  }

  _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  dropConnection(uid) {
    // const connection = this.peers[uid].connection;
    // const channel = this.peers[uid].channel;
    //
    // if (channel) channel.close();
    // if (connection) connection.close();
    //
    // this.peers[uid] = null;
  }

  send(text) {
    _.map(this.peers, (peer) => {
      if (peer && peer.channel && peer.channel.readyState === 'open') peer.channel.send(text);
    });
    this.messageHistoryUpdate({
      data: text,
      outgoing: true,
    });
  }

  messageHistoryUpdate(data) {
    Sync.trigger('message', data);
  }
}

module.exports = RTCPConnect;
