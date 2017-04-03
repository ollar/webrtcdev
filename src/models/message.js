var AModel = require('ampersand-state');

var MessageModel = AModel.extend({
  props: {
    type: 'string',
    data: 'string',
    outgoing: 'boolean',
  },
});

module.exports = MessageModel;
