
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