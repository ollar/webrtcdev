class MessageModel extends Backbone.Model {
  get defaults() {
    return {
      data: '',
      outgoing: false,
    };
  }
}

module.exports = MessageModel;
