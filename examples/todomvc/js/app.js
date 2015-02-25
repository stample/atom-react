
var React = require('react');
var AtomReact = require("atom-react");
var _ = require("lodash");
var TodoEvents = require('./events/TodoEvents');



var TodoApp = require('./components/TodoApp.react');

var TodoStore = require("./stores/TodoStore");

var context = AtomReact.newContext();

context.setMountConfig(TodoApp, document.getElementById('todoapp'));

context.debugMode();

context.addStore(TodoStore);


context.startWithEvent(TodoEvents.start());





