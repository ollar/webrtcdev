const firebase = require('./firebaseConfig');
const RTCPConnect = require('./RTCPConnect');
const trace = require('./utils').trace;

const localConnection = new RTCPConnect();
localConnection.createConnection();

localConnection.createChannel('transferDataChannel');





localConnection.createOffer();

console.log(localConnection);
// console.log(localConnection.iceCandidate.toJSON());
