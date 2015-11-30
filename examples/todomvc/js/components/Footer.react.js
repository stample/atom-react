
//////////////////////////////////////////////////////
var React = require('react');
var ReactDOM = require('react-dom');
var AtomReact = require("atom-react");
var _ = require("lodash");
//////////////////////////////////////////////////////




var Footer = AtomReact.createPureClass("Footer",{

  propTypes: {
    allTodos: React.PropTypes.array.isRequired
  },

  render: function() {
    var allTodos = this.props.allTodos;
    var total = allTodos.length;

    if (total === 0) {
      return null;
    }

    var completed = 0;
    for (var key in allTodos) {
      if (allTodos[key].completed) {
        completed++;
      }
    }

    var itemsLeft = total - completed;
    var itemsLeftPhrase = itemsLeft === 1 ? ' item ' : ' items ';
    itemsLeftPhrase += 'left';

    var clearCompletedButton;
    if (completed) {
      clearCompletedButton =
          <button
              id="clear-completed"
              onClick={this._onClearCompletedClick}>
            Clear completed ({completed})
          </button>;
    }

    return (
        <footer id="footer">
          <span id="todo-count">
            <strong>
            {itemsLeft}
            </strong>
          {itemsLeftPhrase}
          </span>
        {clearCompletedButton}
        </footer>
    );
  },

  _onClearCompletedClick: function() {
    this.actions.destroyCompleted();
  }

});

module.exports = Footer;
