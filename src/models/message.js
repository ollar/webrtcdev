var AModel = require('ampersand-state');

var MessageModel = AModel.extend({
  props: {
    type: 'string',
    data: 'string',
    __fileDescription: 'object',
    outgoing: 'boolean',
  },
});

module.exports = MessageModel;
