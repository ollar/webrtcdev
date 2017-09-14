import UserModel from '../models/user';

var Users = Backbone.Collection.extend({
  model: UserModel,
});

export default Users;
