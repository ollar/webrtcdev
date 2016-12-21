const firebase = require('./firebaseConfig');
const RTCPConnect = require('./RTCPConnect');
const trace = require('./utils').trace;

const connectionId = prompt('Set connection id');

const connection = new RTCPConnect(connectionId);

const sendForm = document.getElementById('sendForm');
const messagesList = document.getElementById('messagesList');
const textinput = document.getElementById('data');
const button = document.getElementById('send');

document.addEventListener('message', (e) => {
  const message = document.createElement('li');
  message.innerHTML = e.data;

  if (e.outgoing) {
    textinput.value = '';
    message.classList.add('outgoing');
  }

  return messagesList.appendChild(message);
});

document.addEventListener('channelOpen', (e) => {
  textinput.removeAttribute('disabled');
  button.removeAttribute('disabled');
});

document.addEventListener('channelClosed', (e) => {
  textinput.setAttribute('disabled', 'disabled');
  button.setAttribute('disabled', 'disabled');
});

sendForm.addEventListener('submit', (e) => {
  e.preventDefault();
  connection.send(textinput.value);
});
