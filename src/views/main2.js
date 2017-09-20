import Sync from '../sync';
import { pageIsVisible } from '../utils';
import { pageOnVisibilityChange } from '../utils';
import { _str } from '../utils';

var MainView = Backbone.View.extend({
  initialize(options) {
    this.title = document.title;
    this.unreadMessages = 0;

    this.users = options.peers;
    this.collection = options.history;

    this.sendForm = document.getElementById('sendForm');
    this.usersList = document.getElementById('usersList');
    this.messagesList = document.getElementById('messagesList');
    this.textinput = document.getElementById('data');
    this.button = document.getElementById('send');
    this.loadProgress = document.getElementsByClassName('load-progress')[0];

    this.listenTo(Sync, 'message', function(data) {
      var user = this.users.get(data.fromUid);
      if (user) user.set('typing', false);
      return this.collection.add(data);
    }, this);
    this.listenTo(Sync, 'channelOpen', function(channel) {
      this.textinput.removeAttribute('disabled');
      this.button.removeAttribute('disabled');

      channel.send(_str({
        type: '__history',
        messages: this.collection.toJSON(),
      }));
    }, this);
    this.listenTo(Sync, 'channelClose', function() {
      this.textinput.setAttribute('disabled', 'disabled');
      this.button.setAttribute('disabled', 'disabled');
    }, this);
    this.listenTo(Sync, 'load:start', function() {
      this.loadProgress.style.opacity = 1;
    }, this);
    this.listenTo(Sync, 'load:progress', function(progress) {
      this.loadProgress.style.width = progress * 100 + '%';
    }, this);
    this.listenTo(Sync, 'load:complete', function() {
      this.loadProgress.style.opacity = 0;
      this.loadProgress.style.width = 0;
    }, this);
    this.listenTo(Sync, 'user:typing', function(uid) {
      var user = this.users.get(uid);

      if (user.get('typingTimer')) {
        clearTimeout(user.get('typingTimer'));
        user.unset('typingTimer');
      }

      if (user) {
        user.set('typing', true);
        var typingTimer = setTimeout(function() {
          user.set('typing', false);
          user.unset('typingTimer');
        }, 1000);
        user.set('typingTimer', typingTimer);
      }
    }, this);
    this.listenTo(this.collection, 'add', this.onMessage, this);

    document.addEventListener(pageOnVisibilityChange(), function() {
      if (pageIsVisible()) {
        this.unreadMessages = 0;
      }
      this._updateTitle();
    }.bind(this));
  }
});

export default MainView;
