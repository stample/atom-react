
//////////////////////////////////////////////////////
var React = require('react');
var ReactDOM = require('react-dom');
var AtomReact = require("atom-react");
var _ = require("lodash");
//////////////////////////////////////////////////////


var TodoItem = require('./TodoItem.react');


var MainSection = AtomReact.createPureClass("MainSection",{

  propTypes: {
    todoListCursor: AtomReact.PropTypes.isCursor
  },

  render: function() {
    var todoCursors = this.props.todoListCursor.list();

    if ( todoCursors.length < 1) {
      return null;
    }

    var todoComponents = todoCursors.map(function(todoCursor) {
      return <TodoItem key={todoCursor.get().id} todoCursor={todoCursor}/>
    });

    var allCompleted = _.every(todoCursors,function(todoCursor) {
      return todoCursor.get().completed;
    });

    return (
        <section id="main">
          <input
              id="toggle-all"
              type="checkbox"
              onChange={this._onToggleCompleteAll}
              checked={allCompleted ? 'checked' : ''}
          />
          <label htmlFor="toggle-all">Mark all as complete</label>
          <ul id="todo-list">{todoComponents}</ul>
        </section>
    );
  },

  _onToggleCompleteAll: function() {
    this.actions.toggleCompleteAll();
  }

});

module.exports = MainSection;
