import MessageModel from '../models/message';

var HistoryCollection = Backbone.Collection.extend({
  model: MessageModel,
});

export default HistoryCollection;
