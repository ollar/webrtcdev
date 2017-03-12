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
    window.peers = this.peers;
    window.uid = this.uid;

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;

    this.iceCandidate = (uid) => db.ref(`${this.connectionId}/${uid}/iceCandidate`);
    this.offer = (uid) => db.ref(`${this.connectionId}/${uid}/offer`);
    this.answer = (uid) => db.ref(`${this.connectionId}/${this.uid}/answer`);

    Sync.on('sendMessage', this.send, this);
    Sync.on('channelClose', (uid) => {
      trace(`Channel close ${uid}`);
      db.ref(`${this.connectionId}/${uid}`).remove();
    });

    this.enterRoom();

    db.ref(this.connectionId).on('child_added', (dbData) => {
      const uid = dbData.val().uid;

      console.log(this.peers, uid);

      if (uid) {
        if (uid === this.uid) {
          // we entered room
          // create simple connection just to bind events
          // wait for other users offers
          // this.createConnection(this.uid);
          this.waitForOffer();
          return;
        } else {
          // someone entered room
          // we create connection with him
          this.createConnection(uid);
          // create channels
          this.createChannel(uid);
          // send offer
          this.createOffer(uid);
          // and wait for answer
          this.waitForAnswer(uid);
        }
      }
    });

    db.ref(this.connectionId).on('child_removed', (dbData) => {
      const uid = dbData.val().uid;

      if (uid) {
        this.dropConnection(uid);
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
        this.offer(uid).child(this.uid).set(offer.toJSON());
      },
      this._onCreateSessionDescriptionError
    );
  }

  waitForOffer(uid) {
    this.offer(this.uid).on('child_added', (dbData) => {
      if (dbData.val()) {
        const _uid = dbData.key;
        let offer = new RTCSessionDescription(dbData.val());
        let _connection = this.peers[_uid].connection;
        _connection.setRemoteDescription(offer);

        _connection.createAnswer().then(
          (answer) => {
            _connection.setLocalDescription(answer);
            this.answer(this.uid).child(_uid).set(answer.toJSON());
            // this.answerReady(answer, _uid),
          },
          this._onCreateSessionDescriptionError
        )
      }
    });

    this.iceCandidate(this.uid).on('child_added', (dbData) => {
      let foreignUid = dbData.key;

      this.iceCandidate(this.uid).child(foreignUid).on('child_added', (_dbData) => {
        if (_dbData.val()) {
          let _connection = this.peers[foreignUid].connection;
          _connection.addIceCandidate(new RTCIceCandidate(_dbData.val()));
        }
      });
    });
  }

  waitForAnswer(uid) {
    const connection = this.peers[uid].connection;
    this.answer(uid).on('child_added', (dbData) => {
      if (dbData.val() && dbData.key === uid) {
        let answer = new RTCSessionDescription(dbData.val());
        connection.setRemoteDescription(answer);
      }
    });
  }

  _onIceCandidate(event, uid) {
    trace('local ice callback');
    if (event.candidate) {
      const ice = this.iceCandidate(uid).child(this.uid).push();
      ice.set(event.candidate.toJSON());
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
      Sync.trigger('channelClosed');
      firebase.database().ref(`${this.connectionId}/${this.uid}`).remove();
    }
  }

  // offerReady(offer, uid) {
  //   const connection = this.peers[uid].connection;
  //   connection.setLocalDescription(offer);
  //   trace('Offer from localConnection \n' + offer.sdp);
  //   this.offer(this.uid).child(uid).set(offer.toJSON());
  //   // this.offer(uid).update(offer.toJSON());
  // }

  // answerReady(answer, uid) {
  //   const connection = this.peers[uid].connection;
  //   connection.setLocalDescription(answer);
  //   trace('Answer from connection \n' + answer.sdp);
  //   this.answer(uid).child(this.uid).set(answer.toJSON());
  //   // this.answer(uid).update(answer.toJSON());
  // }

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