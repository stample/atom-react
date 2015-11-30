
var React = require('react');
var AtomReact = require("atom-react");
var _ = require("lodash");
var TodoActions = require('./events/TodoActions');



var TodoApp = require('./components/TodoApp.react');

var TodoStore = require("./stores/TodoStore");

var context = AtomReact.newContext();

context.setMountConfig(TodoApp, document.getElementById('todoapp'));

context.debugMode();

context.setActions(TodoActions);


context.addStore(TodoStore);


context.actions.start();







