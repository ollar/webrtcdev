const firebase = require('./firebaseConfig');
const RTCPConnect = require('./RTCPConnect');
const uuid = require('./utils').uuid;
const MainView = require('./views/main');

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
      const db = firebase.database();

      db.ref(`${connection.connectionId}/${connection.uid}`).remove();

      return false;
    };
  },
});

new Router();

Backbone.history.start();
