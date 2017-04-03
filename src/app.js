var WebRTC = require('./RTCPConnect');
var Sync = require('./sync');
var _str = require('./utils')._str;
var trace = require('./utils').trace;
var Middleware = require('./utils').Middleware;
var _forEach = require('lodash/forEach');

var App = (function(window) {
  var ws;

  /**
   * init function
   * @param  {String} connectionId connection UID
   */
  function init(connectionId) {
    if (ENV === 'dev') {
      ws = new WebSocket('ws://localhost:8765/' + connectionId);
    } else {
      ws = new WebSocket('ws://188.166.36.35:8765/' + connectionId);
    }

    WebRTC.init(connectionId);

    ws.onopen = _enterRoom;

    Sync.on('channelClose', function(uid) {
      trace('Channel close ' + uid);
    });

    Sync.on('channelCloseWS', function(uid) {
      ws.send(_str({
        type: 'channelClose',
        uid: uid || WebRTC.getUid(),
      }));
    });

    Sync.on('ws:send', _sendWsMessage);

    ws.onmessage = function(event) {
      var message = JSON.parse(event.data);

      switch (message.type) {
        case 'newUser':
          var uid = message.uid
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
  function _sendWsMessage(msg) {
    return ws.send(msg);
  }

  /**
   * Enter a room
   */
  function _enterRoom() {
    ws.send(_str({
      type: 'enterRoom',
      uid: WebRTC.getUid(),
    }));
  }

  /**
   * Send message via RTC
   * @param  {String} text message body
   */
  function sendMessage(text) {
    _forEach(WebRTC.getPeers(), function(peer) {
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

  function _createFileConnections(cb) {
    _forEach(WebRTC.getPeers(), function(peers, key) {
      WebRTC.createConnection(key, WebRTC.getUid() + '_file', key + '_file');
      var channel = WebRTC.createChannel(key + '_file');
      WebRTC.createOffer(key, WebRTC.getUid() + '_file', key + '_file');

      channel.addEventListener('open', cb);
    });
  }

  function _closeFileConnections(next) {
    _forEach(WebRTC.getPeers(), function(peer, key) {
      if (key.indexOf('_file') > -1)
        WebRTC.dropConnection(key);
    });

    next();
  }

  function _sendTransferPrepareInfo(next, file) {
    _forEach(WebRTC.getPeers(), function(peer, key) {
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

    return next();
  }

  function _sendTransferCompleteInfo(next) {
    _forEach(WebRTC.getPeers(), function(peer, key) {
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

    return next();
  }

  function _sliceFile(next, offset, file) {
    var chunkSize = 16384;
    var reader = new window.FileReader();
    reader.onload = (function() {
      return function(e) {
        _forEach(WebRTC.getPeers(), function(peer, key) {
          if (key.indexOf('_file') > -1 &&
            peer && peer.channel &&
            peer.channel.readyState === 'open') {
              peer.channel.send(e.target.result);
            }
        });

        if (file.size > offset + e.target.result.byteLength) {
          _sliceFile(next, offset + chunkSize, file);
          // setTimeout(_sliceFile, 0, next, offset + chunkSize, file);
        } else {
          messageHistoryUpdate({
            type: 'text',
            data: 'Sent file "' + file.name + '" (' + file.size + ')',
            outgoing: true,
          });

          next();
        }
        // sendProgress.value = offset + e.target.result.byteLength;
      };
    })(file);
    var slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  }

  /**
   * sendFile function
   * @param  {Blob} file - file to send
   */
  function sendFile(file) {
    var middleware = new Middleware();

    if (file.size === 0) {
      console.log('File is empty, please select a non-empty file');
      return;
    }

    middleware.use(_createFileConnections);
    middleware.use(function(next) {return _sendTransferPrepareInfo(next, file);});
    middleware.use(function(next) {return _sliceFile(next, 0, file);});
    middleware.use(_sendTransferCompleteInfo);
    middleware.use(_closeFileConnections);

    middleware.go(function(next) {
      trace('File is ' + [file.name, file.size, file.type, file.lastModifiedDate].join(' '));
      return true;
    });
  }

  return {
    init: init,
    sendFile: sendFile,
    sendMessage: sendMessage,
  };
})(window);

module.exports = App;
