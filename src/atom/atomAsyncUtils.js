'use strict';


var Q = require("q");
var _ = require("lodash");


var AtomAsyncValueStates = {
    LOADING: "LOADING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR"
};

exports.AtomAsyncValueStates = AtomAsyncValueStates;



var AtomAsyncValue = function AtomAsyncValue(state) {
    this.state = state || AtomAsyncValueStates.LOADING;
};
AtomAsyncValue.prototype.isLoading = function() {
    return this.state === AtomAsyncValueStates.LOADING;
};
AtomAsyncValue.prototype.isSuccess = function() {
    return this.state === AtomAsyncValueStates.SUCCESS;
};
AtomAsyncValue.prototype.isError = function() {
    return this.state === AtomAsyncValueStates.ERROR;
};

AtomAsyncValue.prototype.toSuccess = function(value) {
    var async = new AtomAsyncValue(AtomAsyncValueStates.SUCCESS);
    async.value = value;
    return async;
};
AtomAsyncValue.prototype.asSuccess = function() {
    if ( !this.isSuccess() ) throw new Error("Can't convert async value as success becauuse its state is " + this.state);
    return this.value;
};

AtomAsyncValue.prototype.toError = function(error) {
    var async = new AtomAsyncValue(AtomAsyncValueStates.ERROR);
    async.error = error;
    return async;
};
AtomAsyncValue.prototype.asError = function() {
    if ( !this.isError() ) throw new Error("Can't convert async value as error becauuse its state is " + this.state);
    return this.error;
};
exports.AtomAsyncValue = AtomAsyncValue;




// This returns a promise of the swapped result if the swap was successful
function setupAsyncValueSwapping(atom,path,asyncValue,promise,logCompletion) {
    var deferred = Q.defer();
    Q(promise)
        .then(function asyncCompletionSuccess(data) {
            var swapped = atom.compareAndSwapPathValue(path,asyncValue,asyncValue.toSuccess(data));
            if ( logCompletion ) {
                console.debug("Async value completion",path,"Swap success=",swapped);
            }
            if ( swapped ) {
                deferred.resolve(data);
            } else {
                deferred.reject(new Error("Async value completion for path "+path+" but swap=false"));
            }
        })
        .fail(function asyncCompletionError(error) {
            var swapped = atom.compareAndSwapPathValue(path,asyncValue,asyncValue.toError(error));
            if ( logCompletion ) {
                console.error("Async value completion error",path,"Swap success=",swapped);
                console.error(error.stack ? error.stack : error);
            }
            deferred.reject(error);
        })
        .done();

    return deferred.promise;
};




function setPathAsyncValue(atom,path,promise,logCompletion) {
    var asyncValue = new AtomAsyncValue();
    atom.setPathValue(path,asyncValue);
    return setupAsyncValueSwapping(atom,path,asyncValue,promise,logCompletion);
};
exports.setPathAsyncValue = setPathAsyncValue;


function setPathResolvedAsyncValue(atom,path,resolvedValue) {
    var asyncValue = new AtomAsyncValue().toSuccess(resolvedValue);
    atom.setPathValue(path,asyncValue);
};
exports.setPathResolvedAsyncValue = setPathResolvedAsyncValue;



function pushPathAsyncValue(atom,listPath,promise,logCompletion) {
    var list = atom.getPathValue(listPath) || [];
    if ( list instanceof Array ) {
        var asyncValueIndex = list.length;
        var asyncValuePath = listPath.concat([asyncValueIndex]);
        var asyncValue = new AtomAsyncValue();
        var newList = list.concat(asyncValue);
        atom.setPathValue(listPath,newList);
        return setupAsyncValueSwapping(atom,asyncValuePath,asyncValue,promise,logCompletion);
    } else {
        throw new Error("Can't push async value in list because list is " + JSON.stringify(list));
    }
};
exports.pushPathAsyncValue = pushPathAsyncValue;



function followValues(cursor) {
    if ( !cursor.exists() ) {
        return [];
    }
    if ( cursor.isInstanceOf(Array) ) {
        return cursor.list();
    }
    else {
        return [cursor];
    }
}

function getAsyncValueCursors(asyncValueCursor) {
    if ( asyncValueCursor.get().isSuccess() ) {
        return followValues(asyncValueCursor.follow("value"));
    }
    else {
        return [];
    }
}


function getPathAsyncValueListCursors(cursor) {
    if ( !cursor.exists() ) {
        return [];
    }
    else if ( cursor.isInstanceOf(AtomAsyncValue) ) {
        return getAsyncValueCursors(cursor);
    }
    else if ( cursor.isInstanceOf(Array) ) {
        var cursorsArray = cursor.list().map(function(asyncValueCursor) {
            return getAsyncValueCursors(asyncValueCursor);
        });
        return _.flatten(cursorsArray);
    }
    else {
        throw new Error("getPathAsyncValueListCursors can only be called on an array, not a "+asyncValueList+" for path="+cursor.atomPath);
    }
}
exports.getPathAsyncValueListCursors = getPathAsyncValueListCursors;



