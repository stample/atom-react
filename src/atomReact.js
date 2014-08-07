'use strict';

var React = require("react/addons");
var ReactLink = require("react/lib/ReactLink");
var Preconditions = require("./utils/preconditions");

var Atom = require("./atom/atom");
var AtomReactContext = require("./atomReactContext");
var AtomReactStore = require("./atomReactStore");
var AtomCursor = require("./atom/atomCursor");
var AtomAsyncValue = require("./atom/atomAsyncUtils").AtomAsyncValue;



function isSameValueOrCursor(value,nextValue) {
    if ( value instanceof AtomCursor && nextValue instanceof AtomCursor ) {
        return value.getOrElse(undefined) === nextValue.getOrElse(undefined);
    } else {
        return value === nextValue;
    }
}

function shallowEqualProps(props, nextProps) {
    if (props === nextProps) {
        return true;
    }
    if ( props.length !== nextProps.length ) {
        return false;
    }

    var key;
    for (key in props) {
        var equalValues = isSameValueOrCursor(props[key],nextProps[key]);
        if ( !equalValues ) {
            return false;
        }
    }
    return true;
}



var AtomReactPureRenderMixin = {
    shouldComponentUpdate: function(nextProps, nextState) {
        if ( nextState ) {
            throw new Error("AtomReact components should not have any local state! " + this.getDisplayName());
        }
        var shouldUpdate = !shallowEqualProps(this.props, nextProps);
        if ( shouldUpdate ) {
            console.debug("["+this.getDisplayName()+"] should update!")
        }
        return shouldUpdate;
    }
};


var AtomReactLinkedCursorMixin = {
    linkCursor: function(cursor) {
        return new ReactLink(
            cursor.getOrElse(undefined),
            function setCursorNewValue(value) {
                cursor.set(value);
            }
        );
    }
};


var AtomReactContextAccessorMixin = {
    contextTypes: {
        router: React.PropTypes.object.isRequired,
        atom: React.PropTypes.instanceOf(Atom).isRequired,
        publishEvent: React.PropTypes.func.isRequired
    },
    router: function() {
        return this.context.router;
    },
    publish: function() {
        this.context.publishEvent.apply(this,arguments);
    }
};



function addMixins(config) {
    config.mixins = config.mixins || [];
    config.mixins.push(AtomReactPureRenderMixin);
    config.mixins.push(AtomReactLinkedCursorMixin);
    config.mixins.push(AtomReactContextAccessorMixin);
}



function createPureClass(name,config) {
    Preconditions.checkHasValue(name,"The name attribute is mandatory: this helps to debug compoennts!")
    Preconditions.checkHasValue(config,"The config attribute is mandatory!")
    Preconditions.checkCondition(!config.initialState,"Pure components should not have any local state, and thus no initialState attribute");
    Preconditions.checkCondition(!config.shouldComponentUpdate,"shouldComponentUpdate is already implemented for you");
    Preconditions.checkCondition(config.render,"render() must be implemented");
    Preconditions.checkCondition(config.propTypes,"propTypes must be provided: this is the component interface!");

    // Unfortunately, the displayName can't be infered from the variable name during JSX compilation :(
    // See http://facebook.github.io/react/docs/component-specs.html#displayname
    config.displayName = name;
    // Because React's displayName is not easy to obtain from a mixin (???)
    config.getDisplayName = function() { return name };


    addMixins(config);

    return React.createClass(config);
}
exports.createPureClass = createPureClass;

var PropTypes = {
    isCursor: React.PropTypes.instanceOf(AtomCursor).isRequired,
    isAsyncValue: React.PropTypes.instanceOf(AtomAsyncValue).isRequired
};
exports.PropTypes = PropTypes;




function newContext() {
    return new AtomReactContext();
}
exports.newContext = newContext;


function newStore(name,description) {
    return new AtomReactStore(name,description);
}
exports.newStore = newStore;

