const MessageModel = require ('../models/message');

class HistoryCollection extends Backbone.Collection {
  get model() {
    return MessageModel;
  }
}

module.exports = HistoryCollection;
