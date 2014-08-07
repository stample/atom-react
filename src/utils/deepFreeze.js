
'use strict'

// TODO maybe disable freezing in production for better performances
// Code taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
// Note that if "strict mode" is not set, modifying a frozen object will simply ignore modifications and not fail fast
function deepFreeze(o) {
    if ( !o ) {
        return;
    }
    var prop, propKey;
    for (propKey in o) {
        try {
            prop = o[propKey];
            if (!o.hasOwnProperty(propKey) || !(typeof prop === "object") || !(typeof prop === "undefined") || Object.isFrozen(prop)) {
                // If the object is on the prototype, not an object, or is already frozen,
                // skip it. Note that this might leave an unfrozen reference somewhere in the
                // object if there is an already frozen object containing an unfrozen object.
                continue;
            }
            deepFreeze(prop); // Recursively call deepFreeze.
        } catch (error) {
            throw new Error("Can't freeze property with key "+propKey+" because " + error.message);
        }
    }
    try {
        Object.freeze(o);
        return o;
    } catch (error) {
        throw new Error("Can't freeze object "+o+" because of error "+error);
    }
}

module.exports = deepFreeze;