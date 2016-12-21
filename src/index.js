const firebase = require('./firebaseConfig');
const RTCPConnect = require('./RTCPConnect');
const trace = require('./utils').trace;

// const connectionId = prompt('Set connection id');

const connectionId = 112;
const connection = new RTCPConnect(connectionId);

const MainView = require('./views/main');
const mainView = new MainView({ el: '#app'});
