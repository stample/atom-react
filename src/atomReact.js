'use strict';

var React = require("react");
var ReactLink = require("react/lib/ReactLink");
var Preconditions = require("./utils/preconditions");
var DeepFreeze = require("./utils/deepFreeze");
var Immutables = require("./utils/immutables");
var ArgumentsOrArray = require("./utils/argumentsOrArray");

var Atom = require("./atom/atom");
var AtomReactContext = require("./atomReactContext");
var AtomReactStore = require("./atomReactStore");
var AtomCursor = require("./atom/atomCursor");
var AtomAsyncValue = require("./atom/atomAsyncUtils").AtomAsyncValue;

var AtomReactEvent = require("./atomReactEvent");
var AtomReactCommand = require("./atomReactCommand");





function isSameValueOrCursor(value,nextValue) {
    if ( value instanceof AtomCursor && nextValue instanceof AtomCursor ) {
        return value.creationTimeValue === nextValue.creationTimeValue;
    } else {
        return value === nextValue;
    }
}

// This is the "shallowEqual" from React, a little bit modified to handle cursors
function shallowEqual(objA, objB) {
    if (objA === objB) {
        return true;
    }
    var key;
    // Test for A's keys different from B.
    for (key in objA) {
        if ( objA.hasOwnProperty(key) && (!objB.hasOwnProperty(key) || !isSameValueOrCursor(objA[key],objB[key])) ) {
            return false;
        }
    }
    // Test for B's keys missing from A.
    for (key in objB) {
        if ( objB.hasOwnProperty(key) && !objA.hasOwnProperty(key) ) {
            return false;
        }
    }
    return true;
}


var WithPureRenderMixin = {
    shouldComponentUpdate: function(nextProps, nextState) {
        return !shallowEqual(this.props,nextProps) || !shallowEqual(this.state,nextState);
    }
};
exports.WithPureRenderMixin = WithPureRenderMixin;


var WithActionsMixin = {
    contextTypes: {
        atomReactContext: React.PropTypes.object.isRequired
    },
    componentWillMount: function() {
        this.actions = this.context.atomReactContext.actions;
    }
};
exports.WithActionsMixin = WithActionsMixin;


var WithCursorLinkingMixin = {
    linkCursor: function(cursor) {
        return new ReactLink(
            cursor.getOrElse(undefined),
            function setCursorNewValue(value) {
                cursor.set(value);
            }
        );
    }
};
exports.WithCursorLinkingMixin = WithCursorLinkingMixin;


var WithTransactMixin = {
    contextTypes: {
        atom: React.PropTypes.instanceOf(Atom).isRequired
    },
    transact: function(tasks) {
        this.context.atom.transact(tasks);
    }
};
exports.WithTransactMixin = WithTransactMixin;


var WithEventPublisherMixin = {
    contextTypes: {
        publishEvents: React.PropTypes.func.isRequired
    },
    publish: function() {
        var array = ArgumentsOrArray(arguments);
        this.context.publishEvents(array);
    }
};
exports.WithEventPublisherMixin = WithEventPublisherMixin;

var WithCommandPublisherMixin = {
    contextTypes: {
        publishCommand: React.PropTypes.func.isRequired
    },
    publishCommand: function(command) {
        console.error("publishing commands is deprecated: use this.actions.actionName(...) instead");
        this.context.publishCommand(command);
    }
};
exports.WithCommandPublisherMixin = WithCommandPublisherMixin;


var WithEventListenerMixin = {
    contextTypes: {
        addEventListener: React.PropTypes.func.isRequired,
        removeEventListener: React.PropTypes.func.isRequired
    },
    addEventListener: function(listener) {
        this.context.addEventListener(listener);
    },
    removeEventListener: function(listener) {
        this.context.removeEventListener(listener);
    },
    componentDidMount: function() {
        if ( this.listenToEvents ) {
            this.context.addEventListener(this.listenToEvents);
        }
    },
    componentWillUnmount: function() {
        if ( this.listenToEvents ) {
            this.context.removeEventListener(this.listenToEvents);
        }
    }
};
exports.WithEventListenerMixin = WithEventListenerMixin;




function getAllCursors(props) {
    return Object.keys(props)
        .map(function(key) {
            return props[key];
        })
        .filter(function(value) {
            return value instanceof AtomCursor;
        });
}

// As during the whole render, the cursor values are not supposed
// to change we memoize them to the value they had at creation time
function memoizeCursor(cursor) {
    cursor.memoizeToCreationTimeValue();
}
// But we unmemoize the cursors outside the render to provide read-your-writes semantics in callbacks like
// componentDidMount, componentDidUpdate, timers, intervals etc...
function unmemoizeCursor(cursor) {
    cursor.unmemoize();
}
// This memoizes the cursors just before the render method is called.
// Cursors are then unmemoized to provide read-your-writes semantics
var WithCursorsMemoizationMixin = {
    componentWillMount: function() {
        getAllCursors(this.props).forEach(memoizeCursor);
    },
    componentDidMount: function() {
        getAllCursors(this.props).forEach(unmemoizeCursor);
    },
    componentWillUpdate: function(nextProps) {
        getAllCursors(nextProps).forEach(memoizeCursor);
    },
    componentDidUpdate: function() {
        getAllCursors(this.props).forEach(unmemoizeCursor);
    }
};
exports.WithCursorsMemoizationMixin = WithCursorsMemoizationMixin;




function addMixins(config) {
    config.mixins = config.mixins || [];
    config.mixins.push(WithCursorsMemoizationMixin);
    config.mixins.push(WithPureRenderMixin);
    config.mixins.push(WithCursorLinkingMixin);
    config.mixins.push(WithTransactMixin);
    config.mixins.push(WithCommandPublisherMixin);
    config.mixins.push(WithEventPublisherMixin);
    config.mixins.push(WithEventListenerMixin);
    config.mixins.push(WithActionsMixin);
}



function createPureClass(name,component) {
    Preconditions.checkHasValue(name,"The name attribute is mandatory: this helps to debug compoennts!")
    Preconditions.checkHasValue(component,"The config attribute is mandatory!")
    Preconditions.checkCondition(!component.shouldComponentUpdate,"shouldComponentUpdate is already implemented for you");
    Preconditions.checkCondition(component.render,"render() must be implemented");
    Preconditions.checkCondition(component.propTypes,"propTypes must be provided: this is the component interface!");

    // Unfortunately, the displayName can't be infered from the variable name during JSX compilation :(
    // See http://facebook.github.io/react/docs/component-specs.html#displayname
    component.displayName = name;
    // Because React's displayName is not easy to obtain from a mixin (???)
    component.getDisplayName = function() { return name };


    addMixins(component);

    return React.createClass(component);
}
exports.createPureClass = createPureClass;

var PropTypes = {
    isCursor: React.PropTypes.instanceOf(AtomCursor).isRequired,
    isOptionalCursor: React.PropTypes.instanceOf(AtomCursor),
    isAsyncValue: React.PropTypes.instanceOf(AtomAsyncValue).isRequired
};
exports.PropTypes = PropTypes;




function newContext() {
    return new AtomReactContext();
}
exports.newContext = newContext;


function newStore(name,description) {
    return new AtomReactStore.AtomReactStore(name,description);
}
exports.newStore = newStore;

exports.Preconditions = Preconditions;
exports.DeepFreeze = DeepFreeze;




exports.Event = AtomReactEvent;
exports.Command = AtomReactCommand;


exports.EmptyArray = Immutables.EmptyArray;
exports.EmptyObject = Immutables.EmptyObject;