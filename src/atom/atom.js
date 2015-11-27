'use strict';

var React = require("react");
var DeepFreeze = require("../utils/deepFreeze");


var AtomUtils = require("./atomUtils");
var AtomCursor = require("./atomCursor");



var CanGroupLogs = console.group && console.groupEnd;

var NOOP = function noop() { } // Convenient but probably not performant: TODO ?

/**
 * Creates an Atom
 * It contains an immutable state that is never modified directly, but can be swapped to a new immutable state
 * @param options
 * @constructor
 */
var Atom = function Atom(options) {
    this.state = options.initialState || {};
    this.beforeTransactionCommit = options.beforeTransactionCommit || NOOP;
    this.afterTransactionCommit = options.afterTransactionCommit || NOOP;
    this.currentTransactionState = undefined;
    if ( process.env.NODE_ENV !== "production" ) {
        DeepFreeze(this.state);
    }
};


/**
 * Change the state reference hold in this Atom
 * @param newState
 */
Atom.prototype.swap = function(newState) {
    if ( !this.isInTransaction() ) {
        throw new Error("It is forbidden to swap the atom outside of a transaction");
    }
    if ( this.locked ) {
        throw new Error("Atom is locked because: "+this.lockReason);
    }
    if ( process.env.NODE_ENV !== "production" ) {
        DeepFreeze(newState);
    }
    this.currentTransactionState = newState;
};


Atom.prototype.isInTransaction = function() {
    return !!this.currentTransactionState;
};
Atom.prototype.openTransaction = function() {
    this.currentTransactionState = this.state;
    this.currentTransactionDate = Date.now();
};
Atom.prototype.commitTransaction = function() {
    var transactionState = this.currentTransactionState;
    this.currentTransactionState = undefined
    this.state = transactionState;
    var duration = Date.now() - this.currentTransactionDate;
    this.currentTransactionDate = undefined;
    var transactionData = {
        duration: duration
    };
    return transactionData;
};
Atom.prototype.rollbackTransaction = function() {
    this.currentTransactionState = undefined
};



Atom.prototype.lock = function(lockReason) {
    this.locked = true;
    this.lockReason = lockReason
};
Atom.prototype.unlock = function() {
    this.locked = false;
    this.lockReason = undefined
};

Atom.prototype.doWithLock = function(lockReason,task) {
    try {
        this.lock(lockReason);
        task();
    } finally {
        this.unlock();
    }
};



Atom.prototype.transact = function(tasks) {
    // TODO do we need to implement more complex transaction propagation rules than joining the existing transaction?
    if ( this.isInTransaction() ) {
        tasks();
    }
    else {
        if ( CanGroupLogs ) {
            console.group("Atom transaction");
        }
        this.openTransaction();
        try {
            tasks();
            // "lock" these values before calling the callbacks
            var previousState = this.state;
            this.beforeTransactionCommit(this.currentTransactionState,previousState);
            var transactionData = this.commitTransaction();
            try {
                this.afterTransactionCommit(this.state,previousState,transactionData);
            } catch(error) {
                console.error("Error in 'afterTransactionCommit' callback. The transaction will still be commited -> "+error.message);
                console.error( error.stack ? error.stack : error );
            }
        } catch (error) {
            console.error("Error during atom transaction! rollback!");
            this.rollbackTransaction();
            // This is a shitty solution but at least we are sure that error will always be logged correctly!
            setTimeout(function() {
                throw error;
            },0);
        } finally {
            if ( CanGroupLogs ) {
                console.groupEnd();
            }
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
 * @param options
 * @return {AtomCursor}
 */
Atom.prototype.cursor = function(options) {
    return new AtomCursor(this,[],options);
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