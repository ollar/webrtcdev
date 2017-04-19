var User = Backbone.View.extend({
  tagName: 'li',

  render: function() {
    this.el.innerHTML = this.model.get('id');
    this.el.style.color = this.model.get('colour');
    return this;
  }
});

module.exports = User;
