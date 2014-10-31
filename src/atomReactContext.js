'use strict';

var React = require("react/addons");
var Preconditions = require("./utils/preconditions");

var Atom = require("./atom/atom");
var AtomCursor = require("./atom/atomCursor");
var AtomUtils = require("./atom/atomUtils");

var AtomReactEvent = require("./atomReactEvent");
var AtomReactCommand = require("./atomReactCommand");

var AtomReactContext = function AtomReactContext() {
    this.recorder = new AtomReactRecorder(this);
    this.stores = [];
    this.eventListeners = [];
    this.router = undefined;
    this.mountNode = undefined;
    this.mountComponent = undefined;
    this.perfMesureMode = "none";
    this.verboseStateChangeLog = false;
    this.beforeRenderCallback = undefined;
    this.beforeRenderCallback = undefined;
    this.logPublishedEvents = false;
    this.logPublishedCommands = false;

    this.atom = new Atom({
        beforeTransactionCommit: this.beforeTransactionCommit.bind(this),
        afterTransactionCommit: this.afterTransactionCommit.bind(this)
    });
};
module.exports = AtomReactContext;


AtomReactContext.prototype.debugMode = function() {
    this.setPerfMesureMode("wasted");
    this.setVerboseStateChangeLog(true);
    this.setLogPublishedEvents(true);
    this.setLogPublishedCommands(true);
};

AtomReactContext.prototype.setPerfMesureMode = function(perfMesureMode) {
    this.perfMesureMode = perfMesureMode;
};

AtomReactContext.prototype.setVerboseStateChangeLog = function(bool) {
    this.verboseStateChangeLog = bool;
};
AtomReactContext.prototype.setLogPublishedEvents = function(bool) {
    this.logPublishedEvents = bool;
};
AtomReactContext.prototype.setLogPublishedCommands = function(bool) {
    this.logPublishedCommands = bool;
};



AtomReactContext.prototype.addStore = function(store) {
    if ( store.description.reactToChange ) {
        console.warn("Store [",store.name,"] should rather not implement 'reactToChange' because it will be removed in the future");
    }
    if ( store.description.init ) {
        console.warn("Store [",store.name,"] should rather not implement 'init' because it will be removed in the future");
    }
    this.stores.push({
        store: store,
        storeManager: store.createStoreManager(this)
    });
};

AtomReactContext.prototype.setRouter = function(router) {
    this.router = {
        router: router,
        routerManager: router.createStoreManager(this)
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

AtomReactContext.prototype.beforeRender = function(callback) {
    this.beforeRenderCallback = callback;
};
AtomReactContext.prototype.afterRender = function(callback) {
    this.afterRenderCallback = callback;
};


AtomReactContext.prototype.setMountNode = function(mountNode) {
    this.mountNode = mountNode;
};

AtomReactContext.prototype.setMountComponent = function(mountComponent) {
    this.mountComponent = mountComponent;
};


AtomReactContext.prototype.beforeTransactionCommit = function(newState,previousState) {
    var shouldRender = (newState !== previousState);
    if ( shouldRender ) {
        if ( this.beforeRenderCallback ) this.beforeRenderCallback(this.atom.get());
        this.printReactPerfMesuresAround(
            this.renderCurrentAtomState.bind(this)
        );
        if ( this.recorder.isRecording() ) {
            this.recorder.addRecord(newState);
        }
    }
};
AtomReactContext.prototype.afterTransactionCommit = function(newState,previousState) {
    var shouldRender = (newState !== previousState);
    if ( shouldRender && this.afterRenderCallback ) this.afterRenderCallback(newState,previousState);
};

AtomReactContext.prototype.publishCommand = function(command) {
    if ( this.logPublishedCommands ) {
        console.debug("Publishing command: %c"+command.name,"color: red;",command.data);
    }
    Preconditions.checkCondition(command instanceof AtomReactCommand,"Command fired is not an AtomReactCommand! " + command);
    var self = this;
    var commandHandlerByStore = undefined;
    var returnedEvents = undefined;
    this.atom.doWithLock("A command handler should not modify the atom state!",function() {
        self.stores.forEach(function(store) {
            try {
                var eventOrEvents = store.storeManager.handleCommand(command);
                if ( eventOrEvents ) {
                    if ( commandHandlerByStore ) {
                        throw new Error("Command can't be handled by store " + store.store.name +
                            " because it was already handled by " + commandHandlerByStore.store.name);
                    }
                    commandHandlerByStore = store;
                    if ( eventOrEvents instanceof Array ) {
                        returnedEvents = eventOrEvents;
                    } else {
                        returnedEvents = [eventOrEvents];
                    }
                }
            } catch (error) {
                var errorMessage = "Store ["+store.store.name+"] could not handle command";
                console.error(errorMessage,command);
                console.error(error.stack);
                throw new Error(errorMessage);
            }
        });
    });
    if ( !commandHandlerByStore ) {
        throw new Error("Commands should be handled by exactly one command handler");
    }
    this.publishEvents(returnedEvents);
};

// Publish multiple events in the same transaction. Publishing order remains
AtomReactContext.prototype.publishEvents = function(arrayOrArguments) {
    var eventArray = undefined;
    if ( arrayOrArguments instanceof Array ) {
        eventArray = arrayOrArguments;
    } else {
        eventArray = Array.prototype.slice.call(arguments, 0);
    }
    var self = this;
    this.transact(function() {
        eventArray.forEach(function(event) {
            self.publishEvent(event);
        })
    });
};


AtomReactContext.prototype.publishEvent = function(event) {
    if ( this.logPublishedEvents ) {
        console.debug("Publishing event: %c"+event.name,"color: green;",event.data);
    }
    Preconditions.checkCondition(event instanceof AtomReactEvent,"Event fired is not an AtomReactEvent! " + event);
    var self = this;
    // All events are treated inside a transaction
    this.transact(function() {
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

// TODO this should be removed in favor of a bootstrap event
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



AtomReactContext.prototype.startWithEvent = function(bootstrapEvent) {
    Preconditions.checkHasValue(this.mountComponent,"Mount component is mandatory");
    Preconditions.checkHasValue(this.mountNode,"Mount node is mandatory");
    Preconditions.checkHasValue(this.stores,"Stores array is mandatory");
    Preconditions.checkHasValue(this.router,"router is mandatory");
    console.debug("Starting AtomReactContext",this);

    var self = this;
    this.transact(function() {
        self.initStores(); // TODO should be removed. Stores should be initialized with a bootstrap event only
        self.publishEvent(bootstrapEvent);
    });
};

AtomReactContext.prototype.transact = function(task) {
    this.atom.transact(task);
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
};




AtomReactContext.prototype.renderCurrentAtomState = function() {
    this.renderAtomState(this.atom);
};

AtomReactContext.prototype.renderAtomState = function(atomToRender) {
    var self = this;
    var props = {
        appStateCursor: atomToRender.cursor()
    };
    // TODO pass the AtomReact context directly to react !
    var context = {
        atom: atomToRender,
        publishEvent: this.publishEvent.bind(this),
        publishEvents: this.publishEvents.bind(this),
        publishCommand: this.publishCommand.bind(this),
        addEventListener: this.addEventListener.bind(this),
        removeEventListener: this.addEventListener.bind(this)
    };
    try {
        this.logStateBeforeRender();
        var timeBeforeRendering = Date.now();
        atomToRender.doWithLock("Atom state should not be modified during the render phase",function() {
            React.withContext(context,function() {
                React.render(
                    self.mountComponent(props),
                    self.mountNode
                );
            });
        });
        console.debug("Time to render in millies",Date.now()-timeBeforeRendering);
    } catch (error) {
        console.error("Could not render application with state\n",atomToRender.get());
        console.error(error.stack);
        throw new Error("Could not render application");
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





// TODO it may be fun to record cursor position !!!

// TODO how to prevent the user to interacting during the replay???

var AtomReactRecorder = function AtomReactRecorder(atomReactContext) {
    Preconditions.checkHasValue(atomReactContext);
    this.context = atomReactContext;

    this.recording = false;
    this.stateRecords = undefined;

    this.replaying = false;
};

AtomReactRecorder.prototype.isRecording = function() {
    return this.recording;
};
AtomReactRecorder.prototype.isReplaying = function() {
    return this.replaying;
};

AtomReactRecorder.prototype.startRecording = function() {
    console.debug("Start recording");
    this.recording = true;
    this.stateRecords = [];

    // The first item of the record is the current atom state
    var currentAtomState = this.context.atom.get();
    this.addRecord(currentAtomState);
};
AtomReactRecorder.prototype.addRecord = function(state) {
    Preconditions.checkHasValue(state);
    Preconditions.checkCondition(this.isRecording());
    console.debug("Adding record",state);
    this.stateRecords.push({
        time: Date.now(),
        state: state
    });
};
AtomReactRecorder.prototype.stopRecording = function() {
    this.recording = false;
};

AtomReactRecorder.prototype.replayStateRecord = function(record) {
    Preconditions.checkHasValue(record);
    Preconditions.checkHasValue(record.state);
    Preconditions.checkCondition(!this.isRecording());
    // TODO not sure it's nice to create a different atom for each replayed state...
    var replayStateAtom = new Atom({initialState: record.state});
    this.context.renderAtomState(replayStateAtom);
};




AtomReactRecorder.prototype.replay = function(speedFactor) {
    Preconditions.checkCondition(!this.isRecording());
    Preconditions.checkCondition(!this.isReplaying());

    if ( !this.stateRecords || this.stateRecords.length < 1 ) {
        console.error("At least 2 records are needed to replay");
        return;
    }

    try {
        this.replaying = true;
        var speedFactor = speedFactor || 1;
        var firstRecord = this.stateRecords[0];
        var lastRecord = this.stateRecords[this.stateRecords.length - 1];
        var totalRecordTime = lastRecord.time - firstRecord.time;
        Preconditions.checkCondition(totalRecordTime >= 0);

        var records = this.stateRecords.map(function(record) {
            // How much time after the beginning this record was added
            var startOffset = record.time - firstRecord.time;
            Preconditions.checkCondition(startOffset >= 0);
            return {
                record: record,
                offset: startOffset
            }
        });

        // The current time is actually affected by the speed factor
        var currentReplayTime = 0;
        var currentRecordIndex = 0;
        var tickPace = 10; // TODO which value to choose?
        var replayInterval = setInterval(function() {
            this.replayStateRecord(records[currentRecordIndex].record);
            var hasNextRecord = (records.length > currentRecordIndex + 1);
            // TODO create replay widget and send events to this widget
            if ( hasNextRecord ) {
                var nextRecord = records[currentRecordIndex + 1];
                var isTimeToPlayNextRecord = nextRecord.offset <= currentReplayTime;
                if ( isTimeToPlayNextRecord ) {
                    currentRecordIndex = currentRecordIndex + 1;
                    console.debug("Playing to next record");
                }
                currentReplayTime = currentReplayTime + (tickPace * speedFactor);
            } else {
                console.debug("End of replay");
                clearInterval(replayInterval);
            }
        }.bind(this),tickPace);
    } catch (e) {
        console.error("Error during replay of state records",this.stateRecords,e);
        console.error(e.stack);
    } finally {
        this.replaying = false;
    }

};


