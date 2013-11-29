;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  var Bacon, Bus, CompositeUnsubscribe, Dispatcher, End, Error, Event, EventStream, Initial, Next, None, Observable, Property, PropertyDispatcher, PropertyTransaction, Some, Source, addPropertyInitValueToStream, assert, assertArray, assertEvent, assertEventStream, assertFunction, assertNoArguments, assertString, cloneArray, compositeUnsubscribe, convertArgsToFunction, end, former, indexOf, initial, isFieldKey, isFunction, latterF, liftCallback, makeFunction, makeFunctionArgs, makeFunction_, makeSpawner, next, nop, partiallyApplied, toCombinator, toEvent, toFieldExtractor, toFieldKey, toOption, toSimpleExtractor, withMethodCallSupport, _, _ref, _ref1, _ref2,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Bacon = {};

  Bacon.version = '0.6.22';

  Bacon.fromBinder = function(binder, eventTransformer) {
    if (eventTransformer == null) {
      eventTransformer = _.id;
    }
    return new EventStream(function(sink) {
      var unbinder;
      return unbinder = binder(function() {
        var args, event, reply, value, _i, _len;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        value = eventTransformer.apply(null, args);
        if (!(value instanceof Array && _.last(value) instanceof Event)) {
          value = [value];
        }
        reply = Bacon.more;
        for (_i = 0, _len = value.length; _i < _len; _i++) {
          event = value[_i];
          reply = sink(event = toEvent(event));
          if (reply === Bacon.noMore || event.isEnd()) {
            if (unbinder != null) {
              unbinder();
            } else {
              Bacon.scheduler.setTimeout((function() {
                return unbinder();
              }), 0);
            }
            return reply;
          }
        }
        return reply;
      });
    });
  };

  Bacon.$ = {
    asEventStream: function(eventName, selector, eventTransformer) {
      var _ref,
        _this = this;
      if (isFunction(selector)) {
        _ref = [selector, null], eventTransformer = _ref[0], selector = _ref[1];
      }
      return Bacon.fromBinder(function(handler) {
        _this.on(eventName, selector, handler);
        return function() {
          return _this.off(eventName, selector, handler);
        };
      }, eventTransformer);
    }
  };

  if ((_ref = typeof jQuery !== "undefined" && jQuery !== null ? jQuery : typeof Zepto !== "undefined" && Zepto !== null ? Zepto : null) != null) {
    _ref.fn.asEventStream = Bacon.$.asEventStream;
  }

  Bacon.fromEventTarget = function(target, eventName, eventTransformer) {
    var sub, unsub, _ref1, _ref2, _ref3, _ref4;
    sub = (_ref1 = target.addEventListener) != null ? _ref1 : (_ref2 = target.addListener) != null ? _ref2 : target.bind;
    unsub = (_ref3 = target.removeEventListener) != null ? _ref3 : (_ref4 = target.removeListener) != null ? _ref4 : target.unbind;
    return Bacon.fromBinder(function(handler) {
      sub.call(target, eventName, handler);
      return function() {
        return unsub.call(target, eventName, handler);
      };
    }, eventTransformer);
  };

  Bacon.fromPromise = function(promise, abort) {
    return Bacon.fromBinder(function(handler) {
      promise.then(handler, function(e) {
        return handler(new Error(e));
      });
      return function() {
        if (abort) {
          return typeof promise.abort === "function" ? promise.abort() : void 0;
        }
      };
    }, function(value) {
      return [value, end()];
    });
  };

  Bacon.noMore = ["<no-more>"];

  Bacon.more = ["<more>"];

  Bacon.later = function(delay, value) {
    return Bacon.sequentially(delay, [value]);
  };

  Bacon.sequentially = function(delay, values) {
    var index;
    index = 0;
    return Bacon.fromPoll(delay, function() {
      var value;
      value = values[index++];
      if (index < values.length) {
        return value;
      } else if (index === values.length) {
        return [value, end()];
      } else {
        return end();
      }
    });
  };

  Bacon.repeatedly = function(delay, values) {
    var index;
    index = 0;
    return Bacon.fromPoll(delay, function() {
      return values[index++ % values.length];
    });
  };

  withMethodCallSupport = function(wrapped) {
    return function() {
      var args, context, f, methodName;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (typeof f === "object" && args.length) {
        context = f;
        methodName = args[0];
        f = function() {
          return context[methodName].apply(context, arguments);
        };
        args = args.slice(1);
      }
      return wrapped.apply(null, [f].concat(__slice.call(args)));
    };
  };

  liftCallback = function(wrapped) {
    return withMethodCallSupport(function() {
      var args, f, stream;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      stream = partiallyApplied(wrapped, [
        function(values, callback) {
          return f.apply(null, __slice.call(values).concat([callback]));
        }
      ]);
      return Bacon.combineAsArray(args).flatMap(stream);
    });
  };

  Bacon.fromCallback = liftCallback(function() {
    var args, f;
    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.fromBinder(function(handler) {
      makeFunction(f, args)(handler);
      return nop;
    }, function(value) {
      return [value, end()];
    });
  });

  Bacon.fromNodeCallback = liftCallback(function() {
    var args, f;
    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.fromBinder(function(handler) {
      makeFunction(f, args)(handler);
      return nop;
    }, function(error, value) {
      if (error) {
        return [new Error(error), end()];
      }
      return [value, end()];
    });
  });

  Bacon.fromPoll = function(delay, poll) {
    return Bacon.fromBinder(function(handler) {
      var id;
      id = Bacon.scheduler.setInterval(handler, delay);
      return function() {
        return Bacon.scheduler.clearInterval(id);
      };
    }, poll);
  };

  Bacon.interval = function(delay, value) {
    if (value == null) {
      value = {};
    }
    return Bacon.fromPoll(delay, function() {
      return next(value);
    });
  };

  Bacon.constant = function(value) {
    return new Property(function(sink) {
      sink(initial(value));
      sink(end());
      return nop;
    });
  };

  Bacon.never = function() {
    return Bacon.fromArray([]);
  };

  Bacon.once = function(value) {
    return Bacon.fromArray([value]);
  };

  Bacon.fromArray = function(values) {
    assertArray(values);
    values = cloneArray(values);
    return new EventStream(function(sink) {
      var send, unsubd;
      unsubd = false;
      send = function() {
        var reply, value;
        if (_.empty(values)) {
          return sink(end());
        } else {
          value = values.splice(0, 1)[0];
          reply = sink(toEvent(value));
          if ((reply !== Bacon.noMore) && !unsubd) {
            return send();
          }
        }
      };
      send();
      return function() {
        return unsubd = true;
      };
    });
  };

  Bacon.mergeAll = function() {
    var streams;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (streams[0] instanceof Array) {
      streams = streams[0];
    }
    return _.fold(streams, Bacon.never(), (function(a, b) {
      return a.merge(b);
    }));
  };

  Bacon.zipAsArray = function() {
    var streams;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (streams[0] instanceof Array) {
      streams = streams[0];
    }
    return Bacon.zipWith(streams, function() {
      var xs;
      xs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return xs;
    });
  };

  Bacon.zipWith = function() {
    var f, streams, _ref1;
    f = arguments[0], streams = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!isFunction(f)) {
      _ref1 = [f, streams[0]], streams = _ref1[0], f = _ref1[1];
    }
    return Bacon.when(_.map((function(s) {
      return s.toEventStream();
    }), streams), f);
  };

  Bacon.combineAsArray = function() {
    var index, s, sources, stream, streams, _i, _len;
    streams = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (streams.length === 1 && streams[0] instanceof Array) {
      streams = streams[0];
    }
    for (index = _i = 0, _len = streams.length; _i < _len; index = ++_i) {
      stream = streams[index];
      if (!(stream instanceof Observable)) {
        streams[index] = Bacon.constant(stream);
      }
    }
    if (streams.length) {
      sources = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = streams.length; _j < _len1; _j++) {
          s = streams[_j];
          _results.push(new Source(s, true, false, s.subscribeInternal));
        }
        return _results;
      })();
      return Bacon.when(sources, (function() {
        var xs;
        xs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return xs;
      })).toProperty();
    } else {
      return Bacon.constant([]);
    }
  };

  Bacon.onValues = function() {
    var f, streams, _i;
    streams = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), f = arguments[_i++];
    return Bacon.combineAsArray(streams).onValues(f);
  };

  Bacon.combineWith = function() {
    var f, streams;
    f = arguments[0], streams = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.combineAsArray(streams).map(function(values) {
      return f.apply(null, values);
    });
  };

  Bacon.combineTemplate = function(template) {
    var applyStreamValue, combinator, compile, compileTemplate, constantValue, current, funcs, mkContext, setValue, streams;
    funcs = [];
    streams = [];
    current = function(ctxStack) {
      return ctxStack[ctxStack.length - 1];
    };
    setValue = function(ctxStack, key, value) {
      return current(ctxStack)[key] = value;
    };
    applyStreamValue = function(key, index) {
      return function(ctxStack, values) {
        return setValue(ctxStack, key, values[index]);
      };
    };
    constantValue = function(key, value) {
      return function(ctxStack) {
        return setValue(ctxStack, key, value);
      };
    };
    mkContext = function(template) {
      if (template instanceof Array) {
        return [];
      } else {
        return {};
      }
    };
    compile = function(key, value) {
      var popContext, pushContext;
      if (value instanceof Observable) {
        streams.push(value);
        return funcs.push(applyStreamValue(key, streams.length - 1));
      } else if (value === Object(value) && typeof value !== "function") {
        pushContext = function(key) {
          return function(ctxStack) {
            var newContext;
            newContext = mkContext(value);
            setValue(ctxStack, key, newContext);
            return ctxStack.push(newContext);
          };
        };
        popContext = function(ctxStack) {
          return ctxStack.pop();
        };
        funcs.push(pushContext(key));
        compileTemplate(value);
        return funcs.push(popContext);
      } else {
        return funcs.push(constantValue(key, value));
      }
    };
    compileTemplate = function(template) {
      return _.each(template, compile);
    };
    compileTemplate(template);
    combinator = function(values) {
      var ctxStack, f, rootContext, _i, _len;
      rootContext = mkContext(template);
      ctxStack = [rootContext];
      for (_i = 0, _len = funcs.length; _i < _len; _i++) {
        f = funcs[_i];
        f(ctxStack, values);
      }
      return rootContext;
    };
    return Bacon.combineAsArray(streams).map(combinator);
  };

  Event = (function() {
    function Event() {}

    Event.prototype.isEvent = function() {
      return true;
    };

    Event.prototype.isEnd = function() {
      return false;
    };

    Event.prototype.isInitial = function() {
      return false;
    };

    Event.prototype.isNext = function() {
      return false;
    };

    Event.prototype.isError = function() {
      return false;
    };

    Event.prototype.hasValue = function() {
      return false;
    };

    Event.prototype.filter = function() {
      return true;
    };

    return Event;

  })();

  Next = (function(_super) {
    __extends(Next, _super);

    function Next(valueF) {
      if (isFunction(valueF)) {
        this.value = _.cached(valueF);
      } else {
        this.value = _.always(valueF);
      }
    }

    Next.prototype.isNext = function() {
      return true;
    };

    Next.prototype.hasValue = function() {
      return true;
    };

    Next.prototype.fmap = function(f) {
      var _this = this;
      return this.apply(function() {
        return f(_this.value());
      });
    };

    Next.prototype.apply = function(value) {
      return new Next(value);
    };

    Next.prototype.filter = function(f) {
      return f(this.value());
    };

    Next.prototype.describe = function() {
      return this.value();
    };

    return Next;

  })(Event);

  Initial = (function(_super) {
    __extends(Initial, _super);

    function Initial() {
      _ref1 = Initial.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    Initial.prototype.isInitial = function() {
      return true;
    };

    Initial.prototype.isNext = function() {
      return false;
    };

    Initial.prototype.apply = function(value) {
      return new Initial(value);
    };

    Initial.prototype.toNext = function() {
      return new Next(this.value);
    };

    return Initial;

  })(Next);

  End = (function(_super) {
    __extends(End, _super);

    function End() {
      _ref2 = End.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    End.prototype.isEnd = function() {
      return true;
    };

    End.prototype.fmap = function() {
      return this;
    };

    End.prototype.apply = function() {
      return this;
    };

    End.prototype.describe = function() {
      return "<end>";
    };

    return End;

  })(Event);

  Error = (function(_super) {
    __extends(Error, _super);

    function Error(error) {
      this.error = error;
    }

    Error.prototype.isError = function() {
      return true;
    };

    Error.prototype.fmap = function() {
      return this;
    };

    Error.prototype.apply = function() {
      return this;
    };

    Error.prototype.describe = function() {
      return "<error> " + this.error;
    };

    return Error;

  })(Event);

  Observable = (function() {
    function Observable() {
      this.combine = __bind(this.combine, this);
      this.flatMapLatest = __bind(this.flatMapLatest, this);
      this.fold = __bind(this.fold, this);
      this.scan = __bind(this.scan, this);
      this.assign = this.onValue;
    }

    Observable.prototype.onValue = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.subscribe(function(event) {
        if (event.hasValue()) {
          return f(event.value());
        }
      });
    };

    Observable.prototype.onValues = function(f) {
      return this.onValue(function(args) {
        return f.apply(null, args);
      });
    };

    Observable.prototype.onError = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.subscribe(function(event) {
        if (event.isError()) {
          return f(event.error);
        }
      });
    };

    Observable.prototype.onEnd = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.subscribe(function(event) {
        if (event.isEnd()) {
          return f();
        }
      });
    };

    Observable.prototype.errors = function() {
      return this.filter(function() {
        return false;
      });
    };

    Observable.prototype.filter = function() {
      var args, f;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return convertArgsToFunction(this, f, args, function(f) {
        return this.withHandler(function(event) {
          if (event.filter(f)) {
            return this.push(event);
          } else {
            return Bacon.more;
          }
        });
      });
    };

    Observable.prototype.takeWhile = function() {
      var args, f;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return convertArgsToFunction(this, f, args, function(f) {
        return this.withHandler(function(event) {
          if (event.filter(f)) {
            return this.push(event);
          } else {
            this.push(end());
            return Bacon.noMore;
          }
        });
      });
    };

    Observable.prototype.endOnError = function() {
      var args, f;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (f == null) {
        f = true;
      }
      return convertArgsToFunction(this, f, args, function(f) {
        return this.withHandler(function(event) {
          if (event.isError() && f(event.error)) {
            this.push(event);
            return this.push(end());
          } else {
            return this.push(event);
          }
        });
      });
    };

    Observable.prototype.take = function(count) {
      if (count <= 0) {
        return Bacon.never();
      }
      return this.withHandler(function(event) {
        if (!event.hasValue()) {
          return this.push(event);
        } else {
          count--;
          if (count > 0) {
            return this.push(event);
          } else {
            if (count === 0) {
              this.push(event);
            }
            this.push(end());
            return Bacon.noMore;
          }
        }
      });
    };

    Observable.prototype.map = function() {
      var args, p;
      p = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (p instanceof Property) {
        return p.sampledBy(this, former);
      } else {
        return convertArgsToFunction(this, p, args, function(f) {
          return this.withHandler(function(event) {
            return this.push(event.fmap(f));
          });
        });
      }
    };

    Observable.prototype.mapError = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.withHandler(function(event) {
        if (event.isError()) {
          return this.push(next(f(event.error)));
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.mapEnd = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.withHandler(function(event) {
        if (event.isEnd()) {
          this.push(next(f(event)));
          this.push(end());
          return Bacon.noMore;
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.doAction = function() {
      var f;
      f = makeFunctionArgs(arguments);
      return this.withHandler(function(event) {
        if (event.hasValue()) {
          f(event.value());
        }
        return this.push(event);
      });
    };

    Observable.prototype.skip = function(count) {
      return this.withHandler(function(event) {
        if (!event.hasValue()) {
          return this.push(event);
        } else if (count > 0) {
          count--;
          return Bacon.more;
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.skipDuplicates = function(isEqual) {
      if (isEqual == null) {
        isEqual = function(a, b) {
          return a === b;
        };
      }
      return this.withStateMachine(None, function(prev, event) {
        if (!event.hasValue()) {
          return [prev, [event]];
        } else if (event.isInitial() || prev === None || !isEqual(prev.get(), event.value())) {
          return [new Some(event.value()), [event]];
        } else {
          return [prev, []];
        }
      });
    };

    Observable.prototype.skipErrors = function() {
      return this.withHandler(function(event) {
        if (event.isError()) {
          return Bacon.more;
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.withStateMachine = function(initState, f) {
      var state;
      state = initState;
      return this.withHandler(function(event) {
        var fromF, newState, output, outputs, reply, _i, _len;
        fromF = f(state, event);
        newState = fromF[0], outputs = fromF[1];
        state = newState;
        reply = Bacon.more;
        for (_i = 0, _len = outputs.length; _i < _len; _i++) {
          output = outputs[_i];
          reply = this.push(output);
          if (reply === Bacon.noMore) {
            return reply;
          }
        }
        return reply;
      });
    };

    Observable.prototype.scan = function(seed, f, lazyF) {
      var acc, f_, subscribe,
        _this = this;
      f_ = toCombinator(f);
      f = lazyF ? f_ : function(x, y) {
        return f_(x(), y());
      };
      acc = toOption(seed).map(function(x) {
        return _.always(x);
      });
      subscribe = function(sink) {
        var initSent, reply, sendInit, unsub;
        initSent = false;
        unsub = nop;
        reply = Bacon.more;
        sendInit = function() {
          if (!initSent) {
            initSent = true;
            return acc.forEach(function(valueF) {
              reply = sink(new Initial(valueF));
              if (reply === Bacon.noMore) {
                unsub();
                return unsub = nop;
              }
            });
          }
        };
        unsub = _this.subscribe(function(event) {
          var next, prev;
          if (event.hasValue()) {
            if (initSent && event.isInitial()) {
              return Bacon.more;
            } else {
              if (!event.isInitial()) {
                sendInit();
              }
              initSent = true;
              prev = acc.getOrElse(function() {
                return void 0;
              });
              next = _.cached(function() {
                return f(prev, event.value);
              });
              acc = new Some(next);
              return sink(event.apply(next));
            }
          } else {
            if (event.isEnd()) {
              reply = sendInit();
            }
            if (reply !== Bacon.noMore) {
              return sink(event);
            }
          }
        });
        sendInit();
        return unsub;
      };
      return new Property(subscribe);
    };

    Observable.prototype.fold = function(seed, f) {
      return this.scan(seed, f).sampledBy(this.filter(false).mapEnd().toProperty());
    };

    Observable.prototype.zip = function(other, f) {
      if (f == null) {
        f = Array;
      }
      return Bacon.zipWith([this, other], f);
    };

    Observable.prototype.diff = function(start, f) {
      f = toCombinator(f);
      return this.scan([start], function(prevTuple, next) {
        return [next, f(prevTuple[0], next)];
      }).filter(function(tuple) {
        return tuple.length === 2;
      }).map(function(tuple) {
        return tuple[1];
      });
    };

    Observable.prototype.flatMap = function(f, firstOnly) {
      var root;
      f = makeSpawner(f);
      root = this;
      return new EventStream(function(sink) {
        var checkEnd, composite;
        composite = new CompositeUnsubscribe();
        checkEnd = function(unsub) {
          unsub();
          if (composite.empty()) {
            return sink(end());
          }
        };
        composite.add(function(__, unsubRoot) {
          return root.subscribe(function(event) {
            var child;
            if (event.isEnd()) {
              return checkEnd(unsubRoot);
            } else if (event.isError()) {
              return sink(event);
            } else if (firstOnly && composite.count() > 1) {
              return Bacon.more;
            } else {
              if (composite.unsubscribed) {
                return Bacon.noMore;
              }
              child = f(event.value());
              if (!(child instanceof Observable)) {
                child = Bacon.once(child);
              }
              return composite.add(function(unsubAll, unsubMe) {
                return child.subscribe(function(event) {
                  var reply;
                  if (event.isEnd()) {
                    checkEnd(unsubMe);
                    return Bacon.noMore;
                  } else {
                    if (event instanceof Initial) {
                      event = event.toNext();
                    }
                    reply = sink(event);
                    if (reply === Bacon.noMore) {
                      unsubAll();
                    }
                    return reply;
                  }
                });
              });
            }
          });
        });
        return composite.unsubscribe;
      });
    };

    Observable.prototype.flatMapFirst = function(f) {
      return this.flatMap(f, true);
    };

    Observable.prototype.flatMapLatest = function(f) {
      var stream,
        _this = this;
      f = makeSpawner(f);
      stream = this.toEventStream();
      return stream.flatMap(function(value) {
        return f(value).takeUntil(stream);
      });
    };

    Observable.prototype.not = function() {
      return this.map(function(x) {
        return !x;
      });
    };

    Observable.prototype.log = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.subscribe(function(event) {
        return typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log.apply(console, __slice.call(args).concat([event.describe()])) : void 0 : void 0;
      });
      return this;
    };

    Observable.prototype.slidingWindow = function(n, minValues) {
      if (minValues == null) {
        minValues = 0;
      }
      return this.scan([], (function(window, value) {
        return window.concat([value]).slice(-n);
      })).filter((function(values) {
        return values.length >= minValues;
      }));
    };

    Observable.prototype.combine = function(other, f) {
      var combinator;
      combinator = toCombinator(f);
      return Bacon.combineAsArray(this, other).map(function(values) {
        return combinator(values[0], values[1]);
      });
    };

    Observable.prototype.decode = function(cases) {
      return this.combine(Bacon.combineTemplate(cases), function(key, values) {
        return values[key];
      });
    };

    Observable.prototype.awaiting = function(other) {
      return this.toEventStream().map(true).merge(other.toEventStream().map(false)).toProperty(false);
    };

    return Observable;

  })();

  Observable.prototype.reduce = Observable.prototype.fold;

  EventStream = (function(_super) {
    __extends(EventStream, _super);

    function EventStream(subscribe) {
      this.takeUntil = __bind(this.takeUntil, this);
      this.sampledBy = __bind(this.sampledBy, this);
      var dispatcher;
      EventStream.__super__.constructor.call(this);
      assertFunction(subscribe);
      dispatcher = new Dispatcher(subscribe);
      this.subscribe = dispatcher.subscribe;
      this.subscribeInternal = this.subscribe;
      this.hasSubscribers = dispatcher.hasSubscribers;
    }

    EventStream.prototype.delay = function(delay) {
      return this.flatMap(function(value) {
        return Bacon.later(delay, value);
      });
    };

    EventStream.prototype.debounce = function(delay) {
      return this.flatMapLatest(function(value) {
        return Bacon.later(delay, value);
      });
    };

    EventStream.prototype.debounceImmediate = function(delay) {
      return this.flatMapFirst(function(value) {
        return Bacon.once(value).concat(Bacon.later(delay).filter(false));
      });
    };

    EventStream.prototype.throttle = function(delay) {
      return this.bufferWithTime(delay).map(function(values) {
        return values[values.length - 1];
      });
    };

    EventStream.prototype.bufferWithTime = function(delay) {
      return this.bufferWithTimeOrCount(delay, Number.MAX_VALUE);
    };

    EventStream.prototype.bufferWithCount = function(count) {
      return this.bufferWithTimeOrCount(void 0, count);
    };

    EventStream.prototype.bufferWithTimeOrCount = function(delay, count) {
      var flushOrSchedule;
      flushOrSchedule = function(buffer) {
        if (buffer.values.length === count) {
          return buffer.flush();
        } else if (delay !== void 0) {
          return buffer.schedule();
        }
      };
      return this.buffer(delay, flushOrSchedule, flushOrSchedule);
    };

    EventStream.prototype.buffer = function(delay, onInput, onFlush) {
      var buffer, delayMs, reply;
      if (onInput == null) {
        onInput = (function() {});
      }
      if (onFlush == null) {
        onFlush = (function() {});
      }
      buffer = {
        scheduled: false,
        end: null,
        values: [],
        flush: function() {
          var reply;
          this.scheduled = false;
          if (this.values.length > 0) {
            reply = this.push(next(this.values));
            this.values = [];
            if (this.end != null) {
              return this.push(this.end);
            } else if (reply !== Bacon.noMore) {
              return onFlush(this);
            }
          } else {
            if (this.end != null) {
              return this.push(this.end);
            }
          }
        },
        schedule: function() {
          var _this = this;
          if (!this.scheduled) {
            this.scheduled = true;
            return delay(function() {
              return _this.flush();
            });
          }
        }
      };
      reply = Bacon.more;
      if (!isFunction(delay)) {
        delayMs = delay;
        delay = function(f) {
          return Bacon.scheduler.setTimeout(f, delayMs);
        };
      }
      return this.withHandler(function(event) {
        buffer.push = this.push;
        if (event.isError()) {
          reply = this.push(event);
        } else if (event.isEnd()) {
          buffer.end = event;
          if (!buffer.scheduled) {
            buffer.flush();
          }
        } else {
          buffer.values.push(event.value());
          onInput(buffer);
        }
        return reply;
      });
    };

    EventStream.prototype.merge = function(right) {
      var left;
      assertEventStream(right);
      left = this;
      return new EventStream(function(sink) {
        var ends, smartSink;
        ends = 0;
        smartSink = function(obs) {
          return function(unsubBoth) {
            return obs.subscribe(function(event) {
              var reply;
              if (event.isEnd()) {
                ends++;
                if (ends === 2) {
                  return sink(end());
                } else {
                  return Bacon.more;
                }
              } else {
                reply = sink(event);
                if (reply === Bacon.noMore) {
                  unsubBoth();
                }
                return reply;
              }
            });
          };
        };
        return compositeUnsubscribe(smartSink(left), smartSink(right));
      });
    };

    EventStream.prototype.toProperty = function(initValue) {
      if (arguments.length === 0) {
        initValue = None;
      }
      return this.scan(initValue, latterF, true);
    };

    EventStream.prototype.toEventStream = function() {
      return this;
    };

    EventStream.prototype.sampledBy = function(sampler, combinator) {
      return this.toProperty().sampledBy(sampler, combinator);
    };

    EventStream.prototype.concat = function(right) {
      var left;
      left = this;
      return new EventStream(function(sink) {
        var unsubLeft, unsubRight;
        unsubRight = nop;
        unsubLeft = left.subscribe(function(e) {
          if (e.isEnd()) {
            return unsubRight = right.subscribe(sink);
          } else {
            return sink(e);
          }
        });
        return function() {
          unsubLeft();
          return unsubRight();
        };
      });
    };

    EventStream.prototype.takeUntil = function(stopper) {
      var self;
      self = this;
      return new EventStream(function(sink) {
        var produce, stop;
        stop = function(unsubAll) {
          return stopper.onValue(function() {
            sink(end());
            unsubAll();
            return Bacon.noMore;
          });
        };
        produce = function(unsubAll) {
          return self.subscribe(function(x) {
            var reply;
            reply = sink(x);
            if (x.isEnd() || reply === Bacon.noMore) {
              unsubAll();
            }
            return reply;
          });
        };
        return compositeUnsubscribe(stop, produce);
      });
    };

    EventStream.prototype.skipUntil = function(starter) {
      var started;
      started = starter.take(1).map(true).toProperty(false);
      return this.filter(started);
    };

    EventStream.prototype.skipWhile = function() {
      var args, f, ok;
      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      ok = false;
      return convertArgsToFunction(this, f, args, function(f) {
        return this.withHandler(function(event) {
          if (ok || !event.hasValue() || !f(event.value())) {
            if (event.hasValue()) {
              ok = true;
            }
            return this.push(event);
          } else {
            return Bacon.more;
          }
        });
      });
    };

    EventStream.prototype.startWith = function(seed) {
      return Bacon.once(seed).concat(this);
    };

    EventStream.prototype.withHandler = function(handler) {
      var dispatcher;
      dispatcher = new Dispatcher(this.subscribe, handler);
      return new EventStream(dispatcher.subscribe);
    };

    EventStream.prototype.withSubscribe = function(subscribe) {
      return new EventStream(subscribe);
    };

    return EventStream;

  })(Observable);

  Property = (function(_super) {
    __extends(Property, _super);

    function Property(subscribe, handler) {
      this.toEventStream = __bind(this.toEventStream, this);
      this.toProperty = __bind(this.toProperty, this);
      this.changes = __bind(this.changes, this);
      this.sample = __bind(this.sample, this);
      var _this = this;
      Property.__super__.constructor.call(this);
      if (handler === true) {
        this.subscribeInternal = subscribe;
      } else {
        this.subscribeInternal = new PropertyDispatcher(subscribe, handler).subscribe;
      }
      this.sampledBy = function(sampler, combinator) {
        var lazy, samplerSource, stream, thisSource;
        if (combinator != null) {
          combinator = toCombinator(combinator);
        } else {
          lazy = true;
          combinator = function(f) {
            return f();
          };
        }
        thisSource = new Source(_this, false, false, _this.subscribeInternal, lazy);
        samplerSource = new Source(sampler, true, false, sampler.subscribe, lazy);
        stream = Bacon.when([thisSource, samplerSource], combinator);
        if (sampler instanceof Property) {
          return stream.toProperty();
        } else {
          return stream;
        }
      };
      this.subscribe = function(sink) {
        var LatestEvent, end, reply, unsub, value;
        reply = Bacon.more;
        LatestEvent = (function() {
          function LatestEvent() {}

          LatestEvent.prototype.set = function(event) {
            return this.event = event;
          };

          LatestEvent.prototype.send = function() {
            var event;
            event = this.event;
            this.event = null;
            if ((event != null) && reply !== Bacon.noMore) {
              reply = sink(event);
              if (reply === Bacon.noMore) {
                return unsub();
              }
            }
          };

          return LatestEvent;

        })();
        value = new LatestEvent();
        end = new LatestEvent();
        unsub = nop;
        unsub = _this.subscribeInternal(function(event) {
          if (event.isError()) {
            if (reply !== Bacon.noMore) {
              reply = sink(event);
            }
          } else {
            if (event.hasValue()) {
              value.set(event);
            } else if (event.isEnd()) {
              end.set(event);
            }
            PropertyTransaction.onDone(function() {
              value.send();
              return end.send();
            });
          }
          return reply;
        });
        return function() {
          reply = Bacon.noMore;
          return unsub();
        };
      };
    }

    Property.prototype.sample = function(interval) {
      return this.sampledBy(Bacon.interval(interval, {}));
    };

    Property.prototype.changes = function() {
      var _this = this;
      return new EventStream(function(sink) {
        return _this.subscribe(function(event) {
          if (!event.isInitial()) {
            return sink(event);
          }
        });
      });
    };

    Property.prototype.withHandler = function(handler) {
      return new Property(this.subscribeInternal, handler);
    };

    Property.prototype.withSubscribe = function(subscribe) {
      return new Property(subscribe);
    };

    Property.prototype.toProperty = function() {
      assertNoArguments(arguments);
      return this;
    };

    Property.prototype.toEventStream = function() {
      var _this = this;
      return new EventStream(function(sink) {
        return _this.subscribe(function(event) {
          if (event.isInitial()) {
            event = event.toNext();
          }
          return sink(event);
        });
      });
    };

    Property.prototype.and = function(other) {
      return this.combine(other, function(x, y) {
        return x && y;
      });
    };

    Property.prototype.or = function(other) {
      return this.combine(other, function(x, y) {
        return x || y;
      });
    };

    Property.prototype.delay = function(delay) {
      return this.delayChanges(function(changes) {
        return changes.delay(delay);
      });
    };

    Property.prototype.debounce = function(delay) {
      return this.delayChanges(function(changes) {
        return changes.debounce(delay);
      });
    };

    Property.prototype.throttle = function(delay) {
      return this.delayChanges(function(changes) {
        return changes.throttle(delay);
      });
    };

    Property.prototype.delayChanges = function(f) {
      return addPropertyInitValueToStream(this, f(this.changes()));
    };

    Property.prototype.takeUntil = function(stopper) {
      var changes;
      changes = this.changes().takeUntil(stopper);
      return addPropertyInitValueToStream(this, changes);
    };

    Property.prototype.startWith = function(value) {
      return this.scan(value, function(prev, next) {
        return next;
      });
    };

    return Property;

  })(Observable);

  convertArgsToFunction = function(obs, f, args, method) {
    var sampled;
    if (f instanceof Property) {
      sampled = f.sampledBy(obs, function(p, s) {
        return [p, s];
      });
      return method.apply(sampled, [
        function(_arg) {
          var p, s;
          p = _arg[0], s = _arg[1];
          return p;
        }
      ]).map(function(_arg) {
        var p, s;
        p = _arg[0], s = _arg[1];
        return s;
      });
    } else {
      f = makeFunction(f, args);
      return method.apply(obs, [f]);
    }
  };

  addPropertyInitValueToStream = function(property, stream) {
    var getInitValue;
    getInitValue = function(property) {
      var value;
      value = None;
      property.subscribe(function(event) {
        if (event.hasValue()) {
          value = new Some(event.value());
        }
        return Bacon.noMore;
      });
      return value;
    };
    return stream.toProperty(getInitValue(property));
  };

  Dispatcher = (function() {
    function Dispatcher(subscribe, handleEvent) {
      var done, ended, prevError, pushing, queue, removeSub, subscriptions, unsubscribeFromSource, waiters,
        _this = this;
      if (subscribe == null) {
        subscribe = function() {
          return nop;
        };
      }
      subscriptions = [];
      queue = null;
      pushing = false;
      ended = false;
      this.hasSubscribers = function() {
        return subscriptions.length > 0;
      };
      prevError = null;
      unsubscribeFromSource = nop;
      removeSub = function(subscription) {
        return subscriptions = _.without(subscription, subscriptions);
      };
      waiters = null;
      done = function() {
        var w, ws, _i, _len, _results;
        if (waiters != null) {
          ws = waiters;
          waiters = null;
          _results = [];
          for (_i = 0, _len = ws.length; _i < _len; _i++) {
            w = ws[_i];
            _results.push(w());
          }
          return _results;
        }
      };
      this.push = function(event) {
        var reply, sub, success, tmp, _i, _len;
        if (!pushing) {
          if (event === prevError) {
            return;
          }
          if (event.isError()) {
            prevError = event;
          }
          success = false;
          try {
            pushing = true;
            tmp = subscriptions;
            for (_i = 0, _len = tmp.length; _i < _len; _i++) {
              sub = tmp[_i];
              reply = sub.sink(event);
              if (reply === Bacon.noMore || event.isEnd()) {
                removeSub(sub);
              }
            }
            success = true;
          } finally {
            pushing = false;
            if (!success) {
              queue = null;
            }
          }
          success = true;
          while (queue != null ? queue.length : void 0) {
            event = _.head(queue);
            queue = _.tail(queue);
            _this.push(event);
          }
          done(event);
          if (_this.hasSubscribers()) {
            return Bacon.more;
          } else {
            return Bacon.noMore;
          }
        } else {
          queue = (queue || []).concat([event]);
          return Bacon.more;
        }
      };
      if (handleEvent == null) {
        handleEvent = function(event) {
          return this.push(event);
        };
      }
      this.handleEvent = function(event) {
        if (event.isEnd()) {
          ended = true;
        }
        return handleEvent.apply(_this, [event]);
      };
      this.subscribe = function(sink) {
        var subscription;
        if (ended) {
          sink(end());
          return nop;
        } else {
          assertFunction(sink);
          subscription = {
            sink: sink
          };
          subscriptions = subscriptions.concat(subscription);
          if (subscriptions.length === 1) {
            unsubscribeFromSource = subscribe(_this.handleEvent);
          }
          assertFunction(unsubscribeFromSource);
          return function() {
            removeSub(subscription);
            if (!_this.hasSubscribers()) {
              return unsubscribeFromSource();
            }
          };
        }
      };
    }

    return Dispatcher;

  })();

  PropertyDispatcher = (function(_super) {
    __extends(PropertyDispatcher, _super);

    function PropertyDispatcher(subscribe, handleEvent) {
      var current, ended, push,
        _this = this;
      PropertyDispatcher.__super__.constructor.call(this, subscribe, handleEvent);
      current = None;
      push = this.push;
      subscribe = this.subscribe;
      ended = false;
      this.push = function(event) {
        if (event.isEnd()) {
          ended = true;
        }
        if (event.hasValue()) {
          current = new Some(event.value);
        }
        return PropertyTransaction.inTransaction(function() {
          return push.apply(_this, [event]);
        });
      };
      this.subscribe = function(sink) {
        var initSent, reply, shouldBounceInitialValue;
        initSent = false;
        shouldBounceInitialValue = function() {
          return _this.hasSubscribers() || ended;
        };
        reply = current.filter(shouldBounceInitialValue).map(function(val) {
          return sink(initial(val()));
        });
        if (reply.getOrElse(Bacon.more) === Bacon.noMore) {
          return nop;
        } else if (ended) {
          sink(end());
          return nop;
        } else {
          return subscribe.apply(_this, [sink]);
        }
      };
    }

    return PropertyDispatcher;

  })(Dispatcher);

  PropertyTransaction = (function() {
    var inTransaction, onDone, tx, txListeners;
    txListeners = [];
    tx = false;
    onDone = function(f) {
      if (tx) {
        return txListeners.push(f);
      } else {
        return f();
      }
    };
    inTransaction = function(f) {
      var g, gs, result, _i, _len;
      if (tx) {
        return f();
      } else {
        tx = true;
        try {
          result = f();
        } finally {
          tx = false;
        }
        gs = txListeners;
        txListeners = [];
        for (_i = 0, _len = gs.length; _i < _len; _i++) {
          g = gs[_i];
          g();
        }
        return result;
      }
    };
    return {
      onDone: onDone,
      inTransaction: inTransaction
    };
  })();

  Bus = (function(_super) {
    __extends(Bus, _super);

    function Bus() {
      var ended, guardedSink, sink, subscribeAll, subscribeInput, subscriptions, unsubAll, unsubscribeInput,
        _this = this;
      sink = void 0;
      subscriptions = [];
      ended = false;
      guardedSink = function(input) {
        return function(event) {
          if (event.isEnd()) {
            unsubscribeInput(input);
            return Bacon.noMore;
          } else {
            return sink(event);
          }
        };
      };
      unsubAll = function() {
        var sub, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = subscriptions.length; _i < _len; _i++) {
          sub = subscriptions[_i];
          _results.push(typeof sub.unsub === "function" ? sub.unsub() : void 0);
        }
        return _results;
      };
      subscribeInput = function(subscription) {
        return subscription.unsub = subscription.input.subscribe(guardedSink(subscription.input));
      };
      unsubscribeInput = function(input) {
        var i, sub, _i, _len;
        for (i = _i = 0, _len = subscriptions.length; _i < _len; i = ++_i) {
          sub = subscriptions[i];
          if (sub.input === input) {
            if (typeof sub.unsub === "function") {
              sub.unsub();
            }
            subscriptions.splice(i, 1);
            return;
          }
        }
      };
      subscribeAll = function(newSink) {
        var subscription, _i, _len, _ref3;
        sink = newSink;
        _ref3 = cloneArray(subscriptions);
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          subscription = _ref3[_i];
          subscribeInput(subscription);
        }
        return unsubAll;
      };
      Bus.__super__.constructor.call(this, subscribeAll);
      this.plug = function(input) {
        var sub;
        if (ended) {
          return;
        }
        sub = {
          input: input
        };
        subscriptions.push(sub);
        if ((sink != null)) {
          subscribeInput(sub);
        }
        return function() {
          return unsubscribeInput(input);
        };
      };
      this.push = function(value) {
        return typeof sink === "function" ? sink(next(value)) : void 0;
      };
      this.error = function(error) {
        return typeof sink === "function" ? sink(new Error(error)) : void 0;
      };
      this.end = function() {
        ended = true;
        unsubAll();
        return typeof sink === "function" ? sink(end()) : void 0;
      };
    }

    return Bus;

  })(EventStream);

  Source = (function() {
    function Source(s, sync, consume, subscribe, lazy) {
      var invoke, queue;
      this.sync = sync;
      this.subscribe = subscribe;
      if (lazy == null) {
        lazy = false;
      }
      queue = [];
      invoke = lazy ? _.id : function(f) {
        return f();
      };
      if (this.subscribe == null) {
        this.subscribe = s.subscribe;
      }
      this.markEnded = function() {
        return this.ended = true;
      };
      if (consume) {
        this.consume = function() {
          return invoke(queue.shift());
        };
        this.push = function(x) {
          return queue.push(x);
        };
        this.mayHave = function(c) {
          return !this.ended || queue.length >= c;
        };
        this.hasAtLeast = function(c) {
          return queue.length >= c;
        };
      } else {
        this.consume = function() {
          return invoke(queue[0]);
        };
        this.push = function(x) {
          return queue = [x];
        };
        this.mayHave = function() {
          return true;
        };
        this.hasAtLeast = function() {
          return queue.length;
        };
      }
    }

    return Source;

  })();

  Source.fromObservable = function(s) {
    if (s instanceof Source) {
      return s;
    } else if (s instanceof Property) {
      return new Source(s, false, false);
    } else {
      return new Source(s, true, true);
    }
  };

  Bacon.when = function() {
    var f, i, index, ix, len, pat, patSources, pats, patterns, s, sources, usage, _i, _j, _len, _len1, _ref3;
    patterns = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (patterns.length === 0) {
      return Bacon.never();
    }
    len = patterns.length;
    usage = "when: expecting arguments in the form (Observable+,function)+";
    assert(usage, len % 2 === 0);
    sources = [];
    pats = [];
    i = 0;
    while (i < len) {
      patSources = _.toArray(patterns[i]);
      f = patterns[i + 1];
      pat = {
        f: (isFunction(f) ? f : (function() {
          return f;
        })),
        ixs: []
      };
      for (_i = 0, _len = patSources.length; _i < _len; _i++) {
        s = patSources[_i];
        assert(s instanceof Observable, usage);
        index = indexOf(sources, s);
        if (index < 0) {
          sources.push(s);
          index = sources.length - 1;
        }
        _ref3 = pat.ixs;
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
          ix = _ref3[_j];
          if (ix.index === index) {
            ix.count++;
          }
        }
        pat.ixs.push({
          index: index,
          count: 1
        });
      }
      if (patSources.length > 0) {
        pats.push(pat);
      }
      i = i + 2;
    }
    if (!sources.length) {
      return Bacon.never();
    }
    sources = _.map(Source.fromObservable, sources);
    return new EventStream(function(sink) {
      var cannotMatch, cannotSync, match, part;
      match = function(p) {
        return _.all(p.ixs, function(i) {
          return sources[i.index].hasAtLeast(i.count);
        });
      };
      cannotSync = function(source) {
        return !source.sync || source.ended;
      };
      cannotMatch = function(p) {
        return _.any(p.ixs, function(i) {
          return !sources[i.index].mayHave(i.count);
        });
      };
      part = function(source) {
        return function(unsubAll) {
          return source.subscribe(function(e) {
            var p, reply, val, _k, _len2;
            if (e.isEnd()) {
              source.markEnded();
              if (_.all(sources, cannotSync) || _.all(pats, cannotMatch)) {
                reply = Bacon.noMore;
                sink(end());
              }
            } else if (e.isError()) {
              reply = sink(e);
            } else {
              source.push(e.value);
              if (source.sync) {
                for (_k = 0, _len2 = pats.length; _k < _len2; _k++) {
                  p = pats[_k];
                  if (match(p)) {
                    val = function() {
                      return p.f.apply(p, (function() {
                        var _l, _len3, _ref4, _results;
                        _ref4 = p.ixs;
                        _results = [];
                        for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
                          i = _ref4[_l];
                          _results.push(sources[i.index].consume());
                        }
                        return _results;
                      })());
                    };
                    reply = sink(e.apply(val));
                    break;
                  }
                }
              }
            }
            if (reply === Bacon.noMore) {
              unsubAll();
            }
            return reply || Bacon.more;
          });
        };
      };
      return compositeUnsubscribe.apply(null, (function() {
        var _k, _len2, _results;
        _results = [];
        for (i = _k = 0, _len2 = sources.length; _k < _len2; i = ++_k) {
          s = sources[i];
          _results.push(part(s, i));
        }
        return _results;
      })());
    });
  };

  Bacon.update = function() {
    var i, initial, lateBindFirst, patterns;
    initial = arguments[0], patterns = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    lateBindFirst = function(f) {
      return function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return function(i) {
          return f.apply(null, [i].concat(args));
        };
      };
    };
    i = patterns.length - 1;
    while (i > 0) {
      if (!(patterns[i] instanceof Function)) {
        patterns[i] = (function(x) {
          return function() {
            return x;
          };
        })(patterns[i]);
      }
      patterns[i] = lateBindFirst(patterns[i]);
      i = i - 2;
    }
    return Bacon.when.apply(Bacon, patterns).scan(initial, (function(x, f) {
      return f(x);
    }));
  };

  compositeUnsubscribe = function() {
    var ss;
    ss = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return new CompositeUnsubscribe(ss).unsubscribe;
  };

  CompositeUnsubscribe = (function() {
    function CompositeUnsubscribe(ss) {
      var s, _i, _len;
      if (ss == null) {
        ss = [];
      }
      this.empty = __bind(this.empty, this);
      this.count = __bind(this.count, this);
      this.unsubscribe = __bind(this.unsubscribe, this);
      this.add = __bind(this.add, this);
      this.unsubscribed = false;
      this.subscriptions = [];
      this.starting = [];
      for (_i = 0, _len = ss.length; _i < _len; _i++) {
        s = ss[_i];
        this.add(s);
      }
    }

    CompositeUnsubscribe.prototype.add = function(subscription) {
      var ended, unsub, unsubMe,
        _this = this;
      if (this.unsubscribed) {
        return;
      }
      ended = false;
      unsub = nop;
      this.starting.push(subscription);
      unsubMe = function() {
        if (_this.unsubscribed) {
          return;
        }
        ended = true;
        _this.remove(unsub);
        return _.remove(subscription, _this.starting);
      };
      unsub = subscription(this.unsubscribe, unsubMe);
      if (!(this.unsubscribed || ended)) {
        this.subscriptions.push(unsub);
      }
      _.remove(subscription, this.starting);
      return unsub;
    };

    CompositeUnsubscribe.prototype.remove = function(unsub) {
      if (this.unsubscribed) {
        return;
      }
      if ((_.remove(unsub, this.subscriptions)) !== void 0) {
        return unsub();
      }
    };

    CompositeUnsubscribe.prototype.unsubscribe = function() {
      var s, _i, _len, _ref3;
      if (this.unsubscribed) {
        return;
      }
      this.unsubscribed = true;
      _ref3 = this.subscriptions;
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        s = _ref3[_i];
        s();
      }
      this.subscriptions = [];
      return this.starting = [];
    };

    CompositeUnsubscribe.prototype.count = function() {
      if (this.unsubscribed) {
        return 0;
      }
      return this.subscriptions.length + this.starting.length;
    };

    CompositeUnsubscribe.prototype.empty = function() {
      return this.count() === 0;
    };

    return CompositeUnsubscribe;

  })();

  Bacon.CompositeUnsubscribe = CompositeUnsubscribe;

  Some = (function() {
    function Some(value) {
      this.value = value;
    }

    Some.prototype.getOrElse = function() {
      return this.value;
    };

    Some.prototype.get = function() {
      return this.value;
    };

    Some.prototype.filter = function(f) {
      if (f(this.value)) {
        return new Some(this.value);
      } else {
        return None;
      }
    };

    Some.prototype.map = function(f) {
      return new Some(f(this.value));
    };

    Some.prototype.forEach = function(f) {
      return f(this.value);
    };

    Some.prototype.isDefined = true;

    Some.prototype.toArray = function() {
      return [this.value];
    };

    return Some;

  })();

  None = {
    getOrElse: function(value) {
      return value;
    },
    filter: function() {
      return None;
    },
    map: function() {
      return None;
    },
    forEach: function() {},
    isDefined: false,
    toArray: function() {
      return [];
    }
  };

  Bacon.EventStream = EventStream;

  Bacon.Property = Property;

  Bacon.Observable = Observable;

  Bacon.Bus = Bus;

  Bacon.Initial = Initial;

  Bacon.Next = Next;

  Bacon.End = End;

  Bacon.Error = Error;

  nop = function() {};

  latterF = function(_, x) {
    return x();
  };

  former = function(x, _) {
    return x;
  };

  initial = function(value) {
    return new Initial(_.always(value));
  };

  next = function(value) {
    return new Next(_.always(value));
  };

  end = function() {
    return new End();
  };

  toEvent = function(x) {
    if (x instanceof Event) {
      return x;
    } else {
      return next(x);
    }
  };

  cloneArray = function(xs) {
    return xs.slice(0);
  };

  indexOf = Array.prototype.indexOf ? function(xs, x) {
    return xs.indexOf(x);
  } : function(xs, x) {
    var i, y, _i, _len;
    for (i = _i = 0, _len = xs.length; _i < _len; i = ++_i) {
      y = xs[i];
      if (x === y) {
        return i;
      }
    }
    return -1;
  };

  assert = function(message, condition) {
    if (!condition) {
      throw message;
    }
  };

  assertEvent = function(event) {
    return assert("not an event : " + event, event instanceof Event && event.isEvent());
  };

  assertEventStream = function(event) {
    return assert("not an EventStream : " + event, event instanceof EventStream);
  };

  assertFunction = function(f) {
    return assert("not a function : " + f, isFunction(f));
  };

  isFunction = function(f) {
    return typeof f === "function";
  };

  assertArray = function(xs) {
    return assert("not an array : " + xs, xs instanceof Array);
  };

  assertNoArguments = function(args) {
    return assert("no arguments supported", args.length === 0);
  };

  assertString = function(x) {
    return assert("not a string : " + x, typeof x === "string");
  };

  partiallyApplied = function(f, applied) {
    return function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return f.apply(null, applied.concat(args));
    };
  };

  makeSpawner = function(f) {
    if (f instanceof Observable) {
      f = _.always(f);
    }
    assertFunction(f);
    return f;
  };

  makeFunctionArgs = function(args) {
    args = Array.prototype.slice.call(args);
    return makeFunction_.apply(null, args);
  };

  makeFunction_ = withMethodCallSupport(function() {
    var args, f;
    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (isFunction(f)) {
      if (args.length) {
        return partiallyApplied(f, args);
      } else {
        return f;
      }
    } else if (isFieldKey(f)) {
      return toFieldExtractor(f, args);
    } else {
      return _.always(f);
    }
  });

  makeFunction = function(f, args) {
    return makeFunction_.apply(null, [f].concat(__slice.call(args)));
  };

  isFieldKey = function(f) {
    return (typeof f === "string") && f.length > 1 && f.charAt(0) === ".";
  };

  Bacon.isFieldKey = isFieldKey;

  toFieldExtractor = function(f, args) {
    var partFuncs, parts;
    parts = f.slice(1).split(".");
    partFuncs = _.map(toSimpleExtractor(args), parts);
    return function(value) {
      var _i, _len;
      for (_i = 0, _len = partFuncs.length; _i < _len; _i++) {
        f = partFuncs[_i];
        value = f(value);
      }
      return value;
    };
  };

  toSimpleExtractor = function(args) {
    return function(key) {
      return function(value) {
        var fieldValue;
        if (value == null) {
          return void 0;
        } else {
          fieldValue = value[key];
          if (isFunction(fieldValue)) {
            return fieldValue.apply(value, args);
          } else {
            return fieldValue;
          }
        }
      };
    };
  };

  toFieldKey = function(f) {
    return f.slice(1);
  };

  toCombinator = function(f) {
    var key;
    if (isFunction(f)) {
      return f;
    } else if (isFieldKey(f)) {
      key = toFieldKey(f);
      return function(left, right) {
        return left[key](right);
      };
    } else {
      return assert("not a function or a field key: " + f, false);
    }
  };

  toOption = function(v) {
    if (v instanceof Some || v === None) {
      return v;
    } else {
      return new Some(v);
    }
  };

  _ = {
    head: function(xs) {
      return xs[0];
    },
    always: function(x) {
      return function() {
        return x;
      };
    },
    negate: function(f) {
      return function(x) {
        return !f(x);
      };
    },
    empty: function(xs) {
      return xs.length === 0;
    },
    tail: function(xs) {
      return xs.slice(1, xs.length);
    },
    filter: function(f, xs) {
      var filtered, x, _i, _len;
      filtered = [];
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (f(x)) {
          filtered.push(x);
        }
      }
      return filtered;
    },
    map: function(f, xs) {
      var x, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        _results.push(f(x));
      }
      return _results;
    },
    each: function(xs, f) {
      var key, value, _results;
      _results = [];
      for (key in xs) {
        value = xs[key];
        _results.push(f(key, value));
      }
      return _results;
    },
    toArray: function(xs) {
      if (xs instanceof Array) {
        return xs;
      } else {
        return [xs];
      }
    },
    contains: function(xs, x) {
      return indexOf(xs, x) !== -1;
    },
    id: function(x) {
      return x;
    },
    last: function(xs) {
      return xs[xs.length - 1];
    },
    all: function(xs, f) {
      var x, _i, _len;
      if (f == null) {
        f = _.id;
      }
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (!f(x)) {
          return false;
        }
      }
      return true;
    },
    any: function(xs, f) {
      var x, _i, _len;
      if (f == null) {
        f = _.id;
      }
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (f(x)) {
          return true;
        }
      }
      return false;
    },
    without: function(x, xs) {
      return _.filter((function(y) {
        return y !== x;
      }), xs);
    },
    remove: function(x, xs) {
      var i;
      i = indexOf(xs, x);
      if (i >= 0) {
        return xs.splice(i, 1);
      }
    },
    fold: function(xs, seed, f) {
      var x, _i, _len;
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        seed = f(seed, x);
      }
      return seed;
    },
    cached: function(f) {
      var value;
      value = None;
      return function() {
        if (value === None) {
          value = f();
          f = null;
        }
        return value;
      };
    }
  };

  Bacon._ = _;

  Bacon.scheduler = {
    setTimeout: function(f, d) {
      return setTimeout(f, d);
    },
    setInterval: function(f, i) {
      return setInterval(f, i);
    },
    clearInterval: function(id) {
      return clearInterval(id);
    },
    now: function() {
      return new Date().getTime();
    }
  };

  if (typeof module !== "undefined" && module !== null) {
    module.exports = Bacon;
    Bacon.Bacon = Bacon;
  } else {
    if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
      define([], function() {
        return Bacon;
      });
    }
    this.Bacon = Bacon;
  }

}).call(this);

},{}],2:[function(require,module,exports){
// This is called whenever we want to save the current dictionary into the
// local storage area. We pass a some data to save and a callback which
// will be called when the data has been saved. The arguments sent to the
// call back are {data: data}. In the case of setLocalStorage, the data
// will be just a string indicating that we're done saving.
function save(obj, callback) {
  chrome.extension.sendRequest({
    method: "setLocalStorage",
    data: obj
  }, callback);
}

// This is called whenever we want an update on the stored dicitonary
// It will send a request to the background script which will query the
// localstorage database and send a response of the form {data: data}
function load(data, callback) {
  chrome.extension.sendRequest(
    {method: "getLocalStorage", data: data},
    function(response) {
      callback(response ? response.data : null);
  });
}

module.exports = {
  save: save,
  load: load
}

},{}],3:[function(require,module,exports){
// TODO: check if those functions actually work

function replaceWordGmail(div, pos, oldWord, newWord) {
  var txt = $(div).html().trim();
  var first = txt.substring(0, pos + 1);
  var last = txt.substring(pos + oldWord.length + 1, txt.length);
  $(div).html(first + newWord + last);
}

function replaceWordDefault(div, pos, oldWord, newWord) {
  var txt = $(div).val().trim();
  var first = txt.substring(0, pos + 1);
  var last = txt.substring(pos + oldWord.length + 1, txt.length);
  $(div).val(first + newWord + last);
}

function replaceWordFacebook(div, pos, oldWord, newWord) {
  // var txt = $(div).children('textarea').context.value;
  // while(txt.length && txt[txt.length - 1] !== ' ') {
  //     txt.length--;
  // }
  // $(div).children('textarea').context.value = (txt.join('') + words[0]);
  // console.log($(div).children('textarea').context.value);
  console.log("Not handling facebook yet...");
}

// TODO: implement this
function replaceWordiCloud(div, pos, oldWord, newWord) {
  console.log("Not implemented yet...");
}

// TODO: implement this too
function replaceWordjsFiddle(div, pos, oldWord, newWord) {
  console.log("Not implemented yet...");
}

module.exports = {
  replaceWordGmail: replaceWordGmail,
  replaceWordjsFiddle: replaceWordjsFiddle,
  replaceWordFacebook: replaceWordFacebook,
  replaceWordiCloud: replaceWordiCloud,
  replaceWordDefault: replaceWordDefault
};

},{}],4:[function(require,module,exports){
(function($) {
  // NEW CLEAN CODE FROM HERE

  // Load modules here
  var rwController = require("./replaceWord.js");
  var localStorage = require("./localStorage.js");
  var Bacon = require("./Bacon.js").Bacon;

// Global variables
  var dictionary = [];
  var ALPHAS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-_"
  var KEYS = {
    space: 32,
    biggerThan: 188,
    smallerThan: 190,
    f: 70,
    c: 67,
    escape: 27,
    backspace: 8
  };

  var thes = new Map();
  var port = null;
  var website = "";
  var settings = {
    gmail: {
      replaceWord: rwController.replaceWordGmail,
      suggestionsBoxOffset: {
        left: 830,
        top: 310
      }
    },
    icloud: {
      replaceWord: rwController.replaceWordiCloud,
      suggestionsBoxOffset: {
        left: 0,
        top: 0
      }
    },
    jsfiddle: {
      replaceWord: rwController.replaceWordjsFiddle,
      suggestionsBoxOffset: {
        left: 260,
        top: 170
      }
    },
    wiki: {
      replaceWord: rwController.replaceWordDefault,
      suggestionsBoxOffset: {
        left: 210,
        top: 230
      }
    },
    default: {
      replaceWord: rwController.replaceWordDefault,
      suggestionsBoxOffset: {
        left: 0,
        top: 0
      }
    }
  }


  var suggestionsBox = {
    curIndex: 0,
    suggestions: [],

    draw: function() {
      // TODO: clean this up
      if ($("#tip").length === 0){
        // Make new box
        $(document.body).append("<div id=\"tip\" style=\"background-color:LightGrey;\"></div>");
      }
      var fulltext = "<table>";
      for (var i = 0; i < suggestions.length; i++){

        fulltext += (i === suggestionsIndex) ? "<tr><td><b>" : "<tr><td>";
        fulltext += suggestions[i];
        fulltext += (i === suggestionsIndex) ? "</b></th></td>" : "<td><tr>";
      }
      fulltext += "</table>"
      $("#tip").html(fulltext);
    },

    nextSuggestion: function() {
      this.curIndex = (this.curIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.draw();
    },

    prevSuggestion: function() {
      this.curIndex = (this.curIndex + 1 + this.suggestions.length) % this.suggestions.length;
      this.draw();
    }
  };


  // This function has to be called in order for everything to work.
  // It setsup the event handlers, loads the thesaurus, queries the
  // database for the current dictionary and sets up a message passing port
  // between the background script and this script
  function start(callback) {
    loadStreams();

    // Load thesaurus, rough way (TODO: change that loading)
    var ALLDATA = require("./thesaurus");
    var lines = ALLDATA.split('*');
    for (var i = lines.length - 1; i >= 0; i--) {
      var words = lines[i].split(/[ \s]+/);
      thes.set(words[0], words.slice(1, words.length - 1));
    }

    // Get the website (have different settings depending on the website)
    website = getWebsite();

    port = chrome.extension.connect({name: "onButton"});
    port.onMessage.addListener(function(nessage) {
      if(message.button === "onOff") {
        isOn = message.state;
      }
    })

    localStorage.load("dictionary", function(data) {
      dictionary = data.dictionary;
      console.log("Loaded: " + dictionary);
      if(callback)
        callback();
    });
  }


  // This function will load the streams like commandStream or letterStream
  // those are then given handlers that difer from each other depending on
  // the stream
  function loadStreams() {
    // Using the Bacon Magic :D
    var keyStream = $(document).asEventStream("keydown");


    // Here we're creating the different streams that we'll need

    // LetterStream is literaly a stream of letters, you can do whatever you want with them
    var letterStream = keyStream.filter(function(key){
      return isAlpha(String.fromCharCode(key.which)) && !key.ctrlKey && !key.shiftKey;
    });

    function filterCommands(key) {
      for(var k in KEYS) {
        if(KEYS[k] === key.which) {
          return true;
        }
      }
      return false;
    }

    var commandStream = keyStream.filter(filterCommands);

    var whiteSpaceStream = keyStream.filter(function(key) {
      return !isAlpha(String.fromCharCode(key.which)) && !filterCommands(key);
    });


    // Now we attach event handlers to the different streams that are
    // dependent of the nature of the stream
    // TODO: repair this first draft
    letterStream.onValue(letterPressed);

    commandStream.onValue(commandPressed);

    whiteSpaceStream.onValue(whiteSpacePressed);
  }

  // This function will color all the words that are similar to the one
  // passed as an argument
  function getRelevant(word) {
    // this gets all the previously colored words and removes any tags
    // around them
    $(".foundString").contents().unwrap();

    var body = $(document.body).html();
    synonyms = [];
    if (thes.has(word)){
      synonyms = thes.get(word);
    }
    synonyms.push(word);
    for (var i = 0; i < synonyms.length; i++) {
      var index = body.indexOf(synonyms[i]);
      while (index != -1) {
        var beginning = body.substring(0,index);
        var middle = '<span class="foundString">' + synonyms[i] + "</span>";
        var end = body.substring(index + synonyms[i].length, body.length);
        body = beginning + middle + end;
        index = body.indexOf(synonyms[i], index + middle.length);
        // console.log(index + "  " + synonyms[i]);
      }
    }
    $(document.body).html(body);
  }

  function getWebsite() {
    if(document.URL.indexOf("facebook") !== -1) {
      return "facebook";
    } else if (document.URL.indexOf("mail.google") !== -1) {
      return "gmail";
    } else if (document.URL.indexOf("icloud") !== -1) {
      return "icloud";
    } else if(document.URL.indexOf("jsfiddle") !== -1) {
      return "jsfiddle";
    } else if(document.URL.indexOf("wikipedia") !== -1) {
      return "wiki"
    } else {
      return "default";
    }
  }

  function getSuggestions(str, dict) {
    var f = new Fuse(dict);
    result = f.search(str);
    return result.map(function(val) {
      return dict[val];
    })
  }

  function keyPressed(key) {
    if(isOn) {
      parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target, website));
    }
  }




  function isAlpha(ch) {
    return (ALPHAS.indexOf(ch) != -1)
  }

  function clearSuggestions(){
    suggestions = [];
    makeBox();
  }

  // This function will return the word that is currently being written, given the index and the text
  function getCurWord(cursorIndex, text) {
    var beg = 0;
    for (var i = cursorIndex; i >= 0; i--) {
      if (!isAlpha(text.charAt(i))) {
        beg = i + 1;
        break;
      }
    }
    return text.substring(beg, cursorIndex + 1);
  }










  // TO HERE

  // TODO: finish implementing that
  // function didYouMean(word, callback) {
  //   var query = new Parse.Query("SavedDictionary");
  //   query.equalTo("USER_ID", USER_ID);

  //   query.find({
  //     success: function(data) {
  //       var dictionary = data[0].get("didyoumean");
  //       var f = new Fuse(dictionary);
  //       result = f.search(word);
  //       callback(dict[result[0]])
  //     },
  //     error: function(data, error) {

  //     }
  //   });
  // }


  // TODO: understand this AND/OR make this work
  function setEndOfContenteditable(contentEditableElement)
  {
    contentEditableElement = $(".Am.Al.editable.LW-avf")[0];

    var range,selection;
    if(document.createRange)//Firefox, Chrome, Opera, Safari, IE 9+
    {
      range = document.createRange();//Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection();//get the selection object (allows you to change selection)
      selection.removeAllRanges();//remove any selections already made
      selection.addRange(range);//make the range you have just created the visible selection
    }
    else if(document.selection)//IE 8 and lower
    {
      range = document.body.createTextRange();//Create a range (a range is a like the selection but invisible)
      range.moveToElementText(contentEditableElement);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      range.select();//Select the range (make it the visible selection
    }
  }


  function getText(div) {
    if(website === "facebook") {
      console.log("NOPE");
    } else if(website === "gmail") {
      return $(div).html().replace("&nbsp;", " ");
    } else if (website === "icloud"){
      // var txt = "";
      // var t = $("text");
      // var l = $("text").length;
      // for(var i = 0; i < l; i++) {
      //     txt += (t[i]).textContent.replace("&nbsp;", " ").replace(/<.+>|\n+/g, "");
      // }
      // console.log(txt);
      // return txt;
      return "";
    } else {
      if($(div).prop("tagName") === "TEXTAREA") {
        return $(div).val();
      } else {
        return $(div).html();
      }
    }
  }

  // Copy pasted from stackoverflow
  function getCaretPosition(editableDiv) {
    // console.log(editableDiv);

    // If Textare, then we do this:
    if($(editableDiv).prop("tagName") === "TEXTAREA") {
      if (editableDiv.selectionStart) {
        return editableDiv.selectionStart;
      } else if (document.selection) {
        editableDiv.focus();

        var r = document.selection.createRange();
        if (r == null) {
          return 0;
        }

        var re = editableDiv.createTextRange(),
          rc = re.duplicate();
        re.moveToBookmark(r.getBookmark());
        rc.setEndPoint('EndToStart', re);

        return rc.text.length;
      }
    } else if($(editableDiv).prop("tagName") === "DIV") {
      // If div, then we do this:
      var caretPos = 0, containerEl = null, sel, range;
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
          range = sel.getRangeAt(0);
          if (range.commonAncestorContainer.parentNode == editableDiv) {
            caretPos = range.endOffset;
          }
        }
      } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        if (range.parentElement() == editableDiv) {
          var tempEl = document.createElement("span");
          editableDiv.insertBefore(tempEl, editableDiv.firstChild);
          var tempRange = range.duplicate();
          tempRange.moveToElementText(tempEl);
          tempRange.setEndPoint("EndToEnd", range);
          caretPos = tempRange.text.length;
        }
      }
      return caretPos;
    } else {

    }
  }
  function setCaretPosition(ctrl, pos){
    if(web === "gmail") {
      setEndOfContenteditable(ctrl);
      return;
    }
    if(ctrl.setSelectionRange)
    {
      ctrl.focus();
      ctrl.setSelectionRange(pos,pos);
    }
    else if (ctrl.createTextRange) {
      var range = ctrl.createTextRange();
      range.collapse(true);
      range.moveEnd('character', pos);
      range.moveStart('character', pos);
      range.select();
    }
  }


  function occurrences(string, subString){
    string+=""; subString+="";
    string = string.toLowerCase();
    // console.log(string);
    if(subString.length<=0) return string.length+1;

    var n=0, pos=0;
    var step= (subString.length);

    while(true){
      pos=string.indexOf(subString,pos);
      if(pos>=0){ n++; pos+=step; } else break;
    }
    return(n);
  }

  function searchInCategory(category, search, callback) {
    localStorage.load("category", function(results) {
      var list = results;
      console.log("SearchInCategory list: " + list);
      if (!list) {
        callback("");
        return;
      }
      // console.log("List: " + list);
      var searchWords = search.split(" ");
      var synonyms = searchWords.slice();
      for (var i = 0; i < searchWords.length; i++) {
        if (thes.has(searchWords[i])) {
           synonyms = synonyms.concat(thes.get(searchWords[i]));
        }
      }
      var maxCount = 0;
      var maxSynIndex = 0;
      for (var i = 0; i < list.length; i++) {
        var string = list[i];
        var important = string.split(":");

        var count = 0;
        var j, inportance = 1;
        for (j = 0; j < synonyms.length; j++) {
          for(var k = 0; k < important.length; k++) {
            importance = (k === 0 ? 4 : 1);
            count += importance * occurrences(important[k], synonyms[j]);
          }
        }
        if (count > maxCount) {
            maxCount = count;
            maxSynIndex = i;
        }
        // console.log("count: " + count);
      }
      if(maxSynIndex === 0)
        callback("");

      callback(list[maxSynIndex]);
    });
  }

  function saveInCategory(category, highlight, callback) {
    localStorage.load("category", function(response) {
        if(response.data) {
          response.data.push(highlight);
        } else {
          response.data = [response.data];
        }
        localStorage.save({category: response.data}, callback);
    });
  }

  function categorizeHighlightedText(category) {

    var html = "";
    if (typeof window.getSelection != "undefined") {
      var sel = window.getSelection();
      if (sel.rangeCount) {
        var container = document.createElement("div");
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
          container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        html = container.innerHTML;
      }
    } else if (typeof document.selection != "undefined") {
      if (document.selection.type == "Text") {
        html = document.selection.createRange().htmlText;
      }
    }
    html = (html.split(/\s+/)).join(" ");
    // .replace(/<\/?[^>]+(>|$)/g, "");;
    // console.log(html);
    localStorage.saveInCategory(category, html, function() {
      console.log("Successfully saved: " + html);
    });
  }

  // function createTextbox(text, search) {
  //   if(text.length === 0 || search.length === 0)
  //     text = "No matching category or word found.";
  //   var textbox = document.createElement('div');
  //   var inside = document.createElement('div');
  //   var body = text.toLowerCase();
  //   search = search.split(" ");

  //   for (var i = 0; i < search.length; i++) {
  //     var index = body.indexOf(search[i]);
  //     while (index != -1) {
  //       var beginning = body.substring(0,index);
  //       var middle = '<span class="foundString">' + search[i] + "</span>";
  //       var end = body.substring(index + search[i].length, body.length);
  //       body = beginning + middle + end;
  //       index = body.indexOf(search[i], index + middle.length);
  //       // console.log(index + "  " + search[i]);
  //     }
  //   }
  //   $(inside).html(body);
  //   $(inside).addClass("inside");
  //   $(textbox).addClass("searchResult");
  //   textbox.appendChild(inside);
  //   document.body.appendChild(textbox);
  //   $(document).click(function() {
  //     $(textbox).remove();
  //   });
  // }

  start();
})(jQuery);


},{"./Bacon.js":1,"./localStorage.js":2,"./replaceWord.js":3,"./thesaurus":5}],5:[function(require,module,exports){
module.exports = "foul                dirty soiled disgusting unpleasant*\
mirage              optical illusion deception imagined *\
genre               kind category species type class *\
untie               loosen free unbind *\
scold               chide dress nag snap vixen *\
originality         novelty speciality ingenuity *\
outwit              frustrate circumvent outsmart *\
lore                learning scholarship erudition *\
immature            unripe green undeveloped raw *\
antecede            go before precede priority *\
digit               member finger numeral cipher *\
stipulate           specify demand insist upon require *\
yellow              fair blond cowardly jealous *\
unify               consolidate combine join *\
disturb             annoy disrupt molest unsettle *\
prize               appreciate award reward trophy *\
succession          series train continuation suite *\
reliable            trustworthy dependable trusty *\
charter             grant sanction license establish *\
simile              comparison figurative *\
preface             foreword prologue preamble *\
pulse               throb beat quiver tremble *\
elegant             beauty classic rich tasteful *\
second              moment instant backer assistant *\
valiant             brave courageous gallant daring *\
sterile             barren unfruitful aseptic *\
inanimate           inorganic lifeless inactive inert *\
ruthless            relentless merciless cruel *\
thunder             shout bellow resound peal roar *\
fossil              relic petrification oldness *\
resilient           buoyant tough rebounding elastic *\
crouch              bend squat stoop cower cringe *\
avert               keep off ward off *\
herb                potherb condiment vegetable *\
error               fallacy falsetruth misconception *\
here                hereabouts hither hitherward *\
herd                group flock drove gathering *\
cult                cultus sect religion denomination *\
shriek              scream screech shrill squeal *\
calculate           compute reckon count appraise *\
substance           matter frame object thing body *\
diplomat            envoy ambassador statesman *\
criticism           blame comment critique analysis *\
golden              gilded aureate precious priceless *\
divide              separate allot assign split up *\
classification      grouping category allocation order *\
lengthen            elongate extend protract stretch *\
replace             supplant succeed restore substitute *\
remnant             remainder residue fragment vestige *\
stern               rigorous austere forbidding *\
unit                detail member squad section segment *\
spoke               ray rung stave rundel *\
browse              graze feed nible pasture *\
exhort              incite urge prompt admonish *\
symphony            harmony concert orchestra *\
music               song lyrics poetry melody tuneful *\
telegraph           telegram morse cable signal wire *\
strike              hit smite beat impress cancel *\
until               till to up to the time of *\
holy                celestial sacred devout pious *\
relax               rest relent slacken loosen abate *\
hurt                damage pain ache injury wound *\
glass               crystal mirror lens slide *\
hurl                throw project pitch toss fling *\
hole                opening aperture gap cavity hollow *\
hold                grasp clutch grip tenure *\
unpack              unwrap uncover open unload *\
copse               grove wood hedge plant tree *\
intake              consume ingestion assimilation *\
pursue              chase ensue follow seek *\
blade               cutter edge sword knife *\
locker              chest cabinet safe foot locker *\
exhale              breathe expel emanate emit expire *\
example             sample specimen piece instance *\
wand                rod mace scepter staff stick *\
wane                decrease lessen ebb diminish fade *\
unjust              unfair undue biased *\
malign              libel slander defame asperse *\
caution             discretion prudence heed forethought *\
want                need poverty deficiency absence *\
reprove             chide dress lecture criticize *\
absolute            thorough complete perfect fixed *\
unpaid              owing due volunteer unsalaried *\
travel              journey course voyage cruise rove *\
copious             abundant plentiful ample overflowing *\
machine             apparatus contrivance device *\
hot                 heated peppery biting *\
hop                 leap spring dance bound jump *\
significance        important consequential expressive *\
beauty              lovely elegant graceful dainty *\
diagram             plan sketch chart blueprint *\
modest              bashful downcast humble meek *\
unselfish           generous liberal benevolent *\
effective           efficacious effectual adequate *\
scourge             lash whip flog hit thrash *\
revolt              uprising rebellion mutiny sedition *\
alias               assumed name pseudonym *\
decoy               entice lure entrap attraction *\
wing                pinion arm flank annex extension *\
squint              glance peering peek *\
wine                drink liquor stimulant alcohol *\
restriction         ban qualification reserve restraint *\
misdemeanor         crime misconduct misdeed *\
vary                change alter fluctuate differ *\
fit                 caprice notion convulsion seizure *\
unforeseen          unexpected unanticipated *\
fix                 establish repair adjust *\
secede              withdraw separate bolt relinquish *\
fib                 false yarn prevarication lie *\
hidden              concealment disguised camouflage *\
emphasize           accent make clear highlight *\
glorify             acclaim magnify laud commend *\
bristle             hair stubble stand stick up *\
enrich              endow ornament adorn cultivate *\
slate               list ballot ticket slab roof *\
interrupt           stop check cut short hinder suspend *\
spotless            clean immaculate stainless *\
averse              loath reluctant unwilling opposed *\
unwary              rash unwise imprudent *\
whim                caprice fancy notion desire *\
pliant              pliable supple yielding flexible *\
concord             accord harmony agreement *\
garment             clothing robe dress vestment *\
exhume              dig up excavate discover locate *\
allay               lessen soothe mitigate ease calm *\
message             communication dispatch note news *\
numeration          counting tally calculation recount *\
misfortune          mishap trouble difficulty *\
smirk               grin leer grimace smug look *\
waive               relinquish renounce forgo *\
freeze              congeal harden immobilize ice frost *\
encourage           animate strengthen hearten fortify *\
adapt               suit conform regulate fit adjust *\
exaction            requisition ultimatum demand *\
outburst            eruption explosion breakthrough *\
foundation          base basis institution *\
waddle              toddle shamble lurch waggle sway *\
fugitive            runaway fleeing transient transitory *\
inscribe            write mark engrave enter enroll *\
estimate            gauge judge value appraise *\
knit                weave interlace contract *\
speedy              fast rapid swift quick nimble *\
purpose             intention determination resolution *\
misplace            derange mislocate displace mislay *\
wash                clean deterge bathe wet soak *\
instruct            charge profess educate teach train *\
clarity             clearness transparency meaning *\
declaim             recite harangue rant speech *\
service             aid help duty servitude *\
engagement          betrothal obligation promise pledge *\
stack               pile heap mound bundle *\
master              superior director expert adept *\
postulate           axiom hypothesis premise fact *\
bitter              stinging cutting acrid unpalatable *\
genesis             creation origin formation beginning *\
listen              harken attend hear heed *\
collapse            break down fall cave in *\
convention          assembly gathering meeting *\
stake               post peg pile wager bet *\
motionless          immobile quiescent still inert *\
crawl               creep lag drag cringe fawn cower *\
horrible            alarming dreadful appalling *\
trek                walk hike travel journey expedition *\
peril               danger hazard risk chance exposure *\
exultation          rejoicing triumph elation *\
tree                plant sapling scrub shrub *\
likely              apt probably prone feasible *\
project             plan purpose enterprise endeavor *\
idle                useless futile fruitless pointless *\
sheen               light gleam luster shine glow *\
feeling             sensation emotion sensitivity *\
acclaim             commend applaud glorify honor *\
entail              involve imply require *\
runner              courier racer entrant sprinter *\
untrained           raw inexperienced green untamed *\
thaw                melt dissolve liquefy soften *\
alive               living quick witted alert brisk *\
concrete            actual real tangible solid cement *\
responsible         trustworthy dependable accountable *\
gripe               complain grumble mutter *\
amusing             entertaining pleasant enjoyable *\
season              period time interval prepare age *\
imprudent           careless incautious rash unwise *\
limitless           endless unbounded infinity *\
affirmation         statement allegation assertion *\
mouth               lips muzzle inlet entrance *\
addict              devotee fan enthusiast slave to *\
letter              character symbol note writing *\
thriller            chiller shocker *\
morality            ethics virtue purity chastity *\
expound             state express explain interpret *\
episode             digression incident action happening *\
grove               thicket coppice copse *\
camp                encampment bivouac cantonment *\
nettle              trouble irritate annoy provoke vex *\
scream              shout shriek yell screech *\
marvel              miracle phenomenon wonder *\
saying              adage word mentioning revealing *\
undue               unjust immoderate exorbitant *\
soluble             fluid solvent dissolvable *\
gauge               caliber estimate measure meter *\
ulcer               abscess infection sore *\
lethal              deadly fatal mortal toxic hurtful *\
abreast             up-to-date equal level side by side *\
caper               leap cavort gambol frolic prance *\
busy                occupied engaged engrossed employed *\
quaint              old-fashioned picturesque *\
menu                bill of fare diet list *\
bust                failure arrest breast *\
bush                shrub clump thicket hedge scrub *\
bliss               happiness ecstasy rapture pleasure *\
rich                wealthy affluent opulent fertile *\
mend                repair restore correct improve *\
plate               dish utensil tray slab *\
foremost            leading first precedent chief *\
pocket              pouch bin purse hollow *\
cushion             pad pillow mat seat *\
relish              zest gusto flavor taste spice *\
patch               piece segment spot repair *\
release             free liberate give out relinquish *\
hasten              hurry hustle run speed trot *\
traverse            cross ford range patrol obstruct *\
mandatory           required compulsory binding *\
disaster            casualty catastrophe tragedy *\
fair                beautiful handsome pretty comely *\
sensitivity         allergy feeling irritability *\
irritable           fretful peevish touchy sensitive *\
radius              spoke half-diameter range scope *\
result              consequence conclusion outcome *\
fail                blunder misfire miss topple *\
hero                victor inspiration ideal model *\
hammer              strike beat drum pound mallet *\
best                choice unequalled unparalleled *\
irk                 annoy discontentment bothersome *\
scorn               contempt disdain ridicule despise *\
ire                 incense wrath fury rage anger *\
preserve            cure pickle save protect shield *\
wage                undertake carry on conduct make *\
splinter            shard sliver shaving fragment *\
extend              continue lengthen widen enlarge *\
nature              character essence basic quality *\
impetus             impulse force stimulus motive *\
extent              limit measure range span *\
debt                obligation liability debit account *\
pity                compassion sympathy lamentation *\
accident            mishap injury casualty chance *\
veer                swerve shift deviate *\
disdain             scorn contempt arrogance *\
country             land region tract district plain *\
incense             inflame heat infuriate anger ire *\
pith                pulp core heart essence *\
argue               debate discuss reason with dispute *\
tinge               color complexion imbue tint *\
eradicate           abolish blot out erase exterminate *\
rehash              review repeat restate summarize *\
vain                proud conceited futile *\
canyon              ravine gorge gulch chasm *\
penalize            fine handicap scold chasten *\
bewilder            puzzle confuse perplex daze *\
union               unity concord connection alliance *\
subside             sink fall ebb lower abate *\
cue                 hint clue intimation signal *\
muck                dirt filth slime mud *\
much                abundance ample plenty *\
fry                 panfry griddle saute *\
incompetent         incapable inept inefficient *\
obese               fat overweight stout plump *\
life                vitality existence being living *\
spit                impale pierce stab sprinkle hiss *\
worker              laborer artisan operator yeoman *\
snap                crackle pop crack break scold *\
lift                raise elevate exalt uplift *\
child               youth kid youngster *\
spin                twirl whirl rotate gyrate *\
chill               shivering shakes ague discourage *\
dissect             cut up anatomize examine analyze *\
employ              use occupy hire engage *\
player              performer actor musician participant *\
elicit              draw forth extract evoke educe *\
violin              fiddle string amati stradivarius *\
transfuse           set into insert infuse inject *\
memorial            commemorative shrine tablet *\
severity            rigor tyranny asperity hardness *\
rebellion           revolt uprising insurrection *\
harmony             agreement concurrence concord peace *\
rebound             bounce ricochet react *\
haggard             drawn gaunt cadaverous ugliness *\
academic            scholastic collegiate scholarly *\
stillness           hush quite calm lull tranquility *\
bellow              roar shout bawl *\
distribute          allot parcel apportion disperse *\
beset               beseige attack stud or ornament *\
disguise            camouflage make-up concealment mask *\
plight              quandary predicament dilemma *\
succeeding          posterior subsequent next after *\
previous            preceding former prior antecedent *\
endue               endow clothe furnish *\
ease                comfort luxury rest repose content *\
innocent            ignorant simple upright faultless *\
prison              dungeon jail penitentiary *\
falter              hesitate waver vacillate stumble *\
hat                 headgear bonnet derby headdress *\
elevation           raising uplift height eminence *\
quirk               flourish quip taunt jibe *\
confection          dessert sweet jam dainty pastry *\
disagreement        discord dissent mixup conflict *\
possibly            maybe perhaps by chance *\
birth               origin creation genesis inception *\
unlikely            improbable doubtful dubious *\
shadow              umbra silhouette shade follower *\
unique              sole single only rare unusual *\
desire              wish fancy fantasy want longing *\
prologue            preface introduction preamble *\
attorney            lawyer agent *\
right               virtue lawful correct accurate good *\
crowd               gathering concourse horde mass gang *\
people              humanity populace *\
creed               belief tenet doctrine persuasion *\
crown               coronate wreathe enthrone adorn *\
animate             liven cheer enliven encourage *\
creep               crawl inch slither writhe *\
bottom              base foot sole foundation *\
inhuman             cruel barbarous bestial brutal *\
foe                 enemy adversary antagonist opponent *\
fog                 haze mist steam murk exhalation *\
exposition          explanation exhibition show *\
palatable           tasty savory appetizing *\
yoke                union bond chain link tie *\
memorable           noteworthy outstanding unforgettable *\
recollect           recall remember bring to mind *\
despair             hopelessness sadness discouragement *\
meddle              tamper interfere intrude *\
gauze               net tulle bandage *\
sod                 turf clod divot *\
facility            ease free clear smooth lighten *\
son                 male child boy descendant inheritor *\
administer          govern rule manage control *\
respectable         worthy reputable decent estimable *\
sow                 sprinkle seed scatter plant *\
wrap                robe shawl cloak coat cover *\
fabric              cloth material tissue textile *\
panorama            scene view spectacle scenery *\
support             aid help backbone upkeep groundwork *\
tame                domestic broken subdued meek gentle *\
avail               serve do suffice help *\
width               breadth span extent expanse *\
overhead            costs expenditure capital *\
happy               fortunate lucky gay contented *\
offer               tender bid advance ultimatum *\
fascination         charm attraction captivation *\
thesaurus           treasury repository dictionary *\
understandable      basic clear sensible reasonable *\
safeguard           anchor precaution protection shield *\
handily             skillfully neatly easily *\
inside              in inner interior inward within *\
pest                plague epidemic infestation *\
juvenile            youngster minor adolescent young one *\
liberal             lavish unselfish tolerant receptive *\
crumble             perish pulverize fall apart decay *\
soothe              calm quiet assuage mitigate *\
exist               live subsist breathe survive *\
accounting          bookkeeping audit ledger budget *\
dealer              barter merchant vendor *\
leer                smirk wink look ogle make eyes *\
floor               deck pavement story level covering *\
glacier             ice iceberg floe berg *\
insane              mad manic crazy deranged wild *\
flood               deluge inundation torrent freshet *\
zany                clown buffoon fool jester *\
smell               scent stink inhale detect nose out *\
roll                coil curl scroll tumble wallow *\
ointment            unguent balm pomade salve cream *\
comely              fair handsome lovely pretty *\
intent              earnest sincere absorbed engrossed *\
variable            changeable alterable inconstant *\
entrust             commission charge delegate confide *\
fastener            button clamp pin buckle hook *\
time                duration period span age *\
push                nudge thrust shove press *\
gown                negligee nightgown robe dress *\
chain               range series yoke connect attach *\
viaduct             bridge underpass way aquaduct *\
convoy              accompany escort guard support *\
midst               center middle *\
vex                 tease plague harass torment *\
crater              volcano hole depression pit *\
irksome             troublesome irritating tedious *\
oversight           omission error blunder slip *\
persevere           persist plod remain pusue *\
jerk                twist tweak pull snap twitch *\
cheap               inexpensive cut rate bargain *\
choice              option selection pick preference *\
embark              ship board set sail sail begin *\
gloomy              dismal dreary morbid overcast *\
mourn               lament sorrow grieve bewail bemoan *\
bustle              stir rustle fluster flurry ado *\
exact               require claim demand extort *\
minute              tiny precise exact meticulous *\
epic                heroic majestic elevated *\
tear                rip lacerate tatter shred split *\
leave               abandon surrender quit forsake *\
settle              agree upon resolve conclude *\
team                crew side group pair *\
unaware             unwary oblivious ignorant *\
prevent             preclude hinder stop forestall *\
spiritual           immaterial fleshless celestial *\
occurrence          event incident affair episode *\
somber              gloomy dark overcast dull sad *\
prediction          warning prophecy prognosis forecast *\
sign                omen portent indication token *\
erotic              sexual sensual carnal obscene *\
educate             teach train instruct enlighten *\
jeopardy            danger risk peril hazard threat *\
melt                dissolve soften thaw fuse vanish *\
current             common prevalent in vogue *\
badge               emblem sign indication *\
jury                trial panel board of judges *\
funeral             burial entombment *\
understanding       intelligence comprehension sympathy *\
snack               repast refreshment collation *\
address             direct court woo accost greet *\
alone               apart solitary single *\
along               lengthwise onward together *\
enroll              list record enter register *\
redemption          ransom salvation reparation *\
brilliant           resplendant radiant luminous clever *\
ineffective         useless vain unavailing impotent *\
reclaim             redeem restore reform recover *\
concealed           disappearance incognito lurk secret *\
love                fondness liking desire admiration *\
prefer              select fancy choose promote advance *\
logical             rational reasonable sane *\
abash               humiliate humble shame embarrass *\
loquacity           talkativeness fluency gift of gab *\
fake                counterfeit impostor make-believe *\
abase               humble demean degrade shame *\
working             agency operative toiling laboring *\
wicker              twig shoot rod willow *\
dangle              hang suspend swing *\
wicket              gate door window hoop arch *\
opposed             averse contrary antagonistic *\
scope               extent range sweep compass field *\
wicked              evil bad criminal cruel sinful *\
afford              manage bear supply furnish *\
apparent            plain obvious visible evident *\
refrain             abstain spare cease avoid *\
ignorant            illiterate stupid simple innocent *\
degrade             humiliate shame debase demean *\
behalf              interest benefit advantage *\
pretend             sham feign counterfeit lie *\
abortion            miscarriage failure premature *\
strain              stretch make taut strive exert *\
harmonious          compatible consistent similar like *\
following           after behind sequence next *\
detached            separate independent aloof *\
gunfire             gunplay shooting burst volley salvo *\
awesome             impressive solemn terrible moving *\
offense             insult affront aggression attack *\
winter              wintertime cold hibernation *\
savor               flavor smack tang enjoy relish *\
writhe              wriggle squirm twist contort *\
optimal             optimum prime best *\
cavil               carp find fault take exception *\
spot                place locality blotch smear blemish *\
laxative            physic cathartic purgative enema *\
misshapen           deformed malformed distorted *\
date                day time moment age era epoch *\
such                like similar of the same kind *\
suck                draw extract absorb *\
data                facts evidence information *\
stress              pressure strain emphasis *\
natural             character innate native unaffected *\
conscious           sensible cognizant percipient *\
yielding            pliant supple flexible fertile rich *\
truck               vehicle van wagon dolly lorry *\
truce               armistice peace respite delay *\
damage              abuse disable hurt harm injure *\
course              bearing itinerary path procedure *\
yearn               pine long hanker grieve mourn *\
tendency            aptness aptitude tend conduce lean *\
splurge             extravagance waste indulge oneself *\
derive              get obtain deduce originate arise *\
overhaul            examine check inspect repair *\
solace              comfort consolation relief *\
nymph               dryad doxy party girl *\
attraction          affinity allure magnet temptation *\
suspicion           mistrust doubt misgiving *\
stroll              ramble saunter promenade walk *\
limbo               nowhere borderland oblivion *\
bashful             shy diffident timid modest *\
nation              country state realm republic *\
tumid               swollen enlarged bulging pompous *\
quarter             one-forth district region *\
square              tetragon quadrilateral rectangle *\
retrieve            recover regain reclaim repair *\
beloved             dear pet precious sweethart *\
sponsor             patron backer surety advertiser *\
giddy               frivolous irresponsible dizzy *\
container           bag can utensil holder chest *\
abide               dwell reside live stay tolerate *\
boundless           unlimited vast immense great *\
investigation       analysis espionage inquiry search *\
hibernate           become dormant inactivity *\
siege               investment besiegement blockade *\
envelop             cover wrap surround enclose *\
quite               entirely wholly actually really *\
disrespect          disesteem disregard contempt *\
complicated         complex intricate difficult *\
besides             more otherwise furthermore *\
remainder           residue remains remnant vestige *\
training            discipline practice tuition *\
undisguised         true genuine obvious frank open *\
wrong               injustice oppression corruption *\
initiate            admit introduce start *\
quibble             evasion cavil argue criticize *\
neglect             carelessness omission oversight *\
puny                small underdeveloped undersized *\
emotion             feeling sentiment passion sensation *\
intuition           insight instinct perceptivity *\
symmetry            proportion balance uniformity *\
spoken              oral vocal verbal *\
clause              article paragraph section provision *\
reprisal            retaliation revenge requital *\
one                 individual sole only single *\
submit              comply refer relent stoop suggest *\
vote                poll ballot choice option election *\
chubby              plump stout obese overweight *\
open                ajar uncover undisguised unlock *\
city                town municipality capital metropolis *\
wrath               anger ire fury rage *\
convent             cloister nunnery temple *\
bite                morsel scrap nip snap snip sting *\
indicate            denote designate specify *\
shiver              quiver shake vibrate chill *\
draft               sketch outline breeze air current *\
dissipate           scatter dispel diffuse waste *\
convene             assemble gather collect congregate *\
cite                commend mention quote summon *\
blazon              proclaim advertise decorate *\
shawl               cape wrap stole tuckler *\
snatch              grab seize grasp clutch jerk *\
ridiculous          absurd preposterous laughable *\
antic               caper escapade prank gambol *\
impractical         unwise imprudent illogical unsound *\
rival               competitor contender antagonist *\
distill             extract express concentrate drip *\
future              time to come eventuality tomorrow *\
glossy              sleek slick smooth shining lustrous *\
cavalier            horseman knight escort *\
janitor             caretaker superintendent custodian *\
prospect            view outlook scene sight promise *\
illness             sickness disease *\
sumptuous           lavish luxurious splendid *\
sag                 droop slump warp curve slouch *\
argument            persuasion thesis debate discussion *\
alley               passage lane walk *\
sad                 sorrowful downcast dejected unhappy *\
say                 speak tell declare state affirm *\
uninterrupted       endless unceasing continuous *\
erudition           learning lore education culture *\
perplex             puzzle bewilder confuse mystify *\
fashionable         dressy style vogue etiquette *\
aside               apart aloof away distant *\
zoo                 park garden menagerie vivarium *\
note                letter acknowledgment reminder *\
take                capture pirate plagiarize catch *\
destroy             waste ruin desolate *\
coincide            agree concur match harmonious *\
tally               count score check record tag *\
buffer              fender bumper polish safety *\
compress            reduce digest abridge consolidate *\
lawn                green greenyard greensward *\
average             normal norm mean standard *\
drive               propel impel urge forward pursue *\
unabated            tireless relentless ceaseless *\
wind                draught draft whiff blow drift *\
salt                saline season pickle brine *\
oridinance          law regulation order decree rule *\
surplus             excess glut profit oversupply *\
infuriate           enrage anger madden incite provoke *\
mince               chop dice moderate *\
merit               reward due worth virtue *\
bright              brilliant shining glistening *\
scarce              rare uncommon deficient *\
slow                inactive leisureliness crawl lag *\
slop                spillage muck slush refuse *\
transact            negotiate deal conduct execute *\
cloak               cape wrap mantle shield disguise *\
robe                cloak mantle gown vestment *\
dispute             contradict controvert doubt contest *\
assistant           aide auxiliary prop second *\
infallible          reliable dependable trustworthy *\
outlet              drain mouth nozzle break crack *\
submerge            drown sink plunge dive immerse *\
transpire           pass through exhale come to light *\
yammer              complain wail shine whimper yearn *\
prime               original first initial primitive *\
assimilate          digest absorb incorporate merge *\
borrow              take appropriate make use of adopt *\
uncover             open disclose bare expose *\
where               in what place whither place *\
vision              sight optics look glance view *\
temperance          moderation tolerance restraint *\
mope                brood fret sulk pout *\
forsake             desert abandon renounce quit *\
vertical            plumb upright perpendicular erect *\
aberration          deviation variation irregularity *\
screen              partition curtain shield mask *\
dome                vault cupola covering *\
adept               ace clever master proficient *\
jovial              genial cordial gay merry jolly *\
spare               save refrain abstain exempt *\
spark               flash inspiration *\
undermine           excavate mine sap subvert weaken *\
quack               charlatan falsehood doctor *\
oust                depose evict remove dismiss *\
residence           abode home presence habitation *\
deduction           subtraction removal excision rebate *\
expression          grimace phrase speech word *\
allowance           stipend admission sanction *\
twin                double twofold fraternal identical *\
comeback            recur triumph winning retort *\
boat                ship vessel craft sail *\
testimonial         certificate reference voucher *\
stretch             extend lengthen spread expand *\
vacation            holiday rest time off recess leave *\
concede             consent yield give in allow *\
breath              respiration inhalation breeze life *\
almighty            all powerful omnipotent *\
prototype           model sample standard pattern *\
reflex              reaction instinct repercussion *\
enable              empower invest endow authorize *\
gist                meaning essence significance point *\
unsafe              insecure precarious dangerous *\
thousand            grand 1000 fifty score *\
surpassing          above very excelling dominant *\
observe             see comply with respect acknowledge *\
former              late other past previous *\
queasy              nauseous squeamish uneasy timid *\
shanty              cabin hut shack hovel cottage *\
straighten          adjust align order compose *\
dressy              stylish fashionable smart showy *\
brow                forehead summit crest *\
canon               decree code law principle criterion *\
technology          knowledge information craft science *\
fame                repute renown prestige honor *\
yearbook            annual almanac journal diary *\
vandalism           pillage plundering defacement *\
nuzzle              nose muzzle burrow snuff *\
sickness            disease illness malady ailment *\
defy                challenge dare withstand resist *\
disown              disinherit disclaim repudiate deny *\
undefined           indefinite limitless boundless *\
vacant              empty open free unoccupied *\
clobber             pummel punish defeat *\
summer              zenith acme high point summer time *\
manifold            multiple diverse copied repeated *\
being               life existence person creature *\
rest                remainder remains balance residue *\
disperse            distribute scatter strew disband *\
inaudible           unhearable faint muffled *\
underline           accent emphasize underscore urge *\
instrument          device tool utensil means apparatus *\
overthrow           overcome defeat upset abolish *\
joyful              glad jubilant cheery *\
dart                hurl cast throw dartle *\
dark                black gloom murk dusk shadow umbra *\
retract             recall recant revoke withdraw *\
snarl               growl gnarl grumble *\
traffic             trade barter dealings transportation *\
pop                 bang shot burst explosion *\
vacuum              void vacancy space nothingness *\
world               creation nature earth cosmos *\
snare               trap pitfall ambush deception *\
vague               unclear blurred shapeless undefined *\
dare                face defy challenge brave *\
clan                family tribe association caste *\
stranger            newcomer foreigner alien outsider *\
expunge             erase efface deduct *\
clay                earth potter's clay mud loam *\
claw                talon nail hook pincer nipper *\
stationary          quiescent sedentary fixed permanent *\
kennel              doghouse stall hovel hut hutch *\
clap                applaud acclaim strike slap bang *\
obstruct            block stop impede choke retard *\
satisfactory        acceptable enough adequate *\
conditional         contingent tentative provisional *\
divine              godlike superhuman celestial *\
cavity              hole excavation hollow pit opening *\
noon                noontime midday noonday lunchtime *\
nook                retreat corner cover niche recess *\
exit                departure withdrawal egress *\
situate             place locate set station put *\
refer               submit commit send direct *\
vacillation         fluctuation hesitation uncertainty *\
biased              onesided unjust prejudiced *\
squabble            quarrel bicker altercate *\
contingent          possible provisional conditional *\
power               potence might force energy vigor *\
intimate            close friendly familiar private *\
ration              apportion allocate allot limit *\
poise               balance dignity composure bearing *\
stone               gem jewel mineral pebble rock *\
ace                 expert adept skill master *\
industry            labor work occupation trade *\
favorite            darling pet idol hero choice *\
slender             slim thin skinny meager weak *\
side                direction sector quarter flank *\
tumor               swelling growth cancer *\
act                 behave action deed doing *\
luck                chance good fortune destiny *\
interruption        break hindrance hiatus gap delay *\
antidote            antitoxin remedy *\
lively              cheerful upbeat vivacious winsome *\
pivot               axis hinge joint *\
burglar             housebreaker stealing *\
gleam               light beam flash glimmer *\
glean               gather harvest deduce cull winnow *\
futile              ineffectual vain idle useless *\
series              sequence set succession chain *\
mollify             placate pacify soothe appease calm *\
bubble              blob fizzle simmer foam *\
complete            accomplish entire finish full total *\
verbatim            literal unchanged word for word *\
fastidious          dainty proper meticulous careful *\
pasteurize          sterilize disinfect *\
unreliable          untrustworthy unstable unsure *\
with                by by means of alongside beside *\
amplify             enlarge swell magnify *\
pull                power sway jerk wrench *\
rush                hurry scurry dash surge expedite *\
rage                fury frenzy wrath violence *\
attenuate           weaken thin out rarefy *\
ruse                artifice device gambit trick *\
impute              ascribe attribute accusation *\
dirty               foul nasty obscene soiled filthy *\
agree               yield consent coincide *\
rust                corrode oxidize deteriorate *\
gone                absent missing removed departed *\
fright              dread terror panic alarm fear *\
certain             some specified *\
stealing            burglar heist piracy embezzlement *\
tranquil            calm quiet undisturbed serene *\
jargon              lingo shoptalk gibberish argon *\
tremble             agitation quaver quiver shudder *\
cream               ointment pick finest best *\
novice              beginner student amateur *\
abolish             annul cancel suppress exterminate *\
tight               close compact snug scarce short of *\
unparalleled        unequaled unmatched inimitable *\
whip                lash scourge beat flog thrash *\
congress            assembly legislature parliament *\
annex               add attach affix *\
slant               slope inclination tilt leaning *\
midget              dwarf pygmy shrimp *\
snitch              swipe filch inform *\
infirmity           fault feebleness weakness illness *\
omnibus             collection compilation extensive *\
mask                false face masquerade pretense *\
mimic               mime imitate impersonate copy mock *\
mast                pole timber upright column *\
mass                bulk size lump wad accumulation *\
sensibility         feeling perceptivity impression *\
original            novel unique primary earliest *\
consider            deliberate ponder brood contemplate *\
beware              take care be on guard avoid *\
weariness           tiredness exhaustion lethargy *\
debris              rubbish rubble detritus wreckage *\
upkeep              care maintenance expenses pension *\
welfare             prosperity happiness success *\
tail                appendage end tip extremity *\
smile               grin simper smirk beam *\
norm                normalacy model standard *\
tatter              rag shred tear *\
appointment         meeting interview engagement *\
blockade            barrier obstruction embargo *\
candid              frank straightfoward blunt *\
diary               journal log chronicle memoirs *\
existing            living present for the time being *\
strand              thread string fiber rope *\
cable               rope line cord cablegram *\
heist               burglary stealing *\
laud                praise extol eulogize approbation *\
large               big huge colossal enormous immense *\
sand                grit granules particle grain speck *\
sane                logical lucid rational reasonable *\
facsimile           duplicate reproduction replica *\
harry               plunder pillage attack distress *\
small               little tiny short wee dwarfish *\
past                yesterday archaic bygone former *\
pass                elapse enact crossing way track *\
destitute           wanting lacking stripped bereft *\
investment          grant loan backing finance interest *\
forestall           anticipate prevent thwart *\
imperceptible       indistinct unseen vague obscure *\
succinct            terse concise brief meaty *\
nurse               attendant nursemaid nanny *\
perforate           bore drill pierce puncture riddle *\
method              way manner gait form mode *\
contrast            difference opposition dissimilarity *\
full                filled satiated complete entire *\
hash                mixture medley mix jumble botch *\
sentient            perceptive sensitive feeling alive *\
indecision          irresolution hesitation uncertainty *\
legend              tradition tale saga myth *\
compliance          consent obedience observance *\
experience          have know meet encounter undergo *\
periodic            recurrent cyclic epochal *\
pick                best cream elite choice prime *\
cessation           disuse inactivity pause stop rest *\
via                 through along on *\
depart              go remove retire quit leave *\
vie                 rival emulate contend strive *\
vim                 zest energy vigor *\
follower            disciple shadow lackey pupil *\
coercion            force pressure persuasion *\
select              choose pick prefer elect opt *\
casket              chest canister container coffin *\
enliven             exhilarate animate inspirit quicken *\
maltreat            abuse ill-treat misuse *\
implore             beg beseech entreat plead *\
fragrance           bouquet perfume aroma smell *\
ballad              song chantey *\
more                additional in addition added besides *\
teem                swarm abound multiply pullulate *\
company             fellowship association corporation *\
nomad               wanderer gypsy rover *\
doom                convict fate lot destination *\
cunning             artful astute shrewd sly subtle *\
fleece              bleed defraud shear wool *\
fatal               deadly lethal mortal fateful *\
apportion           budget dispense distribute ration *\
science             knowledge skill efficiency *\
chisel              trim pare sculpt carve *\
mall                promenade avenue parkway *\
kaput               ruined done for destroyed failure *\
male                man sir master chap husband mister *\
beautiful           fair lovely pretty attractive *\
prompt              incite induce motivate actuate *\
taunt               ridicule scoff jeer twit provoke *\
gallop              run canter *\
lout                bumpkin clod oaf boor *\
autumn              fall harvest time *\
unbiased            impartial unprejudiced fair just *\
sense               meaning import feeling judgment *\
scar                blemish flaw pock crust deface *\
dress               clothe attire array scold reprove *\
condemn             blame convict sentence doom *\
information         knowledge data enlightenment *\
imminent            impending close at hand near *\
enlarge             increase extend widen broaden *\
cling               stick hold cleave adhere grasp *\
creature            animal beast creation being thing *\
sprinkle            scatter spread sow spray wet *\
sympathize          feel for sorrow condole feel sorry *\
unsound             unhealthy diseased sickly deranged *\
plane               level stratum surface *\
waver               vacillate fluctuate hesitate sway *\
ethics              morals morality rules of conduct *\
authentic           genuine real trustworthy *\
flutter             quiver wave whirl flap ripple wave *\
refuse              deny decline reject resist *\
register            record roll list enroll mark *\
pucker              wrinkle crease ruffle contract *\
wrench              twist wring yank pull extort *\
fundamental         elementary radical basic underlying *\
trellis             lattice network grid screen grill *\
pester              molest nag bother annoy harrass *\
pant                gasp puff blow yearn *\
distortion          twist crookedness ugliness deformity *\
attitude            stand pose posture position *\
pang                pain twinge shoot ache *\
brim                edge rim brink *\
turbine             rotator propeller *\
zippy               agile active brisk nimple spry *\
nifty               smart stylish fashionable *\
sauce               dressing dip gravy compote flavor *\
ally                friend confederate supporter *\
wry                 crooked twisted askew distorted *\
colleague           associate partner co-worker *\
propose             propound advance present suggest *\
consign             deliver commit assign delegate *\
imperil             endanger jeopardize risk *\
misuse              abuse perversion ill-use misapply *\
speculate           ponder contemplate meditate theorize *\
likeness            portrait effigy counterpart *\
nugget              lump hump slug *\
always               invariably continually *\
found               establish institute originate cast *\
lantern             lamp searchlight torch *\
reduce              diminish lessen curtail lower *\
exorbitant          expensive undue excessive extreme *\
operation           action campaign process method *\
scribe              secretary clerk author *\
terrify             terrorize frighten alarm appall *\
really              surely indeed truly certainly *\
silky               satiny sleek smooth *\
darling             sweetheart dearest treasure hero *\
impudence           audacity gall rudeness insolence *\
salute              welcome greet hail uncover *\
belief              creed faith opinion religion *\
murmur              hum lamentation whisper *\
imagine             conceive evoke visualize *\
reproach            blame rebuke censure reproof *\
insolence           arrogance hauteur haughtiness *\
castle              fortress stronghold abode *\
clump               cluster bunch patch thicket grove *\
major               principal chief senior main *\
unqualified         unfit unsuited ineligible *\
number              compute calculate enumerate estimate *\
preservation        conservation support maintain retain *\
unasked             voluntary spontaneous free *\
ethereal            airy delicate light tenuous fragile *\
guess               surmise supposition assumption *\
leverage            advantage purchase hold *\
jet                 stream spurt gush spout pour *\
invalid             void null worthless useless *\
introduction        preface forward prelude *\
swipe               steal pilfer filch strike hit *\
tradition           legend myth folklore fable *\
flimsy              sleazy fragile tenuous feeble weak *\
zealot              fanatic visionary dreamer *\
saint               hallow pietist apostle *\
gnash               grind champ crunch gnaw bite *\
longing             avidity desire yen wanting *\
immediate           prompt instant present *\
required            mandatory must necessary requisite *\
typhoon             hurricane tornado cyclone *\
crop                shave vintage yield harvest *\
consult             confer refer to ask advice *\
stifle              smother suffocate extinguish *\
rampant             rife widespread epidemic *\
grace               delicacy tact culture courtesy *\
vocal               articulate spoken verbal oral *\
marriage            matrimony wedlock betrothal *\
beneficial          useful helpful salutary advantagious *\
absorb              assimilate incorporate *\
defect              blemish fault flaw imperfection *\
caress              fondle pet stroke endear *\
blond               light-colored flaxen platinum *\
sell                sale vend offer bargain *\
tarnish             taint dishonor sully defame *\
self                ego being essence personality *\
commotion           stir fuss ferment disorder *\
jostle              push bump elbow shoulder *\
depression          lowering debase reduce downcast *\
analogy             parable relation similarity *\
frail               fragile brittle delicate weak *\
brace               stimulate support strengthen prop *\
play                sport frolic fun amusement game *\
yawn                gape open wide split part *\
virus               venom poison contagious *\
plan                scheme design project aim *\
unequal             disparate uneven mismatched *\
covey               flock brood bevy assemblage *\
covet               desire crave want envy *\
cover               wrap envelop lid guard shelter *\
artistic            talented accomplished cultural *\
barren              infertile unprofitable sterile *\
bulletin            notice report statement news *\
despise             scorn disdain hold in contempt *\
gold                money wealth bullion *\
exterminate         abolish eradicate destroy annihilate *\
affix               fasten attach append *\
session             sitting meeting period term *\
freight             cargo load burden *\
occupation          industry job trade vocation work *\
impact              shock collision contact bump slam *\
downpour            deluge rain flood monsoom storm *\
sunny               warm bright cheerful cheery *\
remedy              help antidote sedative drug *\
compass             surround define encircle effect *\
banner              flag pennant symbol badge *\
enemy               foe opponent opposition *\
sleeve              covering envelope coupling union *\
tumult              outcry uproar uproar confusion *\
cry                 shout call outcry clamor *\
sojourn             reside visit stay vacation *\
kill                murder assassinate slaughter *\
obscure             indistinct indefinite hazy dim *\
sew                 mend stitch seam *\
set                 place put station arrange fix *\
creator             god jehovah supreme being maker *\
nibble              browse gnaw peck pick at *\
potent              powerful strong mighty intense *\
see                 view behold observe comprehend *\
backfire            boomerang go awry failure *\
sea                 ocean main lake wave swell *\
outward             exterior outer out visible *\
shower              rain sprinkle drizzle fall *\
diluted             thin weak watery *\
fission             cleavage scission disjunction *\
compliment          praise flatter comend congratulate *\
endure              bear persist suffer sustain undergo *\
available           handy ready convenient *\
incident            occasion event episode happening *\
legislature         congress parliament council *\
lass                lassie colleen miss maid maiden *\
last                endure persist continue abide final *\
barely              only just narrowness *\
connection          bond tie link isthmus nape bridge *\
lash                beat whip flog scourge berate *\
let                 allow permit propose cause assign *\
approve             accept like support recognize agree *\
load                burden cargo lading charge *\
majesty             stateliness grandeur sovereignty *\
loan                lend borrow advance credit *\
allegiance          loyalty devotion *\
hollow              cavity indent pocket vacant pit *\
tremor              trembling shivering shaking quiver *\
indefinite          unclear undefined blurred vague *\
belt                girdle band stripe zone encircle *\
worthless           useless vile miserable valueless *\
satire              comedy irony lampoon skit mockery *\
implicit            unspoken tacit understood implied *\
firm                immovable secure steadfast solid *\
sweetheart          darling lover beloved dear *\
fire                flame blaze ignite detonate inspire *\
upstart             nobody snob squirt parvenu *\
fund                resources store cache reserve *\
moderation          temperance continence self-restraint *\
engage              bind obligate promise occupy *\
awake               alert heedful observant informed *\
deport              send away banish exile expel *\
straight            direct true linear fair reliable *\
budget              apportionment allowance *\
admire              esteem idolize venerate *\
technical           scientific professional skilled *\
leaning             inclination slant tilting *\
real                actual veritable true genuine sure *\
pound               bang batter hammer knock ram slam *\
agitation           stir shake tremble quiver quake *\
binding             mandatory obligated necessary *\
comport             behave conduct oneself suit fit *\
vow                 swear take oath vouch affirm *\
chasm               canyon crevasse rift fissure *\
vanish              disappear fade out dissolve *\
chase               pursue follow hunt dispel *\
funny               amusing comic absurd laughable *\
seek                search for hunt pursue request *\
shorten             abbreviate clip condense truncate *\
elevated            epic high aerial towering raised *\
forgiveness         pardon grace amnesty oblivion *\
comprehensive       blanket universal inclusive absolute *\
cigar               cheroot stogie panatela *\
alert               watchful on guard wary ready *\
rabid               mad furious fanatical overzealous *\
necessity           essentiality indispensability *\
fabrication         construction production *\
infamous            shameful abominable contemptible *\
recent              fresh late modern *\
expend              spend lay out disburse consume *\
person              individual body somebody human *\
comprise            consist of involve embrace embody *\
uncouth             boorish rude vulgar gauche *\
telegram            message wire cable *\
aroma               bouquet perfume fragrance odor *\
signal              sign warning vestige beckon *\
reap                gather harvest acquire cut mow *\
eager               desirous keen fervent earnest *\
location            place site position environment *\
derange             craze misplace confuse disorder *\
input               information contribute knowledge *\
emergency           crisis crux pinch predicament *\
format              arrangement plan layout design *\
couple              join tie link yoke unite pair *\
quest               search pursuit probe inquiry *\
abound              teem swarm be plentiful overflow *\
abduct              kidnap steal seize *\
pertinent           relevant apposite applicable *\
spine               backbone ridge thorn spike *\
consensus           concord assent agreement *\
continue            persist resume maintain *\
stylish             dressy nifty chick in fashion *\
disorder            derangement anarchy disunion discord *\
spring              leap bound start bounce rise *\
bounce              rebound recoil spring carom *\
limb                branch arm leg member part *\
palm                conceal hide over cover deceive *\
pall                jade weary sicken satiate *\
sight               appearance spectacle view vision *\
sprint              run dash speed rush bolt *\
pale                wan colorless light sickly *\
indigent            needy poor penniless destitute *\
untangle            unravel free extricate clear up *\
twinkle             blink wink scintillate sparkle *\
novelty             new originality innovation change *\
oblivion            forgetfulness failure amnesia limbo *\
religion            faith belief truth theology *\
behave              bear conduct act *\
seclusion           privacy retirement recess isolation *\
temple              place of worship tabernacle synagogue *\
inclination         leaning predisposition liking *\
object              thing item goal aim *\
odor                smell scent emanation fume *\
agreement           concord harmony unanimity unison *\
respite             armistice reprieve spell truce *\
by                  beside alongside past beyond *\
scepter             staff wand baton stick *\
ambush              hiding place camouflage pitfall *\
repair              mend renovate restore amend remedy *\
garbage             waste refuse trash junk scraps *\
appropriate         proper fit timely suitable *\
span                measure stretch over extent bridge *\
chide               scold lecture reprove *\
custom              practice usage precedent habit *\
occupy              hold inhabit keep fill tenant *\
suit                petition appeal train outfit *\
spar                stall play for time argue bicker *\
spat                quarrel dispute slap smack *\
litigate            contest dispute sue prosecute *\
lint                fluff fuzz threads *\
slump               fall settle sink slouch *\
archaic             ancient past old outdated *\
link                tie bond join unite couple *\
line                row file cord string crease *\
considerable        large sizable substantial important *\
up                  aloft higher upward *\
corsage             bouquet boutonniere ornament *\
slander             malign smear villify defame defile *\
mature              ripe developed fullgrown adult *\
genial              affable cordial jovial friendly *\
reconcile           placate appease settle accord *\
oddity              curiosity freak singularity *\
likewise            ditto too furthermore moreover *\
influence           weight pressure power control *\
haunt               shade spook resort retreat den *\
char                burn singe scorch sear carbonize *\
diverse             manifold unlike distinct various *\
graceful            beauty fluent supple limber agile *\
concealment         hide blind screen hush up *\
phantom             specter illusion ghost spirit *\
intrepid            fearless undaunted *\
paradox             inconsistency absurdity *\
tuft                cluster clump wisp bunch brush *\
scrape              graze brush scratch grind *\
swirl               whirl eddy twist *\
deviate             stray swerve veer wander digress *\
tart                acid sour sarcastic sharp *\
potion              elixir brew *\
scrub               rub scour swab mop *\
besiege             beset surround beleaguer invest *\
oblige              compel force constrain bind *\
lucid               clear understandable sane rational *\
vantage             advantage rise vantage point *\
lane                path byway passageway corridor *\
land                earth ground terra firma *\
fighter             combatant boxer prize struggle *\
age                 oldness years decline grow senior *\
crease              fold pleat bend mark wrinkle *\
feud                contention quarrel conflict rivalry *\
summit              top maximum climax high *\
urgency             haste requirement need necessity *\
crinkle             wrinkle roughen crease crumple *\
oracle              prophet seer predictor *\
fresh               novel recent new unfaded vigorous *\
menace              threat danger hazard peril *\
hello               greeting salutation welcome *\
essay               attempt test dissertation exposition *\
code                cipher secret writing principle *\
partial             dim onesided part incomplete *\
incorporate         embody federate merge consolidate *\
effigy              likeness statue image representation *\
scratch             score gash rasp lacerate deface *\
soften              melt thaw relent dissolve diminish *\
legal               justice lawful legitimate valid *\
dainty              delicate exquisite fastidious *\
amiss               wrong ill badly improperly *\
gossip              busybody talebearer chatter rumors *\
conversation        discussion talk dialogue colloquy *\
young               ageless adolescent fresh immature *\
send                dispatch forward transmit impel *\
dislike             distaste disinclination reluctance *\
resources           assets wealth prosperity means *\
retire              retreat leave resign depart *\
garden              herbery nursery flowerbeds *\
torture             pain excruciation agony torment *\
wipe                clean rub brush dust mop dry *\
timely              well-timed opportune right *\
harbor              refuge port retreat haven shelter *\
repository          storehouse treasury locker *\
race                onrush advance dash sprint *\
rack                strain exert torture distress *\
pledge              promise security pawn collateral *\
mishap              accident mischance misfortune *\
unprofitable        useless futile unwise profitless *\
crook               swindler thief rogue fork notch *\
imply               hint suggest infer involve entail *\
odd                 strange unusual unnatural *\
ode                 poem lyric canticle hymn *\
victor              champion winner conqueror *\
index               measure scale table list pointer *\
twine               cord string line filament *\
aground             stranded grounded *\
oration             speech declamation discourse address *\
flowing             fluent liquid loose issuing *\
bird                fowl songbird warbler fledgling *\
unmask              disclose lay bare reveal *\
leg                 limb support course tack lap side *\
punch               jab wallop strike hit poke *\
misgiving           qualm scruple suspicion doubt *\
poverty             lack privation poor need *\
consideration       care respect courtesy toleration *\
tuition             training education fee cost price *\
great               magnificent grand large considerable *\
revile              abuse malign deride contempt *\
receive             get acquire catch derive absorb *\
scatter             stretch disperse dissipate *\
survey              view examine inspect appraise *\
defeat              thwart frustrate foil outwit rout *\
opinion             idea belief conviction theory *\
extricate           free disentangle loose liberate *\
mortify             humiliate embarrass chagrin decay *\
getup               rig outfit garb costume *\
standing            repute status position *\
confidence          assurance certainty boldness *\
certificate         warrant diploma policy testimonial *\
theme               subject topic text thesis melody *\
next                beside nearest after later *\
figurative          colloquialism metaphor apply allude *\
duplicate           facsimile duplication double replica *\
doubt               unbelief discredit agnostic *\
midday              noon 12 o'clock *\
insomnia            sleeplessness wakefulness *\
infamy              dishonor scandal *\
patrol              guard warden ranger lookout *\
rubbish             debris junk trash litter waste *\
baby                infant babe child tot nursling *\
entangle            ensnare implicate involve *\
pout                sulk grimace dejected sullen *\
challenge           query question dare defy *\
pour                flow emerge decant fill issue *\
thin                slender lean narrow weak delicate *\
drill               pierce bore train exercise practice *\
fulfill             accomplish perform complete finish *\
coffin              casket pine box sarcophagus *\
wedge               shim block chock sprag quoin *\
bent                bias crooked twisted *\
pawn                pledge hock security *\
process             conduct method procedure practice *\
lock                fasten secure make fast closure *\
slim                slender thin slight frail weak *\
high                elevated lofty tall eminent costly *\
slit                cut gash slash slice *\
bend                curve turn give yield *\
slip                glide slide misstep err blunder *\
martyr              victim sacrifice scapegoat example *\
trumpet             cornet bugle horn bellow roar *\
weaken              attenuate faint impair undermine *\
wares               goods products provisions *\
negation            denial disclaimer contradiction *\
delay               put off retard defer postpone *\
animal              beast brute creature living thing *\
comedy              satire parody burlesque humor wit *\
luster              glaze gloss polish sheen *\
contraption         gadget contrivance *\
abrasive            rough grinding annoying irritating *\
stow                 conceal stash store cram *\
await               expect anticipate look forward to *\
tier                rank row level layer *\
autograph           signature manuscript holograph *\
counter             apposing apposite contrary against *\
element             essence ingredient member metal *\
writ                process summons warrant *\
allot               appoint assign distribute *\
allow               grant permit concede tolerate *\
ingress             entrance entry inroad invasion *\
understate          belittle degrade underestimate *\
mute                muffle silence reduce soften *\
move                transport impel actuate incite *\
doubtful            undecided unlikely vague indestinct *\
operative           effective acting working functioning *\
perfect             absolute intact ripe unspoiled *\
decay               decomposition deterioration *\
imperfection        fault defect weak blemish flaw *\
shudder             tremble quake quiver vibrate *\
hobby               avocation fad whim amusement *\
forest              woods tall timber timber land grove *\
prosper             fare thrive fortunate flourish *\
earn                work for gain win deserve merit *\
dock                landing wharf deduct withhold *\
kiss                smack osculation caress *\
pompous             haughty vain arrogant self-important *\
realize             comprehend appreciate understand *\
installment         down payment layaway plan part *\
scenic              theatrical dramatic stagy *\
merge               unite blend coalesce absorb *\
truth               fact reality verity gospel plain *\
shortage            deficiency shortcoming *\
beneath             underneath under below *\
scorch              char singe blacken parch wither *\
beginner            amateur novice rookie *\
scanty              few meager scant sparse stingy *\
society             humanity mankind folk culture *\
static              immobile motionless inert passive *\
castigate           criticize correct punish *\
jagged              sharp rough snaggy pointed *\
banal               commonplace trite habit *\
agriculture         cultivate farm till garden *\
wander              rove ramble stroll swerve deviate *\
witness             proof evidence testifier attestor *\
omnipotent          all-powerful almighty *\
venom               bane poison virus toxin *\
freshman            plebe greenhorn tenderfoot novice *\
unprepared          raw unarmed unready surprised *\
oblong              elongate rectangular elliptical *\
shut                close cease terminate stop *\
perish              expire die crumble nonexistence *\
godly               divine pious reverent devout *\
tempo               time beat rate pace rhythm *\
greedy              insatiable ravenous avid selfish *\
graze               touch brush scratch abrade *\
tempt               entice cajole fascinate lure decoy *\
shun                avoid elude evade ignore *\
embarrass           discomfort demoralize abash hamper *\
craving             appetite hunger thirst wish *\
spill               overturn upset slop let slip *\
length              span extent stretch footage *\
serenity            composure equanimity patience peace *\
stimulate           excite rouse animate stir spur *\
ethical             equitable moral humane decent *\
scene               view vista panorama site location *\
affliction          adversity distress plague trouble *\
scent               smell detect perfume odor *\
prank               antic escapade lark capper game *\
vixen               evildoer shrew scold female fox *\
system              coordination organization routine *\
malady              disease sickness illness infirmity *\
stomach             abdomen belly paunch *\
quarry              prey game catch target take *\
chagrin             mortification vexation dejection *\
vouch               guarantee warrant affirm declare *\
elite               select choice prime chosen people *\
steel               plate armor temper toughen *\
wet                 damp moist clammy rainy *\
bother              nuisance annoyance trouble worry *\
gentile             heathen pagan christian non-jewish *\
disband             break up dismiss dissolve *\
steep               sheer precipitous soak saturate *\
devotion            dedication piety affection love *\
ingenious           clever inventive skill *\
false               untrue lie fib belie falsify *\
chivalrous          knightly gallant noble courteous *\
gentle              mild calm soothing courteous *\
relic               fossil ruin vestige antique *\
depict              delineate picture portray *\
soak                wet drench permeate absorb *\
hangover            nausea atavism remnant *\
adjunct             addition appendix appendage *\
soap                cleanser detergent shampoo *\
soar                fly mount rise sail tower *\
manor               mansion hall estate territory *\
sophomoric          immature callow inane foolish *\
courtesy            respect good manners politeness *\
cipher              digit estimate add blank naught *\
vise                clamp gripper clinch *\
device              scheme trick stratagem ruse *\
medal               medallion badge decoration prize *\
fervent             earnest fervid ardent eager *\
face                visage features facade facet *\
unscramble          untangle disentangle unmix solve *\
brew                stew cook steep simmer ferment *\
painting            drawing design perspective *\
fact                reality actuality certainty *\
atmosphere          air sky ether ozone exosphere *\
terminate           finish shut end eliminate annul *\
vacancy             gap vacuum opening *\
bring               fetch carry convey conduct *\
brine               pickle salt water saline solution *\
rough               abrasive coarse crude harsh sharp *\
trivial             insignificant unimportant small *\
brink               edge brim rim bluff verge *\
principal           chief leader head *\
pause               cessation rest hesitation *\
transfix            pierce fasten impale opening *\
jar                 clash conflict discord vessel jug *\
score               account tally record music scratch *\
tape                band strip ribbon measure *\
jab                 punch blow prod poke *\
hope                desire trust confidence optimism *\
insight             discernment perceptiveness intuition *\
handle              shaft hilt grip knob *\
means               resources money wealth capital *\
wiggle              squirm shake wriggle wobble wag *\
wring               wrench twist rack pain squeeze *\
antagonist          foe rival adversary opponent *\
smash               shatter crush hit strike *\
summon               send for rouse invoke *\
stuff               cram pack jam fill pad wad *\
rein                curb check control restraint *\
exude               emit discharge ooze leak drain *\
withstand           face confront oppose defy *\
allusion            hint implication reference mention *\
frame               construct fashion fabricate *\
dungeon             pit cell jail donjon prison *\
wire                filament line *\
destiny             future fate impend loom approach *\
synod               council congregation conclave *\
unravel             untwine untangle explain unfold *\
injustice           bias warp twist partiality *\
wiry                filamentous strong muscular sinewy *\
specious            plausible ostensible apparent *\
witless             senseless silly foolish idiotic *\
tantrum             fit outburst rage frenzy *\
drum                boom hammer pulsate *\
phonetic            phonic phonal sonant vocal *\
ramp                incline slant slope *\
drug                medicine physic elixir *\
puff                swelling blow breath cloud wind *\
heart               bosom core nucleus pith *\
conclude            end close finish wind up deduce *\
outsider            alien stranger foreigner layman *\
quaver              quiver shake tremble warble trill *\
genetic             inherited hereditary innate *\
willing             minded disposed desirous docile *\
mime                mimic pantomime impersonate pretend *\
feather             plume quill plumage shaft *\
waste               dispersion ebb leakage loss expend *\
tyranny             despotism autocracy severity rigor *\
coherence           adherence adhesion cohesion *\
banish              exile dismiss expel eject *\
fallacious          illogical inaccurate incorrect *\
ultra               radical extreme excessive *\
ripe                mature perfect complete ready *\
lush                luscious juicy tender luxurious *\
site                location scene seat situation *\
lust                desire sensuality voracity avarice *\
askew               crooked awry lopsided *\
tenor               drift purport import meaning *\
ransom              redeem redemption release price *\
cohort              band company *\
denial              negation repudiation refusal *\
dilate              expatiate stretch enlarge *\
romance             novel love story fantasy *\
painstaking         particular thorough scrupulous *\
buffoon             fool clown jester comedian *\
vocabulary          words glossary dictionary language *\
terrorism           oppression tyranny anarchy *\
covenant            contract agree undertake *\
ball                dance shot projectile globe *\
infinity            incalculable eternity endless *\
dusk                twilight gloom half-light shadow *\
bale                bundle sorrow woe *\
drink               sip lap guzzle swill swig *\
upon                on on top of above against about *\
hangman             executioner punishment *\
infinite            immense vast unbounded untold *\
identity            oneness self individuality *\
fascinate           captivate charm interest tempt *\
trudge              march slog tramp walk plod *\
overcast            cloudy murky shadowy gloomy *\
enrage              anger exasperate provoke incense *\
command             order bidding dictum beck charge *\
lest                for fear that *\
gully               ditch gulch chasm *\
flesh               meat pulp animal tissue *\
glut                stuff cram choke pack jam *\
glue                mucilage paste cement adhesive *\
web                 weaving texture mesh net scheme *\
generous            unselfish wide altruistic lavish *\
wee                 tiny little minute small *\
cage                enclosure bars aviary pen restrain *\
lattice             grating mesh trellis screen web *\
combine             associate blend coalesce unify *\
exempt              absolve dispense remit spare *\
scoundrel           heel rogue scamp villain rascal *\
magnify             enlarge augment laud glorify *\
inundation          deluge flood torrent tide *\
crux                gist key crisis emergency *\
haul                drag pull draw deliver traction *\
supervise           officiate preside oversee control *\
atrophy             degeneration deterioration *\
password            countersign shibboleth watchword *\
pier                landing wharf quay *\
crisp               brittle curly blunt friable *\
bulge               swell protrude bag *\
garage              carport service station store *\
stagger             reel sway falter totter *\
imprison            lock up confine detain hold jail *\
become              befit accord with behoove turn into *\
sprain              wrench strain twist *\
sinewy              strong wiry powerful forceful *\
inconstant          unstable irregular fickle changeable *\
habitat             environment quarters abode *\
flush               blush redden elate thrill rinse *\
ballot              vote choice poll *\
recognition         gratitude nod perceiving identify *\
disbelief           doubt disbelieve *\
avoid               evade elude dodge sidestep *\
inkling             clue suggestion hint whisper *\
sustain             support endure maintain prolong *\
passion             love fervor ardor infatuation *\
pilfer              filch rob steal plunder *\
schedule            list catalog inventory *\
pressure            strain compulsion stress coercion *\
imaginary           unreal visionary illusory dreamy *\
adversary           opponent enemy foe rival *\
stage               platform scaffold arena theater *\
idolize             admire adore worship glorify *\
revise              alter correct reconsider edit amend *\
cadet               recruit combatant *\
alliance            association federation *\
rectify             correct improve repair purify *\
assess              value appraise price estimate *\
tiny                minute miniature small wee *\
negotiable          conveyable assignable transferable *\
subsidy             bounty provision bonus tribute *\
stamina             hardiness force vigor vitality *\
bump                collide knock strike hit *\
heresy              dissent heterodoxy doubt error *\
construction        building fabrication formation *\
grate               scrape grind rasp abrade *\
count               enumerate tell score figure *\
compute             figure calculate reckon number *\
evident             apparent plain obvious distinct *\
deficiency          lack shortage want scarcity paucity *\
smooth              glossy slick slippery glaze *\
excitement          stimulation provocation agitation *\
convince            persuade satisfy *\
problem             issue knot question dilemma *\
appraise            evaluate assess price *\
bearing             course trend carriage manner *\
recognize           acknowledge concede remember realize *\
contribute          give subscribe donate aid assist *\
rubble              trash litter refuse waste *\
denote              designate signify indicate express *\
replica             image double twin facsimile copy *\
variety             variation diversity assortment *\
deadly              fatal lethal mortal deathly *\
scholarly           academic studious erudite cultured *\
stockpile           reserve store hoard surplus *\
behold              see look at watch observe *\
illusion            delusion hallucination vision *\
reckless            careless foolhardy heedless *\
repeat              reiterate quote recite duplicate *\
oppression          terrorism wrong tyranny cruelty *\
vignette            decoration ornament picture sketch *\
chance              accident fate gamble long shot *\
pacify              appease mollify placate quite *\
repeal              revoke recall annul vacate abrogate *\
epilogue            afterword summation last word *\
vein                blood vessel stripe deposit lode *\
inspiration         breathing happy thought brainstorm *\
ghost               apparition phantom spector *\
rule                law ordinance code command order *\
write               compile inscribe transcribe record *\
pension             allowance annuity allotment *\
rural               rustic countrified bucolic *\
abhor               hate despise loathe detest *\
magnetic            electric hypnotic potential *\
nursery             the cradle infancy babyhood hatchery *\
tenuous             ethereal flimsy fragile slim thin *\
mansion             house manor hall villa abode *\
integrity           honor honesty wholeness *\
defraud             swindle cheat dupe fleece *\
unanimity           agreement consent accord *\
tickle              excite gladden delight please *\
daze                confuse dazzle bewilder awe stun *\
regal               royal splendid stately majestic *\
worth               merit value price cost estimation *\
amorous             loving passionate *\
compassion          sympathy tenderness kindness mercy *\
blanket             covering widespread comprehensive *\
distort             pervert warp twist bend *\
manic               maniacal insane frenzied *\
whisk               whip froth beat sweep swish *\
exaggerate          enhance inflate overestimate falsify *\
pinch               stress strain pressure emergency *\
globule             glob droplet bead blob *\
delegate            deputy envoy emissary agent *\
monologue           recitation speech reverie *\
endorse             approve support recommend *\
triumph             joy exultation celebration success *\
monotonous          wearisome humdrum tedious unvaried *\
contusion           bruise black-and-blue *\
horn                antler cornu callus nail *\
incompatible        inharmonious inconsistent clashing *\
above               overhead up superior surpassing *\
toll                tax import charge fee price *\
suppose             assume suspect conjecture sumarize *\
crunch              gnaw munch test trouble emergency *\
protection          safeguard defense shelter screen *\
pursuit             adventure quest inquiry pursuance *\
coddle              humor pamper lenient *\
study               meditation research examination *\
envoy               diplomat agent messenger *\
foolishness         idiocy nonsense folly indiscretion *\
smoke               reek fume smolder steam puff *\
maunder             digress wander meander *\
secure              guarantee pledge ensure warrant *\
thrust              push drive propel substance gist *\
glance              glimpse beam look skim peek graze *\
total               complete entire utter absolute *\
plot                diagram plan outline scheme *\
gloss               luster sheen shine finish *\
ploy                maneuver stratagem *\
insult              slap abuse affront offend *\
plod                persevere persist trudge *\
vegetate            stagnate inactivity *\
plagiarize          pirate copy imitate stimulate *\
fervor              heat passion unction verve *\
inflect             bend vary conjugate decline *\
ascribe             impute accredit attribute *\
award               prize medal decision vigilant *\
aware               cognizant informed *\
yard                enclosure court patio *\
word                expression utterance saying *\
err                 mistake offend slip fail misjudge *\
work                job occupation calling trade *\
eclipse             disappearance excel surpass *\
worm                larva grub insect crawler *\
worn                used frayed shabby weary *\
cuddle              snuggle nestle huddle clasp fondle *\
radiance            glory glow brightness brilliance *\
quiver              tremble shudder shiver flutter *\
pollute             contaminate foul desecrate taint *\
federate            incorporate join combine unify *\
nozzle              spout outlet vent valve *\
impair              damage weaken spoil mar *\
indifferent         neutral unconcerned detached cool *\
impassive           stolid stoical calm undemonstrative *\
provide             equip supply furnish replenish *\
agony               pain torture anxiety anguish *\
morbid              unhealthy diseased gloomy *\
rookie              beginner novice greenhorn *\
interview           converse question meeting inquiry *\
ordinary            usual medium average regular *\
beach               shore coastline sands *\
gamble              bet chance hazard risk wager *\
fever               pyrexia frenzy delirium disease *\
lad                 boy youth stripling *\
after               later subsequent following pursuit *\
movable             portable mobile changeable *\
lax                 loose limp slack remiss weak *\
fat                 plump stout chubby greasy rich *\
law                 statute ordinance regulation mandate *\
arch                curve arc vault *\
elusive             elusory evasive slippery shifty *\
hasty               precipitate sudden quick swift *\
appreciate          prize esteem value understand *\
greet               address hail salute welcome receive *\
green               lawn emerald immature untrained *\
worst               defeat conquer bad terrible *\
order               uniformity harmony system routine *\
greed               desire cupidity avidity avarice *\
modesty             humility diffidence timidity shyness *\
office              headquarters department room *\
devote              give to employ at destine *\
consent             assent approval compliance yielding *\
misconduct          misbehavior impropriety misdemeanor *\
mayor               administrator president magistrate *\
adolescence         youth minor juvenile teens *\
sheaf               cluster bale bundle bind *\
tinkle              jingle ring clink chink chime *\
production          formation construction fabrication *\
valor               courage fearlessness heroism daring *\
precipitate         rash hasty hurried impetuous *\
shear               clip cut snip trim prune fleece *\
split               rend cleave divide separate *\
then                soon next immediately consequently *\
unfortunate         unlucky hapless abortive ruinous *\
fragment            bit part scrap *\
safe                locker sure secure guarded defended *\
collide             bump clash smash hit strike *\
bane                poison venom curse mischief *\
band                belt strap stripe zone orchestra *\
bang                clap crash slam pound batter *\
repulsive           obnoxious vile offensive resistant *\
suitor              lover wooer admirer swain *\
bank                slope hillside vault depository *\
absolve             exempt excuse relieve pardon spare *\
reasonable          logical plausible probably rational *\
hurdle              difficulty hindrance snag obstacle *\
observance          performance compliance adhesion *\
transient           ephemeral fugitive volatible *\
flock               drove herd covey flight *\
network             reticulation mesh interlacing *\
remorse             qualm regret contrition *\
engrave             impression etch cut print *\
unkempt             uncombed disordered untidy *\
opportune           fortuitous timely seasonable *\
forth               forward onward out of progression *\
barrier             obstacle impediment hindrance *\
colorless           livid pale sear neutral dull *\
veto                nullification no disapproval *\
standard            prototype normal conventional grade *\
mutilate            maim destroy cripple disfigure *\
drench              douse soak wet saturate *\
maniac              madman insane person *\
louse               vermin bug parasite *\
caprice             fancy fit humor vagary whim notion *\
renew               revive restore resume continue *\
disuse              abstinence obsoleteness cessation *\
sprig               branch shoot spray *\
recondition         repair renew overhaul restore *\
render              give pay deliver supply yield *\
another             one more others next *\
comic               comical funny hilarious laughable *\
tangle              snarl jumble complication mix *\
illustrate          decorate exemplify explain clarify *\
vibrate             palpitate shake shudder throb *\
plentiful           copious numerous fruitful bountious *\
immodest            bold vain suggestive revealing *\
compromise          strike a balance go halfway *\
fumble              grope paw bungle unskillfulness *\
cuff                slap smite punch hit *\
inflate             aerate expand swell exaggerate *\
efface              erase expunge obliterate rub out *\
emblem              symbol token sign flag badge *\
inexact             unprecise incorrect wrong erroneous *\
mercy               pity leniency forbearance *\
guild               union association club *\
target              aim mark goal object *\
hike                walk tramp jaunt march *\
guilt               sinfulness culpability accusation *\
pessimism           dejection cynicism morbidity *\
manner              kind sort habit style *\
accompany           convoy escort company attend follow *\
contents            packing volume gist essence meaning *\
ponder              think reflect meditate consider *\
strength            vigor energy might force power *\
genuine             actual authentic real undisguised *\
widen               enlarge extend broaden increase *\
convenient          available handy useful favorable *\
latter              later last mentioned past *\
casual              accidental chance careless *\
luxury              elegance extravagance *\
transmit            send transfer convey forward *\
curfew              bedtime vespers siren whistle *\
gravy               sauce dressing *\
nobody              nonentity upstart jerk zilch *\
maiden              lass maid virgin first earliest *\
what                kind of whatever how which *\
anatomy             structure framework zootomy analysis *\
phase               appearance state condition aspect *\
autopsy             post-mortem examination inquiry *\
grave               sepulcher tomb death serious *\
swamp               marsh bog quagmire immerse inundate *\
notion              idea thought opinion fancy caprice *\
reserve             restriction restraint caution *\
knightly            chivalrous gallant courteous *\
subtle              sly artful crafty wily cunning *\
toast               brown heat warm drink to *\
adequate            acceptable effective enough *\
personality         character individuality self ego *\
do                  perform achieve contrive manage *\
ardor               fervor passion enthusiasm zeal *\
leisure             spare time idle hours holiday *\
nasty               foul filthy horrid dirty indecent *\
prune               shear snip trim abbreviate *\
infrequent          rare few uncommon unusual *\
runt                dwarf pigmy stunted underdeveloped *\
covering            blanket hood rug sleeve floor *\
implication         allusion suggestion meaning *\
steal               rob thieve pilfer filch palm *\
steam               vapor mist fog gas evaporation *\
erroneous           faulty inaccurate incorrect *\
cattle              livestock cows bulls steers *\
miserable           wretched forlorn doleful mean *\
pastel              pale light soft delicate tinted *\
away                abroad absent aside distant remote *\
calamity            casualty catastrophe tragedy *\
unable              unfit incapable impotence *\
cooperation         coadjutant in cahoots with partaking *\
furnishings         equipment provision furniture *\
accord              harmonize conform agree *\
embody              incorporate join unite organize *\
unfold              open unroll expose announce *\
climate             weather temperature *\
cot                 bed bunk couch *\
coy                 bashful reserved shy demure *\
ill                 unwell sick indisposed poorly *\
steer               guide pilot control manage direct *\
tone                sound quality accent pitch *\
abbreviate          shorten cut abridge condense *\
spear               lance pike shaft javelin *\
royal               regal imperial princely magnificent *\
trunk               stem chest box circuit *\
seizure             apprehension fit spasm stroke *\
infirm              unhealthy weak decrepit sick *\
oblivious           deaf unaware preoccupied heedless *\
speak               talk converse orate utter say *\
gratitude           gratefulness recognition praise *\
petty               trivial unimportant small *\
charisma            specialty personality trait mark *\
flexible            pliant limber lithe supple *\
warmth              glow heat passion feeling emotion *\
easy                comfortable unconcerned free smooth *\
excite              arouse provoke stimulate tantalize *\
hoist               elevator lift derrick crane lift *\
gracious            gentle courteous tactful kind *\
ahead               before in advance winning *\
air                 atmosphere sky vapor *\
aim                 purpose goal *\
abrupt              sudden short curt steep sheer *\
thrash              beat spank whip flog strike *\
aid                 assist contribute help support *\
property            assets quality belonging capital *\
mistake             misunderstand err misidentify *\
stink               reek smell stench offensive odor *\
sting               smart tingle irritate pain *\
dizzy               giddy groggy confused lightheaded *\
brake               retard check curb slow down stop *\
exile               expel remove banish expatriate *\
uplift              elevation improvement lift *\
stint               restrain restrict limit scrimp *\
descent             descending decursive deciduous *\
perform             enact play execute fulfill achieve *\
grapple             seize grasp clutch struggle contend *\
independent         free separate exclusive well off *\
raid                attack invasion onset incursion *\
swell               expand dilate bulge protrude *\
hang                dangle attach drape depend cling *\
evil                ill harm hurt nuisance mishap *\
hand                fist extremity helper employee *\
fuse                merge unite amalgamate weld melt *\
palpable            evident plain clear manifest *\
nip                 nibble bite cut pinch shorten *\
jangle              discord clangor ringing jingle *\
scenario            plot script text book *\
humble              lowly unassuming modest obscure *\
taint               corrupt spoil poison tarnish stain *\
client              customer buyer patron *\
impertinent         imprudent irrelevant inapt insolent *\
mingle              blend mix merge *\
athletic            agile spry muscular hardy robust *\
repose              rest inactivity relaxation sleep *\
farther             more distant further additional *\
victim              prey sufferer dupe gull sacrifice *\
hallow              bless sanctify consecrate enshrine *\
passive             nonresistant inactive inert quiet *\
exalt               exhilarate lift erect promote *\
shout               scream call bellow yell *\
spread              scatter strew cover unfold diffuse *\
board               council cabinet panel *\
evidencee           manifest visibility testimony data *\
righteous           godly upright just devout *\
cape                mantle cloak tippet bertha shawl *\
retreat             seclusion shelter withdrawal *\
sparse              scattered thin few meager scanty *\
night               darkness evening nightfall midnight *\
augur               foretell prophesy signify *\
security            bail mortgage pawn pledge safety *\
accuracy            precision correctness exactness *\
flatter             cajole compliment wheedle *\
hassle              quarrel squabble *\
critique            review criticism *\
bore                drill penetrate perforate tire *\
cede                yield relinquish grant assign *\
humor               disposition mood temper caprice *\
peek                peep glance look watch pry *\
peel                pare rind husk bark shell *\
pose                attitude posture sit *\
confer              converse discuss consult debate *\
ply                 exert urge attack apply work use *\
post                station assignment position place *\
trophy              medal prize *\
chaff               husks banter jesting *\
visa                endorsement validation stamp *\
cherish             nurture nourish foster protect *\
dilemma             plight predicament quandary *\
mantle              covering cloak cape robe *\
float               glide drift be wafted hover *\
profession          trade vocation calling business *\
bound               limit confine delimit leap *\
obligate            bind engage restrict constrain *\
lewd                obscene indecent unchaste *\
stumble             falter lurch trip flounder *\
familiarize         acquaint accustom habit *\
deception           untruth fraud deceit bluff *\
wag                 wave shake sway nod *\
segment             slice portion component member part *\
wad                 lump filling plug stuffing *\
frill               trimming decoration ornament extra *\
sovereign           prince ruler superior autocrat *\
fight               battle brawl quarrel *\
conservation        maintenance protection preservation *\
way                 passage road method manner mode *\
wax                 grease coat smooth polish *\
scathe              injure harm hurt castigate *\
diligence           application industry activity *\
converse            transposed reversed turned about *\
vitality            life vigor energy *\
peninsula           projection neck tongue of land *\
true                faithful loyal constant sincere *\
absent              gone lacking missing elsewhere away *\
dowry               dower dot inheritance possession *\
vagary              fancy notion caprice whim *\
maximum             supreme utmost greatest highest *\
crystal             lucid pellucid clear *\
emotional           hysterical sensuous moving fervent *\
emit                discharge emanate radiate breathe *\
digression          detour deviation discursion *\
abstract            theoretical abtruse supposition *\
molt                shed divest *\
wretched            beggarly worthless miserable *\
evidence            facts data grounds support proof *\
manure              fertilizer compost dung *\
subsist             exist live continue survive *\
enlist              volunteer sign up enroll recruit *\
mold                form shape figure stamp cast model *\
archive             chronicle anal record *\
physical            bodily anatomical material *\
disloyal            unfaithful false untrue inconstant *\
reality             truth actuality verity fact *\
evasive             elusive shifty false misleading *\
test                examination trial essay *\
unwilling           averse indisposed reluctant *\
frolic              play gambol caper romp disport *\
shrink              contract shrivel diminish flinch *\
truncate            abridge reduce shorten curtail *\
welcome             greeting salutation embrace receive *\
polite              mannerly courteous amiable gentle *\
faze                deter daunt ruffle disconcert *\
interval            separation break opening spaced *\
together            mutually jointly unitedly *\
loyal               faithful true devoted obedient *\
precedent           custom foremost exemplar pattern *\
concept             conception conceit thought *\
dance               ball hop prom trip the light *\
debauch             carouse orgy rape debase defile *\
global              spherical worldwide *\
grateful            appreciative thankful welcome *\
battle              fight engagement combat contest *\
devoted             faithful loyal constant *\
devotee             follower disciple zealot believer *\
varnish             shellac lacquer spar gloss *\
zone                region area belt band sector *\
mallet              hammer club maul *\
flask               bottle vial flacon ampoule *\
graph               chart tabulate diagram plan *\
hump                hunch lump bulge knob *\
flash               flare blaze burst streak gleam *\
rhythm              beat meter tempo accent *\
terror              fear dread fright alarm *\
brown               toast braise singe tan bronze *\
congest             overfill clog block plug *\
liability           responsibility contingency duty *\
anonymous           unnamed nameless incognito *\
trouble             affliction distress misfortune worry *\
blast               explosion discharge gust destroy *\
feeble              flimsy languid weak fragile puny *\
fragile             delicate frail tenuous gossamer *\
gun                 firearm weapon *\
discrete            separate distinct discontinuous *\
burgeon             bud sprout expansion vegetable *\
upper               higher superior *\
brave               courageous valiant *\
regret              remorse lamentation mourning sorrow *\
discover            uncover reveal disclose manifest *\
agitate             churn fret jiggle shake stir toss *\
cost                price charge expense expenditure *\
stupefy             deaden dull numb stun astound *\
helpless            impotent powerless vulnerable *\
tempest             storm gale hurricane blizzard *\
cargo               freight load ship baggage *\
curse               bane malediction oath swearing *\
appear              emerge rise seem look *\
havoc               devastation destruction wreckage *\
uniform             stable changeless outfit suit *\
sequential          chronological serial succeeding *\
appeal              entreaty plea begging petition *\
satisfy             content gratify appease convince *\
explosion           blast outburst pop detonation *\
blackmail           extortion hush money protection *\
disclaim            disown repudiate deny refuse *\
gorge               canyon gulch satiate glut surfeit *\
combatant           cadet fighter warrior soldier *\
teacher             minister tutor schoolmaster *\
change              alter transition vary modify *\
exemption           freedom immunity privilege liberty *\
detonate            set touch let off discharge explode *\
trial               test experiment hearing ordeal *\
burdensome          onerous weighty oppressive heavy *\
pillow              cushion bolster headrest *\
extra               additional spare redundant *\
paragon             ideal model perfect example pattern *\
uphill              ascending difficult strenuous *\
marker              indicator sign counter chip *\
stingy              penurious miserly scanty meager *\
prove               confirm verify show demonstrate *\
captivate           charm fascinate enchant enamor *\
coalesce            unite consolidate combine *\
live                exist be alive abide subsist *\
jam                 crowd crush blockage preserves *\
entrance            mouth entry ingress threshold *\
club                cudgel stick bat association *\
envelope            enclosure sleeve cover sheath *\
clue                suggestion intimation hint key *\
graphic             pictorial descriptive vivid *\
flinch              wince shrink recoil *\
chastise            chasten castigate discipline *\
cat                 feline pussy tabby kitten mouser *\
purge               cleanse clarify flush wash *\
can                 tin container *\
cab                 taxi hackney hansom cockpit *\
spy                 secret agent scout informer *\
attribute           allude ascribe impute quality *\
chip                piece splinter fragment flake *\
topic               subject theme thesis item *\
abort               stop quit cancel nullify *\
purity              clearness refinement filtering *\
exclude             blackball blacklist debar reject *\
clothing            clothes dress apparel wear attire *\
serum               blood fluid antitoxin plasma *\
productive          fertile lucrative rich fruitful *\
malevolence         evil bad intent misanthropy enmity *\
unwritten           oral verbal unrecorded spoken *\
lounge              sofa relax loll slouch repose *\
flank               side wing loin thigh *\
product             produce outcome effect result *\
escalate            intensify worsen increase *\
dive                plunge dip swoop descent *\
bawl                yell bellow cry sob *\
produce             goods yield harvest fruit *\
bear                endure tolerate suffer render yield *\
drastic             radical extreme stringent severe *\
flourish            wave wield flaunt brandish *\
remember            recollect observe acknowledge *\
explicit            express plain clear definite *\
rather              preferably more correctly passably *\
offend              break the law err displease provoke *\
perfection          excellence ideal model perfect *\
indeed              in fact truly *\
forfeit             penalty fine deposit lose *\
benevolence         generosity almsgiving good works *\
brain               cerebrum intellect mind *\
nefarious           evil detestable base wicked *\
cold                frigid chilly brisk crisp *\
still               silent quiet calm peaceful *\
mixup               confusion muddle disagreement *\
trifle              trinket trace nothing triviality *\
acknowledge         admit confess condede declare *\
vicinity            neighborhood locality proximity *\
window              casement dormer pane *\
suffocate           smother stifle choke strangle *\
atonement           reparation compensation amends *\
halt                stop check arrest pause cease *\
fling               throw cast hurl sling *\
nod                 salute greeting recognition *\
rake                gather collect rummage search *\
introduce           usher bring in present acquaint *\
half                hemisphere bisection two equal parts *\
provision           replenishment subsidy furnishings *\
hall                corridor lobby manor mansion room *\
expedite            dispatch rush hurry assist *\
lineage             ancestry family pedigree *\
inversion           reversal overturn inside out *\
placate             soothe quiet pacify conciliate *\
thankful            grateful appreciative much obliged *\
servant             servitor menial help subject *\
drop                let fall abandon collapse *\
volatible           changeable transient lively airy *\
domain              realm dominion territory region *\
hurried             impatient precipitate *\
avidity             eagerness longing desire keenness *\
supplant            supersede succeeed replace *\
year                calendar year twelve months *\
counteract          check thwart nullify negate *\
amusement           avocation game hobby play diversion *\
accomplish          do complete execute fulfill perform *\
space               extent area expanse spread capacity *\
irony               ridicule satire sarcasm *\
thirst              dryness craving desire *\
increase            augment enlarge extend dilate gain *\
tingle              sting prickle thrill *\
showy               dressy gaudy flashy glaring ornate *\
rational            logical reasonable collected sensible*\
viable              fertile capable potential practical *\
rebel               revolt resist mutiny rise up *\
marina              boat basin dock *\
obligation          duty promise agreement debt bond *\
care                concern consideration anxiety heed *\
vestige             trace remainder evidence relic *\
outcry              clamor tumult exclamation shout *\
profess             pretend feign teach instruct *\
altitude            height elevation *\
blind               ambush screen shade deception *\
indecent            immodest obscene improper bawdy *\
blink               wink flash twinkle glimmer *\
consecrate          bless sanctify hallow devote *\
rink                course drome skating palace *\
gasp                pant labor choke puff exclaim *\
rind                skin peel epicarp integument *\
demote              downgrade reduce degrade *\
drove               flock herd pack *\
size                magnitude bulk mass volume *\
impetuous           impulsive rash headlong rushing *\
sheer               utter absolute mere simple vertical *\
sheet               iceberg leaf covering bed linen *\
silent              still tacit hushed calm quiet *\
breed               create multiply generate produce *\
callous             hardened tough unfeeling insensitive *\
tragic              dramatic melodramatic disastrous *\
friend              acquaintance neighbor partner *\
artless             simple ingenuous naive *\
blackball           exclude ostracize reject boycott *\
pomp                grandeur show ostentation display *\
courier             messenger runner *\
expanse             stretch spread reach extent *\
short               abrupt brief concise curt small *\
peck                nip bite pick snip tap rap *\
television          video tv telefilm *\
recruit             enlist raise furnish supply *\
discernment         flair insight perception judgment *\
extinguish          quench stifle smother choke *\
troublesome         irksome onerous upsetting disturbing *\
surname             family name cognomen patronymic *\
angel               archangel celestial being invisible *\
slay                kill slaughter murder assassinate *\
premier             chief foremost earliest *\
slap                hit smack swat cuff insult *\
slam                shut close swat pound batter *\
stash                hide conceal *\
anger               resentment displeasure wrath *\
insatiable          greedy voracious quenchless *\
recover             regain get back redeem reclaim *\
slab                slice wedge section piece cut *\
offering            auction sacrifice contribution gift *\
veteran             old man elder old-timer *\
terrific            sensational wonderful fabulous *\
equipment           furnishings gear supplies apparatus *\
objective           unemotional unprejudiced unbiased *\
begin               origin cause source rise bud seed *\
prick               puncture pierce prod urge *\
oppressive          heavy sultry difficult confining *\
price               amount cost expense charge *\
dream               vision reverie fantasy delusion *\
steady              firm secure stable constant *\
tooth               fang tusk canine incisor molar *\
unconquerable       invincible irresistible *\
professional        expert technical adept learned *\
boggle              amaze astound surprise *\
ground              earth terra firma soil foundation *\
gnaw                chew masticate crunch irritate *\
ratio               proportion rate percentage value *\
title               name caption legend status surname *\
proportion          ratio dimension extent share part *\
jolt                hustle shock jar punch *\
texture             quality surface tissue grain *\
only                solely singly exclusively merely *\
stain               color dye discolor blotch smear *\
cannon              gun field artillery *\
truly               indeed really actually, absolutely *\
revulsion           reaction dislike recoil withdrawal *\
deprecate           protest regret disfavor *\
husband             mate spouse benedict man *\
concert             recital program serenade musicale *\
burst               rupture break rend explode shatter *\
imposter            fake masquerader pretender fraud *\
unfit               incapable unqualified unhealthy *\
asleep              sleeping dozing napping quiescent *\
sport               recreation athletics fun merriment *\
concern             regard pertain to relate refer to *\
incite              stir urge impel actuate provoke *\
glaze               luster shine glassiness *\
complexion          hue color tinge tint skin texture *\
altercation         contest quarrel argument dispute *\
between             intervene come between step in *\
import              meaning significance importance *\
notice              attention observation perception *\
transpose           exchange interchange reverse invert *\
pluck               courage bravery valor determination *\
blame               criticism censure charge condemn *\
article             item object thing story piece *\
whisker             beard hair stubble mustache *\
cleave              stick adhere cling *\
talented            artistic clever gifted capable *\
guffaw              laugh snort roar *\
pertain             apply refer bear upon belong relate *\
monk                friar hermit brother cenobite *\
temper              nature disposition mood tone *\
aura                atmosphere air emanation *\
evict               eject oust remove expel *\
dispatch            send expedite kill accomplish *\
exploit             utilize profit by milk misapply *\
learning            assimilation absorption erudition *\
disgrace            degrade abase dishonor humiliate *\
resort              gather flock frequent refuge *\
rebuild             reconstruct remodel build up *\
toss                fling buffet agitate stir throw *\
wonderful           miraculous marvelous amazing *\
homely              plain simple rustic down-to-earth *\
external            extraneous outer outside visible *\
trick               artifice craft illusion wile ruse *\
cherub              angel child urchin *\
zenith              summit top apex apogee pinnacle *\
soil                loam earth sod dirt *\
agnostic            skeptic doubter *\
bias                prejudice partiality bent *\
embrace             hold clutch clasp hug *\
return              restore echo render reply answer *\
worry               care anxiety fear apprehension *\
develop             evolve unfold mature grow cultivate *\
inquire             ask investigate question probe *\
media               magazine newspaper journal radio *\
medic               doctor paramedic *\
epoch               cycle date era period *\
inquiry             autopsy interview pursuit quest *\
document            instrument writing record evidence *\
noble               aristocrat title distinction grand *\
finish              end terminate complete conclude *\
foam                froth suds lather spume *\
fruit               produce harvest offspring results *\
cinder              slag ashes brand ember coal lava *\
corpulence          fatness fleshiness obesity plumpness *\
validate            confirm legalize *\
swallow             ingest gulp devour consume absorb *\
theater             arena stage playhouse concert hall *\
bondage             slavery subjection peonage *\
severe              acute austere drastic harsh *\
breeze              breath draft zephyr flurry blast *\
demean              debase lower humble *\
wean                separate deprive alienate grow up *\
taxi                jitney cab hackney *\
valuable            precious costly worthy useful *\
touch               contact feel handle palm meet *\
speed               haste hasten hurry accelerate *\
death               expiration decease demise the grave *\
senseless           inane silly unwise witless *\
improvement         uplift mend advance progress *\
subversion          overthrow defeat mutiny rebellion *\
allude              refer ascribe attribute *\
verse               poetry stanza measure passage *\
swim                paddle stroke float *\
frown               scowl glower look askance *\
read                peruse interpret decipher *\
ruler               sovereign straightedge slide rule *\
specimen            example sample part unit *\
early               before timely punctual prompt ready *\
earnest             eager fervent intent serious *\
stunt               dwarf retard check trick feat *\
execution           action rendition fulfilling *\
lady                gentlewoman madam dowager noblewoman *\
hovel               hut kennel cottage shed cabin *\
rear                nurture bring up raise establish *\
fortune             fate lot destiny chance luck *\
greeting            hail hello nod welcome salutation *\
miracle             wonder marvel fluke phenomenon *\
engross             monopolize control absorb engage *\
benefit             behalf boon profit utility *\
output              produce yield harvest *\
verbal              spoken oral unwritten literal *\
duration            term time period continuance *\
derisive            mocking sarcastic contemptuous *\
squirm              twist thrash about wriggle *\
perverse            contrary stubborn obstinate *\
deficit             shortfall debt shortcoming *\
squirt              emit spurt eject spit *\
hustle              jostle jolt poke prod hasten *\
assembly            congress convention meeting *\
dejection           depression sinking heart dismay *\
throb               beat pulsate vibrate quiver *\
equivalent          equal tantamount corresponding *\
throe               pang spasm pain agitation *\
uneasy              restless perturbed disquieted *\
hectic              feverish febrile excited *\
innocence           guiltlessness purity virtue *\
assemble            collect convene meet muster *\
bazaar              market place fair street fair *\
throw               pitch toss cast fling *\
comparison          parable simile analyzing relating *\
vacillate           falter fluctuate waver sway *\
chop                cut mince cleave lop hack strike *\
assassin            killer slayer murderer thug *\
backup              substitute alternate aid *\
stratagem           artifice device gambit maneuver *\
outlook             appearance prospect forecast *\
renovate            renew restore repair freshen *\
elementary          rudimentary primary fundamental *\
restless            impatient uneasy jumpy nervous *\
stare               gaze gape gawk *\
log                 timber firewood journal record *\
prepare             concoct cook make ripen season *\
area                place region space zone *\
start               begin commence set out originate *\
stealth             stalking secrecy skulking *\
lot                 fate destiny fortune sum *\
immaculate          clean spotless chaste pure virgin *\
zip                 zero vigor zest energy *\
groan               lamentation moan grumble lament *\
pitcher             carafe jug jar bottle vessel *\
tyrant              despot autocrat oppressor *\
posterior           later succeeding rear hindmost *\
recoil              reaction revulsion rebound bounce *\
upbeat              lively brisk *\
hire                rental fee remuneration *\
fraud               deception swindle imposture artifice *\
intermission        interlude lull interim wait recess *\
bucket              pail tub scoop receptacle *\
sadness             despair gloom sorrow dejection *\
undertake           venture enterprise tackle engage *\
subdue              tame overcome master conquer *\
describe            chronicle portray depict picture *\
antenna             aerial rabbit ears mast tower *\
event               occasion occurrence affair episode *\
valid               sound logical legal *\
poor                indigent inferior faulty defective *\
polar               extreme ultimate furthest outermost *\
ineligible          unqualified inadmissible unfit *\
vaccinate           variolate inoculate inject immunize *\
arbitrator          judge referee umpire mediator *\
drift               pile heap deposit movement *\
podium              stand dais rostrum platform *\
peak                summit top apex pinnacle crest *\
unattractive        ugly homely plain unsightly *\
pool                lagoon lake monopoly syndicate *\
building            construction pile structure *\
assert              avow declare say claim *\
apathy              coldness indifference unconcern *\
untidy              careless messy disorderly unkempt *\
repay               reimburse refund recompense *\
requisition         demand order claim exaction *\
unrest              restlessness disquiet agitation *\
thoughtful          considerate polite studious sensible *\
adhere              cling to stick hold closely to *\
dreadful            awful hideous horrible terrible *\
insulate            cover protect shield isolate detach *\
foster              cherish nourish nurture raise *\
solicit             lobby urge ask request query *\
fountain            spring jet spray fount source *\
confidential        secret private intimate *\
very                exceedingly decidedly surpassing *\
horror              terror disgust dread aversion fear *\
xylod               woody ligneous *\
rogue               vagabond scoundrel cheat *\
decide              determine elect choose settle *\
heaven              kingdom of god abode of the blessed *\
issue               offspring arise result problem *\
mild                gentle easy bland soft harmless *\
vanquish            conquer subdue subjugate silence *\
fence               barrier barricade wall hedge rail *\
vivacious           lively animated gay spirited *\
resound             echo ring reverberate *\
boldness            audacity confidence courage *\
hamper              constrict cramp embarrass *\
darkness            night shade murk gloom mystery *\
spry                lively alert athletic nimble agile *\
lurch               sway pitch stagger stumble *\
skid                curb brake sideslip slide spin *\
overrule            override reverse set aside rescind *\
turmoil             ferment welter agitation confusion *\
loose               free detached flowing unbound *\
modify              change vary alter temper *\
excess              immoderation dissipation exorbitance *\
strong              sinewy powerful robust hardy hearty *\
arena               field theater coliseum stadium *\
conviction          opinion belief faith persuasion *\
whine               cry whimper complain moan gripe *\
amount              total quantity sum *\
family              household forefathers children *\
ask                 interrogate question inquire invite *\
teach               instruct educate tutor coach *\
pulverize           crush powder crumble *\
bicker              spar squabble wrangle argue *\
injure              wound hurt damage abuse deface *\
unction             anointing gushing fervor *\
mysterious          occult uncanny strange unnatural *\
injury              accident harm hurt mischief wound *\
excuse              pardon remit overlook forgive *\
impulse             impulsion impetus momentum thrust *\
hurry               press rush drive force hasten *\
pretense            show pretension imitation excuse *\
grill               pan rack broiler roast saute *\
offender            lawbreaker culprit *\
coalition           union alliance league merger bloc *\
spontaneous         instinctive automatic involuntary *\
history             record chronicle annals *\
transcend           exceed overpass surpass excel outdo *\
visage              face semblance look aspect *\
encircle            environ surround embrace encompass *\
boycott             shun blackball resist *\
tract               expanse region publication *\
phrase              expression sentence paragraph *\
species             variety class sort category *\
xylophone           marimba vibraphone gigelire *\
thieve              poach steal loot rob filch *\
utilize             exploit harness employ use *\
reject              refuse disavow veto discard abandon *\
gash                incision notch scratch slash slit *\
threat              menace intimidate terrorize frighten *\
rude                barbarous crude primitive rough *\
sneak               slink skulk crawl steal *\
idiocy              imbecility vacuity foolishness *\
unsung              neglected slighted ignored *\
invasion            encroachment infringement violation *\
horizontal          level plane azimuth lying down *\
inconceivable       unimaginable unthinkable incredible *\
a                   some one any each *\
criticize           castigate quibble study probe *\
deluge              flood inundation downpour *\
ego                 self personality identity *\
dread               awe fear horror phobia terror *\
deterioration       wane ebb decline recession *\
egg                 ovum embryo beginning incite goad *\
crafty              sly subtle wily foxy tricky *\
help                aid assistance relief relieve *\
reservoir           cistern watershed reserve store *\
slouch              droop slump sag loll bend *\
soon                presently promptly quickly *\
perceptive          knowledgeable observant aware *\
helm                tiller wheel authority command *\
absence             nonresidence truant not present *\
astonish            amaze wonder suprise astound *\
relate              tell recount report narrate connect *\
fool                folly dupe mislead idle away tamper *\
evening             dusk nightfall close of day sunset *\
food                nourishment nutriment sustenance *\
pirate              marauder corsair sea robber *\
vomit               eject spew throw up disgorge *\
foot                base bottom footing hoof paw *\
intervene           interrupt mediate arbitrate *\
capability          ability caliber skill aptitude *\
fairy               fay sprite pixy elf gnome *\
notify              inform warn apprise advise tell *\
heavy               weighty oppressive tedious tiresome *\
transcribe          copy write reproduce transliterate *\
pamper              humor indulge spoil pet coddle *\
wacky               erratic odd demented *\
deride              revile ridicule scoff sneer *\
quantum             quantity amount substance mass *\
balk                rebel stop shy hinder thwart foil *\
beyond              farther yonder over past *\
heave               lift hoist raise throw pitch *\
anarchy             lawlessness terrorism disorder *\
vertigo             dizziness giddiness vertiginous *\
trusty              conscientious reliable honest *\
unnatural           artificial factitious foreign *\
since               ago later subsequently afterwards *\
testify             attest swear indicate show *\
publish             announce vend reprint issue *\
jolly               joyous mirthful buoyant elated *\
safety              security surety assurance escape *\
shrivel             shrink compress wither condense *\
outrun              overtake outdistance outstrip *\
ass                 donkey jackass burrow fool *\
bald                hairless treeless bare *\
inert               inanimate passive static *\
dirt                earth soil dust mud *\
reason              intellect explanation cause ground *\
base                bottom foot foundation root essence *\
put                 place locate set deposit plant *\
earliest            first original premier *\
launch              float start get going cast throw *\
perceptible         appreciable discernible visible *\
terrible            terrifying dreadful awesome fearful *\
caption             title subtitle headline heading *\
automobile          self-propelled car auto vehicle *\
undergo             suffer experience endure sustain *\
assign              hand over allot distribute delegate *\
elder               older earlier superior senior *\
mist                fog haze vapor drizzle film *\
miss                fail omit skip overlook avoid *\
meadow              mead lea pasture land *\
horse               equine stallion mare colt filly *\
ostracize           blackball blacklist exile expel *\
blossom             bloom flower bud *\
obedience           compliance submission nonresistance *\
eddy                swirl vortex whirlpool maelstorm *\
station             place position office rank *\
expand              augment inflate stretch swell *\
sigh                moan long yearn grieve *\
scheme              collusion design device plan plot *\
merciless           relentless ruthless pitiless *\
lament              groan mourn sob wail weep whimper *\
anticipate          await expect precede forestall *\
premeditate         calculate plan prearrange *\
uncanny             mysterious eery ghostly *\
kindle              ignite start set ablaze stir *\
garrison            fort outpost stronghold camp *\
phobia              fear dread aversion repulsion *\
alongside           beside by with close by *\
vulnerable          open weak defenseless susceptible *\
lid                 top cover cap crown closure *\
lie                 prevaricate falsify deceive *\
adrift              afloat drifting loose *\
evasion             elusion avoidance escape *\
trance              daze stupor abstraction ecstasy *\
camouflage          disguise conceal mask *\
lip                 edge verge labium flange *\
useless             vane impotent waste futile *\
caliber             gauge quality ability capability *\
quote               repeat cite instance abstract *\
quota               allotment share proportion *\
plunder             pillage loot spoil gain advantage *\
bridle              curb check harness bristle *\
position            location perspective post status *\
salary              stipend pay wages hire compensation *\
chronicle           history annals record describe *\
sturdy              hardy robust durable stubborn *\
mobile              movable loose free animate *\
clear               clear-cut plain understandable *\
succor              help aid assist serve comfort *\
clean               pure spotless immaculate unspoiled *\
velocity            speed swiftness acceleration rush *\
latest              last freshest newest in fashion *\
blend               combine mix crossbreed merge *\
perseverance        stability tenacity persistence *\
humid               moist damp wet dank *\
languid             weak feeble weary listless *\
completion          conclude finish close end wrap up *\
wriggle             wiggle shake squirm writhe shimmy *\
paranoid            fearful suspicious distrustful *\
less                inferior not so much less under *\
assertion           affirmation plea statenent *\
pretty              attractive comely good-looking *\
circle              encircle ring girdle circum-navigate *\
legible             readable decipherable clear plain *\
rehearse            repeat recite enumerate drill *\
waterproof          leakproof impermeable hermetic *\
outlast             outlive survive outwear durable *\
famous              noted famed renowned *\
basement            cellar vault *\
docile              gentle tractable teachable *\
intensify           aggravate enhance escalate raise *\
chimney             smokestack spout flue vent *\
molten              melted fused liquefied *\
immerse             bathe dip baptize plunge submerge *\
boost               aid help endorsement assist help *\
alteration          variation difference change *\
perfume             fragrance aroma cologne scent *\
withdrawal          exit retreat recession revulsion *\
courteous           civil gentle gracious polite suave *\
cramp               restrict hamper confine cripple *\
plausible           credible reasonable believable *\
culture             development education learning *\
close               compact dense firm approximate *\
constellation       cluster asterism assemblage *\
horrid              horrible foul shocking *\
plush               pile nap hair velvet fluff *\
woo                 court make love to seek pursue *\
woe                 trouble grief misery sorrow *\
architect           planner designer creator *\
unconscious         unaware insensible asleep repressed *\
missing             omitted gone absent lacking *\
wreath              garland lei festoon *\
spray               spume varrage sprinkler sprig *\
invisible           angel unseen intangible out of sight *\
dally               linger wait toy tease wait *\
league              band coalition covenant federation *\
sensitive           irritable sensuous sentient sore *\
buzz                drone hum whir whisper *\
vault               bank crypt dome jump leap tomb *\
secrete             hide conceal mask prepare *\
battery             assault attack guns solar or storage *\
deceit              deception hoax fraud trickery *\
vessel              boat ship bowl jar pitcher vial *\
unrestrained        uncurbed free loose rampant *\
arrest              seize apprehend capture halt *\
stamp               impression symbol seal trademark *\
damp                dank humid moist smother subdue *\
exert               ply rack strain use put forth *\
nape                scruff scuff scrag *\
coarse              rough uncouth rude crude vulgar *\
maintenance         conservation upkeep sustaining *\
territory           region district kingdom state *\
empty               void deplete exhaust evacuate *\
crack               pop rend explode bang crackle *\
deter               restrain hinder discourage pause *\
determination       purpose resolution resolve *\
bidding             auction command offering *\
furrow              flute groove trench ditch gutter *\
pact                compact covenant treaty bargain *\
loom                menace emerge tower overshadow *\
utmost              most greatest final total complete *\
look                behold perceive discern inspect *\
rope                cable cord lariat strand strap *\
pace                rate speed velocity step stride *\
while               during whilst although whereas *\
match               fuse equal peer contest bout *\
endanger            imperil danger *\
loot                booty spoil plunder *\
animated            brisk vivacious spirited lively *\
guide               tracker leader instructor map *\
loop                ring circle noose eyelet ambit *\
pack                stow bale load burden bundle *\
costly              expensive precious valuable *\
confound            confuse bewilder perplex dumfound *\
ready               prepared available handy prompt *\
grant               gift allotment contribution yield *\
makeshift           expedient substitute stopgap *\
shackle             fetter hobble manacle bond *\
grand               large impressive magnificent stately *\
conflict            battle combat strife fight *\
sham                counterfeit imitation fake pretense *\
bonus               premium extra dividend *\
banter              chaff ridicule spoof teasing joking *\
censure             blame reproach criticism judge *\
grind               pulverize crush sharpen polish *\
synopsis            condensation abridgment digest *\
coup                stroke master stroke cunning *\
chore               job task assignment *\
abstain             deny constrain refrain avoid desist *\
morsel              bite piece scrap chunk bit *\
ignoble             mean shoddy disgraceful lewd *\
useful              beneficial valuable helpful *\
tick                click beat check dot *\
botch               bungle blunder butcher mar spoil *\
informal            casual free easy unofficial *\
cemetery            graveyard necropolis burial ground *\
exhilarate          elate exalt inspirit enliven *\
harmonize           accord concur blend arrange *\
march               tramp pace file advance parade *\
outspoken           frank candid unreserved blunt *\
lacking             absent destitute missing *\
evaluate            value appraise estimate price *\
showing             performance display exhibition *\
game                amusement sport play match contest *\
jibe                quirk yaw agree correspond *\
submission          obedience resignation humility *\
oncoming            impending menacing *\
strife              contention emulation rivalry *\
bun                 roll chignon food knot *\
popular             common public liked chosen famous *\
sketch              draw outline draft chart map *\
parade              show display march ostentation *\
creation            birth creature genesis world *\
some                several one any a number of *\
urgent              important imperative pressing *\
savage              wild untamed barbarous ferocious *\
reckon              calculate count compute estimate *\
simmer              boil cook bubble *\
slash               hack cut gash cleave sever sunder *\
run                 scurry hasten travel flow *\
rub                 buff abrade scour polish stroke *\
reach               touch attain gain get to strive *\
benefactor          benevolence receive *\
rug                 mat carpet covering *\
stem                stalk derivation lineage *\
step                gait pace stride tread *\
stew                simmer steam worry fret fume *\
ache                hurt pain throb crave *\
taboo               tabu prohibition forbiddance *\
subtract            deduct remove *\
abroad              overseas away outside roaming *\
rut                 groove beaten path routine *\
shine               glow gleam polish wax burnish *\
faith               trust reliance confidence belief *\
gnome               elf fairy dwarf troll *\
sake                purpose motive reason regard *\
allotment           grant lottery pension quota share *\
silence             quiet peace hush mute muzzle *\
within              indoors internal inside *\
nonsense            absurdity foolishness silliness *\
ensue               follow succeed supervene pursue *\
murk                gloom haze dusk dark blackness *\
conscientious       faithful honorable upright trusty *\
convulsion          fit spasm attack epilepsy *\
innate              natural inborn congenital *\
rummage             hunt ransack junk *\
inept               clumsy unskilled incompetent *\
hail                greeting welcome salute summon *\
reef                island shelf ridge bar beach *\
branch              member arm bough offshoot *\
reek                vapor fumes odor stench stink *\
reel                spool stagger totter wobble *\
dull                blunt flat stolid stupefy stupid *\
nestle              lodge snuggle lie cuddle *\
similar             like realistic such comparable *\
seethe              boil stew simmer soak *\
unwise              foolish senseless imprudent *\
surmise             guess suspect conjecture theory *\
nab                 grab catch seize ensnare *\
sullen              sulky ill-tempered grim crabbed *\
nag                 pester scold badger fret complain *\
application         diligence use utilization *\
nap                 doze sleep repose *\
transport           conveyance movement emotion carry *\
forge               make fabricate counterfeit invent *\
draw                haul drag pull tub extract attract *\
venerable           aged hoary respected revered *\
resign              abandon abdicate quit retire *\
drag                draw pull tow tug haul protract *\
drab                grayish brownish monotonous dull *\
structure           building edifice arrangement *\
outing              excursion junket field day picnic *\
sedative            tranquilizer sleeping pill bromide *\
orbit               path track circuit revolution *\
depth               deepness concavity shaft well pit *\
virtue              goodness morality integrity *\
grunt               snort rasp oink complain *\
cheerful            gay glee hip spirits lively joyous *\
proposition         axiom thesis ask approach accost *\
go                  leave depart withdraw retire vanish *\
barbecue            cookout rotisserie spit *\
emboss              knob stud engrave chase ornament *\
phenomenon          marvel wonder occurrence *\
illegible           unreadable scrawled jumbled pied *\
stave               penetrate puncture pierce fend off *\
arrogance           haughtiness self-importance insolence *\
shack               hut shanty shed abode *\
friendly            amiable cordial genial social *\
virtuous            chaste moral worthy good upright *\
prudence            discretion carefulness caution tact *\
wave                wag shake sway flutter motion *\
trough              manger hutch bin trench ditch *\
discouragement      despair dismay melancholy *\
snide               spiteful sarcastic cynical invidious *\
stiff               rigid inflexible firm strong *\
button              fastener disk boss badge emblem *\
verdict             judgment ruling finding decision *\
sedentary           stationary seated inactive *\
enforce             compel force oblige urge lash goad *\
pyromaniac          arsonist firebug incendiary *\
jump                hop leap bound spring vault *\
hose                hosing tubing stockings socks *\
poke                prod nudge stick jab push *\
edifice             pile structure monument building *\
cell                protoplasm cage jail compartment *\
rotten              decomposed putrid corrupt *\
experiment          attempt venture adventure *\
infuse              instill transfuse inspire implant *\
stance              foothold station posture *\
prescribe           urge suggest advise order *\
convert             change make over retool adapt *\
justice             fairness impartiality equity legal *\
repel               resist reject scatter revolt *\
salvation           redemption deliverance salvage *\
wig                 toupee transformation switch *\
daybreak            day morning dawn sunrise *\
danger              peril jeopardy risk hazard threat *\
win                 beat conquer master gain obtain *\
manage              administer conduct control afford *\
wit                 sense of humor fancy whim comedy *\
manipulate          operate control manage influence *\
imbue               saturate tinge suffuse instill *\
snoop               pry investigate probe meddle *\
remains             corpse remainder ruin rest *\
crag                rock boulder *\
vehicle             machine transportation automobile *\
cram                glut squeeze stow stuff compact *\
noisy               blatant boisterous loud vociferous *\
lacerate            tear mangle harrow distress *\
visibility          appearance exposure to view evidence *\
missile             bullet pellet projectile weapon *\
unfaithful          disloyal faithless untrue fickle *\
wretch              sufferer beggar outcast rogue *\
meek                subdued humble patient submissive *\
consort             spouse husband wife *\
ride                drive tour travel journey *\
meet                encounter assemble junction *\
nurture             sustain support feed foster cherish *\
vaunt               boast brag talk big vapor *\
control             command dominate govern rule *\
wharf               dock pier landing waterfront *\
speciality          originality feature trait particular *\
suds                foam lather bubbles *\
hit                 success smash favorite *\
skirt               kilt coattail farthingale *\
hesitate            falter waiver shrink pause demur *\
defective           faulty poor imperfect incomplete *\
poetry              balladry poem ode lyric verse *\
arrangement         array file format structure *\
perspire            exude sweat exhale excrete *\
elliptical          eccentric oblong oval ovoid *\
immoral             wrong evil corrupt lewd indecent *\
filament            hair thread twine wire *\
circular            coronary round orbicular *\
fare                get on thrive prosper get along *\
farm                agriculture cultivate *\
fatigue             weary tire exhaust overstrain *\
prance              caper cavort spring dance strut *\
scoop               ladle dipper spoon *\
rove                cruise roam stray travel wander *\
enclose             envelop surround penned in *\
costume             clothing outfit rig fancy dress *\
cruise              voyage journey roam meander rove *\
brittle             crisp frail fragil weak *\
brood               hatch progeny posterity *\
outer               outside outward external *\
exclusion           omission exception rejection exile *\
equanimity          evenness poise serenity self-control *\
broom               brush besom whisk *\
youngster           child juvenile boy girl pupil *\
sword               blade saber cutlass *\
propound            propose state suggest *\
stout               chubby fat obese plump thick *\
front               fore foremost face frontage *\
handy               convenient near available *\
mastery             rule victory ascendency supremacy *\
university          college school seminary institute *\
slide               glide skid slip *\
magnitude           quantity size extent measure *\
mode                state manner method custom fashion *\
upward              higher aloft upwards *\
unwind              relax repose let down *\
illuminate          light illumine clarify elucidate *\
chunk               lump hunk part *\
retaliation         avenge reprisal revenge vengeance *\
constitute          form be make frame compose total *\
measure             quantity extent gauge amount *\
gallant             chivalrous valiant intrepid bold *\
armor               steel plate mail shielding *\
confess             acknowledge avow own admit *\
fathom              measure take a sounding probe study *\
cause               origin source wellspring principle *\
obsess              haunt beset besiege *\
umbrella            shade screen parasol canopy *\
diagonal            aslant oblique catty-corner *\
undo                loose unlock unfasten untie release *\
ancestry            paternity maternity origins stem *\
sneer               smile jeer taunt scoff deride *\
underpass           underwalk tunnel tube viaduct *\
hostile             antagonistic apposed unfriendly *\
precaution          care caution warning safeguard *\
route               corridor itinerary path way course *\
keep                retain hold have possess receive *\
counterpart         copy likeness mate picture *\
keen                shrewd smart sharp edged acute *\
shred               strip tatter remnant bit speck *\
benediction         blessing commendation *\
mankind             humanity society human race *\
confuse             bewilder confound distract perplex *\
indisposed          ill unwilling dissuasion diseased *\
stump               remnant stub snag hobble *\
eminence            height altitude distinction rank *\
quality             attribute property excellence trait *\
durable             outlast sturdy permanent enduring *\
attach              affix annex fasten fix connect *\
attack              assault and battery onslaught charge *\
prong               point spike extension tine *\
circulate           stir proclaim report distribute *\
punish              castigate clobber inflict spank *\
omen                warning foreboding portent *\
photograph          picture photo film snapshot *\
spurn               flout scout reject repel scorn *\
glisten             gleam glint sparkle *\
girdle              belt circle truss corset *\
beg                 implore beseech ask alms *\
bed                 couch cot resting place *\
defense             protection guard shield resistance *\
spurt               gush squirt spray burst *\
sultry              hot oppressive humid muggy close *\
bet                 wager stake gamble play lay odds *\
exhibit             show present display produce *\
torment             torture vex abuse mistreat hurt *\
need                necessity requirement desire lack *\
border              edge limit margin rim frontier *\
tale                story account recital report *\
ephemeral           short-lived fugitive transient *\
gunner              carabineer hunter marksman *\
instance            case example illustration *\
jaunt               excursion ride escapade *\
sufficiency         adequacy enough complete plenty *\
visor               mask shield eyeshade brim *\
disgorge            unload vomit eject spew *\
rigor               harshness austerity severity *\
nuisance            bother evil plague vexation trouble *\
gallery             balcony corridor veranda *\
eject               reject expel discard cast out *\
spleen              resentment wrath anger malice spite *\
urn                 vase vessel pot amphora *\
upset               overthrow overturn capsize bother *\
talk                conversation chatter chat gossip *\
misdeed             offense wrong malefaction *\
constrain           abstain oblige compel force urge *\
deface              disfigure injure mar scar scratch *\
impression          engrave sensation sensibility stamp *\
unsettle            upset disturb disarrange unhinge *\
molest              disturb annoy vex pester harass *\
envy                jealous covetousness spite *\
untimely            inopportune unseasonable early *\
cavort              caper gambol prance romp play *\
tire                weary fatigue bore exhaust *\
winner              success victor conqueror champ *\
brighten            hearten perk improve clear up *\
rash                eruption impetuous imprudent unwary *\
employer            user boss director *\
rasp                scrape file grate chafe *\
fuel                inflammable burnable ignite peat *\
achieve             accomplish attain reach *\
dodge               avoid elude evade *\
gratify             indulge please satisfy humor *\
commendation        benediction blessing praise *\
overall             blanket all-inclusive *\
joint               connection link juncture *\
legitimate          lawful legal proper valid *\
probably            likely plausible reasonable credible *\
endless             incessant uninterrupted perpetual *\
gray                dun mousy slaty clouded overcast *\
shy                 bashful reserved timid cautious *\
quarantine          detention detainment restraint *\
dejected            downcast pout sad depressed *\
ordain              install appoint invest frock decree *\
watershed           runoff reservoir catchment basin *\
gush                pour flow jet spurt effuse *\
contain             include comprise incorporate *\
recoup              regain retrieve reimburse *\
grab                capture nab snatch wrest *\
preach              exhort evangelize lecture moralize *\
sensuality          lust pleasure desire exciting *\
shake               vibrate agitate shiver rattle *\
orphan              waif stray gamin urchin *\
portend             signify omen forebode foreshadow *\
reinforce           strengthen support replenish *\
powder              dust pulverize particles *\
desperate           hopeless incurable reckless rash *\
humane              considerate human benevolent *\
portent             omen sign wonder marvel *\
unearth             exhume expose discover uproot *\
tend                mind watch care for guard *\
state               condition category mood plight *\
lug                 tote transport convey carry *\
neither             negation none of never *\
sabotage            destruction vandalism subversion *\
attention           mindfullness intentness attentiveness *\
solitary            alone lone lonely single sole *\
importance          consequence prominence significance *\
interfere           butt in meddle interpose hinder *\
dwell               live reside abide hang out *\
merry               jovial gay vivacious mirthful *\
disconnect          detach separate uncouple unfasten *\
precious            priceless costly precise beloved *\
outfit              costume equip getup suit uniform *\
inundate            flood deluge sufficient *\
admit               let in induct concede acknowledge *\
spatter             splash sprinkle soil *\
lofty               high tall elevated raised *\
christen            baptize sponsor name initiate *\
cordial             sincere heartfelt hearty friendly *\
distinguish         discern identify specify classify *\
quit                satisfy resign abandon leave *\
tread               walk step trample crush stamp *\
addition            increase expansion annexation affix *\
yaw                 drift deviate tack jibe *\
quiz                interrogate question examine tease *\
immense             vast great huge infinite *\
treat               bargain deal parley attend doctor *\
armistice           truce respite lull peace *\
consequential       moment significance eventful *\
expenditure         cost overhead outgo payment expense *\
novel               story book romance epic writing *\
ripen               mature prepare perfect mellow *\
harden              bake freeze solidify temper *\
petition            plea request entreaty asking *\
resident            citizen tenant occupant inmate *\
surface             outside exterior cover rise up *\
hearten             cheer encourage brighten reassure *\
capture             seize apprehend arrest grab *\
balloon             airostat blimp kite dirigible *\
strange             unusual odd unfamiliar queer *\
speaker             orator chairperson *\
eclectic            selective choice difference *\
party               faction denomination clique club *\
eccentric           elliptical parabolic hyperbolic *\
effect              consequence result upshot outcome *\
fierce              furious grim wild enraged *\
spree               frolic escapade fling revel *\
destruction         waste ruin crash smash havoc *\
rift                crack cleft crevice fissure *\
weld                fuse unite join fasten blend *\
reflection          image thought observation study *\
lunch               snack collation midday meal *\
glower              frown glare scowl sulk *\
well                robust strong hearty amply fully *\
rife                prevalent current widespread *\
drone               buzz hum vibrate *\
welt                wale rim binding cord *\
restore             cure heal mend renew repair *\
underdog            loser victim *\
discord             dissidence disagreement friction *\
accurate            correct exact precise valid genuine *\
distant             aloof aside far remote *\
skill               dexterity proficiency competence *\
density             solidity consistency impermeability *\
snicker             laugh ridicule giggle *\
stratum             layer plane tier level *\
warrant             certificate guarantee secure vouch *\
kick                punt spurn stamp *\
fate                destiny lot fortune doom chance *\
disappearance       eclipse concealed vanish fade lost *\
livid               pallid ashen colorless *\
burden              hindrance load weight encumbrance *\
immediately         presently then at once directly *\
prominent           noticeable outstanding notable *\
loss                perdition forfeit lapse waste *\
necessary           needful required essential imperativ *\
ring                encircle clang tinkle circle girdle *\
clown               buffoon comic comedian jester *\
sissy               weakling chicken scaredy-cat *\
divest              deprive molt strip disrobe seize *\
page                leaf folio servant attendant *\
adversity           affliction trouble hardship calamity *\
shed                drop shelter shack *\
glare               scowl frown glower stare *\
library             athenaeum bookroom *\
motive              reason ground cause purpose *\
deliverance         escape salvation ransom release *\
home                domicile residence abode dwelling *\
liking              affinity inclination love desire *\
drizzle             sprinkle mist rain spray *\
projection          map peninsula propulsion stud *\
broad               wide widespread extensive *\
kettle              pot caldron boiler teakettle *\
overlap             imbricate shingle overhang *\
appreciative        grateful thankful indebted gratitude *\
mutation            change variation deviation freak *\
percolate           drip trickle permeate ooze *\
allegory            fable parable figurative story *\
hinder              deter interfere interrupt prevent *\
medieval            feudal knightly courtly antiquated *\
disentangle         extricate unscramble untwist free *\
journal             diary daybook record log periodical *\
expansion           increase extension spread growth *\
variation           alteration change modification *\
offset              neutralize balance cancel out *\
instinct            knack aptitude impulse intuition *\
refuge              asylum sanctuary hideout home *\
freedom             exemption latitude liberty will *\
compatible          harmonious well-matched suitable *\
dominion            domain jurisdiction possession *\
tongue              communication speech language *\
leniency            mercy patience kindness tolerance *\
congregate          convene gather meet converge *\
pointless           idle inane meaningless *\
utility             service benefit help aid convenient *\
disjunction         amputate fission section *\
rejoice             triumph joy festivity jubilee *\
additional          extra farther further more plus *\
veil                net mesh curtain screen *\
museum              gallery repository archives *\
wimp                weakling fragile delicate *\
invisibility        escape notice unseen concealed veil *\
elate               exhilarate inspire cheer stimulate *\
mutiny              rebellion revolt uprising *\
evacuate            empty clear eject expel purge *\
gait                step pace stride trot gallop walk *\
admonish            warn caution advise against *\
neutral             indifferent unconcerned impartial *\
gain                increase profit amplification *\
wince               cringe flinch cower shrink back *\
overflow            inundate flood run over deluge *\
highest             ultimate supreme *\
eat                 consume devour feed fare erode *\
yelp                bark squeal howl cry *\
oligarchy           clique junta aristocracy *\
grieve              distress pain hurt sadden injure *\
unlock              unfasten unbolt undo open release *\
cruel               brutal inhuman ruthless wicked *\
limit               boundary bounds confines edge verge *\
piece               scrap morsel bit section fragment *\
display             show exhibition manifest flaunt *\
devise              bequeath will produce invent *\
universal           comprehensive general global *\
twist               wind wreathe coil wrench *\
education           culture tuition schooling study *\
balcony             gallery loggia porch tier loge *\
cavalry             horse soldiers dragoons hussars *\
lopsided            asymmetrical askew aslant *\
contest             contention altercation battle duel *\
offensive           unpleasant vulgar obnoxious horrid *\
meteor              meteorite meteoroid shooting star *\
star                sun celestial body leading role *\
stay                check halt stop restrain detain *\
foil                frustrate battle balk circumvent *\
stab                pierce puncture perforate stick *\
animosity           antipathy enmity *\
stitch              seam suture knit crotchet *\
appoint             prescribe assign ordain place *\
pestilence          disease plague epidemic *\
portion             fraction segment share allotment *\
diagnosis           analysis explanation conclusion *\
pardon              forgive excuse release overlook *\
similarity          likeness resemblance affinity *\
dynamic             forceful vigorous potent impelling *\
unfurl              unroll open spread out display *\
obstruction         block blockade hindrance hitch *\
protest             objection complaint contradiction *\
captain             commander skipper leader chief *\
unfeeling           hard-hearted cruel callous merciless *\
gamut               scale scope extent compass *\
buddy               comrade pal chum friend *\
swab                mop applicator cleanse wipe *\
swat                slap clip slug *\
unroll              unfold unfurl display uncover *\
swap                exchange barter interchange *\
sorry               rueful regretful pitiful deplorable *\
sway                swing influence control prejudice *\
rescue              liberate set free deliver save *\
vociferous          loud noisy clamorous blatant *\
void                empty vacuous blank unoccupied *\
smack               clap whack kiss savor *\
govern              rule reign administrate *\
sleek               slick oily smooth glossy skillful *\
courageous          brave undaunted valiant *\
vast                huge immense infinite boundless *\
convenience         accessibility availability comfort *\
enhance             intensify exaggerate advance *\
deplorable          lamentable sad regrettable *\
force               compulsion coercion power import *\
concise             succinct short brief terse compact *\
crave               desire beg seek solicit *\
subordinate         below junior assistant helper under *\
kidnap               abduct steal *\
quill               feather plume pen spine *\
even                level equal smooth flat unvaried *\
wreck               destruction ruin collision accident *\
desirous            eager willing wistful anxious *\
orchestra           symphony band ensemble *\
haze                film opacity mist fog *\
sunder              break separate sever divide *\
new                 fresh youth raw untried *\
net                 catch ensnare trap veil web *\
ever                always eternally *\
niche               corner nook recess cranny *\
never               not ever ne'er nevermore fat chance *\
active              agile zippy energetic vigorous *\
interpret           define expound read solve *\
dry                 bake sear wipe shrivel wilt wither *\
taper               narrow slacken diminish spire *\
credit              trust score tally account *\
harass              distress trouble irritate vex *\
permit              allow let license grant empower *\
lucrative           profitable gainful productive *\
suitable            appropriate apt compatible *\
menial              servant slave flunky humble servile *\
intrigue            plot conspiracy spying espionage *\
astute              clever shrewd cunning *\
heedful             awake observant attentive discreet *\
plea                request petition assertion *\
campaign            operation plan fight war *\
elude               escape evade avoid dodge foil *\
undesirable         distasteful disliked objectionable *\
moral               ethical righteous just virtuous *\
circumvent          foil outwit dodge elude encircle *\
army                troops soldiers force throng *\
arms                weapons firearms armament *\
pudgy               stocky plump chubby *\
call                cry shout yell summon bid choose *\
calm                placid serene unruffled cool *\
recommend           commend advise suggest entrust *\
survive             outlive outlast escape continue *\
type                sign emblem kind class letter *\
tell                recount relate narrate inform *\
wary                guarded watchful alert cautious *\
expose              disclose reveal divulge unearth *\
warp                twist bend serve distort bias *\
warm                hot tepid muggy fervid fervent *\
frenzy              fever fury rage tantrum *\
adult               grown up mature ripe full grown *\
qualm               misgiving remorse twinge pang throe *\
ward                watch guard defend protect fend *\
aligned             linear arrange straighten adjust *\
hoax                deception trick deceit fraud *\
room                chamber hall apartment *\
gasoline            petrol fuel oil *\
obstacle            hindrance difficulty barrier snag *\
endow               dower settle upon bestow enrich *\
defer               delay suspend postpone *\
give                contribute render bestow bequeath *\
climax              acme zenith summit pinnacle *\
assent              acquiescence nod accord concord *\
involve             imply include implicate entangle *\
rig                 equip furnish improvise appoint *\
cursory             passing superficial quick slight *\
autonomy            self-government independence freedom *\
titular             honorary nominal in name only *\
answer              response reply retort acknowledgment *\
faulty              defective erroneous wrong *\
recompense          repay reward return *\
minority            few smaller group childhood youth *\
indignity           slight humiliation disrespect *\
abdomen             stomach belly paunch venter *\
inactivity          inaction inertness lull cessation *\
purchase            buying power bargain *\
attempt             try endeavor essay attack *\
pulsate             beat throb drum palpitate *\
maintain            continue insist preservation sustain *\
inhabitant          citizen occupant dweller resident *\
operate             conduct manage direct go run work *\
deck                floor platform adorn decorate *\
ensnare             catch net bag entangle ensnarl *\
fortify             strengthen buttress barricade uphold *\
ghastly             pale haggard deathly ashen *\
fable               parable allegory moral tale *\
before              afore ahead of beforehand previously *\
frisky              playful pert peppy *\
personal            private individual intimate own *\
crew                force gang band squad company *\
better              mend correct relieve *\
persist             persevere continue remain endure *\
carve               cut slice shape fashion *\
overcome            conquer subdue defeat *\
vigorous            dynamic fresh hardy robust *\
combination         mixture synthesis union blend *\
workout             trial practice rehearsal *\
indulge             pamper spoil favor humor gratify *\
advise              acquaint notify prescribe recommend *\
grammar             syntax analysis praxis *\
meat                substance core essence pith *\
mistrust            suspect suspicion skepticissm doubt *\
roast               bake cook toast broil barbecue *\
higher              up upper upward superior taller *\
meal                repast eats consume devour *\
bond                union connection tie accord *\
improvise           invent extemporize unpreparedness *\
durability          continuity stability longevity age *\
aide                assistant auxiliary helper partner *\
awry                askance crooked askew out of order *\
extract             distill draw elicit milk suck *\
enclosure           envelope case cartridge wrapper *\
contend             struggle dispute debate discord *\
decree              canon edict enact oridinance *\
velvet              silk plush velour *\
crucial             decisive determining final urgent *\
content             peace of mind ingredients *\
sparkle             glisten twinkle glitter *\
debit               debt owed deficit *\
surprise            unforeseen unexpected amaze astound *\
sluggish            inactive stagnant slow lazy *\
grease              oil fat graphite suet lard tallow *\
linear              aligned straight lineal *\
resume              recommence continue reassume *\
revenge             retaliation retort vengeance spite *\
struggle            strive strain endeavor contend *\
abate               reduce decrease lighten diminish *\
greasy              fat slick creamy oily *\
cosmic              universal galactic heavenly vast *\
undercover          masked in disguise incognito *\
signature           autograph hand mark endorsement *\
heckle              plague taunt harass challenge *\
loud                noisy vociferous vehement *\
grade               level quality class rank *\
reassure            comfort placate content encourage *\
hook                crook bend gaff curvature *\
enumerate           count rehearse list mention *\
radiate             emanate emit shed difuse *\
ditch               channel trench gully canal *\
hoof                foot ungula dewclaw support *\
hood                covering cape cowl coif *\
speck               blemish speckle spot particle mote *\
debase              degrade demean lower sink *\
acquaint            introduce present inform advise *\
twisted             crooked wry contorted wrenched *\
interlude           intermission pause episode gap *\
brevity             concision briefness shortness *\
fiery               impetuous passionate fervid blazing *\
stoic               impassive unfeeling self-controlled *\
requisite           necessary required essential *\
peculiar            individual strange odd unusual *\
symptom             sign indication token warning *\
distance            remoteness farness span range *\
anxiety             concern care fear mental anguish *\
affront             insult offense slur slight *\
matter              something subject substance text *\
street              avenue boulevard alley passage *\
silly               witless foolish stupid senseless *\
seep                leak ooze drain drip exude *\
quench               extinguish satisfy *\
modern              contemporary late recent up-to-date *\
mind                consciousness understanding intellect *\
mine                lode vein deposit burrow excavate *\
seed                germ grain nut bulbs *\
seem                appear look appearance *\
churn               agitate whip seethe boil *\
mint                coin money piece *\
unfasten            loosen disconnect unfix liberate *\
reprieve            delay stay respite pardon *\
horde               mass group throng mob gang crowd *\
alibi               excuse justify exemptness *\
divulge             expose reveal disclose impart *\
impotent            helpless ineffective useless *\
chest               case box casket cabinet breast *\
regular             normal ordinary punctual staple *\
inconsistency       absurd paradox discrepancy variance *\
blacklist           ostracize exclude exclusion *\
mitigate            lessen moderate allay relieve *\
observation         comment notice view regard note *\
alarm               warning siren danger signal *\
dog                 canine cur whelp puppy slut *\
principle           doctrine theory code law *\
constrict           hamper limit contract bind cramp *\
dot                 spot speck point jot whit iota *\
discontent          dissatisfaction resentment vexation *\
aquatic             watery oceanic marine water *\
hunger              desire craving famine emptiness *\
rapture             bliss delight ecstasy pleasure *\
jurisdiction        administration province dominion *\
poison              venom toxicity virus *\
undignified         discreditable inelegant ludicrous *\
explain             expound solve resolve fathom *\
cripple             cramp disable mutilate wound *\
integrate           unite fuse synthesize blend *\
hoard               collection store reserve stock *\
edict               decree bull law proclamation *\
rejoicing           exultation triumph jubilation joy *\
smut                soot smudge blemish dirt *\
stop                close obstruct halt impede delay *\
perceive            apprehend discern observe notice *\
meditate            ponder reflect speculate contemplate *\
smug                sleek trim neat self-satisfied *\
iceberg             berg flow glacier sheet *\
comply              consent conform yield submit obey *\
bat                 cudgel club stick nightstick *\
chronological       dated sequential *\
bar                 barricade block obstruct impede *\
gather              congregate group amass collect *\
bag                 receptacle case container pouch *\
bad                 unpleasant wicked worst vile evil *\
troop               group number party company *\
cower               crawl cringe crouch quail *\
ban                 prohibition restriction interdict *\
linguist            polyglot philologist etymologist *\
enchant             captivate please charm delight *\
attest              testify bear witness depose *\
unworthy            undeserving worthless unbecoming *\
reference           citation credentials testimonial *\
imitate             parrot mimic copy mock *\
allure              attraction charm entice tempt *\
subject             topic theme matter citizen control *\
voyage              cruise crossing excursion *\
scrap               bit crumb morsel splinter *\
sail                cruise voyage navigate traverse *\
artificial          handmade synthetic false sham fake *\
unwell              ailing sick indisposed ill *\
tolerance           allowance temperance moderation *\
lazy                indolent slothful slow sluggish *\
weary               fatigue languid pall tire worn *\
virtuosity          skill mastery proficiency technique *\
excavate            dig exhume mine spade undermine *\
wandering           errant odyssey roving drifting *\
uncertainty         indecision vacillation doubt *\
against             in opposition to contrary *\
distinction         eminence honor noble clarification *\
contribution        donation grant present gift *\
dislocate           displace disarrange disjoin *\
height              altitude elevation eminence *\
lowly               humble meek *\
path                trail lane road route way course *\
tint                color tinge hue dye shade tone *\
immobile            immovable motionless *\
recur               return comeback reoccur repeat *\
basis               foundation justification reason *\
erect               build plumb upright construct *\
commission          consignment charge delegation *\
interest            concern touch affect fascinate *\
basic               simple easy understandable *\
lovely              beautiful delightful comely *\
idol                favorite ideal icon graven image *\
plateau             plain mesa highland tableland *\
wheedle             coax cajole persuade flatter court *\
suppress            quell repress restrain quash *\
chum                pal buddy friend *\
aviation            flight flying navigation aeronautics *\
unpopular           dislike unloved out of favor *\
exception           exclusion omission rejection *\
sly                 cunning furtive wily crafty *\
affirm              allege say swear vouch vow *\
tang                savor flavor taste zest *\
originate           start invent begin initiate cause *\
ugly                deformed plain ordinary unlovely *\
near                close adjacent intimate nigh verge *\
neat                tidy orderly compact trim shapely *\
itinerary           journey route circuit course *\
balance             equilibrium steadiness stability *\
mangle              break crush mutilate disfigure *\
anchor              grapnel kedge mainstay safeguard *\
spawn               deposit law produce breed *\
upgrade             improve better raise increase *\
cane                switch stick rod walking stick *\
sulk                sullen pout mope gripe *\
shame               humiliation disgrace dishonor abash *\
jest                joke with humor gag pun wisecrack *\
in                  inside middle of midst of cool *\
sever                cleave separate sunder *\
if                  supposing in case that provided *\
growl               mutter grumble snarl complain howl *\
make                create produce prepare obtain cause *\
belly               stomach tummy abdomen paunch *\
contaminate         corrupt infect taint pollute *\
vegetable           burgeon herb plant dull passive *\
delight             joy rapture please thrill *\
undaunted           courageous bold cool reckless *\
kin                 related folks family *\
jealous             envy possesive covetous *\
kid                 child youth make fun of deceive *\
romp                frolic caper cavort *\
inherit             succeed get acquire receive possess *\
unconcerned         indifferent uninterested detached *\
approbation         approval esteem favor admiration *\
just                fair right impartial legitimate *\
yen                 desire craving longing yearning *\
isolate             segregate insulate separate *\
unfair              onesided unjust wrong base bad *\
identify            recognize distinguish associate *\
human               mortal earthly humane civilized *\
yes                 yea aye indeed true agreed *\
yet                 nevertheless still however *\
impending           imminent oncoming encumbering *\
nudge               push poke prod *\
candidate           nominee office-seeker aspirant *\
legion              horde multitude army corps *\
agile               nimble active spry athletic *\
character           kind class natural disposition *\
potential           dynamic magnetic charged *\
affinity            liking attraction *\
save                rescue deliver preserve salvage *\
designate           name specify indicate point out *\
opt                 decide approve of vote for elect *\
auspicious          favorable promising propitious *\
discreet            prudent judicious careful tactful *\
performance         action observance rendition showing *\
vanity              conceit immodesty futility egotism *\
dignity             poise prestige pride repute *\
uncivil             rude impolite unmannerly *\
unnecessary         useless needless superfluous *\
pillar              column pedestal support post *\
squander            waste lavish dissipate *\
deal                apportion allocate allot distribute *\
repudiate           renounce disclaim deny disown *\
deaf                innattentive oblivious *\
dead                deceased perished defunct *\
intern              detain hold shut up confine *\
invoice             list bill summation *\
dear                expensive precious beloved cherished *\
pain                suffering hurt discomfort agony *\
manifest            bring forward show display evidence *\
sprawl              spread extend slump slouch lounge *\
dense               close thick compact solid *\
uproar              tumult discord pandemonium *\
normal              ordinary regular average usual *\
bold                daring audacious forward *\
burn                char singe scorch blaze incinerate *\
jester              wit joker gagman comedian fool *\
sift                separate bolt sort segregate *\
bolt                staple pin lag screw *\
bury                inter inhume immure cover sink *\
conceal             camouflage covert secrete stow away *\
magazine            storehouse arsenal periodical weekly *\
commit              perpetrate perform do entrust *\
nerve               courage strength vigor vitality *\
motivate            induce move draw on inspire *\
paunch              stomach abdomen belly fat *\
down                downward under beneath below *\
doctrine            creed principle concept *\
jealousy            envy covetousness cupidity desire *\
mediate             interpose intervene propitiate *\
lampoon             satire spoof detraction *\
fraction            part portion piece bit fragment *\
unseat              displace depose *\
fork                diverge separate branch off *\
starve              hunger famish fast pine deny *\
form                figure shape framework build set up *\
landing             docking wharf dock pier *\
ford                traverse wade portage passage *\
failure             inefficacy nonsuccess collapse *\
syndicate           pool combine monopoly *\
surrender           cession relinquishment submission *\
detective           investigator agent undercover man *\
whiskey             liquor spirits firewater redeye *\
cosmos              universe world harmony order *\
propaganda          publicity persuasion proselytization *\
delete              erase cancel expunge take out *\
classic             standard chaste simple elegant *\
covert              secret hidden sheltered conceal *\
sticky              adhesive mucilaginous tenacious *\
vacate              decamp relinquish surrender quit *\
ship                vessel craft cargo send transport *\
unholy              wicked impious extreme unseemly *\
vista               view prospect scene landscape *\
excel               exceed surpass eclipse outstrip *\
answerable          accountable liable *\
tardy               overdue late slow sluggish *\
sling               propel fling catapult shoot *\
faction             party sect cabal gang crew *\
handicap            penalize encumber inconvenience *\
slink               lurk sneak prowl cower *\
partiality          bias injustice prejudice *\
sensuous            sensitive esthetic emotional *\
journey             trip tour voyage cruise expedition *\
curvature           bending crook hook deflection *\
happening           affair incident accident event *\
apology             excuse justification vindication *\
assume              suppose take for granted take over *\
pseudo              spurious counterfeit simulated false *\
daily               everyday diurnal once a day *\
jacket              coat sack suit tuxedo *\
meander             wind drift twist wander roam *\
dust                powder earth soil dirt ash *\
shop                works workshop store *\
revoke              recall repeal annul rescind *\
skip                leap hop frolic omit pass over *\
relieve             absolve better cure help mitigate *\
peruse              read study examine con *\
skit                parody sketch play satire *\
invent              devise conceive contrive originate *\
manager             boss director head administrator *\
skim                glide graze skip scan *\
skin                bark fur hide pelt rind *\
mill                grinder millstone factory plant *\
abundant            copious plenty profuse abounding *\
milk                extract extort interrogate *\
retention           holding custody retaining keeping *\
depend              rely trust dangle hang rest *\
father              sire forefather founder god *\
amaze               astonish astound *\
unpleasant          offensive bad nasty unattractive *\
swoop                pounce descend dive *\
analogous           like parallel related corresponding *\
shoot               rush dart sprout fire discharge *\
string              twine thread cord series line *\
yeast               leaven ferment froth foam *\
pious               devout godly holy divine *\
dim                 obscure opaque partial shadow dusk *\
din                 noise clamor discord cacophony *\
nectar              sweetness honey dew *\
die                 perish death mold *\
dig                 shovel spade excavate delve unearth *\
magnet              lodestone attraction power *\
item                piece detail particular entry *\
excellence          perfection quality superiority *\
grimace             face scowl leer expression *\
dip                 plunge dive depression swim *\
round               circular annular spherical globular *\
shave               pare plane crop skim graze trim *\
unexpected          unforeseen sudden abrupt surprise *\
seasoning           condiment flavoring sauce relish *\
slake               quench satisfy appease allay abate *\
ravenous            hungry greedy voracious *\
annals              chronicle history records *\
suspect             mistrust surmise infer suppose *\
dwarf               midget runt stunt low little *\
wail                lament cry moan bewail howl *\
clerk               employee cashier teller *\
detest              hate abhor despise abominate *\
ingenuous           artless plain frank outspoken *\
decipher            make out decode translate interpret *\
earthquake          tremor seism quake shock *\
wait                stay linger remain dally delay *\
box                 chest trunk crate package *\
boy                 lad youth child *\
institute           found establish school university *\
shift               change substitute veer vary *\
bow                 obeisance curtsy yield concede *\
suggestion          advice clue hint implication *\
bog                 swamp morass quagmire marsh *\
hither              here nearer direction *\
elect               choose select decide on call ordain *\
merely              barely simply only purely *\
plumb               perpendicular vertical erect *\
verge               edge brink rim margin eve *\
ailing              sick unhealthy unwell feeble week *\
surmount            rise above master pass beyond *\
transplant          replant repot graft relocate *\
wealth              riches fortune affluence prosperity *\
perk                cheer up brighten animate liven *\
visit               call interview appointment sojourn *\
noisome             destructive harmful baneful evil *\
sharpen             grind whet hone focus intensify *\
labyrinth           maze tangle meander intricacy *\
acceptable          decent adequate satisfactory *\
rigid               stiff unyielding firm strict *\
effort              exertion endeavor stress attempt *\
fly                 soar wing aviate float speed bolt *\
demolish            raze level ruin wreck destroy *\
deformed            misshapen disfigured crippled askew *\
soul                psyche breath mind essence mortal *\
impel               drive push urge force incite *\
soup                stock broth bouillon *\
sour                acetic tart curdled spoiled *\
deceased            dead late former defunct *\
claim               demand requisition allege assert *\
grouchy             cross sharp sulky testy *\
predict             forecast foretell prophecy *\
agent               attorney delegate envoy promoter *\
sample              specimen example pattern prototype *\
council             committee panel chamber board *\
craze               derange unbalance madden unsettle *\
tilt                tip slant incline slope *\
parch               dry up shrivel scorch *\
pine                languish long crave droop *\
till                until up to down to cultivate plow *\
pure                chaste clean immaculate simple *\
persuasion          argument plea conviction influence *\
map                 plan chart projection diagram *\
mar                 disfigure deface blemish scratch *\
mat                 pad rug covering *\
may                 can might be allowed permitted *\
accessory           auxiliary addition accomplice *\
gelatin             gel jelly aspic pectin *\
mad                 crazy insane rabid frantic *\
grow                mature become develop increase *\
man                 male humanity operate staff run *\
relinquish          abandon cede release vacate waive *\
neck                channel isthmus strait pass head *\
maybe               perhaps mayhap perchance possibly *\
purify              clarify filter refine sanctify *\
fluent              flowing graceful voluble *\
switch              change modify transpose *\
jail                prison slammer joint *\
deposit             precipitate sediment pledge *\
deceive             beguile cheat kid lie mislead *\
unleash             uncage unshackle release *\
tall                high lofty towering long *\
bungle              botch butcher fumble blunder *\
gesture             motion signal gesticulation *\
cute                attractive pretty coy *\
shield              screen protection arms armor *\
gradual             slow progressive *\
pointed             direct concise terse brief *\
entity              thing being whole unity existence *\
stability           balance durability perseverance *\
lyric               poem song melodic music *\
terrace             level plateau plane porch *\
pitch               incline heave hurl throw tone *\
equip               furnish outfit rig provide *\
adhesive            glue sticky tenacious *\
group               assemblage company association *\
monitor             overseer censor master controller *\
maid                girl lass maiden miss virgin *\
policy              conduct management tactice strategy *\
mail                post letters correspondence *\
main                principle primary large most *\
tonic               bracing refreshing voiced sonant *\
finance             back fund subsidize underwrite *\
killer              assassin murderer butcher thug *\
shatter             splinter shiver smash destroy *\
sarcastic           scornful contemptuous withering *\
moron               simpleton halfwit imbecile *\
safari              journey expedition trek caravan *\
teller              bank clerk cashier *\
possess             have keep own hold occupy *\
outweigh            overweigh outbalance exceed *\
peasant             countryman peon laborer farmer *\
careless            carefree nonchalant casual negligent *\
rock                swing sway oscillate teeter *\
vogue               mode style fashion custom practice *\
ruffle              tousle tangle irritate fret anger *\
abnormal            unusual aberrant eccentric *\
gird                bind strap secure encircle *\
aloof               distant unneighborly reserved *\
girl                lass maid damsel female *\
living              quick existing alive live *\
impurity            uncleanness indecency obscenity *\
nominal             titular in name only token *\
imperative          essential necessary unavoidable *\
correct             improve rectify set right amend *\
assurance           confidence promise pledge warranty *\
lag                 linger drag fall behind hang back *\
monster             freak giant brute monstrosity *\
hefty               weighty bulky burly brawny *\
smudge              smear smut spot blemish *\
baptize             sprinkle immerse dip name *\
ajar                open agape discordant *\
cough               hack racking cough *\
orb                 globe sphere ball circle *\
advance             progress go forward proceed gain *\
language            dialect lingo tongue vocabulary *\
ministry            teaching spreading the good news *\
thing               affair matter deed act entity *\
frequent            hourly resort many repeated *\
first               earliest original prime leading *\
exotic              foreign alien strange rare *\
question            problem query interrogation doubt *\
long                lengthy elongated tedious *\
carry               uphold support transport convey *\
interchange         commute swap transfer transpose *\
little              few small wee diminutive tiny *\
lap                 drink flap extention fold leg tuck *\
moisture            moistness humidity dampness dankness *\
gaudy               garish showy cheap blatant *\
continuous          marathon serial unbroken unceasing *\
crevice             cleft split fissure break *\
interdict           ban forbid hinder prohibit *\
austere             harsh stern severe ascetic *\
cleanse             purge refine scour swab clean *\
infiltrate          penetrate pervade enter permeate *\
orgy                debauch carouse dissipation *\
venture             dare risk speculate undertake *\
watchtower          beacon lighthouse lookout *\
gathering           convention crowd meeting reunion *\
lick                tongue dart across beat thrash *\
capsize             overturn upset tip over *\
tantalize           tease tempt excite provoke balk *\
retort              reply witticism sally comeback *\
dash                shatter smash frustrate *\
winding             spiral turning twisting *\
conspiracy          collusion intrigue connivance trick *\
pastry              cake crust shell pit tart strudel *\
spectacle           sight parade show exhibition scene *\
foreigner           barbarian outsider stranger *\
squad               band patrol unit crew team *\
interior            internal inner inside inmost *\
haste               urgency spurt rush scramble hurry *\
channel             artery ditch neck canal tube *\
ultimate            farthest most remote extreme final *\
frost               rime hoarfrost icing *\
amiable             friendly agreeable *\
trace               draw sketch copy follow investigate *\
roster              list register roll call count tally *\
track               trail follow explore pursue *\
insanity            lunacy derangement craziness *\
assault             battery storm assail strike atack *\
barrage             attack bombardment *\
entreaty            appeal petition supplication plea *\
inspirit            enliven exhilarate arouse animate *\
billow              surge swell undulation wave *\
pair                couple duo mates *\
mettle              spirit temperament courage vigor *\
scowl               frown glare grimace glower *\
precise             exact accurate definite rigid *\
shot                propelled struck pellet bullet *\
show                exhibit display explain teach *\
salon               drawing room parlor ballroom *\
supposition         assumption hypothesis conjecture *\
elevate             lift raise hoist promote advance *\
threshold           sill entrance outset beginning *\
corner              angle nook niche predicament *\
forecast            predict divine prognosticate *\
enthusiast          addict fan fanatic optimist *\
fend                defend protect ward avert *\
plume               quill feather plumage crest tuft *\
treasure            hoard wealth riches value cherish *\
enough              adequate sufficient satisfactory *\
junior              younger lesser subordinate *\
black               dark midnight *\
plump               corpulent fat chubby stout *\
get                 secure obtain procure acquire *\
hostage             security pledge guarantee bond *\
unimportant         petty trivial worthless frivolous *\
nearly              about almost all but approximately *\
gem                 jewel stone prize work of art *\
secondary           incidental minor dependent *\
beseech             beg implore ask entreat *\
yield               crop harvest surrender succumb bear *\
morning             morn forenoon daybreak sunrise *\
stupid              slow dull obtuse tedious *\
kernel              grain nucleus nut core heart *\
lethargy            inertia stupor weariness apathy *\
honesty             candor frankness sincerity *\
sear                dry arid waterless colorless char *\
seat                chair bench location site *\
seam                ridge junction scar wrinkle *\
seal                die stamp signet guarantee *\
salutation          hello welcome address regards *\
wonder              marvel bewilder astonish admiration *\
foreword            preface prelude prologue preamble *\
limber              flexible supple nimble spry deft *\
ornament            corsage emboss frill lace vignette *\
label               tag tab mark sticker slip record *\
behind              rearward aft backward following *\
across              crosswise athwart over *\
satiate             satisfy quench gorge fill *\
parent              begetter procreator source *\
tacit               unspoken unexpressed silent *\
killing             homicide murder mortal lethal fatal *\
tub                 pot vat cauldron *\
tug                 pull strain drag haul tow *\
tuck                fold pleat lap *\
tour                trip journey expedition excursion *\
among               in the middle of included with *\
cancer              carcinoma sarcoma malignancy *\
terse               brief concise pointed succinct *\
spank               slap paddle punish chastise *\
accusation          complaint guilt impute indictment *\
uncouple            unyoke disconnect disjunct *\
cancel              delete offset neutralize *\
writing             handwriting rune calligraphy paper *\
custody             care safe keeping charge *\
sensible            cognizant conscious reasonable sane *\
intrude             interlope intervene trespass *\
capable             able competent sufficient *\
wobble              roll rock stagger reel lurch *\
mark                goal imprint stain label badge *\
workshop            seminar clinic office store shop *\
dependable          infallible reliable responsible sure *\
squash              crush mash flatten suppress *\
dramatic            scenic tragic tense climatic *\
wake                path trail vigil watch arouse stir *\
odyssey             wandering travel journey quest *\
sound               tone acoustics honorable true *\
predicament         condition dilemma crisis emergency *\
compile             collect arrange edit write make *\
many                numerous multitudinous manifold *\
margin              border rim verge lip edge *\
bathe               immerse submerge dip wash scour *\
sincere             cordial frank intent true real *\
strait              narrow difficulty straits *\
cluster             bunch clump group *\
sudden              abrupt unexpected hasty quick *\
obnoxious           repulsive loathsome hateful *\
everyday            daily usual commonplace normal *\
different           other unlike various unique *\
pat                 caress stroke rap tap strike *\
harsh               ungenial severe rough heartless *\
doctor              physician surgeon learned man sage *\
pay                 render salary stipend wages *\
same                identical alike equivalent *\
speech              expression talk communication *\
clammy              moist damp sweaty *\
deference           homage obeisance veneration aclaim *\
pal                 companion crony comrade friend bud *\
pan                 pot kettle skillet grill *\
exhaust             drain empty deflate weaken *\
oil                 fat lipid grease wax mineral *\
assist              aid help support attend *\
companion           comrade mate pal friend *\
diversion           deviation recreation detour change *\
weave               interlace twine loom spin fabricate *\
break               interruption disconnection breach *\
drain               draw off empty exhaust outlet *\
accountable         answerable responsible liable *\
solve               explain interpret answer resolve *\
bottle              flask jug pitcher canteen *\
parody              take-off imitation travesty *\
fume                fret gas odor smoke stew *\
imprint             impress seal result effect *\
aspect              look appearance side view *\
flavor              taste seasoning savor *\
forgo               relinquish abandon deny oneself *\
pile                structure building edifice heap *\
enamor              captivate charm smite please entice *\
grating             lattice openwork grid *\
extensive           broad omnibus wide huge large *\
grip                handle hold control *\
grit                grain sand graval powder *\
mop                 scrub swab wipe clean polish *\
zephyr              breeze breath gentle wind *\
secrecy             stealth privacy isolation *\
mob                 rabble riffraff herd crowd *\
implicate           involve entangle embroil *\
grim                fearful stern fierce ruthless *\
grin                smile smirk bare the teeth *\
terrorize           terrify threat coerce intimidate *\
nosy                inquisitive meddlesome prying *\
lightning           thunderbolt levin firebolt *\
chamber             cabinet council room apartment *\
nose                snout muzzle nasal nostrils *\
passionate          amorous fiery intense vehement *\
afflict             beset trouble burden *\
doll                dolly kewpie doll puppet muppet *\
ascend              climb mount rise soar *\
slavery             bondage forced labor toil submission *\
erase               efface rub out expunge *\
pasture             field meadow grassland range *\
ascent              rising upswing acclivity incline *\
spasm               throe convulsion seizure fit *\
herald              forerunner precursor announcer *\
confirm             establish strengthen ratify validate *\
pioneer             forerunner settler originator *\
escort              accompany conduct convoy guard *\
inject              insert introduce force in *\
moderate            sparing frugal inexcessive tolerant *\
knife               blade edge point steel *\
unusual             uncommon rare curious odd queer *\
untamed             savage unbroken untrained wild *\
tease               plague annoy vex harass taunt mock *\
roar                shout bellow howl bawl resound *\
island              isle cay key atoll reef *\
violence            vehemence intensity riot rumpus *\
insect              bug fly moth beetle *\
roam                wander range ramble rove stray *\
provisional         contingent tentative conditional *\
road                way path track passage trail *\
fertile             prolific productive rich creative *\
coupon              certificate ticket slip premium *\
skilled             conversant technical proficient able *\
actuate             move induce compel persuade *\
harness             control utilize curb yoke *\
strip               divest pull off deprive undress *\
brute               beast animal ruffian *\
decode              decipher translate *\
decisive            crucial final absolute definitive *\
hysterical          uncontrolled wild emotional frenzied *\
tycoon              magnate millionaire *\
fanatic             zealot enthusiast dog-matic *\
spice               season flavor odor taste *\
annihilate          demolish destroy eliminate *\
ember               cinder coal ash slag *\
powerless           helpless inability incapable *\
affection           attachment devotion affinity *\
celestial           heavenly divine holy unearthly *\
censor              reviewer critic faultfinder *\
deep                depth depression unfathomed *\
fellow              comrade associate colleague *\
imagination         creativeness inspiration originality *\
examine             investigate inspect survey prove *\
file                arrangement classification list *\
deed                act feat achievement exploit *\
hound               dog beagle cur wretch *\
casualty            accident disaster calamity *\
fill                complete load pervade *\
tedious             wearisome wearing boring monotonous *\
again               do over ditto repeat once more *\
hybrid              mixture crossbreed cross *\
field               clearing grassland expanse range *\
astronaut           cosmonaut spaceman *\
victimize           cheat dupe swindle hoax fool gull *\
shelter             refuge retreat sanctuary cover *\
vertex              top apex head crown *\
important           significance urgent critical *\
equitable           fair just ethical honest unbiased *\
prudent             discreet wary circumspect careful *\
remote              distant secluded alien slight *\
assets              possessions property resources *\
unload              empty disgorge offload unpack *\
burrow              hole tunnel excavation dig mine *\
nitwit              bonehead jughead fool dimwit *\
resolution          determination will resolve firmness *\
caste               class rank *\
liar                prevaricator fibber deceiver *\
forget              disregard overlook dismiss omit *\
founder             producer establisher originator *\
allergy             sensitivity reaction *\
dollar              single one buck greenback *\
commute             interchange travel *\
implement           tool utensil enact execute fulfill *\
children            family offspring sons and daughters *\
hideous             frightful dreadful horrible *\
premium             reward prize payment gift bounty *\
parcel              bundle distribute packet carton *\
scout               spy observer spotter forerunner *\
scour               scrub abrade polish cleanse *\
fall                plunge drop sink tumble topple *\
difference          contrast eclectic variance change *\
elated              jolly jubilant exalted aroused *\
applicable          fitting relevant pertinent *\
alms                charity dole giving *\
neighborhood        proximity vicinity area section *\
abridge             digest condense compress reduce *\
clinch              confirm fasten secure rivet clamp *\
zero                nothing naught none blank nobody *\
perspective         view angle aspect position *\
further             farther more additional *\
residue             remainder rest remnant leavings *\
illogical           unreasoned fallacious absurd *\
stool               hassock seat footrest *\
trinket             trifle tinsel gadget novelty *\
stoop               bend bow crouch submit *\
judicious           critical discreet prudent sensible *\
tribute             homage ovation reward recognition *\
everlasting         perpetual timeless permanent *\
public              popular common general known *\
movement            motion gesture maneuver progress *\
compact             contract mini reduce *\
component           ingredient segment element part *\
stipend             compensation wage pay salary *\
search              hunt seek look for explore *\
stupor              lethargy apathy coma daze *\
enmity              hostility antagonism opposition hate *\
airport             landing strip airfield *\
misery              wretchedness poverty distress *\
narrow              local strait taper thin *\
fatten              feed flesh out increase enrich *\
authorize           enable vest empower sanction allow *\
caravan             procession motorcade van *\
transit             passage change conveyance *\
aptitude            ability faculty instinct knack *\
sanction            permission confirmation approval *\
establish           charter confirm found start begin *\
legislator          lawmaker congressman senator *\
readily             willingly easily promptly *\
yeomen              commoner farmer attendant *\
eye                 watch ogle stare view observe *\
composure           placidity serenity calmness *\
distinct            separate unattached discrete *\
splash              splatter dash spill dabble *\
libel               defamation calumniation aspersion *\
aperture            hole opening fissure gap *\
tacky               shabby cheep sleazy poor taste *\
jubilant            joyful triumphant exultant elated *\
brisk               alert quick lively animated cool *\
particular          demanding painstaking meticulous *\
disfavor            displeasure disesteem disrespect *\
town                city urban village bright lights *\
none                no one nothing *\
middle              midst mean medium middle center *\
recall              recollect remember revoke retain *\
remain              stay endure last continue *\
paragraph           clause phrase section passage *\
taut                tight stretched tense strained *\
abandon             relinquish resign quit surrender *\
marble              hard vitreous unyielding lifeless *\
stubborn            perverse sturdy unreasonable *\
compare             contrast place side by side relate *\
onslaught           attack onset assault invasion *\
share               portion part allotment *\
shard               potsherd fragment piece splinter *\
sphere              orb globe ball range field *\
minimum             modicum least amount *\
attain              achieve accomplish reach successful *\
sharp               acute point spiked spiny rough *\
homicide            killing murder manslaughter *\
siren               warning signal alarm *\
awkward             clumsy inconvenient inopportune *\
needy               in want destitute indigent penniless *\
comfort             luxury ease coziness solace *\
sacred              hallowed sanctified holy *\
oppose              contrast confront combat resist *\
stir                move budge circulate agitate *\
petite              small mignon trim tiny *\
uprising            revolt revolution rebellion *\
advice              counsel suggestion recommendation *\
interpose           step in interfere meddle mediate *\
malediction         imprecation curse execration *\
blood               serum essence sap gore *\
faculty             ability aptitude power talent knack *\
bloom               blossom flower glow mature *\
response            answer reply reaction *\
bleak               raw desolate unsheltered cold *\
coax                cajole inveigle wheedle persuade *\
orchard             fruit garden grove plantation *\
coat                cover crust plaster paint protect *\
blunder             slip botch mess solecism fail err *\
mislead             deceive delude lead astray *\
coal                ember cinder charcoal briquette *\
responsibility      duty liability reliability loyalty *\
sect                denomination faction fellowship *\
pleasure            enjoyment gratification sensuality *\
through             among by *\
existence           being entity life reality presence *\
suffer              endure undergo experience sustain *\
arrogant            dogmatic domineering egotistic *\
fissure             cleft opening crack rift *\
bosom               breast bust heart intimate close *\
late                tardy new recent former deceased *\
pad                 cushion mat buffer *\
clamor              outcry hallubaloo uproar racket *\
bereft              bereaved deprived of loss *\
lookout             patrol watchtower tower *\
good                excellent value worth goodness *\
detour              deviation digression excursion byway *\
detach              separate disconnect remove unfasten *\
complain            gripe growl grunt nag whine yammer *\
association         alliance club company group guild *\
mystery             secret puzzle enigma rite sacrament *\
easily              handily readily effortlessly *\
pregnant            significant weighty fertile *\
evade               avoid elude dodge shun baffle *\
token               sign symbol emblem feature *\
boisterous          noisy clamorous vociferous stormy *\
monsoon             trade wind rainy season *\
exquisite           accurate exact discriminating *\
clamp               grip vise fastener clasp *\
harm                deterioration dishonor injury damage *\
hark                hear listen harken *\
mental              intellectual cognitive rational *\
house               abode mansion dwelling residence *\
energy              power vigor vim strength *\
hard                tough firm strenuous difficult *\
idea                thought concept notion opinion *\
endearment          caress fondling embrace feeling *\
insurance           guarantee warranty coverage protect *\
harp                dwell on repeat iterate nag pester *\
taciturnity         reticence reserve silence secrecy *\
childish            infantile juvenile brattish silly *\
avenge              retaliation *\
cyclone             tornado twister gale hurricane *\
bully               hector brawler tyrant *\
pathetic            piteous pitiable saddening *\
pleasant            agreeable gracious attractive genial *\
difficulty          hardness tough job uphill climb *\
giveaway            disclosure revelation bonus handout *\
disposition         character constitution mood temper *\
laughable           comic funny ridiculous ludicrous *\
omit                neglect skip spare overlook delete *\
audacity            boldness courage impudence *\
wither              waste decline droop wilt *\
trickle             drip flow percolate leak seep ooze *\
barbarian           foreigner outsider alien savage *\
juncture            crisis joint choice coupling *\
wages               pay payment hire compensation *\
fiction             myth prose lie novel tale story *\
unacquainted        ignorant unknowing uninformed *\
least               smallest minimum inferior *\
regulation          law oridinance direction control *\
assumption          guess supposition theory conjecture *\
statement           affirmation bill bulletin proposal *\
lease               leasehold contract rent let demise *\
pare                peel trim cut shave slice reduce *\
park                deposit leave place zoo garden *\
malice              malevolence spite animosity *\
part                sector segment fraction region *\
favorable           advantageous opportune commendatory *\
upshot              outcome conclusion result effect *\
percentage          compensation commission fee *\
carnage             massacre slaughter shambles killing *\
oscillate           rock swing vibrate waver change *\
incision            cut gash notch *\
ungodly             godless pagan profane unholy *\
youth               childhood minority prime of life *\
contrary            opposed opposite counter *\
sedate              calm serious dignified serene *\
declare             assert proclaim say signify *\
totter              shake tremble rock reel waver *\
swerve               deviate shift sheer *\
emanation           aura odor effusion flowing issuing *\
plead               allege assert state beg petition *\
illiterate          ignorant unread uneducated dumb *\
cistern             tank reservoir rain barrel *\
aged                elderly old ancient venerable *\
mountain            hill peak elevation mount *\
trip                journey excursion error stumble *\
couch               bed cot pallet lounge *\
onset               attack onslaught opening *\
build               construct make fashion erect *\
serene              calm placid tranquil clear *\
flute               groove furrow pipe piccolo fife *\
chart               map plan graph *\
most                greatest majority of nearly all *\
charm               fascinate captivate enamor enchant *\
fluctuate           alternate wave vacillate *\
saturate            soak fill drench imbue *\
mammoth             huge giant gigantic tremendous *\
pennant             banner flag streamer pennon *\
weigh               measure balance ponder consider *\
sector              part side zone division area *\
swelling            lump puff tumor welt *\
relation            connection reference analogy similar *\
malignant           malign vicious criminal harmful *\
fine                penalty forfeit penalize *\
find                discover detect obtain learn *\
giant               jumbo monster titan colossus *\
nervous             jumpy jittery fidgetry *\
ruin                destruction wreck remains relic *\
unhappy             unfortunate sorrowful wretched *\
poach               steal thieve filch pilfer *\
money               funds finance capital *\
override            annul overrule prevail *\
prowess             courage bravery heroism *\
notation            note comment annotation entry *\
permission          leave allowance toleration grace *\
attire              clothing dress apparel *\
courage             bravery valor boldness strength *\
batter              smash beat pound destroy *\
breast              bosom bust chest *\
inaugurate          induct install introduce initiate *\
pellet              pill tablet capsule missile pebble *\
unofficial          unauthorized off the record *\
elapse              slip away pass expire intervene *\
resolve             determination resolution decide *\
remove              depart go away move displace *\
common              ordinary standard usual general *\
gospel              bible truth scripture faith *\
excavation          burrow cavity unearhing mining *\
vine                climber runner stem shoot ivy *\
individual          one peculiar personal somebody *\
tender              gentle kind affectionate money *\
changeable          movable variable inconstant fickle *\
expert              skillful master professional *\
debar               exclude shut out prohibit *\
please              kindly do request gratify satisfy *\
abrade              grate graze rub scour scuff *\
donate              contribute volunteer bestow *\
commercial          mercantile trade salable *\
lightness           levity gaiety grace nimbleness *\
egotism             conceit selfishness vanity pride *\
reverse             converse apposite setback defeat *\
annual              yearly seasonal anniversary *\
foreign             alien strange exotic extraneous *\
mean                ignoble stingy average normal *\
consume             destroy demolish annihilate devour *\
bridge              span trestle viaduct causeway *\
simple              clear easy innocent pure artless *\
smother             damp stifle suffocate choke *\
gypsy               nomad vagrant idler flirt coquette *\
supple              limber flexible yielding compliant *\
civilize            educate cultivate refine reclaim *\
expensive           costly dear high exorbitant *\
raise               lift elevate arouse incite muster *\
apostle             disciple evangelist *\
create              cause make form bring into being *\
underage            immature premature minor *\
appall              horrify shock disgust revolt *\
volley              attack round burst salvo *\
secret              mystery confidence concealed hidden *\
amnesia             loss of memory *\
meeting             encounter gathering contend assembly *\
gay                 lively vivacious blithe *\
honorary            nominal in name only titular *\
gas                 vapor fume reek fuel gasoline *\
gap                 interval vacancy break space *\
understand          know comprehend grasp perceive *\
gag                 muffle silence choke strangle retch *\
chatter             prattle talk gabble *\
pierce              impale penetrate prick stab stave *\
fur                 hide pelt coat skin hair *\
solid               concrete cube firm stable body *\
bill                score reckoning invoice statement *\
tolerate            abide allow bear stand *\
crutch              staff walking stick support *\
fun                 play sport game jest joke *\
lingo               language speech tongue *\
lull                calm intermission repose *\
shoddy              inferior shabby common ignoble *\
mystic              hidden secret esoteric *\
astound             boggle amaze stun stupefy surprise *\
rancor              spite malice bitterness vengefulness *\
decoration          frill vignette adornment enrichment *\
facade              front appearance aspect pretense *\
unaffected          natural simple plain genuine *\
seduce              lead astray lure entice corrupt *\
thesis              proposition topic argument statement *\
dishonor            treachery infamy perfidy infidelity *\
butcher             slaughter kill bungle *\
benign              gracious favorable benevolence *\
discourse           converse talk discuss declaim *\
seminar             study group tutorial school *\
corridor            hall gallery passage route *\
development         culture growth improvement progress *\
itch                tickling tingling desire crave *\
assignment          chore mission post task *\
yesterday           day before the past *\
moment              importance consequential instant *\
stripe              line band streak belt class *\
realm               kingdom empire domain sphere *\
unveil              disclose reveal uncover *\
timid               fearful cowardly afraid shy *\
task                work job labor lesson assignment *\
supersede           replace displace supplant succeed *\
spent               used up exhausted fatigued worn-out *\
withdraw            remove separate retire retreat *\
toil                labor drudgery task work effort *\
entry               entrance memorandum record posting *\
recant              withdraw take back renounce retract *\
spend               expend consume employ exhaust *\
howl                bellow shriek yowl bay *\
preference          choice option favorite election *\
vindictive          vengeful spiteful bitter resentful *\
segregate           isolate sift sever divide part *\
shape               form figure contour pattern *\
thorough            exact painstaking complete absolute *\
credentials         papers documents voucher passport *\
alternative         choice option plan *\
timber              wood lumber log beam *\
discipline          training drill practice obedience *\
superficial         shallow cursory slight slender *\
cut                 incise carve slice trim split *\
cur                 dog hound mongrel *\
cup                 mug tankard chalice goblet *\
alternate           substitute proxy *\
snag                catch detent difficulty hindrance *\
source              begin cause font fountain parent *\
studious            scholarly thoughtful bookish *\
bravery             courage valiantly prowess boldly *\
reproof             admonition rebuke reproach *\
excited             hectic tense aroused restless *\
bin                 pocket trough hopper crib *\
big                 large bulky huge mountainous *\
bid                 offer try invitation request *\
displace            misplace remove succeed unseat *\
redeem              ransom recover rescue restore *\
bit                 scrap mite slice piece tool drill *\
knock               pound strike hit rap tap bump *\
blemish             flaw defect imperfection *\
retake              resume recover recapture retrieve *\
flux                flow current course motion change *\
indication          symbol sign symptom marker *\
foolish             silly sophomoric unwise irrational *\
transgress          overstep sin infringe offend *\
often               frequently repeatedly recurrently *\
magnificent         grand splendid noble superb *\
back                rear support aid promote fund *\
impeach             accuse charge indict arraign *\
martial             military warlike soldierly *\
scale               balance ratio proportion weigh *\
culprit             offender malefactor wrongdoer *\
pet                 favorite beloved love cuddle *\
pelt                fur hide skin covering *\
decision            award verdict end result judgment *\
proficient          adept skillful expert masterly *\
pen                 stockade enclosure fold stall *\
eliminate           expel excrete get rid of eradicate *\
lark                frolic romp gambol caper prank *\
peg                 pin degree *\
invade              enter encroach violate penetrate *\
patient             invalid case victim *\
wayward             perverse willful forward delinquent *\
goods               produce stock wares merchandise *\
constraint          pressure force stress *\
drama               the stage the theater show business *\
gambit              attack stratagem ruse artifice ploy *\
depose              attest oust swear unseat *\
tiff                temper fit tantrum squabble spat *\
lesson              instruction task exercise example *\
derangement         disorder insanity jumple confusion *\
forward             front anterior foremost future *\
translate           transfer decipher decode render *\
errant              wandering roving deviation *\
opponent            opposition enemy attacker *\
invite              summon ask tempt attract lure *\
cloud               haze overcast obscure *\
quiescent           still motionless fixed stationary *\
agreeable           amiable nice pleasant kindly mild *\
subsidiary          branch incidental supplementary *\
nutshell            husk hull covering synopsis *\
rejection           exception exclusion repulsion *\
aversion            distaste horror phobia repulsion *\
groove              habit routine rut furrow *\
possession          ownership lordship dominion estate *\
curt                short concise brief succinct *\
constant            steady true uniform unchanging *\
expedition          trip tour excursion journey quest *\
metal               mineral element alloy ore *\
deprive             dispossess divest denude *\
single              one solitary sole alone *\
cure                heal restore relieve preserve *\
curb                restrain subdue control check *\
obtuse              stupid dull blunt *\
curl                roll wave ripple spiral twist coil *\
prevail             rule succeed induce persuade *\
crypt               vault tomb interment *\
sterilize           disinfect pasteurize ascepticize *\
excrete             eliminate expel perspire remove *\
assassinate         kill slay murder *\
confine             imprison incarcerate immure jail *\
cellar              basement subcellar vault *\
lend                advance finance loan entrust lease *\
heir                legatee inheritor beneficiary *\
luxurious           lush sumptuous voluptuous costly *\
lens                refractor eyeglass *\
restoration         renovation revival resuscitation *\
cater               indulge humor pleasure *\
charming            sweet winsome cute ravishing *\
desert              waste wilderness solitude *\
downcast            dejected modest bashful *\
oppress             persecute burden crush afflict *\
implied             implicit suggested inferential *\
tube                pipe spout tunnel underpass conduit *\
rinse               rewash dip splash *\
wrangle             quarrel bicker squabble dispute *\
chariot             carriage phaeton *\
intricate           complicated complex involved devious *\
query               challenge question inquiry *\
vicious             sinful wicked immoral wrong *\
strew               scatter disperse disseminate *\
compose             constitute print comprise write *\
suave               bland courteous gracious smooth *\
granular            granulated grainy mealy gritty *\
critical            exacting captious judicious urgent *\
blaze               fire flame mark spot *\
gravel              stones pebbles calculi rubble *\
ingredient          component part element *\
annoy               vex tease harass disturb molest *\
queen               ruler mistress belle *\
presently           soon shortly immediately eventually *\
dessert             sweet savory confection treat *\
unbeaten            undefeated unconquered successful *\
accuse              allege blame charge araign *\
arrange             accommodate compile negotiate set *\
entire              complete absolute total all whole *\
recreation          diversion sport pastime *\
knight              warrior paladin cavalier *\
shock               shake jar jolt startle surprise *\
choppy              rough jerky agitated *\
lapse               interval oversight error deteriorate *\
mural               wall painting fresco mosaic *\
append              add attach to affix addition *\
zest                relish gusto appetite enthusiasm *\
anthem              song hymn chorale music *\
paddle              oar row spank swim pole *\
access              approach admittance passage *\
exercise            drill perform train *\
body                anatomy torso substance assemblage *\
justification       apology vindication excuse defense *\
exchange            substitute trade barter interchange *\
nimble              agile light spry quick *\
packing             contents filler wadding buffer *\
intercept           stop interrupt check hinder seize *\
sink                settle go downhill lower debase *\
sing                troll praise vocalize hum whistle *\
preamble            preface prologue prelude *\
irritating          abrasive irksome vexatious *\
extreme             remote utmost farthest last *\
remark              note observe comment mention *\
talent              ability faculty flair aptitude gift *\
conceit             vanity pride egotism fancy *\
contradiction       discrepancy opposite dispute *\
climb               mount scale ascend rise succeed *\
proof               evidence substantiation verification *\
honor               distinction integrity repute *\
blizzard            snow storm tempest blast gale *\
limp                lax slack pliant soft flabby *\
private             confidential intimate personal *\
extravagance        luxury splurge lavishness waste *\
egress              exit issue emergence eruption *\
decrease            abate wane lessen diminish abate *\
oval                elliptical ovoid ovate *\
scandal             disgrace infamy shame humiliation *\
staple              chief principal stable regular *\
patron              client sponsor helper supporter *\
impotence           inability incapacity *\
trait               quality characteristic feature *\
trail               track footprints vestige scent path *\
train               succession instruct drill educate *\
harvest             fruit glean produce reap yield *\
account             consider regard assess *\
tunnel              passageway burrow tube *\
gruff               bluff surly rough harsh coarse *\
unreal              imaginary illusionary shadowy *\
obvious             manifest patent clear evident *\
praise              commendation acclaim approval *\
smear               smudge slander defame *\
unread              illiterate unlearned uneducated *\
fetch               retrieve bring carry heave deal *\
reserved            aloof coy shy claimed saved taken *\
contempt            disdain scorn despise disrespect *\
native              countryman innate inherent natural *\
daring              bold valiant valor courageous *\
lame                crippled halt weak ineffectual *\
lamp                light lantern headlight *\
attachment          addition appendage affection love *\
stock               merchandise goods livestock *\
profile             contour outline side silhouette *\
collection          hoard omnibus assembling assortment *\
nullify             abort counteract revoke cancel *\
bluff               brink cliff deception trick *\
bind                restrain secure fasten obligate *\
chief               foremost head paramount premier *\
tamper              meddle interfere taint alter *\
furious             raging violent fierce storming *\
furnish             afford endue equip rig supply *\
ignite              fire fuel kindle light start up *\
disarm              demilitarize pull one's teeth *\
meter               rhythm cadence lilt gauge *\
alacrity            promptness speed zeal *\
galaxy              assemblage multitude milky way *\
bunch               crowd group cluster bundle *\
ample               plenty sufficient large copious *\
labor               work toil effort task proletariat *\
heroism             prowess valor bravery courage *\
blatant             noisy obtrusive *\
marsh               bog swamp quagmire *\
latitude            range extent scope freedom *\
criminal            offender malefactor felon sinner *\
image               picture reflection likeness *\
junction            connection coherence joining union *\
lunatic             madman maniac psychopath *\
dab                 spot pinch bit littleness *\
dam                 dike seawall levee embankment *\
spell               charm trance respite time stretch *\
muddle              confusion mess disorder *\
mention             let fall cite speak of communicate *\
mandate             command edict statute ordinance *\
day                 daytime light dawn daybreak *\
strive              endeavor strain struggle contend *\
thrill              excitement tremor vibration tingle *\
slacken             relax taper loosen retard reduce *\
radiant             shining sparkling glowing *\
disregard           disrespect forget ignore *\
flair               judgment discernment talent gift *\
thwart              oppose baffle foil frustrate *\
pantry              store cupboard kitchen galley *\
calibrate           graduate rectify measure *\
wade                walk through traverse ford *\
fondle              pet caress cosset endearment *\
defend              fend protect ward shield shelter *\
understudy          alternate substitute second double *\
mate                companion chum comrade counterpart *\
messenger           courier envoy bearer herald crier *\
stud                boss jewel support projection *\
lecture             address discourse expound reprove *\
postpone            procrastinate delay defer shelve *\
stun                deaden daze stupefy astound *\
red                 crimson scarlet *\
frank               ingenuous straightforward sincere *\
hanker              desire covet crave yearn *\
clarify             filter refine purify render explain *\
bleed               flow hemorrhage fleece suffer *\
verify              confirm prove make certain establish *\
indent              impress hollow dent notch *\
yarn                tread fib tall story *\
abuse               misuse injure harm damage maltreat *\
qualification       limitation restriction condition *\
mortal              human ephemeral fatal deadly *\
retain              have keep recall grasp remember *\
retail              vend peddle dispense sell *\
suffix              affix addition ending *\
sack                bag destruction pillage ravage *\
madden              infuriate enrage incense craze *\
puppet              doll toy manikin figurine *\
instill             inculcate implant impart infuse *\
ancient             aged venerable antique archaic *\
vulgar              offensive bad taste ribaldry *\
immovable           firm immobile solid stable fixed *\
scant               scanty limited meager sparse *\
jingle              clink tinkle ring jangle *\
nut                 kernel stone nutmeat seed core *\
cabin               shack shed shanty lodge hut *\
gear                clothing dress cogwheel equipment *\
explanation         reason elucidation clarification *\
acquire             get annex obtain achieve *\
dreary              dread cheerless gloomy somber *\
resist              boycott confront oppose rebel *\
slack               careless lax loose limp dull slow *\
compensation        stipend wages payment salary *\
lover               suitor wooer sweetheart *\
impale              transfix pierce *\
coronation          crowning investment *\
gambol              leap cavort frolic romp play *\
neutralize          cancel offset compensate *\
tidy                neat orderly trim considerable *\
comfortable         cozy easy snug contented relaxed *\
nonfiction          reality history article expose *\
have                own hold retain possess *\
dictate             enjoin draw up domineer *\
demonstration       proof verification evidence *\
skillful            able expert gifted proficient *\
gravity             weight heft burden ballast *\
incentive           stimulus goad spur motive clause *\
precipice           cliff drop bluff *\
mix                 assort blend hash mingle tangle *\
unless              if not save except without *\
agenda              things to be done order of the day *\
dryness             aridity aridness desiccation *\
procure             acquire purchase get obtain buy *\
payment             defrayment reimbursement compensation *\
stranded            aground stuck embarrassed penniless *\
request             petition plea proposal offer appeal *\
disease             illness ailment sickness infirmity *\
absurd              nonsense paradox inconsistency *\
occasion            opportunity opening room event *\
skinny              thin lean slim slender *\
outlive             outlast survive endure *\
contemptuous        derisive sarcastic disdainful *\
recess              alcove niche nook pause break *\
text                composition matter topic theme *\
unseen              invisible imperceptible *\
traitor             betrayer renegade deserter informer *\
rebuke              reproof reprimand admonition reprove *\
thicket             bush clump grove wood shrubbery *\
supporter           ally fan advocate adherent *\
staff               walking stick cane scepter *\
wear                last endure use show display *\
knowledge           insight inkling aware perceptive *\
startle             start alarm frighten shock surprise *\
prolong             protract sustain extend draw out *\
oppressor           persecutor bully boss slave driver *\
handsome            attractive comely personable fine *\
inferior            least less minor poor shoddy under *\
pitfall             ambush snare trap meshes *\
beat                throb stroke accent rhythm *\
pave                coat cover floor surface *\
beam                shine glow smile ray gleam *\
occupant            tenant lodger occupier inhabitant *\
beak                nose bill nib *\
bead                drop pellet ball *\
unprejudiced        impartial unbiased dispassionate *\
monopoly            trust corner pool syndicate *\
defame              malign smear tarnish slander *\
fixed               absolute quiescent rebuilt repaired *\
conform             accord adapt comply submit *\
omission            exclusion exception elimination *\
farthest            extreme ultimate last furthest *\
groggy              dizzy stupefied sleep out of it *\
ocular              optic visual retinal perceptible *\
yearning            wish yen want longing craving *\
racket              carouse hubbub frolic clatter *\
reform              restore improve convert redeem *\
pattern             form original mold example *\
routine             groove habit order rut system *\
progress            advance improvement movement proceed *\
boundary            limit border confines edge *\
sorrow              bale grief mourn sympathize woe *\
grumble             gripe groan growl snarl *\
deliver             discharge give forth emit free *\
scuff               scratch abrade scrape disfigure *\
exclaim             cry out shout vociferate exclaim *\
instant             sudden immediate direct moment *\
rime                frost ice snow sleet icicle *\
taking              reception receiving appropriation *\
equal               abreast equivalent even match *\
pulp                paste dough curd mush *\
passing             cursory fleeting *\
temporal            worldly mundane civil unsacred *\
otherwise           else if not besides contrarily *\
comment             observation remark note criticism *\
vent                utter express expel emit *\
relevant            applicable pertinent pertaining to *\
commend             praise applaud cite acclaim approve *\
vend                sell purvey issue publish *\
laugh               guffaw snicker giggle chuckle *\
unstrung            unhinged unnerved distraught *\
gulch               gully ravine canyon gorge *\
curtain             screen veil valance *\
proposal            offer statement recommendation *\
curtail             shorten clip cut abbreviate *\
define              explain interpret prescribe describe *\
bulk                size quantity measure amount volume *\
tense               taut rigid intent excited *\
gross               bulky large fat obese vulgar *\
general             broad universal global average *\
volunteer           enlister offerer donate offer *\
plain               simple homely savanna tundra meadow *\
appearance          sight scene view outlook prospect *\
value               worth price rate evaluate assess *\
permeate            pervade saturate overspread *\
helper              aide auxiliary employee hand prop *\
almost              nearly not quite all but *\
dissent             discord disagreement apostasy *\
delusion            deception illusion fantasy *\
prose               writing style fiction non fiction *\
partner             sharer associate co-owner *\
portray             picture describe act out enact *\
whirl               gyration turn flutter confusion *\
watchful            alert vigilant observant *\
coronary            crownlike round circular *\
film                coating membrane movie flick *\
finite              limited limit certain boundary *\
infer               gather reason deduce conclude opine *\
practice            training drill exercise custom *\
judgment            flair taste sense verdict *\
retard              delay hinder impede postpone *\
center              middle core hub midst *\
weapon              armament defense weaponry *\
thought             reflection speculation idea notion *\
ravine              canyon gulch gulley *\
muscle              tendon sinew brawn power strength *\
placid              serene unruffled calm cool *\
lynching            hanging murder mob rule *\
stooge              dupe tool servant henchman sucker *\
proximity           nearness vicinity neighborhood *\
evince              exhibit display show manifest *\
surpass             exceed excel outdo eclipse *\
tough               strong firm stiff resilient *\
graduate            measure beaker calibrate degree *\
onward              forward ahead progress *\
lake                lock pond pool *\
bench               seat settee court bar board *\
add                 annex append increase augment *\
citizen             resident inhabitant native *\
scrimp              curtail limit pinch tighten reduce *\
ravel               untangle fray separate *\
smart               inteligent sharp keen clever *\
untrue              disloyal false unfaithful *\
testy               irritable cross ornery *\
punctual            prompt regular precise timely *\
wink                blink twinkle overlook ignore *\
insert              inject transfuse imbed enter *\
like                similar resembling characteristic *\
success             prosperity triumph conquest winner *\
vibrant             pulsing athrob resonant robust *\
porous              open absorbent permeable loose *\
heed                attention notice regard *\
works               factory plant mill shop *\
soft                mellow whisper faintness tender low *\
heel                rear tilt cant cad scoundrel *\
propel              push force impel thrust shove *\
authority           power jurisdiction title influence *\
hair                filament whiskers locks tresses *\
corroborate         confirm evidence *\
convey              bring move carry transmit send *\
recommendation      advice proposal guidance council *\
proper              correct fastidious chaste right *\
shrub               bush tree scrub hedge plant *\
corpse              cadaver carcass remains relics *\
hurricane           cyclone tempest typhoon *\
discretion          caution option prudence tact will *\
snuggle             cuddle nestle curl up hug *\
regain              recover retrieve get back to *\
pepper              cayenne vim vigor *\
noise               uproar hubbub din racket *\
slight              slender slim frail trivial scant *\
host                throng mass horde legion array *\
expire              exhale emit die perish *\
although            though while even if in spite of *\
worthy              deserving virtuous good upright *\
narrate             recount relate tell *\
panel               jury board of judges *\
retribution         penalty penance requital reprisal *\
inconsiderate       careless heedless thoughtless *\
about               around roughly nearly almost *\
actual              real veritable true genuine *\
certainty           certitude confidence sureness *\
flake               fleck floccule scale shaving *\
evoke               summon invoke imagine suggest *\
discard              reject abandon throw aside *\
tomb                grave sepulcher mausoleum vault *\
guard               shield cover protection pad *\
esteem              respect regard admiration honor *\
female              woman weaker sex feminity *\
ridge               saddle range moraine seam spine *\
adolescent          juvenile teenager young one *\
outline             profile tracing bounds edge *\
condense            abridge digest shorten cut compress *\
utopian             ideal optimistic romantic unreal *\
glimmer             blink gleam flicker flash *\
maze                labyrinth network perplexity *\
globe               ball sphere earth orb *\
bus                 trolley vehicle coach onmibus *\
brand               kind sort mark identification *\
sequel              upshot outcome epilogue *\
plague              affliction woe nuisance pest *\
bug                 insect arthropod mite vermin flaw *\
bud                 begin burgeon sprout shoot *\
glory               aureole halo nimbus radiance *\
wish                desire will craving yearning *\
wisp                bundle tuft lock *\
condiment           seasoning sauce spice relish *\
supreme             highest utmost prime chief dominant *\
pin                 peg spoke dowel fastener *\
whisper             murmur whispering sigh hint reveal *\
pig                 hog sow boar swine slob *\
pit                 hole hollow indentation crater *\
loft                attic garret studio *\
oaf                 lout simpleton dullard dunce *\
corporation         association syndicate company *\
detail              part unit item particular *\
virtual             practical implied implicit *\
detain              delay check hold back keep *\
sewer               drain culvert conduit *\
oar                 paddle blade sweep scull *\
ledge               shelf rim bench berm *\
stimulant           excitant stimulus spur tonic *\
flange              lip wall rib spine shield *\
bundle              package parcel bunch bale *\
wallow              tumble grovel roll toss revel *\
wallop              thrash beat strike punch hit *\
astronomy           cosmology cosmogony *\
ramble              prowl rave roam stroll walk wander *\
prevalent           current rife widespread prominent *\
oral                verbal vocal spoken unwritten *\
pupil               disciple student attendant *\
yell                shout cry scream shriek *\
parole              pledge promise custody release *\
limited             definite finite scant qualified *\
vermin              bug insect louse *\
hitch               hindrance knot obstruction obstacle *\
sleep               slumber somnolence nap doze rest *\
appetite            hunger desire craving *\
hate                abhorrence loathing disfavor enmity *\
yonder              thither there beyond far away *\
muzzle              mouth nose nuzzle silence *\
vile                base debased low mean repulsive *\
under               below beneath inferior subordinate *\
pride               dignity self-respect arrogance *\
merchant            trader dealer *\
lure                entice decoy tempt coax *\
haughtiness         arrogance insolence aloofness *\
risk                chance venture hazard gamble *\
dispense            distribute apportion excuse exempt *\
rise                ascend soar upward appear *\
lurk                skulk slink sneak concealed *\
every               each all complete entire *\
encounter           meet come across engage *\
school              academy university institute *\
ovation             applause kudos tribute cheers *\
conceive            devise frame imagine visualize *\
enjoy               like relish love gloat over *\
veritable           actual real authentic genuine *\
infancy             babyhood childhood beginning genesis *\
consistent          accordant uniform harmonious *\
direct              tend incline take aim set ones sight *\
nail                talon claw spike tack *\
scrutinize          inspect scan watch view study *\
persuade            coax convince prevail wheedle *\
ransack             rummage scour search loot pillage *\
shining             bright radiant gleaming luminous *\
hide                skin pelt coat leather disguise *\
conduce             lead tend contribute *\
solemn              awesome impressive serious dignified *\
liberty             freedom independence emancipation *\
conduct             dealing behavior act ones age *\
wart                growth blemish callous protuberance *\
ulterior            beyond farther further remote *\
feisty              quarrelsome frisky activity *\
humility            meekness modesty submission *\
aftermath           results consequences *\
voice               intonation utterance vociferation *\
forum               market place court tribunal *\
auction             bidding vender sale offering *\
ridicule            deride jeer snicker scoff banter *\
punishment          hangman penalty correction reproof *\
stray               wander straggle roam rove deviate *\
strap               band bond strip tape rope *\
patience            leniency tolerance perseverance *\
hospital            sanitarium clinic infirmary *\
interlace           knit weave intertwine braid twist *\
spike               ear nail pike prong spine *\
assessment          levy tax appraisal evaluation *\
breathe             emit exhale respire inhale *\
barbarous           inhuman rude savage brutal fierce *\
saber               sabre sword scimitar cutlass *\
grief               distress bereavement sorrow pain *\
excellent           capital good goodly superb *\
pouch               bag pocket sack receptacle *\
must                ought should had better required *\
abundance           plenty sufficient fullness *\
hutch               kennel cage corral trough *\
join                unite affiliate federate associate *\
tissue              gauze fabric web net muscle *\
install             put in set up induct inaugurate *\
appendage           adjunct attachment tail accessory *\
salvage             rescue recovery retrieve reclaim *\
fortress            castle tower stronghold fort *\
quarrel             altercation squabble dispute feud *\
loosen              relax unfasten untie free *\
estate              state status land holdings *\
jumble              mixup confusion disorder *\
attract             appeal lure seduction adduce *\
guarantee           vouch undertake warrant pledge *\
ceremony            ritual formality protocol form *\
end                 close termination conclusion *\
bung                stopper cork plug *\
stride              step pace progress improvement *\
bunk                bed berth cot absurd *\
vagrant             gypsy hobo tramp vagabond begger *\
keel                turn over fall down drop like a log *\
adjacent            near close by next to touching *\
toxic               poisonous venomous virulent noxious *\
gate                gateway opening portal sluice *\
widespread          blanket broad boundless extensive *\
actuality           fact reality substantiality *\
dialect             language tongue idiom jargon *\
description         account summary sketch *\
mess                difficulty predicament disorder *\
delicacy            sensitiveness tact nicety exactness *\
lump                protuberance swelling chunk *\
whittle             shape carve pare shave slice *\
mesh                network web tangle lattice *\
stronghold          castle garrison fortress *\
splendid            gorgeous magnificent glorious *\
amid                among midst amidst *\
spout               tube pipe nozzle spurt *\
hypnotic            mesmeric fascination magnetic *\
patent              obvious plain clear evident *\
jungle              wilderness bush tropics *\
enter               penetrate pierce go in invade *\
aloud               audibly vociferously loudly *\
vapor               gas mist reek steam vaunt *\
archaeology         past paleontology paleography *\
unsteady            fluctuating waving shifting shaky *\
fetter              shackle manacle handcuff restrain *\
sprout              germinate shoot bud burgeon *\
over                past across by again beyond *\
bleach              whiten blanch lighten *\
underside           underneath under downside belly *\
sickly              pale unhealthy unsound ailing *\
oven                stove range broiler furnace *\
strangle            choke stifle suffocate suppress *\
digest              absorb assimilate ponder weigh *\
beside              by near alongside abreast *\
comprehend          grasp realize see understand *\
tramp               traveler vagabond hobo vagrant *\
condition           fitness state birth rank place *\
fade                pale dim bleach whiten vanish *\
mistreat            maltreat mishandle neglect *\
tourist             traveler voyager sightseer *\
powerful            potent strong mighty almighty *\
roost               perch limb branch nest refuge *\
diseased            indisposed morbid sick unsound *\
manicure            trim clip cut pare file polish *\
rental              hire rent lease lend sublet *\
gloom               dejection sadness dim shadow *\
gluttony            hoggishness greed voracity *\
explode             destroy burst detonate fire *\
victory             conquest triumph success mastery *\
each                apiece severally respectively every *\
consolidate         coalesce compress incorporate unify *\
prohibit            debar forbid interdict ban obstruct *\
econony             thriftiness frugality thrift care *\
gymnasium           gum gameroom arena *\
clothe              dress endue invest vest attire *\
pounce              spring leap jump snatch seize *\
depress             discourage lower reduce dispirit *\
lair                den covert burrow cave abode *\
god                 creator father jehovah almighty *\
motel               hotel inn cabin motor court *\
adjust              fix adapt regulate straighten *\
unabashed           shameless brazen unashamed *\
heavenly            celestial cosmic supernal *\
independence        autonomy liberty freedom *\
perception          notice sensation understanding *\
associate           join fraternize ally combine unite *\
free                liberated independent released *\
formation           construction genesis production *\
rain                shower precipitation downpour *\
fret                agitate irritate vex worry fume *\
laborer             peasant worker workman *\
filter              strain sieve refine purify screen *\
recite              rehearse relate repeat declaim *\
already             by now previously *\
dunce               oaf dolt lout moron fool *\
primary             capital elementary main original *\
hearing             auditory listener sense of hearing *\
restrict            cramp stint limit restrain check *\
fantasy             delusion desire dream myth romance *\
sober               grave quiet sedate staid serious *\
cheerless           dismal dreary gloomy bleak sad *\
toy                 trinket doll puppet *\
revival             resuscitation reanimation restoration *\
top                 crown head acme summit pinnacle *\
tow                 draw pull drag haul *\
euphoria            elation pleasure high spirits *\
too                 also likewise over additionally *\
inconvenient        awkward embarrassing inopportune *\
unbroken            intact whole continuous untamed *\
urban               city town metropolitan civil *\
hangout             resort rendezvous clubhouse *\
tool                instrument implement utensil device *\
serve               avail officiate succor warp *\
incur               acquire *\
lather              foam froth suds spume *\
nominate            propose name suggest appoint *\
final               last ultimate decisive end *\
flame               blaze fire excitement passion *\
prone               inclined disposed likely *\
rag                 shred tatter scrap remnant *\
fashion             style society ostentation make *\
ram                 butt batter bump pound drive *\
drip                drop dribble trickle leak percolate *\
raw                 crude unprepared uncooked *\
rap                 knock pat peck tap strick whack *\
protract            extend lengthen prolong continue *\
regulate            order manage rule adjust rectify *\
spade               shovel spud delve excavate *\
ray                 beam light shaft spoke flash blaze *\
relapse             recurrence deterioration regression *\
snow                flurry blizzard avalanche *\
elegance            ease grace polish finish simplicity *\
contact             touch connection encounter *\
hatch               invent contrive originate devise *\
snob                upstart fawner toady *\
cleft               split rift fissure crack crevice *\
cookout             barbecue picnic *\
though              although even if nevertheless yet *\
visionary           idealistic utopian imaginary *\
plenty              sufficient abundant ample *\
coil                spiral curl roll winding *\
parting             departure farewell severance *\
glow                light radiance warmth shine blaze *\
partition           screen wall severence apportion *\
flow                run glide trickle stream *\
treaty              compact pact covenant agreement *\
orderly             neat tidy formal exact aide valet *\
enterprise          project scheme venture push ahead *\
flog                lash thrash whip strike *\
section             separation disjunction division *\
sanctuary           refuge shelter haven resort *\
bait                lure temptation decoy tempt tease *\
inspire             breathe in stimulate animate enliven *\
random              haphazard casual chance fortuitous *\
dupe                gull victim cully fool *\
queer               odd singular strange giddy *\
earth               planet globe world ground land *\
peddle              sell canvass hawk retail *\
bail                security bond pledge *\
spite               malice ill-will grudge malignity *\
pacification        mollification conciliation compromise *\
disgust             nauseate sicken revolt repel offend *\
lodge               dwell settle file *\
announce            tell proclaim publish *\
axiom               law proposition *\
mixture             alloyage combination union infusion *\
undecided           undetermined unresolved doubtful *\
watch               look at scrutinize examine stare *\
fluid               liquid sap serum soluble *\
baffle              foil frustrate balk block *\
ultimatum           demand requirement exaction *\
despite             in spite of regardless of contrary to *\
report              state review announce proclaim *\
reconstruct         rebuild redo restore renovate *\
considerate         thoughtful kind humane sympathetic *\
unlatch             open unfasten *\
collusion           conspiracy scheme intrigue conniving *\
falsify             false lie counterfeit *\
twice               doubly twofold a second time *\
thanks              gratitude acknowledgment appreciate *\
penance             retribution atonement fine *\
pummel              pommel beat belabor *\
habit               custom made rule routine rut *\
wrest               twist tear away snatch grab *\
liquor              liquid fluid broth spirits *\
nun                 sister ecclesiastic *\
corrupt             contaminate rotten seduce taint *\
sporadic            occasional irregular *\
accede              assent agree consent comply *\
capacity            space volume limit extent quantity *\
temptation          attraction enticement allurement *\
propulsion          projection push driver power *\
feline              catlike cattish stealthy cunning *\
mud                 mire muck ooze *\
mug                 cup stein gangster mobster thug *\
approach            nearing approximation imminence *\
confusion           chaos disarray jumble mixup *\
weak                feeble infirm fragile delicate *\
boss                knob stud manager supervisor *\
adage               proverb saying aphorism *\
devour              eat wolf down consume destroy *\
devout              pious reverent religious godly *\
dedication          devotion zeal sanctification *\
news                information intelligence tidings *\
improve             correct mend rectify refine upgrade *\
protect             defend guard shelter shield screen *\
irregular           inconstant sporadic unstable *\
fault               failing shortcoming flaw blemish *\
facet               face surface plane bezel aspect *\
variance            change alteration difference *\
expense             cost price outlay expenditure *\
escapade            jount adventure prank frolic caper *\
confide             trust believe in rely on *\
epidemic            disease pestilence plague *\
clinic              hospital workshop sick bay *\
majestic            noble stately imposing grand *\
trust               confide depend faith hope rely *\
truss               girdle belt tie lace button strap *\
aback               rearwards behind unawares sudden *\
bathroom            toilet facilities head water closet *\
bible               sacred writings gospel *\
backlash            reaction recoil *\
beer                bock hops malt drink *\
communion           talk conversation concord unity *\
sprite              elf fairy nymph goblin *\
uncommon            unusual rare scarce strange *\
craft               skill expertise art vessel ship *\
catch               take seize overtake land net hook *\
apprehension        fear anxiety arrest seizure *\
lessen              reduce diminish mitigate abate *\
tolerable           endurable bearable passable not bad *\
lesser              junior minor inferior *\
subjugate           conquer vanquish master subdue *\
precede             antecede anticipate lead go before *\
procedure           process method tactics way course *\
pyramid             polyhedron progression accumulation *\
broth               stock boullon potion elixir *\
brutal              cruel inhuman coarse *\
exterior            extraneous outside outward surface *\
suggest             hint propose submit imply *\
wound               injury hurt cripple stab cut *\
overstep            transgress trespass cross *\
complex             intricate manifold complicated *\
several             individual distinct particular *\
social              gregarious friendly communal *\
deflect             bend curve twist deviate avert *\
action              performance operation execution *\
cycle               period age epoch circle round *\
hearth              fireside fireplace family circle *\
gabble              cackle chatter prattle *\
hearty              cordial well warm jovial *\
incapable           powerless unable incompetent *\
mother              parent mamma prioress matron *\
appease             mollify pacify soothe placate *\
able                capable competent skillful talented *\
vibration           shaking thrill quiver throb *\
thick               broad wide massive stout fat dense *\
elf                 sprite fairy imp pixy gnome *\
befit               suit harmonize with fit become *\
teenager            youth adolescent teen *\
misprint            typographical error typo *\
pitiful             compassionate pity wretched *\
humanity            human race humankind mankind *\
singe               scorch sear burn *\
vulture             predator scavenger condor *\
dismount            take apart dismantle get off *\
judge               arbitrator critic estimate guess *\
scruple             doubt perplexity misgiving qualm *\
rumor               report hearsay gossip *\
apart               separately alone independently away *\
dirigible           airship blimp *\
ditto               as before again likewise *\
gift                donation flair grant premium *\
zeal                devotion dedication passion soul *\
contradict          gainsay deny belie refute *\
gifted              talented skillful artful *\
dishonest           false untrustworthy cheating *\
specific            special distinct limited exact *\
hunk                piece chunk mass *\
arbitrary           despotic dictorial unreasonable *\
overtone            suggestion hint implication *\
hunt                chase rummage search seek *\
sponge              blotter dryer soak sop swab absorb *\
accost              address waylay greet hail *\
usher               escort introduce announce induct *\
displeasure         anger disfavor resentment *\
escape              evasion retreat deliverance freedom *\
indirect            oblique roundabout crooked *\
intellect           mentality brains mind rationality *\
clash               collide conflict disagree dispute *\
ear                 head spike auricle concha heed *\
ice                 frost rime glacier sherbet *\
allocate            deal ration apportion divide *\
convict             condemn find guilty doom *\
espionage           intelligence investigation spying *\
cord                string rope band bond twine *\
core                center interim heart nucleus *\
cork                bung plug stopper *\
discount            rebate allow reduce lessen diminish *\
invaluable          inestimable priceless dear *\
plug                stopper cork dowel secure obstruct *\
census              enumeration count *\
choke               strangle suffocate garrote stifle *\
surround            encompass enclose besiege embrace *\
trustworthy         faithful reliable responsible honest *\
dinner              supper buffet banquet *\
plus                and additional extra added to *\
twitch              jerk writhe shake pull tug *\
abet                inspire encourage assist incite *\
presence            attendance assemblage residence *\
civil               courteous mannerly polite civic *\
puzzle              bewilder mystery mystify perplex *\
visible             apparent outward perceptible *\
obscene             foul lewd dirty indecent coarse *\
accommodate         help aid comfort arrange supply *\
tribune             dais pulpit rostrum gallery *\
cafeteria           restaurant automat *\
awe                 fear dread wonder *\
infidelity          betrayal treachery adultery unbelief *\
rely                trust depend count on *\
why                 how come for what cause wherefore *\
virgin              maiden celibate chaste pure new *\
synthesis           combination composite construct make *\
head                pate poll chief manager leader *\
medium              mean go between agent agency *\
amateur             nonprofessional beginner *\
heal                mend cure repair restore ease *\
deny                contradict negate refuse doubt *\
heat                warmth ardor fervor temperature *\
hear                hark listen detect perceive *\
heap                pile load stack mound oodles *\
humiliate           abash degrade disgrace mortify *\
admiration          approbation esteem love wonder *\
muster              assemble collect gather mobilize *\
bargain             negotiate pact cheap purchase treat *\
ruined              decadent extinct kaput demolished *\
adore               love worship idolize *\
decorate            blazon deck illustrate adorn gild *\
latch               catch latchet hasp clasp lock *\
adorn               crown deck enrich embelish garnish *\
trim                clip cut pare shave shear tidy *\
fury                rage frenzy violence turbulence *\
sinful              vicious wicked erring immoral *\
believable          credible plausible trustworthy *\
check               control test verify tally count *\
faithful            loyal devoted trustworthy exact *\
inborn              native innate inherent *\
no                  not never none not by any means *\
whereas             inasmuch as since while in view of *\
tip                 capsize upset slant tilt topple *\
setting             location sit locale scene *\
whet                sharpen hone excite stimulate *\
tie                 bond obligation fastening *\
implant             plant embed fix set in instill *\
pseudonym           alias nickname byname *\
eternity            infinity perpetual forever *\
picture             image likeness counterpart *\
reconsider          reexamine review think over or again *\
welter              confusion turmoil jumble mishmash *\
discharge           dismiss deselect retire expel *\
ululate             howl wail cry hoot bark meow *\
bullet              missile shot ball lead slug *\
verve               gusto vivacity dash fervor vigor *\
yacht               sailboat pleasure boat sloop cruiser *\
withhold            keep back restrain detain check *\
fasten              secure make fast attack bind *\
backward            retarded slow underdeveloped *\
coach               teach help tutor train *\
affair              occasion event happening occurrence *\
rob                 plunder pillage steal burglarize *\
rod                 cane wand wicker staff bar *\
focus               point focal point concentration *\
snip                cut slice shear scissor prune trim *\
discern             discover perceive distinguish detect *\
promote             advance further aid improve support *\
passage             permeation road highway street *\
environment         atmosphere aura surroundings habitat *\
charge              attack prosecute require sell for *\
federation          alliance league organization *\
advantage           leverage superior vantage profit *\
impend              threaten hang over approaching *\
unfamiliar          unknown uncommon strange novel new *\
waylay              accost detain attack surprise *\
cook                prepare concoct fix make roast *\
cool                chill refrigerate freeze placid *\
impressive          imposing awesome majestic stately *\
level               horizontal flat even aligned *\
brother             friar cadet kinsman sibling fellow *\
quick               rapid swift brief fast prompt *\
accumulation        mass together addition accretion *\
trend               direction tendency inclination drift *\
obsolete            past extinct outworn disused *\
bake                roast cook harden dry fire *\
fear                phobia timidity fright dread *\
substitute          alternate backup exchange makeshift *\
hymn                song of praise or devotion canticle *\
distaste            aversion dislike *\
stately             impressive majestic regal *\
unripe              premature immature crude *\
spire               steeple point pinnacle peak *\
reply               answer response retort *\
hairy               hirsute furry *\
water               moisture wetness lotion immersion *\
hermetic            airtight waterproof sealed shut *\
fluke               freak miracle *\
entertain           receive welcome amuse divert *\
hoarse              throaty raucous husky thick *\
dissipated          dissolute licentious dispersed *\
noticeable          perceptible prominent observable *\
blotch              spot stain blot blemmish *\
weird               uncanny eerie unearthly *\
navigation          steerage pilotage *\
emerge              issue appear arise come forth *\
morale              spirit cheer nerve courage *\
crisis               juncture emergency *\
concoct             prepare invent devise contrive *\
vivid               striking telling picturesque *\
scan                examine study scrutinize look over *\
ravage              lay waste plunder devastate *\
prey                victim game loot prize spoil *\
memory              retention retrospect thought *\
dismay              consternation terror discouragement *\
muffle              deaden stifle mute dampen swathe *\
employee            servant helper hired hand clerk *\
drown               suffocate submerge inundate muffle *\
dismal              cheerless depressing gloomy somber *\
prophecy            prediction prognosis forecast *\
collision           impact crash clash conflict *\
unruly              unmanageable insubordinate factious *\
ferry               scow lighter raft shuttle *\
pickle              preserve salt brine marinate *\
streak              band stripe smear vein trait *\
overpass            bridge walkway *\
stream              river brook course flow current *\
downfall            drop comedown disgrace demotion *\
avocation           hobby sideline amusement *\
unarmed             weaponless unprepared defenseless *\
critic              judge connoisseur expert reviewer *\
provoke             annoy irritate exasperate excite *\
meager              spare scanty sparse poor lean *\
vital               essential indispensable necessary *\
endorsement         boost signature support sanction *\
levy                assessment tax draft conscription *\
paramount           chief first supreme *\
huge                big immense large mammoth vast *\
impartial           just neutral unbiased unprejudiced *\
clone               copy duplicate exact *\
scoff               jeer deride laugh at *\
liquid              fluid smooth flowing *\
amuse               beguile divert entertain charm *\
inform              acquaint notify snitch tell *\
lagoon              laguna pool pond cove estuary *\
representation      imitation depiction portraiture *\
refund              return give back repay reimburse *\
exclusive           independent sole restricted *\
primitive           primeval aboriginal crude unrefined *\
worship             adoration devotion homage service *\
apex                peak vertex zenith top *\
platform            deck podium stage dias rostrum *\
pervade             fill permeate penetrate imbue *\
farmer              peasant yeomen *\
lonely              lonesome solitary lone desolate *\
cajole              flatter wheedle coax *\
underneath          below beneath underside lower *\
qualified           competent fit limited *\
conquer             overcome subdue subjugate usurp win *\
feature             aspect characteristic film story *\
rescind             overrule revoke remove annul cancel *\
occult              mystic mysterious secret hidden *\
execute             perform do accomplish enforce kill *\
equality            symmetry balance level parity *\
name                reputation fame repute *\
clutch               grip cling to clench *\
academy             college school prepartory school *\
realistic           lifelike faithful graphic similar *\
gape                stare yawn goggle gaze peer *\
torch               light brand arsonist *\
plant               vegetable herb organism flower *\
inopportune         inconvenient untimely unfavorable *\
obsession           preoccupation mania phobia *\
putrid              decomposed decayed rank foul *\
concur              agree assent harmonize coincide *\
profit              advantage benefit interest gain *\
factory             mill works plant branch *\
bless               hallow consecrate praise thank *\
maneuver            artifice stratagem tactic cunning *\
theory              opinion principle postulate idea *\
oasis               waterhole wallow refuge shelter *\
hobble              shackle stump clog fetter *\
flare               blaze up burst into flame shine *\
impose              burden with inflict levy tax *\
gusto               relish verve zest zeal fervor *\
motion              movement kinetics locomotion go *\
turn                rotate revolution twirl twist *\
place               spot point nook area zone *\
swing               oscillate sway pivot turn *\
turf                grass sod lawn sod earth *\
weakling            sissy wimp puny coward crybaby *\
childhood           infancy minority youth *\
origin              beginning cause commencement source *\
feign               simulate pretend counterfeit sham *\
suspend             defer postpone stave off recess *\
clumsy              awkward lumbering bungling *\
array               clothing apparel host arrangement *\
ebb                 recede fall back withdraw *\
district            country quarter region territory *\
plastic             moldable malleable pliant *\
assort              arrange classify mix *\
fortuitous          opportune random casual chance *\
persecute           molest oppress maltreat beset abuse *\
bounty              grant subsidy premium generosity *\
white               cleansed purified wax light fair *\
festivity           picnic rejoice revelry pleasure *\
hue                 color tint shade tone complexion *\
hug                 caress embrace enfold clasp *\
hub                 center midpoint axis focus *\
cope                contend strive deal with face *\
hum                 buzz murmur drone bumble *\
hurtful             harmful lethal injurious bad *\
hut                 shack shanty hogan hovel shelter *\
copy                facsimile counterpart form semblance *\
specify             name mention identify indicate *\
wide                spacious generous ample vast *\
require             demand entail exact stipulate *\
ooze                seep leak filter drip percolate *\
outcome             issue termination end result upshot *\
oath                curse epithet expletive profanity *\
froth               foam lather whisk yeast *\
suspense            anxiety apprehension indecision *\
rent                split payment return rental *\
pry                 peek snoop examine search seek *\
stolid              inexcitable impassive dull lethargic *\
marathon            nonstop continuous arduous long *\
prosperity          welfare success blessings *\
wanderer            nomad vagabond adventurer voyager *\
ideal               model paragon idol perfect example *\
paraphrase          rendering restatement reword alter *\
blunt               dull deaden numb direct brusque *\
surf                sea waves billows spray *\
urge                solicit plead exhort incite push *\
sure                certain positive dependable safe *\
multiple            manifold numerous many *\
tornado             cyclone typhoon hurricane whirlwind *\
betrayal            infidelity treason dishonesty *\
donation            contribution gift present *\
undisciplined       wild chaotic lawless primitive *\
multiply            increase accrue propagate spread *\
annul               abolish override repeal revoke *\
misfire             fail abort sputter backfire *\
later               after latter next since subsequent *\
senior              aged elder major superior *\
quantity            magnitude amplitude numbers amount *\
slope               slant tilt grade ramp ascent *\
forage              fodder feed food pasturage herbage *\
cheat               deceive defraud *\
recipe              formula directions method *\
trespass            sin offend infringe invade *\
hack                chop hew slash cut *\
broach              launch introduce beginning *\
trot                run jog lope hasten *\
favor               good will esteem approval backing *\
gull                dupe victim sucker dope fool *\
crime               offense wrong misdemeanor felony *\
gulp                swallow gulp choke *\
fickle              inconstant unfaithful capricious *\
wood                forest grove timber copse thicket *\
wool                fleece down knitted fluffy *\
lighten             abate bleach unburden uplift *\
jazz                ragtime blues swing *\
tailor              dressmaker seamstress design make *\
dye                 color stain tint tinge *\
hedge               bush fence boundary thicket *\
trade               business profession occupation *\
treachery           dishonor infidelity treason *\
closure             lid lock conclusion finish end *\
reveal              disclose show divulge announce *\
pinnacle            climax peak spire top zenith *\
obliterate          efface erase expunge cancel delete *\
impolite            rude uncivil illmannered *\
naked               uncovered stripped bare unclad *\
picnic              excursion outing festivity cookout *\
imposing            impressive majestic overwhelming *\
prowl               ramble wander roam lurk sneak rove *\
college             school academy university seminary *\
detect              discover find out perceive *\
voluntary           willing willed unforced intentional *\
mortgage            pledge security loan bond borrow *\
generosity          benevolence bounty charity profusion *\
crooked             bent curved angular twisted *\
subsequent          succeeding sequent later ensuing *\
review              reexamine reconsider revise recall *\
definite            exact explicit plain limited *\
outside             exterior outer external *\
hiss                fizz sizzle spit *\
comb                scrape card dress tease search *\
come                arrive reach approach move toward *\
isthmus             connection neck land passage *\
reaction            response revulsion reflex *\
region              area district vicinity domain *\
quiet               peaceful tranquil serene *\
contract            compact agreement promise *\
utterance           publicity voice word declaration *\
adjoin              touch abut border meet *\
duty                liability responsibility allegiance *\
key                 answer solution decipherment tone *\
color               hue tint tinge shade dye cast *\
pot                 crock jug tankard kettle pan *\
colony              settlement community territory *\
period              cycle duration season vintage time *\
insist              state maintain hold to persist *\
resentment          anger discontent spleen *\
approval            consent favor praise sanction *\
endeavor            attempt strive labor aim *\
poll                ballot head vote question enroll *\
peaceful            quiet still armistice concord *\
hardly              scarcely barely improbably rarely *\
umpire              referee arbiter arbitrator *\
direction           hither side trend route way *\
exasperate          anger enrage infuriate irritate vex *\
tasteless           bland stale unsavory dull *\
reimburse           repay compensate refund indemnify *\
blessing            benediction commendation godsend *\
ostentation         display show parade pomp *\
minister            legate teacher priest pastor *\
careful             discreet prudent deliberate fussy *\
irrelevant          inappropriate unfitting unrelated *\
spirit              essence breath temper mood energy *\
pilot               helmsman steersman guide counselor *\
case                instance situation plight sheath *\
shaft               arrow spear beam ray bar *\
amend               change correct rectify *\
mount               ascend rise soar go up climb *\
premature           untimely immature precocious *\
cast                throw toss heave hurl sling fling *\
slippery            elusive shifty slick smooth *\
mound               heap hillock knoll hill *\
vest                endow furnish clothe authorize *\
contrive            concoct do hatch invent devise *\
telephone           call dial get through to *\
unreserved          frank cordial demonstrative *\
author              creator originator writer inventor *\
alphabet            letters abc's *\
bowl                basin vessel dish cup breaker *\
levity              lightness weightlessness airiness *\
careen              sway lean career speed *\
shifty              slippery evasive unreliable tricky *\
hermit              anchorite recluse eremite ascetic *\
status              position standing state *\
applaud             acclaim clap commend ovation cheer *\
refusal             denial resistance snub rebuff *\
weed                root out remove eliminate pest *\
director            manager governor rector controller *\
lamentation         wail complaint murmur mutter groan *\
delicate            dainty fragile frail thin weak *\
statue              sculpture effigy image *\
weep                cry lament wail sob blubber mourn *\
canopy              awning tester vault sky *\
fasting             fast starvation hunger famishment *\
minimize            reduce lessen belittle *\
recital             concert tale presentation musical *\
without             outside beyond absent *\
relief              easement alleviation mitigation *\
inability           impotence incapacity powerless *\
termination         end outcome finish close *\
model               prototype pattern mockup copy *\
reward              recompense prize tribute bonus tip *\
justify             aquit absolve excuse clear *\
clod                lout dolt fool sod soil dirt *\
desolate            bleak barren inhospitable lonely *\
when                at what time whereupon whenever *\
clot                lump clump blob coagulate thicken *\
lavish              prodigal profuse bountiful liberal *\
violent             furious intense strong forceful *\
cease               stop desist discontinue end *\
polish              sheen luster shine glaze gloss *\
blow                jab pant puff stroke wind *\
blot                stain blemish spot sully smear *\
hint                suggestion allusion imply tip *\
blob                drop bubble lump *\
disrupt             disorganize disturb upset mess up *\
kingdom             realm territory domain empire *\
holding             retention tenure impeding stopping *\
acute               severe sharp astute *\
snore               wheeze bale zzz *\
particle            speck iota bit atom molecule *\
sanity              soundness reason rationality *\
snort               grunt snortle guffaw laugh *\
friar               brother monk abbot father *\
tower               fortress castle belfry spire *\
node                difficulty nodus protuberance *\
deduct              remove subtract discount reduce *\
subsidize           aid support promote finance back *\
deduce              infer conclude derive reason *\
shortcoming         deficit fault shortage lapse *\
table               board slab desk counter *\
intact              whole unimpaired uninjured perfect *\
slice               cut slash carve shave skive *\
mood                temper humor disposition *\
renounce            forsake recant repudiate waive *\
slick               glossy shiny slippery greasy *\
jiggle              fidget twitch agitate *\
moon                satellite month lunation *\
nutty               nutlike meaty rich tasty *\
compulsion          force pressure drive need *\
poem                lyric ode poetry song sonnet *\
inspect             examine scrutinize investigate *\
slaughter           butchering massacre carnage murder *\
update              make current revise *\
voracious           insatiable ravenous greedy gross *\
prattle             babble chatter gabble drivel *\
on                  forward onward ahead progress *\
subdued             meek mellow tame *\
jeer                sneer scoff taunt gibe *\
stand               tolerate endure support persist *\
doze                snooze nap drowse repose *\
tribe               race people sect group society *\
communication       message speech tongue talk *\
determine           decide resolve end settle answer *\
disposed            prone willing inclined prone apt *\
strict              exact precise rigid accurate *\
carouse             feast revel debauch drink *\
mischief            harm injury trouble *\
jug                 bottle urn pitcher flagon tankard *\
regard              consider deem observe respect *\
cabinet             room boudoir chamber closet *\
strenuous           hard uphill vigorous ardent *\
jut                 protrude project overhang *\
rouse               waken arouse stir excite incite *\
fabricate           build construct manufacture invent *\
incise              cut etch dissect split *\
preside             supervise control direct manage *\
feeler              antenna tentacle palpus probe trial *\
grasp               hold clasp seize comprehend *\
sleazy              flimsy tacky shoddy cheap poor *\
grass               lawn greenery turf sod *\
taste               delicacy flair flavor palatable *\
frighten            startle terrify scare cow *\
tasty               savory appetizing palatable *\
encompass           encircle surround include *\
incorrect           wrong erroneous fallacious false *\
abyss               abysm deep chasm pit chaos *\
onerous             difficult troublesome burdensome *\
deserve             merit be worthy of entitled to *\
compel              actuate enforce impress oblige *\
idiom               dialect language phrase *\
heathen             pagan infidel unbeliever *\
trash               rubbish garbage refuse litter junk *\
deviation           swerving deflection diversion *\
separate            divide disunite disconnect part *\
symbol              token emblem mark badge *\
flower              bloom blossom best pick *\
nucleus             center heart core kernel basis *\
serious             grave momentous solemn earnest *\
spouse              mate consort husband wife *\
applause            clapping praise ovation approbation *\
wife                mate spouse helpmate married woman *\
invest              endue clothe array surround *\
curve               arc arch vault crescent bow *\
fizzle              fizz effervesce bubble foam *\
treason             betrayal disloyalty treachery *\
apparel             array clothing attire garb *\
platter             tray dish plate trencher *\
all                 entire every whole complete *\
lace                cord lacing braid ornament *\
lack                want deficiency shortage need *\
dish                bowl plate platter china *\
follow              go or come after succeed pursue *\
disk                floppy disk hard disk circle frisbee *\
glimpse             glance see briefly *\
wanton              lewd loose immoral wild perverse *\
catastrophe         calamity disaster upheaval cataclysm *\
homage              respect tribute honor deference *\
extraneous          foreign alien exterior external *\
program             playbill agenda forecast outline *\
crest               crown tuft topknot comb summit *\
woman               female lady gentlewoman wife *\
song                lyric ballad poem music *\
far                 remote distant far off afar *\
induce              cause incite infer *\
print               impress compose impose revise *\
fan                 enthusiast supporter rooter follower *\
awful               horrible dreadful *\
ticket              notice record license label *\
fad                 craze rage vogue fancy hobby *\
induct              inaugurate install *\
stimulus            impetus incentive spur stimulant *\
list                catalog record directory *\
trench              ditch dugout furrow *\
wilt                droop sag weaken languish wither *\
manslaughter        homicide murder killing *\
tea                 broth pekoe souchong *\
rate                ratio percent degree proportion *\
design              plan intention scheme project *\
disfigure           deface mar mutilate blemish *\
sue                 prosecute beg solicit request court *\
hesitation          indecision pause vacillation *\
sun                 light star sol iluminator *\
sum                 amount lot value worth *\
whimper             cry whine lament *\
crust               coat rind pastry scar *\
brief               short succinct terse quick fleeting *\
crush               press mash squash squeeze *\
version             rendition account translation *\
intersect           cut bisect interrupt meet cross *\
row                 paddle scull oar *\
christian           believer gentile church-man *\
tragedy             drama disaster calamity catastrophe *\
thrift              economy frugality saving growth *\
miniature           diminutive minuscule minute *\
dismiss             send away discharge liberate *\
clique              oligarchy party clan club faction *\
jehovah             god creator almighty *\
snug                cozy comfortable compact neat *\
proceed             continue progress advance *\
faint               swoon lose heart or courage weaken *\
irritate            annoy provoke vex irk exasperate *\
rustic              homely rural pastoral pleasant *\
unthinkable         inconceivable unbelievable *\
minor               lesser inferior secondary *\
flat                level smooth even exact dull *\
flaw                imperfection defect fault error *\
flap                tab fly lap tag fold *\
flag                banner pennant *\
stick               stab puncture prick put thrust *\
amputate             sever disjunction *\
known               observed disclosed revealed noted *\
mellow              soft rich ripe subdued delicate *\
glad                happy content cheerful joyful *\
parable             allegory analogy fable comparison *\
primate             ape monkey chief leader master *\
ineffectual         futile lame impotent unable to *\
excursion           expedition outing trip voyage *\
division            class section separation *\
imitation           mockery simulation pretense sham *\
arise               get up awake originate begin *\
pond                lagoon lake pool *\
cultivate           farm till work grow develop *\
allege              state assert affirm imply accuse *\
offspring           children descendants family line *\
court               address bench forum yard *\
goal                object end aim ambition *\
ordinance           law mandate rule statute *\
irrigate            moisten flood flush *\
goad                prick stab prod poke incite impel *\
bawdy               coarse ribald gross lewd *\
abdicate            relinquish withdraw resign discard *\
emulate             rival vie compete strive contend *\
reflect             throw back imitate echo meditate *\
catalog             list index register *\
disable             incapacitate cripple damage unfit *\
adventure           enterprise undertaking event risk *\
numb                unfeeling deadened frozen dazed *\
palpitate           beat pulse throb vibrate quake *\
meticulous          minute particular fastidious precise *\
departure           leaving parting outset start *\
artful              cunning skillful *\
shore               coast beach coastline seaside *\
shade               shadow umbrage gloom darkness *\
essence             being substance element entity *\
mission             errand task assignment *\
flaunt              parade display brandish *\
style               form manner method fashion *\
glide               float flow skim slip slide *\
pray                implore ask beg request petition *\
inward              inside private interior incoming *\
sale                selling auction barter closeout *\
mattress            bedding tick bolster pallet *\
harmless            innocent innocuous inoffensive *\
bout                contest match turn round *\
might               power force strength *\
alter               change modify revise tamper vary *\
somebody            one someone person individual *\
unrefined           crude raw natural native *\
framework           anatomy form skeleton core *\
belittle            run down disparage deprecate *\
accumulate          amass gather aggregate collect *\
unconfined          unrestrained free unhampered *\
inherent            inborn internal native innate *\
intolerable         beyond endurance unbearable *\
weight              burden pressure influence power *\
expect              anticipate await wair for hope for *\
inflict             burden trouble punish impose *\
wager               bet stake gamble hazard risk *\
loll                lounge lie down sprawl *\
health              vim vigor vitality strength hygiene *\
hill                grade slope rise ascent elevation *\
paradise            promised land eden garden or park *\
fiber               cloth strand thread cord *\
solvent             responsible reliable soluble *\
gut                 burn out lay waste demolish *\
forgive             excuse pardon remit exonerate *\
disinfect           sterilize sanitize purify fumigate *\
attendant           nurse page yeomen servant *\
generate            make produce proliferate breed *\
guest               visitor company caller *\
thread              filament string yarn *\
stampede            panic rout bolt dash flight *\
prejudice           partiality bias opinion *\
circuit             circle compass itinerary cycle *\
consequence         effect end result sequel outcome *\
feed                eat dine consume devour graze *\
unhealthy           sickly infirm ailing delicate *\
radical             fundamental extreme drastic *\
fancy               imagination idea caprice whims *\
sympathy            understanding accord compassion *\
sailor              seaman mariner *\
revolution          orbit turn revolt rebellion *\
construct           build fabricate frame synthesis *\
blank               empty unfilled vacant vacuous *\
bland               mild unflavored tasteless *\
traveler            tourist tramp voyager wanderer *\
moan                wail sign groan bewail *\
story               tale yarn report account *\
temperature         climate heat warmth condition *\
leading             first foremost front head *\
leash               leader throng restrain *\
swarm               group crowd multitude horde colony *\
storm               spate blizzard outburst assault *\
store               accumulate hoard lode provisions *\
untold              unknown unrevealed countless *\
option              choice preference discretion right *\
pump                draw inflate question interrogate *\
fidget              toss squirm twitch twiddle *\
vindication         justification reply defense *\
officiate           preside serve supervise direct *\
king                ruler monarch emperor royalty *\
kind                class type breed nature character *\
throttle            choke strangle suffocate silence *\
vial                flask vessel test tube *\
double              twofold duplicate duplex dual *\
stall               evade stand still bog down delay *\
dank                damp humid moist *\
stale               rancid tasteless flat *\
amass               collect accumulate pile up *\
outstanding         prominent exceptional remarkable *\
strengthen          brace encourage fortify reinforce *\
shrewd              clever keen cunning wily sharp *\
decadent            ruined fallen depraved debauched *\
engulf              swamp flood immerse engorge *\
cognizant           sensible aware conscious *\
gall                bitterness bile rancor impudence *\
remodel             rearrange rebuild modernize renovate *\
moist               clammy damp humid wet *\
electric            voltaic magnetic thrilling exciting *\
any                 a some each either whatever *\
pillage             plunder ransack rob sack vandalism *\
eruption            rash outbreak discharge expulsion *\
cigarette           smoke regular coffin nail *\
nothing             zero cipher nought blank *\
prestige            repute dignity fame importance *\
constitution        nature disposition code charter *\
mineral             metal oil stone ore *\
forerunner          herald pioneer scout messenger *\
hindrance           obstruction stoppage interruption *\
saloon              bar tavern cabin bistro *\
notch               nick gash score groove *\
liberate            dismiss extricate release rescue *\
barter              exchange interchange trade dealer *\
lay                 put place deposit *\
fond                affectionate tender foolish *\
melody              tune theme song aria music *\
font                fountain spring source type face *\
stubble             remnants stumps beard bristles *\
aggravate           worsen intensify irritate *\
grotesque           strange unnatural abnormal odd *\
penalty             retribution punishment penance *\
hip                 wise with it cool on to *\
publicity           notoriety limelight utterance *\
invoke              plead beg summon wish conjure *\
babble              chatter prattle gossip rave *\
whistle             pipe flute high pitched sound *\
avarice             greed desire *\
deaden              blunt muffle stun stupefy *\
winsome             gay merry lively charming *\
fallible            unreliable untrustworthy *\
voracity            gluttony edacity rapacity greed *\
timeless            endless perpetual everlasting *\
investigate         inquire examine question search *\
activity            wakefulness liveliness haste *\
cringe              cower stoop flinch wince shrink *\
relentless          pitiless merciless implacable *\
signify             show declare pretend mean indicate *\
dump                drop discharge unload jettison *\
intelligence        espionage tidings discernment ability*\
arc                 arch curve *\
bare                empty unfurnished simple *\
bark                covering rind skin shell yelp yap *\
arm                 limb member branch wing weapon *\
visualize           picture envision imagine project *\
various             different many several numerous *\
numerous            many myriad plentiful various *\
sole                only one single unique exclusive *\
denomination        cult party sect catagory group *\
succeed             follow come after displace supplant *\
opposition          contrast enmity opponent resistance *\
competent           able capable qualified fit *\
prelude             preface foreword prologue introduce *\
inertia             stillness laziness lethargy *\
license             charter ticket permit authorize *\
oversee             manage superintend direct command *\
interrogate         ask quiz pump cross-examine *\
context             setting background position *\
cynic               misanthrope pessimist *\
reside              live dwell abide sojourn *\
sloth               laziness idleness slowness *\
flier               aviator aeronaut airman astronaut *\
distress            discomfort pain trouble affliction *\
sweet               confection candy lush charming *\
sweep               brush clean vacuum push drive *\
improper            indecent bawdy lewd wrong inapt *\
rave                bluster storm rant tear ramble *\
acrid               pungent tang raciness strong taste *\
bolster             support sustain prop reinforce *\
decline             droop slant slope decadence aging *\
overlook            command oversee direct ignore skip *\
due                 merit unpaid collectable owing *\
strategy            method plan maneuvering artifice *\
brick               block adobe clay loaf bar *\
affectionate        fond tender loving tender warm *\
referee             arbitrator umpire conciliator *\
flight              decampment escape course *\
goodly              considerable sizable excellent *\
cinch               girth certitude sure thing *\
demand              require charge levy exact claim *\
instructor          guide tutor professor lecturer *\
shove               push urge thrust force crowd *\
batch               baking set series run lot *\
corrode             consume gnaw rust decay wear *\
barricade           fence fortify obstacle barrier *\
incognito           concealed not known hidden *\
identical           same twin alike indistinguishable *\
ecstasy             rapture joy bliss exaltation frenzy *\
rim                 edge border margin curb brink *\
impersonate         pose as imitate mimic personify *\
quail               shrink cower recoil flinch *\
twofold             double dual twice twin *\
provisions          store wares preparation outline *\
shirk               evade slack neglect shun *\
prerequisite        requirement essential necessity *\
sliver              splinter slice chip fragment *\
restraint           inhibition control rein restriction *\
negotiate           accomplish arrange bargain *\
cement              mortar concrete grout paste *\
impede              obstruct retard stop deter *\
robust              vigorous healthy lusty strong *\
knack               adeptness ability aptitude *\
lower               debase humble reduce depress *\
try                 essay endeavor attempt undertake *\
persuasive          inducive cogent convincing logical *\
analysis            breakdown separation investigation *\
cheer               animate hearten morale applause *\
edge                verge brink brow brim curb margin *\
knot                snarl tangle problem cluster group *\
inactive            inanimate passive slow sluggish *\
turbulence          disorder violence unrest *\
vigilant            alert wary watchful unsleeping *\
prince              monarch ruler sovereign nobleman *\
profitable          lucrative paying advantageous *\
tablet              slab stone memorial slate *\
observant           attention heedful regardful *\
internal            inner enclosed innate inherent *\
exhibition          display exposition showing spectacle *\
reinstate           restore put back rehabilitate *\
complaint           accusation charge disease *\
advocate            favor plead support suggest *\
unlimited           undefined indefinite boundless *\
moody               capricious variable gloomy sad *\
rotate              turn gyration circulation pivot *\
confront            face oppose resist brave *\
incidental          secondary minor casual chance *\
ignore              overlook pass by disregard slight *\
collect             gather collate assemble amass *\
distrust            doubt suspicion disbelief *\
unstable            irregular fluctuating unsteady *\
entice              allure decoy lure seduce tempt *\
essential           necessary requirement vital *\
ecology             conservation ecosystem autecology *\
emanate             effuse exhale radiate flow proceed *\
litter              disorder scraps bedding stretcher *\
selfishness         egotism vanity self-interest *\
prop                support brace assistant helper *\
inoculate           vaccinate variolate immunize infect *\
prod                shove goad prick spur jab *\
conversant          acquainted skilled versed proficient *\
zombie              dunce chump clod monster nut *\
aloft               on high overhead above *\
tinker              blunderer bungler mend repair botch *\
consolation         condolence solace symphathy *\
elixir              broth drug potion compound *\
intense             violent sharp strong passionate *\
cautious            shy wary careful watchful *\
ordeal              trial strain cross test *\
range               row series chain extent scope *\
repulsion           rejection spurning aversion *\
credible            believable truthful trustworthy *\
conquest            success victory triumph prevail *\
heedless            inconsiderate reckless careless rash *\
xanthic             yellowish fulvous tawny *\
artifice            trick stratagem ruse device cunning *\
vagabond            hobo tramp vagrant wanderer beggar *\
acquiesce           assent agree consent concur *\
tumble              fall roll leap spring overturn *\
lone                solitary lonely single desolate *\
fast                starve abstain swift speedy rapid *\
etch                engrave carve scratch incise *\
mundane             worldly earthy temporal *\
plunge              dip submerge dive sink fall *\
glamour             charm romance enchantment allure *\
cloth               material stuff fabric fiber *\
crank               handle winder key quirk fanatic *\
usurp               seize expropriate conquer annex *\
upright             vertical perpendicular erect noble *\
outpost             sentry scout border frontier *\
mystify             puzzle perplex bewilder obscure *\
hush                silence quiet stillness calm *\
consist             lie reside comprise include *\
characteristic      feature like trait typical *\
seize               grasp clutch capture arrest *\
x-ray               roentgen ray radiation radiograph *\
individuality       identity personality distinctiveness *\
freak               abnormality fluke monstrosity *\
warning             caution notice alarm admonition *\
tentative           experimental provisional conditional *\
endurance           intolerable resistance persistance *\
peace               amity friendship harmony quiescence *\
income              revenue dividends interest earnings *\
ferment             yeast leaven uproar turmoil *\
mock                ridicule mimic tantalize jeer at *\
nice                pleasing agreeable attractive *\
backbone            spine support fortitude resolution *\
inflame             anger excite arouse incite heat up *\
meaning             gist implication import point sense *\
puncture            perforate prick stab stave stick *\
vigil               watch surveillance wake *\
wrinkle             crease crinkle fold pleat pucker *\
vice                viciousness wickedness sin crime *\
remit               forgive pardon excuse exempt *\
impatient           eager hurried restless anxious *\
scroll              list roll memorial *\
weighty             ponderous heavy burdensome *\
once                formerly previously latterly past *\
pervert             distort twist debase corrupt *\
resistance          opposition stand refusal endurance *\
alien               foreign strange immigrant stranger *\
dispel              chase dissipate disperse deploy *\
gang                crew horde band troops *\
uphold              maintain sustain advocate encourage *\
stable              immobile sound solid deep-rooted *\
breach              break opening gap rupture *\
include             consist contain involve embody *\
abode               dwelling residence house lodging *\
ladle               scoop spoon dip skimmer *\
spool               spindle bobbin reel *\
spoon               ladle dip dunce blockhead *\
foretell            presage portend forecast predict *\
artery              vessel vein channel passage *\
spoof               jest joke banter hoax *\
posture             pose attitude bearing mood *\
outdo               excel exceed surpass *\
pleat               plait corrugation wrinkle fold *\
sensation           feeling perception impression *\
fold                crease bend lapping plait wrinkle *\
reunion             gathering assembling *\
protrude            jut bulge extend project *\
inaccurate          erroneous fallacious incorrect wrong *\
hourly              frequent continual on the hour *\
relent              soften yield submit *\
capital             excellent first-rate primary *\
cozy                snug comfortable homey warm plush *\
degree              graduate peg rate step interval *\
explore             seek search fathom prospect *\
separation          section severance cut division *\
chaste              virtuous pure undefiled clean *\
shovel              dig spade take up move *\
deputy              agent representative delegate *\
forbid              prohibit inhibit interdict ban *\
ensign              flag badge emblem insignia *\
apt                 likely suitable appropriate *\
hardy               sturdy tough vigorous resolute *\
motor               engine center of power *\
apply               put or lay on use ask request *\
use                 exercise application function usage *\
fee                 payment dues tax gratuity tip *\
lottery             raffle draw lotto allotment fortune *\
figure              form shape configuration *\
germ                microorganism seed embryo microbe *\
few                 not many little scanty meager *\
examination         autopsy study test search survey *\
unspoiled           perfect intact whole untouched *\
sort                class kind variety group category *\
clever              adroit skillful talented adept *\
porch               balcony terrace entrance stoop *\
impress             stamp mark imprint inspire compel *\
sore                painful tender sensitive *\
recount             tell recite repeat relate narrate *\
brochure            pamphlet booklet leaflet tract *\
paralleled          compared likened matched *\
augment             increase enlarge extend expand *\
linger              delay dally loiter dawdle wait *\
stroke              blow impact throb seizure *\
column              pillar shaft article byline *\
lumber              wood logs timber planks boards *\
dissolve            disband melt thaw vanish *\
refine              purify cleanse educate improve *\
tap                 knock rap touch faucet spigot *\
tar                 asphalt pitch resin blacken *\
tax                 assessment levy duty tariff rate *\
rapt                ecstatic absorbed engrossed *\
villain             blackguard rascal rogue badman *\
tag                 flap label tab tally *\
something           thing object anything matter part *\
tab                 tag strip label bill cost *\
devastate           lay waste ravage desolate pilage *\
serial              sequential continuous ordered ranked *\
rape                seize plunder seduce debauch *\
counterfeit         false sham fake forged bogus *\
sip                 drink taste siphon suck *\
syndrome            indication characteristics *\
sit                 perch pose be situated *\
buoyant             light floating resilient *\
patronize           support endorse aid *\
prognosis           prediction prophecy forcaset *\
instead             in place of in lieu of substitute *\
panic               terror fright fear stampede *\
sin                 offense fault error transgress *\
tension             strain pressure tensity anxiety *\
express             utter enunciate represent symbolize *\
maternal            motherly motherlike *\
attend              accompany escort be present listen *\
tact                diplomacy finesse discretion *\
hazard              danger chance risk peril gamble *\
discomfort          distress embarrass pain trouble *\
tack                thumbtack change of course veer yaw *\
light               ray stream sun airy giddy nimble *\
arduous             onerous wearisome *\
budge               move stir shift alter change *\
tenure              holding occupancy habitation *\
beguile             deduce deceive amuse divert *\
quake               agitation earthquake shudder *\
obeisance           homage deference obedience bow *\
superior            advantage summit sovereign *\
complicate          involve embarrass confuse perplex *\
glee                cheerfulness delight joy merriment *\
nostalgia           homesickness regret wistfulness *\
restrain            curb deter leash stint suppress *\
choose              call decide elect prefer select *\
holiday             vacation festival recreation *\
originator          author founder pioneer *\
crash               collision shock smash collapse *\
contention          contest feud strife struggle *\
material            bodily corporeal cloth fabric *\
ambition            purpose wish hope desire *\
flee                run away fly abscond *\
crass               coarse crude gross unrefined *\
profound            learned heavy weighty *\
edit                redact revise arrange correct *\
feast               banquet spread repast holiday *\
fiddle              violin trifle unimportance trivial *\
trap                pitfall snare net ambush catch *\
dogmatic            dictorial imperious arrogant *\
tray                plate platter dish *\
unbelievable        incredible unthinkable farfetched *\
related             analogous kin recounted stated said *\
sob                 weep cry sigh moan lament *\
proclaim            announce declare broadcast circulate *\
tabulate            chart graph list catalog *\
out                 without outside outdoors *\
category            class status place *\
acknowledgment      note thanks recognition affirm *\
frontier            border outpost edge verge limit *\
disarray            confusion disorder *\
chaos               disorder confusion jumble abyss *\
impart              share lend tell disclose *\
honorable           conscientious sound noble justly *\
sacrifice           oblation offering self-denial *\
disclose            expose reveal uncover unmask unveil *\
dictionary          word list lexicon encyclopedia *\
utensil             implement instrument container *\
promptly            readily soon on time punctually *\
usual               customary ordinary everyday *\
yore                antiquity old times olden days *\
tenant              occupant occupier resident *\
greenhorn           freshman rookie apprentice novice *\
comrade             friend companion fellow associate *\
overtake            catch outrun reach catch up with *\
illicit             illegal clandestine secret *\
uproot              abolish destroy eradicate *\
wistful             musing pensive desirous eager *\
embryo              egg germ fetus nucleus *\
bulky               big hefty massive huge *\
bouquet             fragrance perfume aroma corsage *\
echo                reverberate resound reply repeat *\
droop               decline sag slouch wilt wither *\
unknown             incognito unfamiliar unrecognized *\
accent              accentuate emphasize stress tone *\
inmate              prisoner tenant occupant *\
badness             evil mischief malevolence *\
boil                churn seethe simmer cook *\
inner               inward private concealed inside *\
shell               bomb pepper attack shrapnel *\
unceasing           continuous uninterrupted perpetual *\
shelf               ledge mantle reef *\
reversed            converse retrograde turned around *\
simulate            imitate resemble mimic feign *\
diminish            lessen reduce shrink abridge wane *\
riches              treasure wealth fortune money *\
probe               fathom feeler quest snoop *\
arouse              rouse awaken stir excite *\
elongate            lengthen extend string out *\
indistinct          inaudible imperceptible unclear *\
sculpture           carving statue sculpting cast *\
clip                cut snip scissor trim shorten *\
fowl                bird hen stewing chicken *\
unbearable          unendurable odious insufferable *\
angle               corner aspect guise point of view *\
rout                stampede panic defeat repulse *\
agency              operation working power office *\
contour             outline profile shape form *\
divert              amuse beguile entertain *\
vegetation          flora greenery verdure *\
combat              battle conflict oppose resist *\
who                 which one *\
harmful             injurious hurtful *\
filch               pilfer poach snitch steal swipe *\
delve               dig spade search probe examine *\
class               division category head section *\
clasp               clamp cuddle embrace grasp clutch *\
statute             law ordinance enactment *\
discourage          depress dishearten dismay deter *\
pipe                passage tube main briar *\
typical             symbolic characteristic model *\
inane               pointless senseless silly vacuous *\
tidings             news message intelligence *\
utter               total complete speak voice issue *\
spindle             axis axle shaft stem *\
feat                deed accomplishment exploit *\
debate              argument dispute controversy forum *\
lariat              rope lasso line riata *\
manacle             fetter shackle handcuff *\
cache               hiding place stash *\
reign               rule govern command influence *\
local               restricted narrow native *\
vigor               force might vim power strength *\
prosecute           urge pursue follow continue charge *\
cube                solid square die dice *\
topple              fall over tumble plunge fail upset *\
massacre            carnage slaughter mass murder *\
penetrate           bore burrow pierce enter cut *\
spur                spine incentive goad stimulus *\
swindle             defraud hoax cheat trick victimize *\
onesided            unfair biased partial *\
thrive              prosper succeed grow flourish *\
view                sight panorama vista scene *\
unison              harmony concord agreement union *\
requirement         want necessity essential urgency *\
humiliation         indignity scandal shame *\
expel               eject extrude excrete discharge *\
admonition          reproof caution warning *\
vocation            profession work trade occupation *\
carriage            bearing chariot buggy surrey coach *\
superb              magnificent impressive excellent *\
genius              spirit pixy brilliance intelligence *\
crude               rough raw unfinished imperfect *\
rendition           rendering execution performance *\
pants               trousers breeches slacks jeans *\
avow                declare confess assert *\
ability             aptitude skill capability talent *\
opening             hole aperture breach *\
joy                 rejoicing pleasure happiness delight *\
job                 work occupation position duty *\
hypothesis          postulate supposition surmise *\
spoil               damage ruin impair plunder pillage *\
jog                 jiggle push trot amble *\
swift               quick rapid fast speedy *\
hobo                tramp drifter vagabond vagrant *\
duplex              double dual *\
grain               grit cereal seed grist kernel *\
retrograde          retreating reversed decadent *\
murder              homicide manslaughter killing *\
wall                side partition bulkhead flange *\
walk                ramble stroll promenade wander *\
worldly             terrestrial secular materialistic *\
respect             regards consideration courtesy *\
decent              decorous chaste pure in heart *\
tutor               teacher instructor coach *\
literal             verbatim word for word exact *\
unspoken            implicit tacit inferred understood *\
sufficient          abundance ample enough plenty *\
twinge              twitch shiver tingle pang qualm *\
overture            advance approach proposal bid *\
cryptic             hidden secret occult *\
unmoved             unaffected impassive unshaken *\
overturn            invert upset reverse overthrow *\
present             current existing immediate modern *\
wily                tricky crafty foxy deceitful *\
unlike              dissimilar diverse different *\
sanctify            consecrate bless hallow purify *\
fearful             grim paranoid timid shy *\
align               line up straighten regulate array *\
will                freedom discretion choice option *\
wild                savage untamed fierce uncontrolled *\
supply              provide furnish give contribute *\
layer               stratum zone stage story *\
apprehend           seize arrest grasp perceive *\
dual                duplex twofold double twin binary *\
thug                assassin killer ruffian *\
perhaps             maybe possibly perchance conceivably *\
vintage             crop produce harvest period time *\
cross               crucifix mixture foil oppose *\
unite               coalesce integrate join link merge *\
member              unit element part fellow *\
unity               oneness coherence fusion junction *\
inch                creep crawl edge worm *\
disciple            follower devotee adherent pupil *\
grandeur            greatness show ostentation splendor *\
difficult           hard onerous uphill uneasy struggle *\
slave               victim bondsman bond servant toil *\
tactful             discreet gracious suave civil *\
recline             lie rest couch repose *\
diploma             certification commission franchise *\
outcast             derelict exile castaway leper *\
beast               brute quadruped blackguard animal *\
student             learner pupil apprentice *\
whale               cetacean finback whopper *\
lobby               foyer hall solicit promote pressure *\
gutter              curb ditch spillway trough *\
splint              strip brace splinter *\
whole               total all everything unity integer *\
perpetrate          commit inflict perform do practice *\
spectator           observer onlooker *\
twirl               twist spin rotate turn whirl *\
obtain              acquire set prevail *\
replenish           refill restock renew stock up *\
happiness           bliss joy welfare cheer delight *\
smite               cuff enamor afflict hit *\
rapid               swift speedy fleet prompt quick *\
console             relief support bracket cabinet *\
pendulum            oscillator swing bob pendant *\
point               object meaning significance intent *\
sky                 heavens air firmament *\
discuss             confer discourse argue debate *\
book                novel opus volume folio textbook *\
attractive          cute handsome nice pleasant pretty *\
enact               decree make pass order ordain *\
knob                handle latch hump bump *\
wont                custom use habit routine *\
boon                benefit favor acquisition request *\
myth                legend tradition fantasy fiction *\
term                word period time duration limit *\
know                experience understand recognize *\
presume             impose venture deduce assume *\
press               crush throng crowd pressure urgency *\
helpful             beneficial contributory favorable *\
perpetual           everlasting unceasing eternity *\
vortex              eddy whirlpool storm center *\
conclusion          diagnosis end result completion *\
exceed              transcend surpass excel outdo *\
because             by reason of on account of *\
shabby              dilapidated sorry pitiful rundown *\
sequence            coming after following extension *\
growth              development maturity harvest *\
vicarious           secondhand indirect once removed *\
empire              realm domain imperium sway *\
leaf                frond blade sheet flake page *\
lead                conduct direct precede open start *\
leak                seep ooze escape waste *\
lean                slant incline depend rely tend *\
leap                jump hop spring bound vault *\
noose               hitch catch loop halter *\
leader              guide bellwether director conductor *\
locate              put situate discover find *\
slur                skim skip gloss over ignore slight *\
slum                skid row ghetto tenements *\
paste               cement glue pulp fix repair *\
slug                hit swat belt smash *\
pike                tip point spike spear lance *\
throng              army horde multitude mass crowd *\
rare                scarce sparse unusual choice *\
incline             slant slope tilt pitch lurch *\
extension           expansion prong sequence wing *\
saddle              seat pad panel ridge hump crest *\
hookup              connection junction circuit rigging *\
universe            cosmos celestial sphere sky *\
surge               rise swell seethe sweep rush *\
swear               affirm depose vow testify *\
sweat               perspire run exude secrete drip *\
outset              departure threshold origin source *\
own                 admit confess concede acknowledge *\
wilderness          wilds wasteland badlands *\
owe                 indebted be in debt *\
airtight            hermetic flawless *\
promise             pledge vow oath assurance guarantee *\
brush               broom graze scrape sweep wipe *\
lawful              legal legitimate permissible valid *\
negate              repeal retract cancel counteract *\
grapevine           rumor rumor mill pipeline *\
transfer            displace interchange assign change *\
spiral              coiled winding helical *\
intention           purpose intent view ambition *\
cliff               precipice palisade crag bluff steep *\
beard               stubble whisker imperial goatee *\
nourish             nurture sustain feed foster *\
shank               leg shin shaft stem *\
mutter              gripe growl lamentation *\
volume              book contents capacity bulk mass *\
squeeze             press compress express stuff cram *\
tactics             strategy maneuvering policy method *\
whether             if in case if it is so *\
recede              retrograde retrogress shrink *\
distract            divert confuse bewilder *\
record              note chronicle put in writing attest *\
below               subordinate lower underneath *\
block               hindrance blockage obstruction *\
goodness            good virtue decency honesty *\
mutual              reciprocal common joint *\
incredible          unbelievable inconceivable absurd *\
other               different separate distinct former *\
boom                push boost plug drum *\
sick                ill ailing diseased nauseated *\
repute              dignity fame standing honor glory *\
pantomime           mime mimicry silent film gestures *\
lance               dart spear pike javelin shaft *\
junk                rubbish waste refuse trash wreck *\
frustrate           baffle defeat foil outwit thwart *\
earthly             terrestrial material worldly sensual *\
squeak              creak cry just make it pull through *\
squeal              yell cry yelp shriek *\
extort              elicit extract draw exact wring *\
auxiliary           assistant helper partner accomplice*\
jewel               stone gem diamond ruby*\
";

},{}]},{},[4])
;