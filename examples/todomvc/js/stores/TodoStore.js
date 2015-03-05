
var AtomReact = require("atom-react");
var _ = require("lodash");

var TodoConstants = require('../constants/TodoConstants');


function completedTodoPredicate(todo) {
  return todo.completed;
}

function randomId() {
  return (+new Date() + Math.floor(Math.random() * 999999)).toString(36);
}


module.exports = AtomReact.newStore("todoStore", {

  handleEvent: function (event) {

    switch (event.name) {
      case TodoConstants.TODO_START:
        this.todosCursor().set(event.data.initialState || []);
        break;


      case TodoConstants.TODO_CREATE:
        var text = event.data.text.trim();
        if (text !== '') {
          this.todosCursor().push({
            id: randomId(),
            completed: false,
            text: text
          });
        }
        break;

      case TodoConstants.TODO_TOGGLE_COMPLETE_ALL:
        if ( this.areAllCompleted() ) {
          this.updateAll(function(todoCursor) {
            todoCursor.follow("completed").set(false);
          });
        }
        else {
          this.updateAll(function(todoCursor) {
            todoCursor.follow("completed").set(true);
          });
        }
        break;

      case TodoConstants.TODO_UNDO_COMPLETE:
        this.todoCursorById(event.data.id).follow("completed").set(false);
        break;

      case TodoConstants.TODO_COMPLETE:
        this.todoCursorById(event.data.id).follow("completed").set(true);
        break;

      case TodoConstants.TODO_UPDATE_TEXT:
        var text = event.data.text.trim();
        if (text !== '') {
          this.todoCursorById(event.data.id).follow("text").set(text)
        }
        break;

      case TodoConstants.TODO_DESTROY:
        var id = event.data.id;
        var todo = this.todoById(id);
        this.todosCursor().without(todo);
        break;

      case TodoConstants.TODO_DESTROY_COMPLETED:
        var completedTodos = _.filter(this.todos(),completedTodoPredicate);
        completedTodos.forEach(function(todo) {
          this.todosCursor().without(todo);
        }.bind(this));
        break;

      default:
      // no op
    }

  },

  todosCursor: function() {
    return this.cursor.follow("todoList");
  },

  todos: function() {
    return this.todosCursor().get();
  },

  todoCursors: function() {
    return this.todosCursor().list();
  },

  todoCursorById: function(id) {
    return _.find(this.todoCursors(),function(todoCursor) {
      return todoCursor.get().id === id;
    })
  },

  todoById: function(id) {
    return this.todoCursorById(id).get();
  },

  areAllCompleted: function() {
    return _.every(this.todos(),completedTodoPredicate)
  },

  updateAll: function(updateFunction) {
    this.cursor.follow("todoList").list().forEach(function(todoCursor) {
      updateFunction(todoCursor);
    });
  }

});
