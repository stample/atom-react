

//////////////////////////////////////////////////////
var React = require('react');
var AtomReact = require("atom-react");
var _ = require("lodash");
var TodoEvents = require('../events/TodoEvents');
//////////////////////////////////////////////////////

var Footer = require('./Footer.react');
var Header = require('./Header.react');
var MainSection = require('./MainSection.react');



var TodoApp = AtomReact.createPureClass("TodoApp",{

  propTypes: {
    appStateCursor: AtomReact.PropTypes.isCursor
  },

  render: function() {
    var todoStoreCursor = this.props.appStateCursor.follow("todoStore");
    var allTodos = todoStoreCursor.get().todoList;
    return (
        <div>
          <Header textInputCursor={todoStoreCursor.follow("textInput")}/>
          <MainSection todoListCursor={todoStoreCursor.follow("todoList")}/>
          <Footer allTodos={allTodos} />
        </div>
    );
  }

});

module.exports = TodoApp;
