
'use strict'

function deepFreeze(o) {
    var isObject = (typeof o === "object" );
    var isNull = (o === null);
    var isAlreadyFrozenObject = (isObject && !isNull ? Object.isFrozen(o) : false);
    var isUndefined = (typeof o === "undefined");
    if ( !isObject || isNull || isAlreadyFrozenObject || isUndefined ) {
        return o;
    }
    var prop, propKey;
    for (propKey in o) {
        try {
            if ( o.hasOwnProperty(propKey) ) {
                prop = o[propKey];
                deepFreeze(prop);
            }
        } catch (error) {
            throw new Error("Can't freeze property with key "+propKey+" and value "+prop+" because:\n " + error.message);
        }
    }
    try {
        return Object.freeze(o);
    } catch (error) {
        throw new Error("Can't freeze object "+o+" because of error:\n"+error);
    }
}

module.exports = deepFreeze;