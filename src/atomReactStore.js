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


// TODO probably not very elegant and secure code, could be overrided
AtomReactStoreManager.prototype.prepare = function() {
    var cursorAttributeName = this.isRouter() ? "routingCursor" : "storeCursor";
    this.store.description[cursorAttributeName] = this.storeCursor();
};


// TODO this should be removed in favor of bootstrap event
AtomReactStoreManager.prototype.init = function() {
    var cursorAttributeName = this.isRouter() ? "routingCursor" : "storeCursor";
    this.prepare();
    this.store.description[cursorAttributeName] = this.storeCursor();
    if ( this.store.description.init ) {
        this.store.description.init();
    } else {
        this.storeCursor().set({});
    }
};



AtomReactStoreManager.prototype.handleEvent = function(event) {
    if ( this.store.description.handleEvent ) {
        this.prepare();
        this.store.description.handleEvent(event);
    }
};
exports.AtomReactStoreManager = AtomReactStoreManager;
