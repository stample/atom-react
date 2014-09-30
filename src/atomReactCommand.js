'use strict';


var Preconditions = require("./utils/preconditions");

var AtomReactCommand = function(commandName,commandData) {
    Preconditions.checkHasValue(commandName,"Command name is mandatory");
    this.name = commandName;
    this.data = commandData;
    this.timestamp = new Date().getTime();
};
module.exports = AtomReactCommand;