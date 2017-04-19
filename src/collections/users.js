var UserModel = require('../models/user');

var Users = Backbone.Collection.extend({
  model: UserModel,
});

module.exports = Users;
