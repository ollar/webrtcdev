const HistoryCollection = require('../collections/history');

const Sync = require('../sync');

const pageIsVisible = require('../utils').pageIsVisible;

class MainView extends Backbone.View {
  constructor(options) {
    super(options);

    this.collection = new HistoryCollection();

    // this.sendForm = this.$('#sendForm');
    this.sendForm = document.getElementById('sendForm');
    this.messagesList = document.getElementById('messagesList');
    this.textinput = document.getElementById('data');
    this.button = document.getElementById('send');

    this.listenTo(Sync, 'message', (data) => {
      return this.collection.add(data);
    }, this);
    this.listenTo(Sync, 'channelOpen', () => {
      this.textinput.removeAttribute('disabled');
      this.button.removeAttribute('disabled');
    }, this);
    this.listenTo(Sync, 'channelClose', () => {
      this.textinput.setAttribute('disabled', 'disabled');
      this.button.setAttribute('disabled', 'disabled');
    }, this);
    this.listenTo(this.collection, 'add', this.onMessage, this);

    this.requestNotificationsPermission();
  }

  get events() {
    return {
      'submit #sendForm': 'submitForm',
      'dragenter': 'handleDragEnter',
      'dragover': 'handleDragOver',
      'dragleave': 'handleDragLeave',
      'drop': 'handleDragDrop',
    };
  }

  requestNotificationsPermission() {
    if (!window.Notification) {
      console.log('Notifications are not available');
      return;
    }

    else if (Notification.permission === "granted") {
      return true;
    }

    else if (Notification.permission !== 'denied') {
      Notification.requestPermission((permission) => {
        if (permission === "granted") {
          return true;
        } else {
          return false;
        }
      });
    }

    return false;
  }

  showNotification(text) {
    if (this.requestNotificationsPermission() && !pageIsVisible()) {
      let notification = new Notification('WebRTC', {
        icon: 'http://lorempixel.com/50/50/',
        body: text,
      });
    }
  }

  submitForm(e) {
    e.preventDefault();

    Sync.trigger('sendMessage', this.textinput.value);
    this.sendForm.reset();
  }

  onMessage(messageModel) {
    let message;
    const _m = document.createElement('div');

    switch (messageModel.get('type')) {
      case 'text':
        message = _.template('<li class="<%= className %>"><%= text %></li>');
        _m.innerHTML = message({
          className: (messageModel.get('outgoing') ? 'outgoing' : ''),
          text: messageModel.get('data'),
        });
        this.showNotification(messageModel.get('data'));
        break;

      case 'file':
        message = _.template('<li class="<%= className %>">' +
          '<a class="<%= className %>" download="<%= fileDescription.name %>" href="<%= url %>">' +
            'Received file "<%= fileDescription.name %>" (<%= fileDescription.size %>)' +
          '</a>' +
        '</li>');
        _m.innerHTML = message({
          className: (messageModel.get('outgoing') ? 'outgoing' : ''),
          url: messageModel.get('data'),
          fileDescription: messageModel.get('__fileDescription'),
        });
        this.showNotification('Hooray! you\'ve received a file!');
        break;

      default:
        throw new Error('Invalid message');
    }

    this.messagesList.appendChild(_m.childNodes[0]);
    this.messagesList.scrollTop = this.messagesList.scrollHeight;
  }

  // Drag functions
  handleDragEnter(e) {
    e.preventDefault()
    this.el.classList.add('draddover');
  }

  handleDragOver(e) {
    e.preventDefault()
  }

  handleDragLeave(e) {
    this.el.classList.remove('draddover');
  }

  handleDragDrop(e) {
    e.preventDefault();
    Sync.trigger('sendFile', e.dataTransfer.files[0]);
  }
}

module.exports = MainView;
