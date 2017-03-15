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
    this.ws = new WebSocket('ws://localhost:8765/' + connectionId);
    // this.ws = new WebSocket('ws://188.166.36.35:8765/' + connectionId);

    this.uid = uuid();

    this.peers = {};
    window.peers = this.peers;
    window.uid = this.uid;

    this.connectionId = connectionId;
    this.pcConstraint = null;
    this.dataConstraint = null;

    Sync.on('sendMessage', this.send, this);
    Sync.on('sendFile', this.sendFile, this);

    Sync.on('channelClose', (uid) => {
      trace(`Channel close ${uid}`);
    });

    Sync.on('channelCloseWS', (uid) => {
      this.ws.send(_str({
        type: 'channelClose',
        uid: uid || this.uid,
      }));
    });

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

        case 'channelClose':
          this.dropConnection(message.uid)
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

  createChannel(uid, type = '') {
    const connection = this.peers[uid].connection;
    const channel = connection.createDataChannel(this.connectionId,
      this.dataConstraint);
    trace(`Created send data channel with id: ${this.connectionId}`);

    if (type) {
      this.peers[uid]['channel' + type] = channel;
    } else {
      this.peers[uid].channel = channel;
    }

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
      if (typeof event.data === 'string') {
        if (event.data.indexOf('__fileDescription') > -1) {
          event.target['__fileDescription'] = JSON.parse(event.data.split('::')[1]);
        } else {
          this.messageHistoryUpdate({
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
    channel.onopen = () => this._onSendChannelStateChange(channel);
    channel.onclose = () => this._onSendChannelStateChange(channel);
  }

  _onSendChannelStateChange(channel) {
    trace('Send channel state is: ' + channel.readyState);

    if (channel.readyState === 'open') {
      Sync.trigger('channelOpen');
    } else if (channel.readyState === 'closed') {
      if (channel._receiveBuffer) {
        var received = new window.Blob(channel._receiveBuffer, {type: channel.__fileDescription.type});
        var href = URL.createObjectURL(received);

        this.messageHistoryUpdate({
          type: 'file',
          data: href,
          __fileDescription: channel.__fileDescription || {},
          outgoing: false,
        });
      }

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

    if (channel) channel.close();
    if (connection) connection.close();

    delete this.peers[uid];
  }

  send(text) {
    _.map(this.peers, (peer) => {
      if (peer && peer.channel && peer.channel.readyState === 'open') peer.channel.send(text);
    });
    this.messageHistoryUpdate({
      type: 'text',
      data: text,
      outgoing: true,
    });
  }

  messageHistoryUpdate(data) {
    Sync.trigger('message', data);
  }

  sendFile(file) {
    var chunkSize = 16384;
    var _this = this;

    function createFileChannels() {
      _.forEach(_.keys(_this.peers), (key) => {
        _this.createChannel(key, 'file');
      });
    }

    function closeFileChannels() {
      _.forEach(_.keys(_this.peers), (key) => {
        if (_this.peers[key].channelfile &&
          _this.peers[key].channelfile.readyState === 'open') {
          _this.peers[key].channelfile.close();
          delete _this.peers[key].channelfile;
        }
      });
    }

    trace('File is ' + [file.name, file.size, file.type,
      file.lastModifiedDate
    ].join(' '));

    if (file.size === 0) {
      console.log('File is empty, please select a non-empty file');
      return;
    }

    createFileChannels();

    _.map(_this.peers, (peer) => {
      if (peer && peer.channelfile && peer.channelfile.readyState === 'open') peer.channelfile.send('__fileDescription::' +
        _str({
          name: file.name,
          size: file.size,
          type: file.type,
        }));
    });

    var sliceFile = function(offset) {
      var reader = new window.FileReader();
      reader.onload = (function() {
        return function(e) {
          _.map(_this.peers, (peer) => {
            if (peer && peer.channelfile && peer.channelfile.readyState === 'open') peer.channelfile.send(e.target.result);
          });
          if (file.size > offset + e.target.result.byteLength) {
            setTimeout(sliceFile, 0, offset + chunkSize);
          } else {
            _this.messageHistoryUpdate({
              type: 'text',
              data: `Sent file "${file.name}" (${file.size})`,
              outgoing: true,
            });
            closeFileChannels();
          }
          // sendProgress.value = offset + e.target.result.byteLength;
        };
      })(file);
      var slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };
    sliceFile(0);
  }
}

module.exports = RTCPConnect;
