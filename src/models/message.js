var MessageModel = Backbone.Model.extend({
  defaults: {
    type: '',
    data: '',
    colour: '#00bfff',
  },
});

module.exports = MessageModel;
