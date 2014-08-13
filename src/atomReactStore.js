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
module.exports = AtomReactStore;


AtomReactStore.prototype.createStoreManager = function(atom) {
    return new AtomReactStoreManager(atom,this);
};




var AtomReactStoreManager = function AtomReactStoreManager(atom,store) {
    Preconditions.checkHasValue(atom);
    Preconditions.checkHasValue(store);
    this.atom = atom;
    this.store = store;
};

AtomReactStoreManager.prototype.storeCursor = function() {
    return this.atom.cursor().follow("stores",this.store.name);
};


AtomReactStoreManager.prototype.init = function() {
    this.store.description.storeCursor = this.storeCursor();
    if ( this.store.description.init ) {
        this.store.description.init();
    } else {
        this.storeCursor().set({});
    }
};


// TODO add forbidden store description attributes to avoid overriding

// TODO think about what would be the best api to expose on stores!

AtomReactStoreManager.prototype.reactToChange = function(previousState) {
    if ( this.store.description.reactToChange ) {
        var currentState = this.atom.get();
        this.store.description.atom = this.atom;
        this.store.description.storeCursor = this.storeCursor();
        this.store.description.state = currentState;
        this.store.description.routing = currentState.routing;
        this.store.description.transact = this.atom.transact.bind(this.atom);
        this.store.description.reactToChange(previousState,currentState);
    }
};

AtomReactStoreManager.prototype.handleEvent = function(event) {
    if ( this.store.description.handleEvent ) {
        var currentState = this.atom.get();
        this.store.description.atom = this.atom;
        this.store.description.storeCursor = this.storeCursor();
        this.store.description.state = currentState;
        this.store.description.routing = currentState.routing;
        this.store.description.transact = this.atom.transact.bind(this.atom);
        this.store.description.handleEvent(event);
    }
};
