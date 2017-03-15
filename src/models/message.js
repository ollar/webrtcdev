class MessageModel extends Backbone.Model {
  get defaults() {
    return {
      type: '',
      data: '',
      outgoing: false,
    };
  }
}

module.exports = MessageModel;
