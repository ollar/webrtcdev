const adapter = require('webrtc-adapter');
const firebase = require('./firebaseConfig');

const trace = require('./utils').trace;

const servers = {
  iceServers: [
    {url:'stun:stun01.sipphone.com'},
    // {url:'stun:stun.ekiga.net'},
//     {url:'stun:stun.fwdnet.net'},
//     {url:'stun:stun.ideasip.com'},
//     {url:'stun:stun.iptel.org'},
//     {url:'stun:stun.rixtelecom.se'},
//     {url:'stun:stun.schlund.de'},
//     {url:'stun:stun.l.google.com:19302'},
//     {url:'stun:stun1.l.google.com:19302'},
//     {url:'stun:stun2.l.google.com:19302'},
//     {url:'stun:stun3.l.google.com:19302'},
//     {url:'stun:stun4.l.google.com:19302'},
//     {url:'stun:stunserver.org'},
//     {url:'stun:stun.softjoys.com'},
//     {url:'stun:stun.voiparound.com'},
//     {url:'stun:stun.voipbuster.com'},
//     {url:'stun:stun.voipstunt.com'},
//     {url:'stun:stun.voxgratia.org'},
//     {url:'stun:stun.xten.com'},
//     {
//     	url: 'turn:numb.viagenie.ca',
//     	credential: 'muazkh',
//     	username: 'webrtc@live.com'
//     },
//     {
//     	url: 'turn:192.158.29.39:3478?transport=udp',
//     	credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     	username: '28224511:1379330808'
//     },
//     {
//     	url: 'turn:192.158.29.39:3478?transport=tcp',
//     	credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     	username: '28224511:1379330808'
//     },
  ]
};

// const servers = null;

class RTCPConnect {
  constructor(connectionId) {
    const db = firebase.database();

    this.type = 'offer';

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;

    this.iceCandidateIsUpdating = false;
    this.offerIsUpdating = false;
    this.answerIsUpdating = false;

    this.iceCandidate = db.ref(`${this.connectionId}/iceCandidate`);
    this.offer = db.ref(`${this.connectionId}/offer`);
    this.answer = db.ref(`${this.connectionId}/answer`);

    db.ref(this.connectionId).once('value').then((dbData) => {
      if (dbData.exists()) {
        this.type = 'answer';
      } else {
        this.type = 'offer';
      }

      this.createConnection();

      if (dbData.exists()) {
        this.waitForOffer();
      } else {
        this.createChannel();
        this.createOffer();
        this.waitForAnswer();
      }
    });
  }

  onSendChannelStateChange() {
    trace('Send channel state is: ' + this.sendChannel.readyState);

    if (this.sendChannel.readyState === 'open') {
      document.dispatchEvent(new Event('channelOpen'));
    } else if (this.sendChannel.readyState === 'closed') {
      document.dispatchEvent(new Event('channelClosed'));
      firebase.database().ref(this.connectionId).remove();
    }
  }

  createConnection() {
    trace('Using SCTP based data channels');
    trace('Connection type is ' + this.type);
    this.connection = new RTCPeerConnection(this.type === 'offer' ? servers : null, this.pcConstraint);
    this.connection.onicecandidate = this.onIceCandidate.bind(this);

    trace('Created local peer connection object localConnection');
    return this.connection;
  }

  waitForOffer() {
    this.connection.ondatachannel = this.receiveChannelCallback.bind(this);

    this.offer.on('value', (dbData) => {
      if (dbData.val() && !this.offerIsUpdating) {
        let offer = new RTCSessionDescription(dbData.val());
        this.connection.setRemoteDescription(offer);

        this.connection.createAnswer().then(
          this.answerReady.bind(this),
          this._onCreateSessionDescriptionError
        )
      }

      this.offerIsUpdating = false;
    });

    this.iceCandidate.on('value', (dbData) => {
      if (dbData.val() && !this.iceCandidateIsUpdating) {
        this.connection.addIceCandidate(new RTCIceCandidate(dbData.val()));
      }
      this.iceCandidateIsUpdating = false;
    });
  }

  waitForAnswer() {
    this.answer.on('value', (dbData) => {
      if (dbData.val() && !this.answerIsUpdating) {
        let answer = new RTCSessionDescription(dbData.val());
        this.connection.setRemoteDescription(answer);
      }

      this.answerIsUpdating = false;
    });
  }

  onIceCandidate(event) {
    trace('local ice callback');
    if (event.candidate) {
      this.iceCandidateIsUpdating = true;
      this.iceCandidate.update(event.candidate.toJSON());
    }
  }

  createChannel() {
    this.sendChannel = this.connection.createDataChannel(this.connectionId,
      this.dataConstraint);
    trace(`Created send data channel with id: ${this.connectionId}`);

    this.bindChannelEvents();

    return this.sendChannel;
  }

  receiveChannelCallback(event) {
    trace('Receive Channel Callback');
    this.sendChannel = event.channel;
    this.bindChannelEvents();
  }

  bindChannelEvents() {
    this.sendChannel.onmessage = (event) => {
      const _event = new MessageEvent('message', event);
      this.messageHistoryUpdate(_event);
    };
    this.sendChannel.onopen = this.onSendChannelStateChange.bind(this);
    this.sendChannel.onclose = this.onSendChannelStateChange.bind(this);
  }

  createOffer() {
    this.connection.createOffer().then(
      this.offerReady.bind(this),
      this._onCreateSessionDescriptionError
    );
  }

  offerReady(offer) {
      this.connection.setLocalDescription(offer);
    trace('Offer from localConnection \n' + offer.sdp);
    this.offerIsUpdating = true;
    this.offer.update(offer.toJSON());
  }

  answerReady(answer) {
    this.connection.setLocalDescription(answer);
    trace('Answer from connection \n' + answer.sdp);
    this.answerIsUpdating = true;
    this.answer.update(answer.toJSON());
  }

  _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  send(text) {
    const event = new MessageEvent('message', { data: text });
    this.sendChannel.send(text);
    this.messageHistoryUpdate(event);
  }

  messageHistoryUpdate(event) {
    document.dispatchEvent(event);
  }
}

module.exports = RTCPConnect;
