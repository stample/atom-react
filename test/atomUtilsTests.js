
var AtomUtils = require("../src/atom/atomUtils");

describe("AtomUtils.getPathValue", function() {

    var objectUnderTest = {
        attribute: {
            attribute2: {
                test: "toto"
            },
            attribute3: 3,
            attribute4: {
                test2: {
                    nested: "blabla"
                }
            }
        }
    };

    it("should be able to retrieve an existing int value for a given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute3"]))
            .toBe(3);
    });

    it("should be able to retrieve an existing string value for a given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute4","test2","nested"]))
            .toBe("blabla");
    });

    it("should be able to retrieve an existing object value for a given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute2"]))
            .toBe(objectUnderTest.attribute.attribute2);
    });

    it("should be able to retrieve undefined if the value does not exist for the given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute2","attribute3","attribute4"]))
            .toBe(undefined);
    });

});


describe("AtomUtils.setPathValue", function() {



    it("should be able to set an int attribute on an empty object", function() {
        var result = AtomUtils.setPathValue({},["attribute"],3);
        expect(result.attribute).toBe(3);
    });

    it("should be able to set a string attribute on an empty object", function() {
        var result = AtomUtils.setPathValue({},["attribute"],"value");
        expect(result.attribute).toBe("value");
    });

    it("should be able to set an object attribute on an empty object", function() {
        var objectAttribute = { toto: "test" };
        var result = AtomUtils.setPathValue({},["attribute"],objectAttribute);
        expect(result.attribute).toBe(objectAttribute);
    });

    it("should be able to set an attribute on a deeply nested object that does not exist", function() {
        var deeplyNestedObject = {
            x1: 123,
            x2: {
                y1: {},
                y2: {
                    z1: {},
                    z2: "toto"
                }
            }
        };
        var result = AtomUtils.setPathValue(deeplyNestedObject,["x2","y2","z1","beta","attribute"],"valueToSet");
        expect(result.x2.y2.z1.beta.attribute).toBe("valueToSet");
        expect(result.x2.y2.z2).toBe("toto");
        expect(result.x2.y1).toBe(deeplyNestedObject.x2.y1);
        expect(result.x1).toBe(123);
    });

    it("should be able to set an attribute on a deeply nested object that already exists", function() {
        var deeplyNestedObject = {
            x1: 123,
            x2: {
                y1: {},
                y2: {
                    z1: {},
                    z2: "toto"
                }
            }
        };
        var result = AtomUtils.setPathValue(deeplyNestedObject,["x2","y2","z1"],"valueToSet");
        expect(result.x2.y2.z1).toBe("valueToSet");
        expect(result.x2.y2.z2).toBe("toto");
        expect(result.x2.y1).toBe(deeplyNestedObject.x2.y1);
        expect(result.x1).toBe(123);
    });


    it("should be able to set a deep and unexisting attribute on an object", function() {
        var empty = {x1: {y1: "existingValue"}};
        var result = AtomUtils.setPathValue(empty,["x1","y2","z1","attribute"],"valueToSet");
        expect(result.x1.y2.z1.attribute).toBe("valueToSet");
    });


    it("should return the input object unmodified when setting an int to its already existing value", function() {
        var object = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {}
            }
        };
        var result = AtomUtils.setPathValue(object,["root","myint"],3);
        expect(result).toBe(object);
    });

    it("should return the input object unmodified when setting a string to its already existing value", function() {
        var object = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {}
            }
        };
        var result = AtomUtils.setPathValue(object,["root","mystring"],"test");
        expect(result).toBe(object);
    });

    it("should return the input object unmodified when setting a string to its already existing value", function() {
        var object = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {}
            }
        };
        var result = AtomUtils.setPathValue(object,["root","myobject"],object.root.myobject);
        expect(result).toBe(object);
    });



});





describe("AtomUtils.getPathDiff", function() {


    it("should return path of a modified path", function() {
        // Given
        var state1 = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {
                    myObjectString: "string"
                }
            }
        };
        var state2 = AtomUtils.setPathValue(state1,["root","myobject","myObjectString"],"newString");
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(1);
        expect(paths).toContain(["root","myobject","myObjectString"]);
    });

    it("should not return path of a modified path setted with same value", function() {
        // Given
        var state1 = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {
                    myObjectString: "string"
                }
            }
        };
        var state2 = AtomUtils.setPathValue(state1,["root","myobject","myObjectString"],"newString");
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(1);
        expect(paths).toContain(["root","myobject","myObjectString"]);
    });

    it("should return path for newly created attribute", function() {
        // Given
        var state1 = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {
                    myObjectString: "string"
                }
            }
        };
        var state2 = AtomUtils.setPathValue(state1,["root","myobject","myObjectString2"],"newString");
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(1);
        expect(paths).toContain(["root","myobject","myObjectString2"]);
    });


    // TODO how to make this one pass? change impl
    it("should return root path for objects created dynamically", function() {
        // Given
        var state1 = { myObject : {} };
        var state2 = AtomUtils.setPathValue(state1,["myObject","att1","att2","att3"],"value");
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(1);
        expect(paths).toContain(["myObject"]);
    });


    it("should return paths for newly created attributes, modified attributes and deleted attributes", function() {
        // Given
        var state1 = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {
                    myObjectString: "string"
                },
                mybool: true
            }
        };
        var state2 = state1;
        state2 = AtomUtils.setPathValue(state2,["root","mybool"],false);
        state2 = AtomUtils.setPathValue(state2,["root","mystring"],undefined);
        state2 = AtomUtils.setPathValue(state2,["root","myint"],3); // This one should not appear in the list!
        state2 = AtomUtils.setPathValue(state2,["root","myobject","newStringAttr"],"test");
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(3);
        expect(paths).toContain(["root","mybool"]);
        expect(paths).toContain(["root","mystring"]);
        expect(paths).toContain(["root","myobject","newStringAttr"]);
    });


    it("should return path of overriden object", function() {
        // Given
        var state1 = {
            root: {
                myint: 3,
                mystring: "test",
                myobject: {
                    attr1: "string",
                    attr2: "string2"
                },
                mybool: true
            }
        };
        var state2 = state1;
        state2 = AtomUtils.setPathValue(state2,["root","myobject"],
            {
                attr3: "value3",
                attr4: "value4",
                attr5: { attr6: 6 }
            }
        );
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(1);
        expect(paths).toContain(["root","myobject","newStringAttr"]);
    });


    it("should return path of overriden object", function() {
        // Given
        var state1 = {root: { myObject: { aaa: "x" } } };
        var state2 = state1;
        state2 = AtomUtils.setPathValue(state2,["root","myObject"],{bbb: "y",ccc: "z"});
        // When
        var paths = AtomUtils.getPathDiff(state1,state2);
        // Then
        expect(paths.length).toBe(1);
        expect(paths).toContain(["myObject"]);
    });





});
