

//////////////////////////////////////////////////////
var React = require('react');
var ReactDOM = require('react-dom');
var AtomReact = require("atom-react");
var _ = require("lodash");
//////////////////////////////////////////////////////



var TodoTextInput = require('./TodoTextInput.react');

var cx = require('classnames');


var TodoItem = AtomReact.createPureClass("TodoItem",{

  propTypes: {
    todoCursor: AtomReact.PropTypes.isCursor
  },

  todo: function() {
    return this.props.todoCursor.get();
  },

  /**
   * @return {object}
   */
  render: function() {
    var todo = this.todo();

    var input;
    if (todo.isEditing) {
      input =
          <TodoTextInput
              className="edit"
              onSave={this._onSave}
              value={todo.text}
              textInputCursor={this.props.todoCursor.follow("editionText")}
          />;
    }

    return (
        <li
            className={cx({
              'completed': todo.completed,
              'editing': todo.isEditing
            })}
            key={todo.id}>
          <div className="view">
            <input
                className="toggle"
                type="checkbox"
                checked={todo.completed}
                onChange={this._onToggleComplete}
            />
            <label onDoubleClick={this._onDoubleClick}>
            {todo.text}
            </label>
            <button className="destroy" onClick={this._onDestroyClick} />
          </div>
        {input}
        </li>
    );
  },

  _onToggleComplete: function() {
    this.actions.toggleComplete(this.todo());
  },

  _onDoubleClick: function() {
    var cursor = this.props.todoCursor;
    this.transact(function() {
      cursor.follow("isEditing").set(true);
      cursor.follow("editionText").set(cursor.get().text);
    }.bind(this));
  },

  _onSave: function(text) {
    this.transact(function() {
      this.actions.updateText(this.todo().id,text);
      this.props.todoCursor.follow("isEditing").unset();
      this.props.todoCursor.follow("editionText").unset();
    }.bind(this));
  },

  _onDestroyClick: function() {
    this.actions.destroy(this.todo().id);
  }

});

module.exports = TodoItem;
