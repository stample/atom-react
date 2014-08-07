'use strict';

exports.checkCondition = function(condition,message) {
    if (!condition) {
        throw new Error("Illegal condition exception. Message="+(message?message:"N/A") );
    }
};

// http://stackoverflow.com/questions/858181/how-to-check-a-not-defined-variable-in-javascript
function hasValue(variable) {
    var defined = (typeof variable != 'undefined');
    var notNull = !(variable == null);
    return defined && notNull;
}
exports.hasValue = hasValue;


exports.checkMandatoryParameter = function(variable,message) {
    if ( !hasValue(variable) ) {
        var errorMsg = (message ? message : "Mandatory parameter has no value :(");
        throw new Error(errorMsg);
    } else {
        return variable; // Just to make it more fluent
    }
};

exports.checkHasValue = function(variable,message) {
    if ( !hasValue(variable) ) {
        var errorMsg = (message ? message : "Variable has no value while it should!");
        throw new Error(errorMsg);
    } else {
        return variable; // Just to make it more fluent
    }
};