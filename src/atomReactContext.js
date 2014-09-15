'use strict';

var React = require("react/addons");
var Preconditions = require("./utils/preconditions");

var Atom = require("./atom/atom");
var AtomCursor = require("./atom/atomCursor");
var AtomUtils = require("./atom/atomUtils");



var AtomReactContext = function AtomReactContext() {
    this.stores = [];
    this.eventListeners = [];
    this.router = undefined;
    this.mountNode = undefined;
    this.mountComponent = undefined;
    this.perfMesureMode = "none";
    this.verboseStateChangeLog = false;
    this.lastRoutingState = undefined;
    this.onRoutingChangeCallback = undefined;

    this.atom = new Atom({
        initialState: {
            routing: {},
            stores: {}
        },
        onChange: this.onAtomChange.bind(this),
        reactToChange: this.reactToAtomChange.bind(this)
    });
};
module.exports = AtomReactContext;


AtomReactContext.prototype.debugMode = function() {
    this.setPerfMesureMode("wasted");
    this.setVerboseStateChangeLog(true);
};

AtomReactContext.prototype.setPerfMesureMode = function(perfMesureMode) {
    this.perfMesureMode = perfMesureMode;
};

AtomReactContext.prototype.setVerboseStateChangeLog = function(bool) {
    this.verboseStateChangeLog = bool;
};



AtomReactContext.prototype.addStore = function(store) {
    if ( store.description.reactToChange ) {
        console.warn("Store [",store.name,"] should rather not implement reactToChange because it will be removed in the future");
    }
    this.stores.push({
        store: store,
        storeManager: store.createStoreManager(this.atom)
    });
};

AtomReactContext.prototype.setRouter = function(router) {
    this.router = {
        router: router,
        routerManager: router.createStoreManager(this.atom)
    };
};


AtomReactContext.prototype.addEventListener = function(listener) {
    this.eventListeners.push(listener);
};

AtomReactContext.prototype.removeEventListener = function(listener) {
    var index = this.eventListeners.indexOf(listener);
    if (index > -1) {
        this.eventListeners.splice(index, 1);
    }
};

AtomReactContext.prototype.onRoutingChange = function(callback) {
    this.onRoutingChangeCallback = callback;
};


AtomReactContext.prototype.setMountNode = function(mountNode) {
    this.mountNode = mountNode;
};

AtomReactContext.prototype.setMountComponent = function(mountComponent) {
    this.mountComponent = mountComponent;
};


AtomReactContext.prototype.onAtomChange = function() {
    this.handleRoutingChange();
    this.printReactPerfMesuresAround(
        this.renderCurrentAtomState.bind(this)
    );
};

AtomReactContext.prototype.handleRoutingChange = function() {
    var routingState = this.atom.get().routing;
    if ( routingState !== this.lastRoutingState && this.onRoutingChangeCallback ) {
        this.onRoutingChangeCallback(routingState,this.lastRoutingState);
        this.lastRoutingState = routingState;
    }
};

AtomReactContext.prototype.reactToAtomChange = function(previousState) {
    this.stores.forEach(function(store) {
        try {
            store.storeManager.reactToChange(previousState);
        } catch (error) {
            var errorMessage = "Store ["+store.store.name+"] could not react to atom changes";
            console.error(errorMessage)
            console.error(error.stack);
            throw new Error(errorMessage);
        }
    });
};

AtomReactContext.prototype.publishEvent = function(event) {
    console.debug("publishing event:",event);
    var self = this;
    // All events are treated inside a transaction
    this.atom.transact(function() {
        try {
            // TODO maybe stores should be regular event listeners?
            self.router.routerManager.handleEvent(event);
        } catch (error) {
            var errorMessage = "Router could not handle event";
            console.error(errorMessage,event);
            console.error(error.stack);
            throw new Error(errorMessage);
        }

        self.stores.forEach(function(store) {
            try {
                // TODO maybe stores should be regular event listeners?
                store.storeManager.handleEvent(event);
            } catch (error) {
                var errorMessage = "Store ["+store.store.name+"] could not handle event";
                console.error(errorMessage,event);
                console.error(error.stack);
                throw new Error(errorMessage);
            }
        });
        self.eventListeners.forEach(function(listener) {
            try {
                listener(event);
            } catch (error) {
                var errorMessage = "Event listener ["+listener+"] could not handle event";
                console.error(errorMessage,event);
                console.error(error.stack);
                throw new Error(errorMessage);
            }
        });
    })
};


AtomReactContext.prototype.initStores = function() {
    try {
        this.router.routerManager.init();
    } catch (error) {
        var errorMessage = "Router could not be initialized";
        console.error(errorMessage)
        console.error(error.stack);
        throw new Error(errorMessage);
    }
    this.stores.forEach(function(store) {
        try {
            store.storeManager.init();
        } catch (error) {
            var errorMessage = "Store ["+store.store.name+"] could not be initialized";
            console.error(errorMessage)
            console.error(error.stack);
            throw new Error(errorMessage);
        }
    });
};



AtomReactContext.prototype.start = function() {
    Preconditions.checkHasValue(this.mountComponent,"Mount component is mandatory");
    Preconditions.checkHasValue(this.mountNode,"Mount node is mandatory");
    Preconditions.checkHasValue(this.stores,"Stores array is mandatory");
    Preconditions.checkHasValue(this.router,"router is mandatory");
    console.debug("Starting AtomReactContext",this);

    var self = this;
    this.atom.transact(function() {
        self.initStores();
    });
};




AtomReactContext.prototype.printReactPerfMesuresAround = function(task) {
    if ( this.perfMesureMode === "none" ) {
        task();
    }
    else {
        React.addons.Perf.start();
        task();
        React.addons.Perf.stop();
        try {
            switch(this.perfMesureMode) {
                case "wasted": React.addons.Perf.printWasted(); break;
                case "inclusive": React.addons.Perf.printInclusive(); break;
                case "exclusive": React.addons.Perf.printExclusive(); break;
                default: throw new Error("Unknown perfMesureMode="+this.perfMesureMode);
            }
        }
        catch (error) {
            console.error("Can't print React perf mesures: " + e.message);
            console.error(e.stack);
        }
    }
},


AtomReactContext.prototype.renderCurrentAtomState = function() {
    var self = this;
    var props = {
        appStateCursor: this.atom.cursor()
    };

    this.router.routerManager.prepare();
    var context = {
        router: this.router.router.description,
        atom: this.atom,
        publishEvent: this.publishEvent.bind(this),
        addEventListener: this.addEventListener.bind(this),
        removeEventListener: this.addEventListener.bind(this)
    };
    try {
        this.logStateBeforeRender();
        var timeBeforeRendering = Date.now();
        React.withContext(context,function() {
            React.renderComponent(
                self.mountComponent(props),
                self.mountNode
            );
        });
        console.debug("Time to render in millies",Date.now()-timeBeforeRendering);
    } catch (error) {
        console.error("Could not render application with state\n",this.atom.get());
        console.error(error.stack);
    }
};


AtomReactContext.prototype.logStateBeforeRender = function() {
    if ( this.verboseStateChangeLog ) {
        var previousState = this.lastRenderedState;
        var currentState = this.atom.get();
        this.lastRenderedState = currentState;
        var pathDiff = AtomUtils.getPathDiff(previousState,currentState);
        var pathDiffString = pathDiff.map(function(path) { return "# -> " + path.toString(); }).join("\n");
        console.debug(
            "###########################################################\n# Rendering state\n#",
            this.atom.get(),
            "\n# Modified paths since previous rendering are:\n"+pathDiffString
        );
    } else {
        console.debug("Rendering state",this.atom.get());
    }
};