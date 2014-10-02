'use strict';

var _ = require("lodash");

var Preconditions = require("../utils/preconditions");
var ArgumentsOrArray = require("../utils/argumentsOrArray");

var AtomUtils = require("./atomUtils");
var AtomAsyncUtils = require("./atomAsyncUtils");


var AtomCursor = function AtomCursor(atom,atomPath) {
    this.atom = atom;
    this.atomPath = atomPath;
};


function ensureIsArray(maybeArray,message) {
    if ( !(maybeArray instanceof Array) ) {
        throw new Error("Not an array: " + maybeArray + " -> " + message);
    }
}

AtomCursor.prototype.value = function() {
    return this.atom.getPathValue(this.atomPath);
};

AtomCursor.prototype.exists = function() {
    return Preconditions.hasValue(this.value());
};

AtomCursor.prototype.get = function() {
    var value = this.value();
    Preconditions.checkHasValue(value,"No value for path " + this.atomPath + " -> maybe you want to use " +
        "cursor.getOrElse(undefined) instead if the value you look for may be absent when the cursor is created ");
    return value;
};

AtomCursor.prototype.getOrElse = function(fallback) {
    var value = this.value();
    return Preconditions.hasValue(value) ? value : fallback;
};


// Will return false if the set/unset operation did not change anything
AtomCursor.prototype.set = function(value) {
    var stateBefore = this.atom.get();
    this.atom.setPathValue(this.atomPath,value);
    var stateAfter = this.atom.get();
    return (stateBefore !== stateAfter);
};
AtomCursor.prototype.unset = function() {
    var stateBefore = this.atom.get();
    this.atom.unsetPathValue(this.atomPath);
    var stateAfter = this.atom.get();
    return (stateBefore !== stateAfter);
};


AtomCursor.prototype.push = function(value) {
    var list = this.getOrElse([]);
    ensureIsArray(list,"can only call push on an array. "+this.atomPath);
    var newList = list.concat([value]);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.unshift = function(value) {
    var list = this.getOrElse([]);
    ensureIsArray(list,"can only call unshift on an array. "+this.atomPath);
    var newList = [value].concat(list);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.without = function(value) {
    var list = this.value();
    ensureIsArray(list,"can only call without on an array. "+this.atomPath);
    var newList = _.without(list,value);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.filter = function(value) {
    var list = this.value();
    ensureIsArray(list,"can only call filter on an array. "+this.atomPath);
    var newList = _.filter(list,value);
    this.atom.setPathValue(this.atomPath,newList);
};

AtomCursor.prototype.update = function(updateFunction) {
    var value = this.value();
    if ( !Preconditions.hasValue(value) ) throw new Error("you can't update an unexisting value. " + this.atomPath);
    var valueToSet = updateFunction(value);
    this.atom.setPathValue(this.atomPath,valueToSet);
};
AtomCursor.prototype.plus = function(number) {
    this.update(function(value) { return value+number });
};
AtomCursor.prototype.minus = function(number) {
    this.update(function(value) { return value-number });
};

AtomCursor.prototype.follow = function() {
    var pathToFollow = ArgumentsOrArray(arguments);
    var newPath = this.atomPath.concat(pathToFollow);
    return new AtomCursor(this.atom,newPath);
};

AtomCursor.prototype.list = function() {
    var list = this.value();
    ensureIsArray(list,"can only call list on an array. "+this.atomPath);
    return list.map(function(item,index) {
        return this.follow(index);
    }.bind(this));
};

AtomCursor.prototype.asyncSuccess = function() {
    var value = this.value();
    if ( Preconditions.hasValue(value) && value.isSuccess() ) {
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