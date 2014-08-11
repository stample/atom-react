
var DeepFreeze = require("../src/utils/deepFreeze");

describe("DeepFreeze", function() {


    it("should not fail on undefined", function() {
        var input = undefined;
        var output = DeepFreeze(input);
        expect(output).toBe(input);
    });

    it("should not fail on null", function() {
        var input = null;
        var output = DeepFreeze(input);
        expect(output).toBe(input);
    });

    it("should not fail on int", function() {
        var input = 3;
        var output = DeepFreeze(input);
        expect(output).toBe(input);
    });

    it("should not fail on string", function() {
        var input = "test";
        var output = DeepFreeze(input);
        expect(output).toBe(input);
    });

    it("should not fail on object", function() {
        var input = {test: "x"};
        var output = DeepFreeze(input);
        expect(output).toBe(input);
    });


    it("should ignore updates without strict mode (unfortunately not fail fast by default :s)", function() {
        var input = { property: "value" };
        var output = DeepFreeze(input);
        output.property = "value2"
        expect(output).toBe(input);
        expect(output.property).toBe("value");
    });

    it("should fail on updates with strict mode", function() {
        'use strict'
        var input = { property: "value" };
        var output = DeepFreeze(input);
        expect(function() {
            output.property = "value2";
        }).toThrow();
    });

    it("should freeze deeply nested object", function() {
        var input = {
            x1: 123,
            x2: {
                y1: {},
                y2: {
                    z1: {},
                    z2: "toto"
                }
            }
        };
        var output = DeepFreeze(input);
        output.x2.y2 = "new Value"
        expect(output).toBe(input);
        expect(output.x2.y2.z2).toBe("toto");
    });

    it("should freeze array of primitives", function() {
        var input = [1,2,3]
        var output = DeepFreeze(input);
        output.push(4);
        expect(output).toBe(input);
        expect(output.length).toBe(3);
    });

    it("should freeze array of object", function() {
        var input = [{x: "val"},{x: "val2"}]
        var output = DeepFreeze(input);
        output[0].x = "new val"
        expect(output).toBe(input);
        expect(output[0].x).toBe("val");
    });

});