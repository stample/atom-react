'use strict';

var _ = require("lodash");

var React = require("react/addons");
var Preconditions = require("./utils/preconditions");

var Atom = require("./atom/atom");
var AtomCursor = require("./atom/atomCursor");
var AtomUtils = require("./atom/atomUtils");

var AtomReactEvent = require("./atomReactEvent");
var AtomReactCommand = require("./atomReactCommand");


// With NODE_ENV=production, React does not have perf module
// see https://github.com/facebook/react/issues/4107
var hasPerfPlugin = !!React.addons.Perf;

// For render the cursors are memoized
var AtomCursorMemoizedOption = {memoized: true};


var AtomReactContext = function AtomReactContext() {
    this.recorder = new AtomReactRecorder(this);
    this.stores = [];
    this.reactContext = {};
    this.memoizedReactContext = undefined;
    this.eventListeners = [];
    this.perfMesureMode = "none";
    this.verboseStateChangeLog = false;
    this.beforeRenderCallback = undefined;
    this.beforeRenderCallback = undefined;
    this.logPublishedEvents = false;
    this.logPublishedCommands = false;
    this.logTransactions = false;

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
    this.setLogTransactions(true);
};

AtomReactContext.prototype.setPerfMesureMode = function(perfMesureMode) {
    if ( hasPerfPlugin ) {
        this.perfMesureMode = perfMesureMode;
    }
    else {
        if ( perfMesureMode != "none" ) {
            console.warn("React is in production mode, and does not have Perf module. You won't be able to use AtomReact with setPerfMesureMode("+perfMesureMode+")");
        }
    }
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
AtomReactContext.prototype.setLogTransactions = function(bool) {
    this.logTransactions = bool;
};



AtomReactContext.prototype.addStore = function(store) {
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
    React.unmountComponentAtNode(this.mountConfig.domNode);
};

AtomReactContext.prototype.getMemoizedReactContextHolder = function(atomToRender) {
    Preconditions.checkHasValue(atomToRender);
    if ( !this.memoizedReactContext ) {
        // TODO pass the AtomReact context (this) directly to react ! it will be more flexible
        var libContext = {
            atom: atomToRender,
            publishEvent: this.publishEvent.bind(this),
            publishEvents: this.publishEvents.bind(this),
            publishCommand: this.publishCommand.bind(this),
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
        if ( this.recorder.isRecording() ) {
            this.recorder.addRecord(newState);
        }
    }
};
AtomReactContext.prototype.afterTransactionCommit = function(newState,previousState,transactionData) {
    var shouldRender = (newState !== previousState);
    if ( shouldRender && this.logTransactions ) {
        console.debug("Atom transaction commit",transactionData);
    }
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
                        throw new Error("Command can't be handled by store " + store.store.nameOrPath +
                        " because it was already handled by " + commandHandlerByStore.store.nameOrPath);
                    }
                    commandHandlerByStore = store;
                    if ( eventOrEvents instanceof Array ) {
                        returnedEvents = eventOrEvents;
                    } else {
                        returnedEvents = [eventOrEvents];
                    }
                }
            } catch (error) {
                var errorMessage = "Store ["+store.store.nameOrPath+"] could not handle command because " + error.message;
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

        self.stores.forEach(function(store) {
            try {
                // TODO maybe stores should be regular event listeners?
                store.storeManager.handleEvent(event);
            } catch (error) {
                var errorMessage = "Store ["+store.store.nameOrPath+"] could not handle event because " + error.message;
                console.error(errorMessage,event);
                console.error(error.stack);
                throw new Error(errorMessage);
            }
        });
        self.eventListeners.forEach(function(listener) {
            try {
                listener(event);
            } catch (error) {
                var errorMessage = "Event listener ["+listener+"] could not handle event because " + error.message;
                console.error(errorMessage,event);
                console.error(error.stack);
                throw new Error(errorMessage);
            }
        });
    })
};

// TODO this method is probably useless
AtomReactContext.prototype.startWithEvent = function(bootstrapEvent) {
    Preconditions.checkHasValue(this.mountConfig,"Mount config is mandatory");
    Preconditions.checkHasValue(this.stores,"Stores array is mandatory");
    console.debug("Starting AtomReactContext",this);
    this.publishEvent(bootstrapEvent);
};

AtomReactContext.prototype.transact = function(task) {
    this.atom.transact(task);
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
        atomToRender.doWithLock("Atom state should not be modified during the render phase",function() {
            // TODO 0.13 temporary ?, See https://github.com/facebook/react/issues/3392
            var componentFactory = this.mountConfig.reactElementFactory;
            var componentProvider = function() { return componentFactory(props); };
            var componentWithContext = reactContextHolder.childContextProviderFactory({componentProvider: componentProvider, context: reactContextHolder.context});
            if ( this.perfMesureMode !== "none" ) React.addons.Perf.start();
            React.render(componentWithContext, this.mountConfig.domNode, function() {
                console.debug("Time to render in millies",Date.now()-timeBeforeRendering);
                if ( this.perfMesureMode !== "none" ) React.addons.Perf.stop();
                switch(this.perfMesureMode) {
                    case "none": break;
                    case "wasted": React.addons.Perf.printWasted(); break;
                    case "inclusive": React.addons.Perf.printInclusive(); break;
                    case "exclusive": React.addons.Perf.printExclusive(); break;
                    default: throw new Error("Unknown perfMesureMode="+this.perfMesureMode);
                }
            }.bind(this));
        }.bind(this));
    } catch (error) {
        console.error("Could not render application with state\n",atomToRender.get());
        console.error(error.stack);
        throw new Error("Could not render application");
    }
};


function ChildContextProviderFactory(context) {

    // TODO we are very permissive on the childContextTypes (is it a good idea?)
    var childContextTypes = {};
    _.keys(context).forEach(function(contextKey) {
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
            else {
                // TODO it seems this case happen for null vs undefined
                // For now we fail safe and simply bypass this log statement: to handle later!
                /*
                 console.error("before",beforeValue);
                 console.error("after",afterValue);
                 throw new Error("unexpected case!!!");
                 */
            }
        });
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


