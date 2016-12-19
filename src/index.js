const firebase = require('./firebaseConfig');
const RTCPConnect = require('./RTCPConnect');
const trace = require('./utils').trace;

const connectionId = prompt('Set connection id');

const connection = new RTCPConnect(connectionId);
connection.createConnection();

const textarea = document.getElementById('data');
const button = document.getElementById('send');

button.addEventListener('click', connection.send.bind(connection, textarea.value));
