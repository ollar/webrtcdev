const HistoryCollection = require('../collections/history');

const Sync = require('../sync');

const pageIsVisible = require('../utils').pageIsVisible;

class MainView extends Backbone.View {
  constructor(options) {
    super(options);

    this.collection = new HistoryCollection();

    this.sendForm = this.$('#sendForm');
    this.messagesList = this.$('#messagesList');
    this.textinput = this.$('#data');
    this.button = this.$('#send');

    this.listenTo(Sync, 'message', (data) => {
      return this.collection.add(data);
    }, this);
    this.listenTo(Sync, 'channelOpen', () => {
      this.textinput[0].removeAttribute('disabled');
      this.button[0].removeAttribute('disabled');
    }, this);
    this.listenTo(Sync, 'channelClose', () => {
      this.textinput[0].setAttribute('disabled', 'disabled');
      this.button[0].setAttribute('disabled', 'disabled');
    }, this);
    this.listenTo(this.collection, 'add', this.onMessage, this);

    this.requestNotificationsPermission();
  }

  get events() {
    return {
      'submit #sendForm': 'submitForm',
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

    Sync.trigger('sendMessage', this.textinput[0].value);
    this.sendForm[0].reset();
  }

  onMessage(messageModel) {
    const message = _.template('<li class="<%= className %>"><%= text %></li>');

    const _m = document.createElement('div');
    _m.innerHTML = message({
      className: (messageModel.get('outgoing') ? 'outgoing' : ''),
      text: messageModel.get('data'),
    });

    this.messagesList[0].appendChild(_m.childNodes[0]);
    this.showNotification(messageModel.get('data'));
    this.messagesList[0].scrollTop = this.messagesList[0].scrollHeight;
  }
}

module.exports = MainView;
