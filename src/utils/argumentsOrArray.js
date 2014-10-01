

// this allows both syntax styles for passing path: method("x","y") or method(["x","y"])
function convenientArgumentsToArray(methodArguments) {
    if ( methodArguments.length == 1 && methodArguments[0] instanceof Array ) {
        return methodArguments[0];
    } else {
        return Array.prototype.slice.call(methodArguments, 0);
    }
}
module.exports = convenientArgumentsToArray;