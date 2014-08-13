'use strict';

var React = require("react/addons");
var Preconditions = require("./utils/preconditions");

var Atom = require("./atom/atom");
var AtomCursor = require("./atom/atomCursor");
var AtomUtils = require("./atom/atomUtils");



var AtomReactContext = function AtomReactContext() {
    this.stores = [];
    this.router = undefined;
    this.mountNode = undefined;
    this.mountComponent = undefined;
    this.routerInitializer = undefined;
    this.perfMesureMode = "wasted";

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


AtomReactContext.prototype.setPerfMesureMode = function(perfMesureMode) {
    this.perfMesureMode = perfMesureMode;
};


AtomReactContext.prototype.addStore = function(store) {
    this.stores.push({
        store: store,
        storeManager: store.createStoreManager(this.atom)
    });
};

AtomReactContext.prototype.setRouter = function(router) {
    this.router = router;
};

AtomReactContext.prototype.setRouterInitializer = function(routerInitializer) {
    this.routerInitializer = routerInitializer;
};


// TODO we do not really build a router here
// Should be reworked and router API must be thinked better
AtomReactContext.prototype.buildRouter = function() {
    var routingCursor = this.atom.cursor().follow("routing");
    this.router.routingCursor = routingCursor;
    this.router.transact = this.atom.transact.bind(this.atom);
    return this.router;
}

AtomReactContext.prototype.setMountNode = function(mountNode) {
    this.mountNode = mountNode;
};

AtomReactContext.prototype.setMountComponent = function(mountComponent) {
    this.mountComponent = mountComponent;
};




AtomReactContext.prototype.onAtomChange = function() {
    this.printReactPerfMesuresAround(
        this.renderCurrentAtomState.bind(this)
    );
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

AtomReactContext.prototype.handleEvent = function(event) {
    var self = this;
    Preconditions.checkCondition(event instanceof Event,"Event fired is not an AtomReact.Event! " + event);
    // All events are treated inside a transaction
    this.atom.transact(function() {
        self.stores.forEach(function(store) {
            try {
                store.storeManager.handleEvent(event);
            } catch (error) {
                var errorMessage = "Store ["+store.store.name+"] could not handle event";
                console.error(errorMessage,event)
                console.error(error.stack);
                throw new Error(errorMessage);
            }
        });
    })
};


AtomReactContext.prototype.initStores = function() {
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
        if ( self.routerInitializer ) {
            self.routerInitializer(self.buildRouter());
        }
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
    var context = {
        router: this.buildRouter(),
        atom: this.atom,
        publishEvent: this.handleEvent.bind(this)
    };
    try {
        this.logStateBeforeRender(true);
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


AtomReactContext.prototype.logStateBeforeRender = function(verbose) {
    if ( verbose ) {
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