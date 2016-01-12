'use strict';


var Preconditions = require("./utils/preconditions");

var AtomReactEvent = function(eventName,eventData) {
    Preconditions.checkHasValue(eventName,"Event name/type is mandatory");
    this.name = eventName;
    this.type = eventName;
    this.data = eventData;
    this.payload = eventData;
    this.timestamp = new Date().getTime();
};
module.exports = AtomReactEvent;