'use strict';

var React = require("react/addons");
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
    else {
        var head = path[0];
        var tail = path.slice(1);
        var headValue = object[head];
        if ( Preconditions.hasValue(headValue) ) {
            return getPathValue(headValue,tail);
        } else {
            return undefined;
        }
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
            return React.addons.update(object, updateFunction);
        } else {
            var undefinedObjectPath = pathToObjectPath(undefinedPath,value);
            var updateFunction = pathToObjectPath(definedPath,{$merge: undefinedObjectPath});
            return React.addons.update(object, updateFunction);
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




function getKeyDiff(state1,state2) {
    if ( state1 === state2 ) {
        return [];
    }
    else {
        // Merge and deduplicate keys
        var keysToCompare = _.union(
            _.keys(state1),
            _.keys(state2)
        );
        // If one is defined and not the other we can directly return the union
        var oneIsUndefined = (!!state1 !== !!state2);
        if ( oneIsUndefined ) {
            return keysToCompare;
        }
        // Else we return only modified keys by reference equality check between the 2 objects
        else {
            return keysToCompare.filter(function(key) {
                return state1[key] !== state2[key];
            });
        }
    }
}
exports.getKeyDiff = getKeyDiff;


function getPathDiffRecursive(state1,state2,currentPath) {
    /*
     console.error("-------------------------------");
     console.debug("currentPath",currentPath);
     console.debug("state 1",state1);
     console.debug("state 2",state2);
     */
    var oneIsUndefined = (!!state1 !== !!state2);
    if ( state1 === state2 || oneIsUndefined) {
        return [currentPath];
    }
    var keyDiff = getKeyDiff(state1,state2);
    if ( keyDiff.length === 0 ) {
        return [currentPath];
    }
    //console.debug("key diff",keyDiff);
    var pathsList = keyDiff.map(function(key) {
        var newCurrentPath = currentPath.concat([key]);
        var pathsForKey = getPathDiffRecursive(state1[key],state2[key],newCurrentPath);
        //console.debug(currentPath,"paths for key",key,"=",pathsForKey);
        return pathsForKey;
    });
    var paths = _.flatten(pathsList,true);
    // console.debug(currentPath,"paths = ",paths);
    return paths;
}
function getPathDiff(state1,state2) {
    return getPathDiffRecursive(state1,state2,[]);
}
exports.getPathDiff = getPathDiff;



// this allows both syntax styles for passing path: follow("x","y") or follow(["x","y"])
function convenientArgumentsToArray(methodArguments) {
    if ( methodArguments.length == 1 && methodArguments[0] instanceof Array ) {
        return methodArguments[0];
    } else {
        return Array.prototype.slice.call(methodArguments, 0);
    }
}
exports.convenientArgumentsToArray = convenientArgumentsToArray;
