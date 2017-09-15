var User = Backbone.View.extend({
  tagName: 'li',

  render: function() {
    this.el.innerHTML = this.model.get('id');
    this.el.style.color = this.model.get('colour');
    if (this.model.get('typing')) {
      this.el.classList.add('typing');
    } else {
      this.el.classList.remove('typing');
    }
    return this;
  }
});

export default User;
