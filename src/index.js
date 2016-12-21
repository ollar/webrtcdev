const firebase = require('./firebaseConfig');
const RTCPConnect = require('./RTCPConnect');
const trace = require('./utils').trace;

const connectionId = prompt('Set connection id');

const connection = new RTCPConnect(connectionId);

const messagesList = document.getElementById('messagesList');
const textarea = document.getElementById('data');
const button = document.getElementById('send');

document.addEventListener('message', (e) => {
  const message = document.createElement('li');
  message.innerHTML = e.data;
  messagesList.appendChild(message);

  textarea.value = '';
});

document.addEventListener('channelOpen', (e) => {
  textarea.removeAttribute('disabled');
  button.removeAttribute('disabled');
});

document.addEventListener('channelClosed', (e) => {
  textarea.setAttribute('disabled', 'disabled');
  button.setAttribute('disabled', 'disabled');
});

button.addEventListener('click', () => connection.send(textarea.value));
