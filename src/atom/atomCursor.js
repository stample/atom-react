'use strict';

var _ = require("lodash");

var Preconditions = require("../utils/preconditions");
var Immutables = require("../utils/immutables");
var ArgumentsOrArray = require("../utils/argumentsOrArray");

var AtomUtils = require("./atomUtils");
var AtomAsyncUtils = require("./atomAsyncUtils");



function ensureIsArray(maybeArray,message) {
    if ( !(maybeArray instanceof Array) ) {
        throw new Error("Not an array: " + maybeArray + " -> " + message);
    }
}




////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// CURSOR PRIMITIVES
///////////////////////


var AtomCursor = function AtomCursor(atom,atomPath, options) {
    var options = options || Immutables.EmptyObject;
    this.atom = atom;
    this.atomPath = atomPath;

    // A dynamic cursor never precomputes or memoize a value, it always use up to date data
    this.dynamic = !!options.dynamic;
    this.memoized = !!options.memoized;


    Preconditions.checkCondition( !(this.dynamic && this.memoized) ,"A cursor can't be dynamic and memoized at the same time!");
    if ( this.dynamic ) {
        // Nothing to do
    }
    else {
        // The value of the cursor when it was created.
        // It can be forced as an optimization if the cursor creator knows the creation time value
        this.creationTimeValue = options.hasOwnProperty("creationTimeValue") ? options.creationTimeValue : this.getFreshValue();
        if ( this.memoized ) {
            this.memoizedValue = this.creationTimeValue;
        }
    }
};


AtomCursor.prototype.memoize = function() {
    Preconditions.checkCondition(!this.dynamic,"You can't memoize a dynamic cursor");
    var value = this.value();
    this.memoized = true;
    this.memoizedValue = value;
    return this;
};
AtomCursor.prototype.memoizeToCreationTimeValue = function() {
    Preconditions.checkCondition(!this.dynamic,"You can't memoize a dynamic cursor");
    this.memoized = true;
    this.memoizedValue = this.creationTimeValue;
    return this;
};
AtomCursor.prototype.unmemoize = function() {
    this.memoized = false;
    this.memoizedValue = undefined;
    return this;
};


// TODO this should be removed
AtomCursor.prototype.transact = function(tasks) {
    this.atom.transact(tasks);
};

AtomCursor.prototype.getFreshValue = function() {
    return this.atom.getPathValue(this.atomPath);
};

AtomCursor.prototype.value = function() {
    return this.memoized ? this.memoizedValue : this.getFreshValue();
};

AtomCursor.prototype.follow = function() {
    var pathToFollow = ArgumentsOrArray(arguments);
    var newPath = this.atomPath.concat(pathToFollow);
    return new AtomCursor(this.atom,newPath, {
        // If current cursor is memoized or dynamic, that configuration will propagate...
        dynamic: this.dynamic,
        memoized: this.memoized,
        // Minor optimization
        creationTimeValue: this.dynamic ? undefined : AtomUtils.getPathValue(this.value(),pathToFollow)
    });
};







////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// CURSOR API
///////////////////////

AtomCursor.prototype.getCreationTimeValue = function() {
    Preconditions.checkCondition(!this.dynamic,"A dynamic cursor does not have any creationTimeValue available");
    return this.creationTimeValue;
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

AtomCursor.prototype.getOrEmptyArray = function() {
    return this.getOrElse(Immutables.EmptyArray);
};
AtomCursor.prototype.getOrEmptyObject = function() {
    return this.getOrElse(Immutables.EmptyObject);
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
    var list = this.getOrEmptyArray();
    ensureIsArray(list,"can only call push on an array. "+this.atomPath);
    var newList = list.concat([value]);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.unshift = function(value) {
    var list = this.getOrEmptyArray();
    ensureIsArray(list,"can only call unshift on an array. "+this.atomPath);
    var newList = [value].concat(list);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.without = function(value) {
    var list = this.getOrEmptyArray();
    ensureIsArray(list,"can only call without on an array. "+this.atomPath);
    var newList = _.without(list,value);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.filter = function(value) {
    var list = this.getOrEmptyArray();
    ensureIsArray(list,"can only call filter on an array. "+this.atomPath);
    var newList = _.filter(list,value);
    this.atom.setPathValue(this.atomPath,newList);
};
AtomCursor.prototype.reduce = function(reducer,event) {
    this.update(function(value) {
       return reducer(value,event);
    });
};
AtomCursor.prototype.update = function(updateFunction,initialValueFallback) {
    var value = this.value() || initialValueFallback;
    var valueToSet = updateFunction(value);
    this.atom.setPathValue(this.atomPath,valueToSet);
};
AtomCursor.prototype.plus = function(number) {
    this.update(function(value) { return value+number },0);
};
AtomCursor.prototype.minus = function(number) {
    this.update(function(value) { return value-number },0);
};
AtomCursor.prototype.toggle = function(initialValueFallback) {
    this.update(function(value) { return !value },!!initialValueFallback);
};

AtomCursor.prototype.isInstanceOf = function(clazz) {
    return this.exists() && this.get() instanceof clazz;
};

AtomCursor.prototype.list = function() {
    var list = this.getOrEmptyArray();
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
    return AtomAsyncUtils.getPathAsyncValueListCursors(this);
};



// Useful to manage a single promise
AtomCursor.prototype.setAsyncValue = function(promise,logCompletion) {
    return AtomAsyncUtils.setPathAsyncValue(this.atom,this.atomPath,promise,logCompletion);
};
// Useful to load multiple promises in an array, mostly to handle pagination of long lists...
AtomCursor.prototype.pushAsyncValue = function(promise,logCompletion) {
    return AtomAsyncUtils.pushPathAsyncValue(this.atom,this.atomPath,promise,logCompletion);
};
AtomCursor.prototype.setAsyncSuccess = function(success) {
    var asyncSuccess = new AtomAsyncUtils.AtomAsyncValue().toSuccess(success);
    this.set(asyncSuccess);
};
AtomCursor.prototype.setAsyncError = function(error) {
    var asyncError = new AtomAsyncUtils.AtomAsyncValue().toError(error);
    this.set(asyncError);
};




module.exports = AtomCursor;