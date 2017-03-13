const RTCPConnect = require('./RTCPConnect');
const uuid = require('./utils').uuid;
const MainView = require('./views/main');
const Sync = require('./sync');

const Router = Backbone.Router.extend({
  routes: {
    '': 'start',
    ':connectionId': 'main',
  },

  start: function() {
    Backbone.history.navigate(uuid(), true);
  },

  main: function(connectionId) {
    const connection = new RTCPConnect(connectionId);
    const mainView = new MainView({
      el: '#app',
      connectionId: connectionId,
    });

    window.onunload = function() {
      Sync.trigger('channelCloseWS', connection.uid);
      return null;
    };
  },
});

new Router();

Backbone.history.start();
