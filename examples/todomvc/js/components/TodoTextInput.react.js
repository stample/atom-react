
//////////////////////////////////////////////////////
var React = require('react');
var ReactDOM = require('react-dom');
var AtomReact = require("atom-react");
var _ = require("lodash");
//////////////////////////////////////////////////////


var ENTER_KEY_CODE = 13;

var TodoTextInput = AtomReact.createPureClass("TodoTextInput",{

  propTypes: {
    className: React.PropTypes.string,
    id: React.PropTypes.string,
    placeholder: React.PropTypes.string,
    onSave: React.PropTypes.func.isRequired,
    textInputCursor: AtomReact.PropTypes.isCursor
  },

  render: function() {
    return (
        <input
            className={this.props.className}
            id={this.props.id}
            placeholder={this.props.placeholder}
            onBlur={this._save}
            onKeyDown={this._onKeyDown}
            valueLink={this.linkCursor(this.props.textInputCursor)}
            autoFocus={true}
        />
    );
  },

  _save: function() {
    var text = this.props.textInputCursor.getOrElse("");
    this.props.onSave(text);
  },

  _onKeyDown: function(event) {
    if (event.keyCode === ENTER_KEY_CODE) {
      this._save();
    }
  }

});

module.exports = TodoTextInput;
