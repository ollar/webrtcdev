var MessageModel = require('../models/message');

var HistoryCollection = Backbone.Collection.extend({
  model: MessageModel,
});

module.exports = HistoryCollection;
