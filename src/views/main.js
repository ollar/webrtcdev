const HistoryCollection = require('../collections/history');

const Sync = require('../sync');

class MainView extends Backbone.View {
  constructor(options) {
    super(options);

    this.collection = new HistoryCollection();

    this.sendForm = this.$('#sendForm');
    this.messagesList = this.$('#messagesList');
    this.textinput = this.$('#data');
    this.button = this.$('#send');

    this.listenTo(Sync, 'message', (data) => {
      return this.collection.add(data);
    }, this);
    this.listenTo(Sync, 'channelOpen', () => {
      this.textinput.removeAttr('disabled');
      this.button.removeAttr('disabled');
    }, this);
    this.listenTo(Sync, 'channelClosed', () => {
      this.textinput.attr('disabled', 'disabled');
      this.button.attr('disabled', 'disabled');
    }, this);
    this.listenTo(this.collection, 'add', this.onMessage, this);
  }

  get events() {
    return {
      'submit #sendForm': 'submitForm',
    };
  }

  submitForm(e) {
    e.preventDefault();

    Sync.trigger('sendMessage', this.textinput.val());
    this.sendForm[0].reset();
  }

  onMessage(messageModel) {
    const message = $('<li />', {
      'class': (messageModel.get('outgoing') ? 'outgoing' : ''),
      text: messageModel.get('data'),
    });

    return this.messagesList.append(message);
  }
}

module.exports = MainView;
