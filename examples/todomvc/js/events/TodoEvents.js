
var TodoConstants = require('../constants/TodoConstants');


var Event = require("atom-react").Event;


module.exports = {

  start: function(initialState) {
    return new Event(TodoConstants.TODO_START,{
      initialState: initialState
    });
  },

  create: function(text) {
    return new Event(TodoConstants.TODO_CREATE,{
      text: text
    });
  },

  updateText: function(id, text) {
    return new Event(TodoConstants.TODO_UPDATE_TEXT,{
      id: id,
      text: text
    });
  },

  toggleComplete: function(todo) {
    var id = todo.id;
    if (todo.completed) {
      return new Event(TodoConstants.TODO_UNDO_COMPLETE,{
        id: id
      });
    }
    else {
      return new Event(TodoConstants.TODO_COMPLETE,{
        id: id
      });
    }
  },

  toggleCompleteAll: function() {
    return new Event(TodoConstants.TODO_TOGGLE_COMPLETE_ALL,undefined);
  },

  destroy: function(id) {
    return new Event(TodoConstants.TODO_DESTROY,{
      id: id
    });
  },

  destroyCompleted: function() {
    return new Event(TodoConstants.TODO_DESTROY_COMPLETED,undefined);
  }

};

