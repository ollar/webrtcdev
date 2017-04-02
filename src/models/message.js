var MessageModel = Backbone.Model.extend({
  defaults: {
    type: '',
    data: '',
    outgoing: false,
  },
});

module.exports = MessageModel;
