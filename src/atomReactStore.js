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
AtomReactStore.prototype.createStoreManager = function(context) {
    return new AtomReactStoreManager(context,["stores",this.name],this);
};
exports.AtomReactStore = AtomReactStore;






// TODO remove this router stuff!
var AtomReactRouter = function AtomReactRouter(description) {
    Preconditions.checkHasValue(description);
    this.description = description;
};
AtomReactRouter.prototype.createStoreManager = function(context) {
    return new AtomReactStoreManager(context,["routing"],this);
};
exports.AtomReactRouter = AtomReactRouter;






var AtomReactStoreManager = function AtomReactStoreManager(context,path,store) {
    Preconditions.checkHasValue(context);
    Preconditions.checkHasValue(store);
    var self = this;
    this.context = context;
    this.path = path;
    this.store = store;

    this.disabledCommandPublishing = function(command) {
      throw new Error("You can only publish commands while receiving events. " +
      "This permits to implement the DDD Saga pattern. Read more about it on the internet");
    };
    this.enabledCommandPublishing = function(command) {
        // Yes, commands are not published synchronously but are "queued"
        // and do not participate in the current transaction
        setTimeout(function() {
            self.context.publishCommand(command);
        },0);
    };

    // TODO probably not very elegant
    this.store.description.cursor = this.context.atom.cursor().follow(this.path);
    this.store.description.transact = this.context.atom.transact.bind(this.context.atom);

    this.store.description.publishCommand = this.disabledCommandPublishing

    // TODO remove deprecated name!
    this.store.description.storeCursor = this.context.atom.cursor().follow(this.path);
};

// TODO this should be removed in favor of bootstrap event
AtomReactStoreManager.prototype.init = function() {
    if ( this.store.description.init ) {
        this.store.description.init();
    }
};

AtomReactStoreManager.prototype.withCommandPublishingEnabled = function(tasks) {
    this.store.description.publishCommand = this.enabledCommandPublishing;
    try {
        tasks();
    } finally {
        this.store.description.publishCommand = this.disabledCommandPublishing;
    }
};

AtomReactStoreManager.prototype.handleEvent = function(event) {
    if ( this.store.description.handleEvent ) {
        this.withCommandPublishingEnabled(function() {
            this.store.description.handleEvent(event);
        }.bind(this))
    }
};

AtomReactStoreManager.prototype.handleCommand = function(command) {
    if ( this.store.description.handleCommand ) {
        return this.store.description.handleCommand(command);
    }
};
exports.AtomReactStoreManager = AtomReactStoreManager;
