var User = Backbone.Model.extend({
  defaults: {
    id: '',
    connection: '',
    channel: '',
    colour: '#ccc',
    typing: false,
  }
});

export default User;
