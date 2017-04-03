var ACollection = require('ampersand-collection');
var MessageModel = require('../models/message');

var HistoryCollection = ACollection.extend({
  model: MessageModel,
});

module.exports = HistoryCollection;
