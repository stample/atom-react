
var TodoConstants = require('../constants/TodoConstants');


var Event = require("atom-react").Event;


module.exports = function(publish) {

  return {
    start: function(initialState) {
      publish(new Event(TodoConstants.TODO_START,{
        initialState: initialState
      }));
    },

    create: function(text) {
      publish(new Event(TodoConstants.TODO_CREATE,{
        text: text
      }));
    },

    updateText: function(id, text) {
      publish(new Event(TodoConstants.TODO_UPDATE_TEXT,{
        id: id,
        text: text
      }));
    },

    toggleComplete: function(todo) {
      var id = todo.id;
      if (todo.completed) {
        publish(new Event(TodoConstants.TODO_UNDO_COMPLETE,{
          id: id
        }));
      }
      else {
        publish(new Event(TodoConstants.TODO_COMPLETE,{
          id: id
        }));
      }
    },

    toggleCompleteAll: function() {
      publish(new Event(TodoConstants.TODO_TOGGLE_COMPLETE_ALL,undefined));
    },

    destroy: function(id) {
      publish(new Event(TodoConstants.TODO_DESTROY,{
        id: id
      }));
    },

    destroyCompleted: function() {
      publish(new Event(TodoConstants.TODO_DESTROY_COMPLETED,undefined));
    }

  }


};

