'use strict';

var _ = require("lodash");

var React = require("react");
var ReactDOM = require("react-dom");
var Preconditions = require("./utils/preconditions");

var Atom = require("./atom/atom");
var AtomCursor = require("./atom/atomCursor");
var AtomUtils = require("./atom/atomUtils");

var AtomReactEvent = require("./atomReactEvent");


// For render the cursors are memoized
var AtomCursorMemoizedOption = {memoized: true};


var AtomReactContext = function AtomReactContext() {
    this.stores = [];
    this.actions = undefined;
    this.reactContext = {};
    this.memoizedReactContext = undefined;
    this.eventListeners = [];
    this.errorListeners = [];
    this.verboseStateChangeLog = false;
    this.lightStateChangeLog = false;
    this.beforeRenderCallback = undefined;
    this.beforeRenderCallback = undefined;
    this.logPublishedEvents = false;
    this.logTransactions = false;

    this.atom = new Atom({
        beforeTransactionCommit: this.beforeTransactionCommit.bind(this),
        afterTransactionCommit: this.afterTransactionCommit.bind(this)
    });

};
module.exports = AtomReactContext;


AtomReactContext.prototype.debugMode = function() {
    this.setVerboseStateChangeLog(true);
    this.setLightStateChangeLog(false);
    this.setLogPublishedEvents(true);
    this.setLogTransactions(true);
};


AtomReactContext.prototype.setVerboseStateChangeLog = function(bool) {
    this.verboseStateChangeLog = bool;
};
AtomReactContext.prototype.setLightStateChangeLog = function(bool) {
    this.lightStateChangeLog = bool;
};
AtomReactContext.prototype.setLogPublishedEvents = function(bool) {
    this.logPublishedEvents = bool;
};
AtomReactContext.prototype.setLogTransactions = function(bool) {
    this.logTransactions = bool;
};



AtomReactContext.prototype.setActions = function(actionsFactory) {
    var publishFn = function publish(event) {
        this.publishEvents(event);
    }.bind(this);
    var getContextFn = function getContext() {
        return this.reactContext;
    }.bind(this);
    var getStateFn = function getState() {
        return this.getState();
    }.bind(this);
    this.actions = actionsFactory({
        publish: publishFn,
        getContext: getContextFn,
        getState: getStateFn
    });
};

AtomReactContext.prototype.addStore = function(store) {
    if ( !this.actions ) {
        throw new Error("Before adding stores you must add the actions!");
    }
    if ( store.description.reactToChange ) {
        console.warn("Store [",store.nameOrPath,"] should rather not implement 'reactToChange' because it will be removed in the future");
    }
    if ( store.description.init ) {
        console.warn("Store [",store.nameOrPath,"] should rather not implement 'init' because it will be removed in the future");
    }
    this.stores.push({
        store: store,
        storeManager: store.createStoreManager(this)
    });
};

AtomReactContext.prototype.getState = function() {
    return this.atom.get();
};


AtomReactContext.prototype.setReactContext = function(context,forceFullUpdate) {
    this.reactContext = context;
    this.memoizedReactContext = undefined;
    this.memoizedChildContextProviderFactory = undefined;
    if ( forceFullUpdate ) {
        // See https://github.com/facebook/react/issues/3298
        setTimeout(function() {
            this.unmount();
            this.renderCurrentAtomState();
        }.bind(this),0);
    }
};

AtomReactContext.prototype.updateReactContext = function(updateFunction) {
    var newContext = updateFunction(this.reactContext);
    this.setReactContext(newContext,true);
};


AtomReactContext.prototype.unmount = function() {
    ReactDOM.unmountComponentAtNode(this.mountConfig.domNode);
};

AtomReactContext.prototype.getMemoizedReactContextHolder = function(atomToRender) {
    Preconditions.checkHasValue(atomToRender);
    if ( !this.memoizedReactContext ) {
        // TODO pass the AtomReact context (this) directly to react ! it will be more flexible
        var libContext = {
            atomReactContext: this,

            // TODO the atomReactContext should be enough: remove the rest
            atom: atomToRender,
            publishEvent: this.publishEvent.bind(this),
            publishEvents: this.publishEvents.bind(this),
            addEventListener: this.addEventListener.bind(this),
            removeEventListener: this.removeEventListener.bind(this)
        };
        this.memoizedReactContext = _.assign({},this.reactContext,libContext);
        this.memoizedChildContextProviderFactory = ChildContextProviderFactory(this.memoizedReactContext);
        console.debug("React context built: ",this.memoizedReactContext);
    }
    return {
        context: this.memoizedReactContext,
        childContextProviderFactory: this.memoizedChildContextProviderFactory
    };
};





AtomReactContext.prototype.addEventListener = function(listener) {
    this.eventListeners.push(listener);
};
AtomReactContext.prototype.removeEventListener = function(listener) {
    var index = this.eventListeners.indexOf(listener);
    if (index > -1) {
        this.eventListeners.splice(index, 1);
    } else {
        throw new Error("listener not found");
    }
};


AtomReactContext.prototype.addErrorListener = function(listener) {
    this.errorListeners.push(listener);
};
AtomReactContext.prototype.removeErrorListener = function(listener) {
    var index = this.errorListeners.indexOf(listener);
    if (index > -1) {
        this.errorListeners.splice(index, 1);
    } else {
        throw new Error("listener not found");
    }
};
AtomReactContext.prototype.notifyErrorListeners = function(error,message) {
  this.errorListeners.forEach(function (listener) {
    try {
      listener({error: error, message: message || "N/A"});
    } catch (listenerError) {
      console.error("notifyErrorListeners error", listenerError, error);
    }
  });
};




AtomReactContext.prototype.beforeRender = function(callback) {
    this.beforeRenderCallback = callback;
};
AtomReactContext.prototype.afterRender = function(callback) {
    this.afterRenderCallback = callback;
};

// TODO maybe accept both classes and factories in this method?
AtomReactContext.prototype.setMountConfig = function(reactClass,domNode) {
    Preconditions.checkHasValue(reactClass,"reactClass is mandatory");
    Preconditions.checkHasValue(domNode,"domNode is mandatory");
    this.mountConfig = {
        reactElementClass: reactClass,
        reactElementFactory: React.createFactory(reactClass),
        domNode: domNode
    };
};


AtomReactContext.prototype.beforeTransactionCommit = function(newState,previousState) {
    var shouldRender = (newState !== previousState);
    if ( shouldRender ) {
        if ( this.beforeRenderCallback ) this.beforeRenderCallback(this.atom.get());
        this.renderCurrentAtomState();
    }
};
AtomReactContext.prototype.afterTransactionCommit = function(newState,previousState,transactionData) {
    var shouldRender = (newState !== previousState);
    if ( shouldRender && this.logTransactions ) {
        console.debug("Atom transaction commit",transactionData);
    }
    if ( shouldRender && this.afterRenderCallback ) this.afterRenderCallback(newState,previousState);
};

// Publish multiple events in the same transaction. Publishing order remains
AtomReactContext.prototype.publishEvents = function(arrayOrArguments) {
    var eventArray = undefined;
    if ( arrayOrArguments instanceof Array ) {
        eventArray = arrayOrArguments;
    } else {
        eventArray = Array.prototype.slice.call(arguments, 0);
    }
    this.transact(function() {
        eventArray.forEach(function(event) {
            this.doPublishEvent(event);
        }.bind(this));
    }.bind(this));
};


AtomReactContext.prototype.publishEvent = function(event) {
    this.transact(function() {
        this.doPublishEvent(event);
    }.bind(this));
};


AtomReactContext.prototype.doPublishEvent = function(event) {
    if ( this.logPublishedEvents ) {
        console.debug("Publishing event: %c"+event.name,"color: green;",event.data);
    }
    Preconditions.checkCondition(event instanceof AtomReactEvent,"Event fired is not an AtomReactEvent! " + event);
    this.stores.forEach(function(store) {
        try {
            // TODO maybe stores should be regular event listeners?
            store.storeManager.handleEvent(event);
        } catch (error) {
            var msg = "Store ["+store.store.nameOrPath+"] could not handle event";
            this.notifyErrorListeners(error,msg);
            throw error;
        }
    }.bind(this));
    this.eventListeners.forEach(function(listener) {
        try {
            listener(event);
        } catch (error) {
            var msg = "Event listener could not handle event " + event.type + " => " + listener;
            this.notifyErrorListeners(error,msg);
            throw error;
        }
    }.bind(this));
};

// TODO this method is probably useless
AtomReactContext.prototype.startWithEvent = function(bootstrapEvent) {
    Preconditions.checkHasValue(this.mountConfig,"Mount config is mandatory");
    Preconditions.checkHasValue(this.stores,"Stores array is mandatory");
    Preconditions.checkHasValue(this.actions,"Actions object is mandatory");
    console.debug("Starting AtomReactContext",this);
    this.publishEvent(bootstrapEvent);
};

AtomReactContext.prototype.transact = function(task) {
    if ( this.firstTransactionStatus == "error" ) {
        console.info("Because of startup error: ignoring subsequent transactional tasks");
        return;
    }
    try {
        this.atom.transact(task);
        if ( !this.firstTransactionStatus ) {
            this.firstTransactionStatus = "success";
        }
    }
    catch (e) {
        if ( !this.firstTransactionStatus ) {
            this.firstTransactionStatus = "error";
            var msg = "Serious error on application startup!";
            this.notifyErrorListeners(e,msg);
            console.error(msg,e);
        }
        throw e;
    }
};

AtomReactContext.prototype.renderCurrentAtomState = function() {
    this.renderAtomState(this.atom);
};

AtomReactContext.prototype.renderAtomState = function(atomToRender) {
    var props = {
        appStateCursor: atomToRender.cursor(AtomCursorMemoizedOption)
    };
    var reactContextHolder = this.getMemoizedReactContextHolder(atomToRender);
    try {
        this.logStateBeforeRender();
        var timeBeforeRendering = Date.now();
        // atomToRender.doWithLock("Atom state should not be modified during the render phase",function() {
            // TODO 0.13 temporary ?, See https://github.com/facebook/react/issues/3392
            var componentFactory = this.mountConfig.reactElementFactory;
            var componentProvider = function() { return componentFactory(props); };
            var componentWithContext = reactContextHolder.childContextProviderFactory({componentProvider: componentProvider, context: reactContextHolder.context});
            ReactDOM.render(componentWithContext, this.mountConfig.domNode, function() {
                if ( this.verboseStateChangeLog || this.lightStateChangeLog ) {
                    console.debug("Time to render in millies",Date.now()-timeBeforeRendering);
                }
            }.bind(this));
        // }.bind(this));
    } catch (error) {
        this.notifyErrorListeners(error,"AtomReact rendering error");
        throw error;
    }
};


function ChildContextProviderFactory(context) {

    // TODO we are very permissive on the childContextTypes (is it a good idea?)
    var childContextTypes = {};
    Object.keys(context).forEach(function(contextKey) {
        childContextTypes[contextKey] = React.PropTypes.any.isRequired
    });

    return React.createFactory(React.createClass({
        displayName: "ChildContextProvider",
        childContextTypes: childContextTypes,
        propTypes: {
            componentProvider: React.PropTypes.func.isRequired,
            context: React.PropTypes.object.isRequired
        },
        getChildContext: function() {
            return this.props.context;
        },
        render: function() {
            // TODO simplify this "componentProvider hack" after React 0.14? See See https://github.com/facebook/react/issues/3392
            var children = this.props.componentProvider();
            return children;
        }
    }));
}



AtomReactContext.prototype.logStateBeforeRender = function() {
    if ( this.verboseStateChangeLog ) {
        var previousState = this.lastRenderedState;
        var currentState = this.atom.get();
        this.lastRenderedState = currentState;
        console.debug("###########################################################\n# Rendering state",this.atom.get());
        var pathDiff = AtomUtils.getPathDiff(previousState,currentState);
        pathDiff.forEach(function(path) {
            var beforeValue = AtomUtils.getPathValue(previousState,path);
            var afterValue = AtomUtils.getPathValue(currentState,path);
            if ( Preconditions.hasValue(beforeValue) && Preconditions.hasValue(afterValue) ) {
                console.debug("%cX","color: orange; background-color: orange;","["+path.toString()+"][",beforeValue," -> ",afterValue,"]");
            }
            else if ( Preconditions.hasValue(beforeValue) && !Preconditions.hasValue(afterValue) ) {
                console.debug("%cX","color: red; background-color: red;","["+path.toString()+"]");
            }
            else if ( !Preconditions.hasValue(beforeValue) && Preconditions.hasValue(afterValue) ) {
                console.debug("%cX","color: green; background-color: green;","["+path.toString()+"][",afterValue,"]");
            }
        });
    } else if ( this.lightStateChangeLog ) {
        console.debug("Rendering state",this.atom.get());
    }
};

