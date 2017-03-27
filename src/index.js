const RTCPConnect = require('./RTCPConnect');
const uuid = require('./utils').uuid;
const MainView = require('./views/main');
const Sync = require('./sync');
const App = require('./app');

const Router = Backbone.Router.extend({
  routes: {
    '': 'start',
    ':connectionId': 'main',
  },

  start: function() {
    Backbone.history.navigate(uuid(), true);
  },

  main: function(connectionId) {
    App.init(connectionId);
    const mainView = new MainView({
      el: '#app',
      connectionId: connectionId,
    });
  },
});

new Router();
Backbone.history.start();
