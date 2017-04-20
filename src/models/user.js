var User = Backbone.Model.extend({
  defaults: {
    id: '',
    connection: '',
    channel: '',
    colour: '#ccc',
    typing: false,
  }
});

module.exports = User;
