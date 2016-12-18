const firebase = require('firebase');

var config = {
  apiKey: "AIzaSyDuyDnR7Or4WD4qIt9MdIdsBwngLuoXS6U",
  authDomain: "webrtc-86b8c.firebaseapp.com",
  databaseURL: "https://webrtc-86b8c.firebaseio.com",
  storageBucket: "webrtc-86b8c.appspot.com",
  messagingSenderId: "12297268199"
};
firebase.initializeApp(config);

module.exports = firebase;
