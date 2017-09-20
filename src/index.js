import RTCPConnect from './RTCPConnect';
import { uuid } from './utils';
// import MainView from './views/main';
import MainView from './views/main2';
import Sync from './sync';
import App from './app';
import UsersCollection from './collections/users';
import HistoryCollection from './collections/history';

var Router = Backbone.Router.extend({
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
    var mainView = new MainView({
      el: '#app',
      connectionId: connectionId,
      peers: peers,
      history: history,
    });
  },
});

new Router();
Backbone.history.start();
