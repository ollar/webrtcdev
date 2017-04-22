const RTCPConnect = require('./RTCPConnect');
const uuid = require('./utils').uuid;
const MainView = require('./views/main');
const Sync = require('./sync');
const App = require('./app');
var UsersCollection = require('./collections/users');
var HistoryCollection = require('./collections/history');

const Router = Backbone.Router.extend({
  routes: {
    '': 'start',
    ':connectionId': 'main',
  },

  start: function() {
    Backbone.history.navigate(uuid(), true);
  },

  main: function(connectionId) {
    var peers = new UsersCollection();
    var history = new HistoryCollection();

    App.init(connectionId, peers, history);
    const mainView = new MainView({
      el: '#app',
      connectionId: connectionId,
      peers: peers,
      history: history,
    });
  },
});

new Router();
Backbone.history.start();
