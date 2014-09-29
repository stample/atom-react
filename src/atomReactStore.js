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






// TODO remove this router stuff!
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
    // TODO probably not very elegant
    this.store.description.cursor = this.atom.cursor().follow(this.path);

    // TODO remove deprecated name!
    this.store.description.storeCursor = this.atom.cursor().follow(this.path);
};

// TODO this should be removed in favor of bootstrap event
AtomReactStoreManager.prototype.init = function() {
    if ( this.store.description.init ) {
        this.store.description.init();
    }
};

AtomReactStoreManager.prototype.handleEvent = function(event) {
    this.store.description.handleEvent(event);
};
AtomReactStoreManager.prototype.handleCommand = function(command) {
    if ( this.store.description.handleCommand ) {
        return this.store.description.handleCommand(command);
    }
};
exports.AtomReactStoreManager = AtomReactStoreManager;
