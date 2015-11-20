'use strict';

var React = require("react");

var Preconditions = require("./utils/preconditions");

var AtomCursor = require("./atom/atomCursor");


// The stores are all "dynamic", they do not memoize anything and always return fresh data on .get()
var StoreCursorOptions = {dynamic: true};


var AtomReactStore = function AtomReactStore(nameOrPath,description) {
    Preconditions.checkHasValue(nameOrPath);
    Preconditions.checkHasValue(description);
    this.nameOrPath = nameOrPath;
    this.description = description;
};
AtomReactStore.prototype.createStoreManager = function(context) {
    var path = (this.nameOrPath instanceof Array) ? this.nameOrPath : [this.nameOrPath];
    return new AtomReactStoreManager(context,path,this);
};
exports.AtomReactStore = AtomReactStore;




var AtomReactStoreManager = function AtomReactStoreManager(context,path,store) {
    Preconditions.checkHasValue(context);
    Preconditions.checkHasValue(store);
    this.context = context;
    this.path = path;
    this.store = store;

    this.store.description.cursor = this.context.atom.cursor(StoreCursorOptions).follow(this.path);
    this.store.description.transact = this.context.atom.transact.bind(this.context.atom);

    // Commands published as Saga commands (by stores) are not executed directly but rather queued
    this.store.description.publishCommand = function(command) {
        if ( this.context.logPublishedCommands ) {
            console.debug("Command queued by saga %c"+path,"color: cyan;",command);
        }
        this.context.queueCommand(command);
    }.bind(this);

};

// TODO this should be removed in favor of bootstrap event
AtomReactStoreManager.prototype.init = function() {
    if ( this.store.description.init ) {
        this.store.description.init();
    }
};

AtomReactStoreManager.prototype.handleEvent = function(event) {
    if ( this.store.description.handleEvent ) {
        this.store.description.handleEvent(event);
    }
};

AtomReactStoreManager.prototype.handleCommand = function(command) {
    if ( this.store.description.handleCommand ) {
        return this.store.description.handleCommand(command);
    }
};
exports.AtomReactStoreManager = AtomReactStoreManager;
