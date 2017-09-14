import RTCPConnect from './RTCPConnect';
import { uuid } from './utils';
import MainView from './views/main';
import Sync from './sync';
import App from './app';
import UsersCollection from './collections/users';
import HistoryCollection from './collections/history';
import './backboneConfig';


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
