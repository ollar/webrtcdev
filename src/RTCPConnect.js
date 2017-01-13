const adapter = require('webrtc-adapter');
const firebase = require('./firebaseConfig');

const trace = require('./utils').trace;
const uuid = require('./utils').uuid;

const Sync = require('./sync');

// const servers = {
//   iceServers: [
//     {url:'stun:stun01.sipphone.com'},
//     {url:'stun:stun.ekiga.net'},
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
//   ]
// };

const servers = null;

class RTCPConnect {
  constructor(connectionId) {
    const db = firebase.database();

    this.uid = uuid();

    this.peers = {};

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;

    this.iceCandidate = (uid) => db.ref(`${this.connectionId}/${uid}/iceCandidate`);
    this.offer = (uid) => db.ref(`${this.connectionId}/${uid}/offer`);
    this.answer = (uid) => db.ref(`${this.connectionId}/${uid}/answer`);

    Sync.on('sendMessage', this.send, this);
    Sync.on('channelClose', (uid) => {
      trace(`Channel close ${uid}`);
      db.ref(`${this.connectionId}/${uid}`).remove();
    });

    this.enterRoom();

    db.ref(this.connectionId).on('child_added', (dbData) => {
      const uid = dbData.val().uid;

      if (uid) {
        if (uid === this.uid) {
          this.createConnection(this.uid);
          this.waitForOffer(this.uid);
        } else {
          this.createConnection(uid);
          this.createChannel(uid);
          this.createOffer(uid);
          this.waitForAnswer(uid);
        }
      }
    });
  }

  enterRoom() {
    return firebase.database().ref(`${this.connectionId}`)
      .child(this.uid)
      .set({
        'uid': this.uid
      });
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

  createConnection(uid) {
    trace('Using SCTP based data channels');
    const connection = new RTCPeerConnection(servers, this.pcConstraint);
    connection.onicecandidate = this.onIceCandidate.bind(this);

    this.peers[uid] = {};
    this.peers[uid].connection = connection;
    console.log(this.peers);

    trace('Created local peer connection object localConnection');
    return connection;
  }

  waitForOffer(uid) {
    const connection = this.peers[uid].connection;
    connection.ondatachannel = this.receiveChannelCallback.bind(this);

    this.offer(uid).on('value', (dbData) => {
      if (dbData.val() && !this.offerIsUpdating) {
        let offer = new RTCSessionDescription(dbData.val());
        connection.setRemoteDescription(offer);

        connection.createAnswer().then(
          (answer) => this.answerReady(answer, uid),
          this._onCreateSessionDescriptionError
        )
      }
    });

    this.iceCandidate(uid).on('child_added', (dbData) => {
      if (dbData.val()) {
        connection.addIceCandidate(new RTCIceCandidate(dbData.val()));
      }
    });
  }

  waitForAnswer(uid) {
    const connection = this.peers[uid].connection;
    this.answer(uid).on('value', (dbData) => {
      if (dbData.val()) {
        let answer = new RTCSessionDescription(dbData.val());
        connection.setRemoteDescription(answer);
      }
    });
  }

  onIceCandidate(event) {
    trace('local ice callback');
    if (event.candidate) {
      const ice = this.iceCandidate(this.uid).push();
      ice.set(event.candidate.toJSON());
    }
  }

  createChannel(uid) {
    const connection = this.peers[uid].connection;
    const channel = connection.createDataChannel(this.connectionId,
      this.dataConstraint);
    trace(`Created send data channel with id: ${this.connectionId}`);

    this.peers[uid].channel = channel;

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

  createOffer(uid) {
    const connection = this.peers[uid].connection;

    connection.createOffer().then(
      (offer) =>
        this.offerReady(offer, uid),
      this._onCreateSessionDescriptionError
    );
  }

  offerReady(offer, uid) {
    const connection = this.peers[uid].connection;
    connection.setLocalDescription(offer);
    trace('Offer from localConnection \n' + offer.sdp);
    this.offer(uid).update(offer.toJSON());
  }

  answerReady(answer, uid) {
    const connection = this.peers[uid].connection;
    connection.setLocalDescription(answer);
    trace('Answer from connection \n' + answer.sdp);
    this.answer(uid).update(answer.toJSON());
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
