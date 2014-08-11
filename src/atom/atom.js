'use strict';

var React = require("react/addons");
var DeepFreeze = require("../utils/deepFreeze");
var Preconditions = require("../utils/preconditions");


var AtomUtils = require("./atomUtils");
var AtomCursor = require("./atomCursor");


function noop() { } // Convenient but probably not performant: TODO ?

/**
 * Creates an Atom
 * It contains an immutable state that is never modified directly, but can be swapped to a new immutable state
 * @param options
 * @constructor
 */
var Atom = function Atom(options) {
    this.state = options.initialState || {};
    this.onChange = options.onChange || noop;
    this.reactToChange = options.reactToChange || noop;
    this.currentTransactionState = undefined;
    DeepFreeze(this.state);
};


/**
 * Change the state reference hold in this Atom
 * @param newState
 */
Atom.prototype.swap = function(newState) {
    if ( !this.isInTransaction() ) {
        throw new Error("It is forbidden to swap the atom outside of a transaction");
    }
    DeepFreeze(newState);
    var previousState = this.currentTransactionState;
    this.currentTransactionState = newState;

    // TODO should be allow cascading reactions? this could lead to cyclic effects :(
    if ( !this.currentlyReactingToChanges ) {
        this.currentlyReactingToChanges = true;
        try {
            this.reactToChange(previousState);
        }
            // TODO do something more clever?
        finally {
            this.currentlyReactingToChanges = false;
        }
    }
    if ( !this.isInTransaction() ) {
        this.onChange();
    }
};


Atom.prototype.isInTransaction = function() {
    return !!this.currentTransactionState;
};
Atom.prototype.openTransaction = function() {
    this.currentTransactionState = this.state;
};
Atom.prototype.commitTransaction = function() {
    var transactionState = this.currentTransactionState;
    this.currentTransactionState = undefined
    this.state = transactionState;
    this.onChange();
};
Atom.prototype.rollbackTransaction = function() {
    this.currentTransactionState = undefined
};


Atom.prototype.transact = function(tasks) {
    // TODO do we need to implement more complex transaction propagation rules than joining the existing transaction?
    if ( this.isInTransaction() ) {
        tasks();
    }
    else {
        this.openTransaction();
        try {
            tasks();
            this.commitTransaction();
        } catch (error) {
            console.error("Error during atom transaction!",error.message,this);
            console.error(error.stack);
            this.rollbackTransaction();
        }
    }
};






/**
 * Get the current state of the Atom
 * @return the Atom state
 */
Atom.prototype.get = function() {
    // If we are inside a transaction, we can read the transaction state (read your writes)
    return this.currentTransactionState || this.state;
};

/**
 * Get a cursor,, that permits to focus on a given path of the Atom
 * @param path (defaults to atom root cursor)
 * @return {AtomCursor}
 */
Atom.prototype.cursor = function() {
    return new AtomCursor(this,[]);
};

/**
 * Change the value at a given path of the atom
 * @param path
 * @param value
 */
Atom.prototype.setPathValue = function(path,value) {
    var self = this;
    this.transact(function() {
        var newState = AtomUtils.setPathValue(self.get(),path,value);
        self.swap(newState);
    });
};

Atom.prototype.unsetPathValue = function(path) {
    var self = this;
    this.transact(function() {
        var newState = AtomUtils.setPathValue(self.get(),path,undefined);
        self.swap(newState);
    })

};

/**
 * Get the value at a given path of the atom
 * @param path
 * @return value
 */
Atom.prototype.getPathValue = function(path) {
    return AtomUtils.getPathValue(this.get(),path);
};

/**
 * Compare and swap a value at a given path of the atom
 * @param path
 * @param expectedValue
 * @param newValue
 * @return true if the CAS operation was successful
 */
Atom.prototype.compareAndSwapPathValue = function(path,expectedValue,newValue) {
    var actualValue = this.getPathValue(path);
    if ( actualValue === expectedValue ) {
        this.setPathValue(path,newValue);
        return true;
    }
    return false;
};



module.exports = Atom;