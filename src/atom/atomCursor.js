'use strict';

var _ = require("lodash");

var Preconditions = require("../utils/preconditions");

var AtomUtils = require("./atomUtils");
var AtomAsyncUtils = require("./atomAsyncUtils");


var AtomCursor = function AtomCursor(atom,atomPath) {
    this.atom = atom;
    this.atomPath = atomPath;
    this.atomValue = atom.getPathValue(atomPath); // TODO this probably can be optimized in some cases when navigating from a previous cursor
};


function ensureIsArray(maybeArray,message) {
    if ( !(maybeArray instanceof Array) ) {
        throw new Error("Not an array: " + maybeArray + " -> " + message);
    }
}


AtomCursor.prototype.exists = function() {
    return Preconditions.hasValue(this.atomValue);
};

AtomCursor.prototype.get = function() {
    Preconditions.checkCondition(this.exists(),"No value for path " + this.atomPath + " -> maybe you want to use " +
        "cursor.getOrElse(undefined) instead if the value you look for may be absent when the cursor is created ");
    return this.atomValue;
};

AtomCursor.prototype.getOrElse = function(fallback) {
    return this.atomValue || fallback;
};


AtomCursor.prototype.set = function(value) {
    this.atom.setPathValue(this.atomPath,value);
};
AtomCursor.prototype.unset = function() {
    this.atom.unsetPathValue(this.atomPath);
};


AtomCursor.prototype.push = function(value) {
    var list = this.atomValue || [];
    ensureIsArray(list,"can only call push on an array. "+this.atomPath);
    var newList = list.concat([value]);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.without = function(value) {
    var list = this.atomValue;
    ensureIsArray(list,"can only call without on an array. "+this.atomPath);
    var newList = _.without(list,value);
    this.atom.setPathValue(this.atomPath,newList);
};


AtomCursor.prototype.update = function(updateFunction) {
    if ( !Preconditions.hasValue(this.atomValue) ) throw new Error("you can't update an unexisting value. " + this.atomPath);
    var valueToSet = updateFunction(this.atomValue);
    this.atom.setPathValue(this.atomPath,valueToSet);
};
AtomCursor.prototype.plus = function(number) {
    this.update(function(value) { return value+number });
};
AtomCursor.prototype.minus = function(number) {
    this.update(function(value) { return value-number });
};

AtomCursor.prototype.follow = function() {
    var pathToFollow = AtomUtils.convenientArgumentsToArray(arguments);
    var newPath = this.atomPath.concat(pathToFollow);
    return new AtomCursor(this.atom,newPath);
};

AtomCursor.prototype.list = function() {
    var list = this.atomValue;
    ensureIsArray(list,"can only call list on an array. "+this.atomPath);
    return list.map(function(item,index) {
        return this.follow(index);
    }.bind(this));
};

AtomCursor.prototype.asyncSuccess = function() {
    if ( Preconditions.hasValue(this.atomValue) && this.atomValue.isSuccess() ) {
        return this.asyncSuccessUnsafe();
    } else {
        throw new Error("You can't follow an async value that is not successfully loaded.  Path="+this.atomPath);
    }
};
// Will follow the async value even if there is no async value or a loading/error async value
AtomCursor.prototype.asyncSuccessUnsafe = function() {
    return this.follow("value");
};

AtomCursor.prototype.asyncList = function() {
    return AtomAsyncUtils.getPathAsyncValueListCursors(this.atom,this.atomPath);
};



// Useful to manage a single promise
AtomCursor.prototype.setAsyncValue = function(promise,logCompletion) {
    return AtomAsyncUtils.setPathAsyncValue(this.atom,this.atomPath,promise,logCompletion);
};
// Useful to load multiple promises in an array, mostly to handle pagination of long lists...
AtomCursor.prototype.pushAsyncValue = function(promise,logCompletion) {
    return AtomAsyncUtils.pushPathAsyncValue(this.atom,this.atomPath,promise,logCompletion);
};



module.exports = AtomCursor;