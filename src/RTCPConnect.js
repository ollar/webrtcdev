const adapter = require('webrtc-adapter');
const firebase = require('./firebaseConfig');

const trace = require('./utils').trace;

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
  constructor() {
    var db = firebase.database();
    this.connectionId = prompt('Set connection id');
    this.pcConstraint = null;
    this.dataConstraint = null;

    this.iceCandidateIsUpdating = false;
    this.offerIsUpdating = true;
    this.answerIsUpdating = true;

    this.iceCandidate = db.ref(`${this.connectionId}/iceCandidate`);
    this.offer = db.ref(`${this.connectionId}/offer`);
    this.answer = db.ref(`${this.connectionId}/answer`);
  }

  onSendChannelStateChange() {
    trace('Send channel state is: ' + sendChannel.readyState);
  }

  createConnection() {
    trace('Using SCTP based data channels');
    this.connection = new RTCPeerConnection(servers, this.pcConstraint);
    this.connection.onicecandidate = this.onIceCandidate.bind(this);

    this.bindEvents();

    trace('Created local peer connection object localConnection');
    return this.connection;
  }

  bindEvents() {
    this.iceCandidate.on('value', (dbData) => {
      if (!this.iceCandidateIsUpdating) {
        this.connection.addIceCandidate(new RTCIceCandidate(dbData.val()));
      }
      this.iceCandidateIsUpdating = false;
    });

    this.offer.on('value', (dbData) => {
      // debugger;
      if (this.offerIsUpdating) {
        this.connection.setLocalDescription(new RTCSessionDescription(dbData.val()));
      } else {
        this.connection.setRemoteDescription(new RTCSessionDescription(dbData.val()));
      }

      this.offerIsUpdating = false;
    });

    this.answer.on('value', (dbData) => {
      if (this.answerIsUpdating) {
        this.connection.setRemoteDescription(new RTCSessionDescription(dbData.val()));
      } else {
        this.connection.setLocalDescription(new RTCSessionDescription(dbData.val()));
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

  createChannel(channelId) {
    this.sendChannel = this.connection.createDataChannel(channelId,
      this.dataConstraint);
    trace(`Created send data channel with id: ${channelId}`);

    this.sendChannel.onopen = this.onSendChannelStateChange;
    this.sendChannel.onclose = this.onSendChannelStateChange;

    return this.sendChannel;
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

  _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }
}

module.exports = RTCPConnect;
