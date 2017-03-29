const WebRTC = require('./RTCPConnect');
const Sync = require('./sync');
const _str = require('./utils')._str;
const trace = require('./utils').trace;

var App = (function() {
  var ws;

  /**
   * init function
   * @param  {String} connectionId connection UID
   */
  function init(connectionId) {
    // ws = new WebSocket('ws://localhost:8765/' + connectionId);
    ws = new WebSocket('ws://188.166.36.35:8765/' + connectionId);
    WebRTC.init(connectionId);

    ws.onopen = () => enterRoom();

    Sync.on('sendMessage', send);
    Sync.on('sendFile', sendFile);

    Sync.on('channelClose', (uid) => {
      trace(`Channel close ${uid}`);
    });

    Sync.on('channelCloseWS', (uid) => {
      ws.send(_str({
        type: 'channelClose',
        uid: uid || WebRTC.getUid(),
      }));
    });

    Sync.on('ws:send', sendWsMessage);

    ws.onmessage = (event) => {
      let message = JSON.parse(event.data);

      switch (message.type) {
        case 'newUser':
          let uid = message.uid
          // someone entered room
          // we create connection with him
          WebRTC.createConnection(uid);
          // create channels
          WebRTC.createChannel(uid);
          // send offer
          WebRTC.createOffer(uid);
          break;

        case 'offerFrom':
          WebRTC.handleOffer(message);
          break;

        case 'answerFrom':
          WebRTC.handleAnswer(message);
          break;

        case 'iceCandidateFrom':
          WebRTC.handleIceCandidate(message);
          break;

        case 'channelClose':
          WebRTC.dropConnection(message.uid)
      }
    }

    window.onunload = function() {
      Sync.trigger('channelCloseWS', WebRTC.getUid());
      return null;
    };
  }

  /**
   * send messages to signaling server
   * @param  {String} msg message
   */
  function sendWsMessage(msg) {
    return ws.send(msg);
  }

  /**
   * Enter a room
   */
  function enterRoom() {
    ws.send(_str({
      type: 'enterRoom',
      uid: WebRTC.getUid(),
    }));
  }

  /**
   * Send message via RTC
   * @param  {String} text message body
   */
  function send(text) {
    _.map(WebRTC.getPeers(), (peer) => {
      if (peer && peer.channel && peer.channel.readyState === 'open') peer.channel.send(text);
    });

    messageHistoryUpdate({
      type: 'text',
      data: text,
      outgoing: true,
    });
  }

  /**
   * Updates chat messages history
   * @param  {Object} data data to add to messages list
   */
  function messageHistoryUpdate(data) {
    Sync.trigger('message', data);
  }

  /**
   * sendFile function
   * @param  {Blob} file - file to send
   */
  function sendFile(file) {
    var chunkSize = 16384;

    function createFileConnections(cb) {
      _.map(WebRTC.getPeers(), (peers, key) => {
        WebRTC.createConnection(key, WebRTC.getUid() + '_file', key + '_file');
        var channel = WebRTC.createChannel(key + '_file');
        WebRTC.createOffer(key, WebRTC.getUid() + '_file', key + '_file');

        channel.addEventListener('open', cb);
      });
    }

    function closeFileConnections() {
      _.map(WebRTC.getPeers(), (peer, key) => {
        if (key.indexOf('_file') > -1)
          WebRTC.dropConnection(key);
      });
    }

    function sendTransferPrepareInfo() {
      return _.map(WebRTC.getPeers(), (peer, key) => {
        if (key.indexOf('_file') > -1 &&
          peer && peer.channel &&
          peer.channel.readyState === 'open') {
            peer.channel.send('__fileDescription::' +
              _str({
                name: file.name,
                size: file.size,
                type: file.type,
              })
            );
          }
      });
    }

    function sendTransferCompleteInfo() {
      return _.map(WebRTC.getPeers(), (peer, key) => {
        if (key.indexOf('_file') > -1 &&
          peer && peer.channel &&
          peer.channel.readyState === 'open') {
            peer.channel.send('__fileTransferComplete::' +
              _str({
                connFromUid: WebRTC.getUid() + '_file',
              })
            );
          }
      });
    }

    function sliceFile(offset) {
      var reader = new window.FileReader();
      reader.onload = (function() {
        return function(e) {
          _.map(WebRTC.getPeers(), (peer, key) => {
            if (key.indexOf('_file') > -1 &&
              peer && peer.channel &&
              peer.channel.readyState === 'open') {
                peer.channel.send(e.target.result);
              }
          });

          if (file.size > offset + e.target.result.byteLength) {
            setTimeout(sliceFile, 0, offset + chunkSize);
          } else {
            messageHistoryUpdate({
              type: 'text',
              data: `Sent file "${file.name}" (${file.size})`,
              outgoing: true,
            });

            sendTransferCompleteInfo();

            setTimeout(closeFileConnections, 10);
          }
          // sendProgress.value = offset + e.target.result.byteLength;
        };
      })(file);
      var slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    }

    trace('File is ' + [file.name, file.size, file.type,
      file.lastModifiedDate
    ].join(' '));

    if (file.size === 0) {
      console.log('File is empty, please select a non-empty file');
      return;
    }

    createFileConnections(function() {
      sendTransferPrepareInfo();
      setTimeout(() => sliceFile(0), 10);
    });
  }

  return {
    init,
  };
})();

module.exports = App;
