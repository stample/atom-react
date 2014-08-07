
var AtomUtils = require("../src/atom/atomUtils");

describe("AtomUtils.getPathValue", function() {

    var objectUnderTest = {
        attribute: {
            attribute2: {
                test: "toto"
            },
            attribute3: 3
        }
    };

    it("should be able to retrieve an existing primitive value for a given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute3"])).toBe(3);
    });

    it("should be able to retrieve an existing object value for a given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute2"])).toBe(objectUnderTest.attribute.attribute2);
    });

    it("should be able to retrieve undefined if the value does not exist for the given path", function() {
        expect(AtomUtils.getPathValue(objectUnderTest,["attribute","attribute4"])).toBe(undefined);
    });

});