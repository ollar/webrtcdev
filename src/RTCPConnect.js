const adapter = require('webrtc-adapter');
const firebase = require('./firebaseConfig');

const trace = require('./utils').trace;
const uuid = require('./utils').uuid;

const Sync = require('./sync');

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

    this.uid = uuid();

    this.peers = {
      [this.uid]: {
        connection: null,
        channel: null,
      }
    };

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;

    this.iceCandidateIsUpdating = false;
    this.offerIsUpdating = false;
    this.answerIsUpdating = false;

    this.iceCandidate = db.ref(`${this.connectionId}/${this.uid}/iceCandidate`);
    this.offer = db.ref(`${this.connectionId}/${this.uid}/offer`);
    this.answer = db.ref(`${this.connectionId}/${this.uid}/answer`);

    Sync.on('sendMessage', this.send, this);
    Sync.on('channelClose', (connectionId) => {
      trace(`Channel close ${this.uid}`);
      db.ref(`${this.connectionId}/${this.uid}`).remove();
    });

    db.ref(this.connectionId).once('value').then((dbData) => {
      if (dbData.numChildren()) {
        console.log('has users');
      } else {
        console.log('no users');
        this.createConnection();
        this.createOffer();
      }
    });

    db.ref(this.connectionId).on('child_added', (dbData) => {
      console.log(dbData.key, this.uid);
      console.log(dbData.val());
    });


    // db.ref(this.connectionId).once('value').then((dbData) => {
    //   if (dbData.exists()) {
    //     this.type = 'answer';
    //   } else {
    //     this.type = 'offer';
    //   }
    //
    //   this.createConnection();
    //
    //   if (dbData.exists()) {
    //     this.waitForOffer();
    //   } else {
    //     this.createChannel();
    //     this.createOffer();
    //     this.waitForAnswer();
    //   }
    // });
  }

  onSendChannelStateChange() {
    trace('Send channel state is: ' + this.sendChannel.readyState);

    if (this.sendChannel.readyState === 'open') {
      Sync.trigger('channelOpen');
    } else if (this.sendChannel.readyState === 'closed') {
      Sync.trigger('channelClosed');
      firebase.database().ref(`${this.connectionId}/${this.uid}`).remove();
    }
  }

  createConnection() {
    trace('Using SCTP based data channels');
    const connection = new RTCPeerConnection(servers, this.pcConstraint);
    connection.onicecandidate = this.onIceCandidate.bind(this);

    this.peers[this.uid].connection = connection;

    trace('Created local peer connection object localConnection');
    return connection;
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
      const ice = this.iceCandidate.push();
      ice.set(event.candidate.toJSON());
    }
  }

  createChannel() {
    const connection = this.peers[this.uid].connection;
    const channel = connection.createDataChannel(this.connectionId,
      this.dataConstraint);
    trace(`Created send data channel with id: ${this.connectionId}`);

    this.peers[this.uid].channel = channel;

    this.bindChannelEvents(channel);

    return channel;
  }

  receiveChannelCallback(event) {
    const channel = this.peers[this.uid].channel;

    trace('Receive Channel Callback');
    channel = event.channel;
    this.bindChannelEvents(channel);
  }

  bindChannelEvents(channel) {
    channel.onmessage = (event) => {
      this.messageHistoryUpdate({
        data: event.data,
        outgoing: false,
      });
    };
    channel.onopen = this.onSendChannelStateChange.bind(this);
    channel.onclose = this.onSendChannelStateChange.bind(this);
  }

  createOffer() {
    const connection = this.peers[this.uid].connection;

    connection.createOffer().then(
      this.offerReady.bind(this),
      this._onCreateSessionDescriptionError
    );
  }

  offerReady(offer) {
    const connection = this.peers[this.uid].connection;
    connection.setLocalDescription(offer);
    trace('Offer from localConnection \n' + offer.sdp);
    this.offer.update(offer.toJSON());
  }

  answerReady(answer) {
    const connection = this.peers[this.uid].connection;
    connection.setLocalDescription(answer);
    trace('Answer from connection \n' + answer.sdp);
    this.answer.update(answer.toJSON());
  }

  _onCreateSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString());
  }

  send(text) {
    this.sendChannel.send(text);
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
