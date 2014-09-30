'use strict';


var Preconditions = require("./utils/preconditions");

var AtomReactEvent = function(eventName,eventData) {
    Preconditions.checkHasValue(eventName,"Event name is mandatory");
    this.name = eventName;
    this.data = eventData;
    this.timestamp = new Date().getTime();
};
module.exports = AtomReactEvent;