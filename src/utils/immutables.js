"use strict";


var DeepFreeze = require("./deepFreeze");

// Create singleton empty array/object, like in Scala
// See http://stackoverflow.com/questions/30730020/reactjs-how-to-use-an-immutable-empty-array-or-object
exports.EmptyArray = DeepFreeze([]);
exports.EmptyObject = DeepFreeze({});

