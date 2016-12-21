class MyMessageEvent extends MessageEvent {
  constructor(type, data, outgoing) {
    super(type, data);
    this.outgoing = outgoing;
  }
}

module.exports = MyMessageEvent;
