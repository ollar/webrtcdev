var HistoryCollection = require('../collections/history');
var Sync = require('../sync');
var pageIsVisible = require('../utils').pageIsVisible;
var pageOnVisibilityChange = require('../utils').pageOnVisibilityChange;
var textTemplate = require('../templates/textMessage.html');
var fileTemplate = require('../templates/fileMessage.html');
var App = require('../app');
var anchorme = require("anchorme").default;

var MainView = Backbone.View.extend({
  initialize: function(options) {
    this.title = document.title;
    this.unreadMessages = 0;

    this.collection = new HistoryCollection();

    this.sendForm = document.getElementById('sendForm');
    this.messagesList = document.getElementById('messagesList');
    this.textinput = document.getElementById('data');
    this.button = document.getElementById('send');

    this.listenTo(Sync, 'message', function(data) {
      return this.collection.add(data);
    }, this);
    this.listenTo(Sync, 'channelOpen', function() {
      this.textinput.removeAttribute('disabled');
      this.button.removeAttribute('disabled');
    }, this);
    this.listenTo(Sync, 'channelClose', function() {
      this.textinput.setAttribute('disabled', 'disabled');
      this.button.setAttribute('disabled', 'disabled');
    }, this);
    this.listenTo(this.collection, 'add', this.onMessage, this);

    this.requestNotificationsPermission();

    document.addEventListener(pageOnVisibilityChange(), function() {
      if (pageIsVisible()) {
        this.unreadMessages = 0;
      }
      this._updateTitle();
    }.bind(this));
  },

  events: {
    'submit #sendForm': 'submitForm',
    'dragenter': 'handleDragEnter',
    'dragover': 'handleDragOver',
    'dragleave': 'handleDragLeave',
    'drop': 'handleDragDrop',
  },

  requestNotificationsPermission: function() {
    if (!window.Notification) {
      console.log('Notifications are not available');
      return;
    }

    else if (Notification.permission === "granted") {
      return true;
    }

    else if (Notification.permission !== 'denied') {
      Notification.requestPermission(function(permission) {
        if (permission === "granted") {
          return true;
        } else {
          return false;
        }
      });
    }

    return false;
  },

  _updateTitle: function() {
    if (!this.unreadMessages) return document.title = this.title;
    return document.title = this.title + ' (' + this.unreadMessages + ')';
  },

  showNotification: function(text) {
    if (!pageIsVisible()) {
      this.unreadMessages += 1;
    }
    this._updateTitle();
    // if (this.requestNotificationsPermission() && !pageIsVisible()) {
    //   var notification = new Notification('WebRTC', {
    //     icon: 'http://lorempixel.com/50/50/',
    //     body: text,
    //   });
    // }
  },

  submitForm: function(e) {
    e.preventDefault();

    App.sendMessage(this.textinput.value);
    this.sendForm.reset();
  },

  onMessage: function(messageModel) {
    var message;
    var _m = document.createElement('div');

    switch (messageModel.get('type')) {
      case 'text':
        message = _.template(textTemplate);
        _m.innerHTML = message({
          className: (messageModel.get('outgoing') ? 'outgoing' : ''),
          text: anchorme(messageModel.get('data'), {
            attributes: [
              {
                name: 'target',
                value: '_blank',
              },
            ],
          }),
        });
        if (!messageModel.get('outgoing'))
          this.showNotification(messageModel.get('data'));
        break;

      case 'file':
        message = _.template(fileTemplate);
        _m.innerHTML = message({
          className: (messageModel.get('outgoing') ? 'outgoing' : ''),
          url: messageModel.get('data'),
          fileDescription: messageModel.get('__fileDescription'),
        });
        if (!messageModel.get('outgoing'))
          this.showNotification('Hooray! you\'ve received a file!');
        break;

      default:
        throw new Error('Invalid message');
    }

    this.messagesList.appendChild(_m.childNodes[0]);
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  },

  // Drag functions
  handleDragEnter: function(e) {
    e.preventDefault()
    this.el.classList.add('draddover');
  },

  handleDragOver: function(e) {
    e.preventDefault()
  },

  handleDragLeave: function(e) {
    this.el.classList.remove('draddover');
  },

  handleDragDrop: function(e) {
    e.preventDefault();
    App.sendFile(e.dataTransfer.files[0]);
  },
});

module.exports = MainView;
