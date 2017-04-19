var User = Backbone.Model.extend({
  defaults: {
    id: '',
    connection: '',
    channel: '',
    colour: '#ccc',
  }
});

module.exports = User;
