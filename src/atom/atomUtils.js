'use strict';

var update = require("react-addons-update");
var _ = require("lodash");


var Preconditions = require("../utils/preconditions");



/**
 * Transforms (["a","b","c"],objectAtPath) into {a: {b: {c: objectAtPath } } }
 * @param path
 * @param objectAtPath
 * @return {*}
 */
function pathToObjectPath(path,objectAtPath) {
    if ( path.length == 0 ) {
        return objectAtPath;
    } else {
        var head = path[0];
        var tail = path.slice(1);
        var result = {};
        result[head] = pathToObjectPath(tail,objectAtPath);
        return result;
    }
}

// TODO this can probably be a lot optimized
function getPathValue(object,path) {
    if ( path.length == 0 ) {
        return object;
    }
    else if ( !Preconditions.hasValue(object) ) {
        return undefined;
    }
    else {
        var head = path[0];
        var tail = path.slice(1);
        var headValue = object[head];
        return getPathValue(headValue,tail);
    }
}
exports.getPathValue = getPathValue;


// Permits to know which part of a path already exists in the object
function findDefinedPath(object,path,accu) {
    accu = accu || [];
    if ( path.length === 0 ) {
        return accu;
    }
    else {
        var head = path[0];
        var tail = path.slice(1);
        var headValue = object[head];
        if ( Preconditions.hasValue(headValue) ) {
            accu.push(head);
            return findDefinedPath(headValue,tail,accu);
        } else {
            return accu;
        }
    }
}


// TODO this can probably be a lot optimized
function setPathValue(object,path,value) {
    try {
        var existingValue = getPathValue(object,path);
        if ( existingValue === value ) {
            return object;
        }
        var definedPath = findDefinedPath(object,path);
        var undefinedPath = path.slice(definedPath.length,path.length);
        if ( undefinedPath.length === 0 ) {
            var updateFunction = pathToObjectPath(definedPath,{$set: value});
            return update(object, updateFunction);
        } else {
            var undefinedObjectPath = pathToObjectPath(undefinedPath,value);
            var updateFunction = pathToObjectPath(definedPath,{$merge: undefinedObjectPath});
            return update(object, updateFunction);
        }
    } catch (error) {
        // TODO we should probably create the missing path instead of raising the exception ?
        throw new Error(
            "Can't set value " + JSON.stringify(value) +
                " at path " + JSON.stringify(path) +
                " because of error: " + error.message
        );
    }
}
exports.setPathValue = setPathValue;



// Merge but also deduplicate keys present in both states
function getAllKeys(state1,state2) {
    return _.union(
        _.keys(state1),
        _.keys(state2)
    );
}

function groupKeysByEquality(state1,state2) {
    var allKeys = getAllKeys(state1, state2);
    return _.groupBy(allKeys, function(key) {
        return state1[key] === state2[key];
    });
}

var EmptyArrayConstant = []

// TODO this algorithm is far from being perfect and must be reworked totally to make the tests pass
function getPathDiffRecursive(state1,state2,currentPath,returnCurrentPathIfAllKeysAreDifferent) {
    var oneIsUndefined = (!!state1 !== !!state2);
    if ( state1 === state2 || oneIsUndefined) {
        return [currentPath];
    }
    var groupedKeys = groupKeysByEquality(state1,state2);
    var equalKeys = groupedKeys.true || EmptyArrayConstant;
    var notEqualKeys = groupedKeys.false || EmptyArrayConstant;
    var totalKeys = equalKeys.length + notEqualKeys.length;
    var allKeysAreEqual = (equalKeys.length === totalKeys);
    var allKeysAreDifferent = (notEqualKeys.length === totalKeys);
    if ( allKeysAreEqual ) {
        return [currentPath];
    }

    // TODO not sure of this implementation! it needs to be tested better!
    // What we want is to return the current path if next level diffs have different keys (somehow we want to "factorise" the diffs for readability)
    if ( allKeysAreDifferent && returnCurrentPathIfAllKeysAreDifferent ) {
        return [currentPath];
    }
    var doReturnCurrentPathIfAllKeysAreDifferent = (allKeysAreDifferent);


    var pathsList = notEqualKeys.map(function(key) {
        var newCurrentPath = currentPath.concat([key]);
        var pathsForKey = getPathDiffRecursive(state1[key],state2[key],newCurrentPath,doReturnCurrentPathIfAllKeysAreDifferent);
        return _.flatten(pathsForKey);
    });
    return pathsList;
}

function getPathDiff(state1,state2) {
    return getPathDiffRecursive(state1,state2,[]);
}
exports.getPathDiff = getPathDiff;

