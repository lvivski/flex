(function(global) {
  "use strict";
  var Promise, Observable, Flux = {};
  if (typeof define === "function" && define.amd) {
    define([ "davy", "streamlet" ], function(davy, streamlet) {
      Promise = davy;
      Observable = streamlet;
      return Flux;
    });
  } else if (typeof module === "object" && module.exports) {
    Promise = require("davy");
    Observable = require("streamlet");
    module.exports = Flux;
  } else {
    Promise = global.Davy;
    Observable = global.Streamlet;
    global.Flex = Flux;
  }
  Flux.createStore = function(store) {
    if (isFunction(store)) {
      extend(store.prototype, Store.prototype);
      store = new store();
    } else {
      store = extend(new Store(), store);
      if (isFunction(store.initialize)) {
        store.initialize.call(store);
      }
    }
    Store.call(store);
    return store;
  };
  Flux.createAction = function(name, handler) {
    if (!isFunction(handler)) {
      handler = function(_) {
        return _;
      };
    }
    var controller = Observable.controlSync(), stream = controller.stream, next = function(value) {
      controller.next(value);
      return value;
    }, fail = function(error) {
      controller.fail(error);
      throw error;
    }, action = function Action(data) {
      return new Promise(function(resolve) {
        resolve(handler(data));
      }).then(next, fail).then(wrap(next), wrap(fail));
    }, extra = {
      actionName: name,
      listen: function() {
        stream.listen.apply(stream, arguments);
      }
    };
    return extend(action, extra);
  };
  Flux.createActions = function(spec, parent) {
    parent || (parent = "");
    var actions = {};
    if (isFunction(spec)) {
      spec = new spec();
    }
    for (var action in spec) if (spec.hasOwnProperty(action)) {
      var value = spec[action], actionName = isString(value) ? value : action;
      var parentActionName = parent + actionName;
      if (isObject(value)) {
        var handler = value.$;
        delete value.$;
        actions[actionName] = extend(this.createAction(parentActionName, handler), this.createActions(value, parentActionName));
      } else {
        actions[actionName] = this.createAction(parentActionName, value);
      }
    }
    return actions;
  };
  Flux.save = Flux.saveState = function(store) {
    return JSON.stringify(store.get());
  };
  Flux.restore = Flux.restoreState = function(store, state) {
    store.set(isObject(state) ? state : JSON.parse(state));
  };
  Flux.Promise = Promise;
  Flux.Observable = Observable;
  Flux.Store = Store;
  Flux.ListenerMixin = {
    componentWillMount: function() {
      this.subscriptions = [];
    },
    componentWillUnmount: function() {
      var i = 0;
      while (i < this.subscriptions.length) {
        this.subscriptions[i++]();
      }
    },
    listenTo: function(stream, listener) {
      this.subscriptions.push(stream.listen(listener));
    }
  };
  var STATE = "__state" + Math.random() + "__", CONTROLLER = "__controller" + Math.random() + "__";
  function Store() {
    this.initialState || (this.initialState = {});
    this[CONTROLLER] = Observable.controlSync();
    this[STATE] = {};
    this.set(this.getInitialState());
  }
  Object.defineProperty(Observable.prototype, STATE, {
    configurable: true,
    writable: true,
    value: undefined
  });
  Object.defineProperty(Observable.prototype, CONTROLLER, {
    configurable: true,
    writable: true,
    value: undefined
  });
  Store.prototype.getInitialState = function() {
    return JSON.parse(JSON.stringify(this.initialState || {}));
  };
  Store.prototype.get = Store.prototype.getState = function() {
    return this[STATE];
  };
  Store.prototype.set = Store.prototype.setState = function(state) {
    if (!isObject(state)) return;
    extend(this[STATE], state);
    this[CONTROLLER].add(state);
    return this[STATE];
  };
  Store.prototype.reset = Store.prototype.resetState = function() {
    this[STATE] = {};
    return this.set(this.getInitialState());
  };
  Store.prototype.listen = function(callback) {
    return this[CONTROLLER].stream.listen(callback);
  };
  Store.prototype.listenTo = function(action, onNext, onFail) {
    if (isFunction(action) && isString(action.actionName)) {
      var actionName = action.actionName;
      actionName = actionName[0].toUpperCase() + actionName.slice(1);
      onNext = onNext || this["on" + actionName];
      onFail = onFail || this["on" + actionName + "Fail"];
      if (isFunction(onNext) || isFunction(onFail)) {
        action.listen(onNext && onNext.bind(this), onFail && onFail.bind(this));
      }
    }
    if (arguments.length === 1 && (isFunction(action) || isObject(action))) {
      for (var key in action) if (action.hasOwnProperty(key)) {
        this.listenTo(action[key]);
      }
    }
  };
  function extend(obj) {
    if (!isObject(obj) && !isFunction(obj)) {
      return obj;
    }
    var i = 1;
    while (i < arguments.length) {
      var source = arguments[i++];
      for (var property in source) if (source.hasOwnProperty(property)) {
        if (Object.getOwnPropertyDescriptor && Object.defineProperty) {
          var propertyDescriptor = Object.getOwnPropertyDescriptor(source, property);
          Object.defineProperty(obj, property, propertyDescriptor || {});
        } else {
          obj[property] = source[property];
        }
      }
    }
    return obj;
  }
  function isObject(obj) {
    return obj && typeof obj === "object";
  }
  function isFunction(fn) {
    return fn && typeof fn === "function";
  }
  function isString(str) {
    return str && typeof str === "string";
  }
  function wrap(fn) {
    return function(value) {
      return function() {
        return fn(value);
      };
    };
  }
})(this);