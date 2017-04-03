var RTCPConnect = require('./RTCPConnect');
var uuid = require('./utils').uuid;
var MainView = require('./views/main');
var Sync = require('./sync');
var App = require('./app');
var AmpersandRouter = require('ampersand-router');

var Router = AmpersandRouter.extend({
  routes: {
    '': 'start',
    ':connectionId': 'main',
  },

  start: function() {
    this.history.navigate(uuid(), true);
  },

  main: function(connectionId) {
    App.init(connectionId);
    var mainView = new MainView({
      el: document.getElementById('app'),
      connectionId: connectionId,
    });
  },
});

var appRouter = new Router();
appRouter.history.start({pushState: false});
