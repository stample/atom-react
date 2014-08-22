'use strict';

var React = require("react/addons");

var Preconditions = require("./utils/preconditions");

var AtomCursor = require("./atom/atomCursor");



var AtomReactStore = function AtomReactStore(name,description) {
    Preconditions.checkHasValue(name);
    Preconditions.checkHasValue(description);
    this.name = name;
    this.description = description;
};
AtomReactStore.prototype.createStoreManager = function(atom) {
    return new AtomReactStoreManager(atom,["stores",this.name],this);
};
exports.AtomReactStore = AtomReactStore;






// The router is just a very specific store
var AtomReactRouter = function AtomReactRouter(description) {
    Preconditions.checkHasValue(description);
    this.description = description;
};
AtomReactRouter.prototype.createStoreManager = function(atom) {
    return new AtomReactStoreManager(atom,["routing"],this);
};
exports.AtomReactRouter = AtomReactRouter;






var AtomReactStoreManager = function AtomReactStoreManager(atom,path,store) {
    Preconditions.checkHasValue(atom);
    Preconditions.checkHasValue(store);
    this.atom = atom;
    this.path = path;
    this.store = store;
};


AtomReactStoreManager.prototype.storeCursor = function() {
    return this.atom.cursor().follow(this.path);
};


AtomReactStoreManager.prototype.isRouter = function() {
    return this.path.length === 1 && this.path[0] === "routing";
};


AtomReactStoreManager.prototype.init = function() {
    var cursorAttributeName = this.isRouter() ? "routingCursor" : "storeCursor";
    this.store.description[cursorAttributeName] = this.storeCursor();
    if ( this.store.description.init ) {
        this.store.description.init();
    } else {
        this.storeCursor().set({});
    }
};




// TODO add forbidden store description attributes to avoid overriding

// TODO think about what would be the best api to expose on stores!

// TODO this is a bad idea and should be removed!
AtomReactStoreManager.prototype.reactToChange = function(previousState) {
    if ( this.store.description.reactToChange ) {

        var cursorAttributeName = this.isRouter() ? "routingCursor" : "storeCursor";
        this.store.description[cursorAttributeName] = this.storeCursor();

        // TODO these should probably be deleted as the store is supposed to only change on events!
        // (And events are already handled in transactions)
        var currentState = this.atom.get();
        this.store.description.atom = this.atom;
        this.store.description.state = currentState;
        this.store.description.routing = currentState.routing;
        this.store.description.transact = this.atom.transact.bind(this.store.description);

        this.store.description.reactToChange(previousState,currentState);
    }
};

AtomReactStoreManager.prototype.handleEvent = function(event) {
    if ( this.store.description.handleEvent ) {

        var cursorAttributeName = this.isRouter() ? "routingCursor" : "storeCursor";
        this.store.description[cursorAttributeName] = this.storeCursor();

        // TODO these should probably be deleted as the store is supposed to only change on events!
        // (And events are already handled in transactions)
        var currentState = this.atom.get();
        this.store.description.atom = this.atom;
        this.store.description.state = currentState;
        this.store.description.routing = currentState.routing;
        this.store.description.transact = this.atom.transact.bind(this.store.description);

        this.store.description.handleEvent(event);
    }
};
exports.AtomReactStoreManager = AtomReactStoreManager;
