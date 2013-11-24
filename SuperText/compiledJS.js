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
/**
 * Fuse - Lightweight fuzzy-search
 *
 * Copyright (c) 2012 Kirollos Risk <kirollos@gmail.com>.
 * All Rights Reserved. Apache Software License 2.0
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
!function(){function Searcher(pattern,options){options=options||{};var MATCH_LOCATION=options.location||0,MATCH_DISTANCE=options.distance||100,MATCH_THRESHOLD=options.threshold||.6,pattern=options.caseSensitive?pattern:pattern.toLowerCase(),patternLen=pattern.length;if(patternLen>32){throw new Error("Pattern length is too long")}var matchmask=1<<patternLen-1;var pattern_alphabet=function(){var mask={},i=0;for(i=0;i<patternLen;i++){mask[pattern.charAt(i)]=0}for(i=0;i<patternLen;i++){mask[pattern.charAt(i)]|=1<<pattern.length-i-1}return mask}();function match_bitapScore(e,x){var accuracy=e/patternLen,proximity=Math.abs(MATCH_LOCATION-x);if(!MATCH_DISTANCE){return proximity?1:accuracy}return accuracy+proximity/MATCH_DISTANCE}this.search=function(text){text=options.caseSensitive?text:text.toLowerCase();if(pattern===text){return{isMatch:true,score:0}}var i,j,textLen=text.length,scoreThreshold=MATCH_THRESHOLD,bestLoc=text.indexOf(pattern,MATCH_LOCATION),binMin,binMid,binMax=patternLen+textLen,lastRd,start,finish,rd,charMatch,score=1,locations=[];if(bestLoc!=-1){scoreThreshold=Math.min(match_bitapScore(0,bestLoc),scoreThreshold);bestLoc=text.lastIndexOf(pattern,MATCH_LOCATION+patternLen);if(bestLoc!=-1){scoreThreshold=Math.min(match_bitapScore(0,bestLoc),scoreThreshold)}}bestLoc=-1;for(i=0;i<patternLen;i++){binMin=0;binMid=binMax;while(binMin<binMid){if(match_bitapScore(i,MATCH_LOCATION+binMid)<=scoreThreshold){binMin=binMid}else{binMax=binMid}binMid=Math.floor((binMax-binMin)/2+binMin)}binMax=binMid;start=Math.max(1,MATCH_LOCATION-binMid+1);finish=Math.min(MATCH_LOCATION+binMid,textLen)+patternLen;rd=Array(finish+2);rd[finish+1]=(1<<i)-1;for(j=finish;j>=start;j--){charMatch=pattern_alphabet[text.charAt(j-1)];if(i===0){rd[j]=(rd[j+1]<<1|1)&charMatch}else{rd[j]=(rd[j+1]<<1|1)&charMatch|((lastRd[j+1]|lastRd[j])<<1|1)|lastRd[j+1]}if(rd[j]&matchmask){score=match_bitapScore(i,j-1);if(score<=scoreThreshold){scoreThreshold=score;bestLoc=j-1;locations.push(bestLoc);if(bestLoc>MATCH_LOCATION){start=Math.max(1,2*MATCH_LOCATION-bestLoc)}else{break}}}}if(match_bitapScore(i+1,MATCH_LOCATION)>scoreThreshold){break}lastRd=rd}return{isMatch:bestLoc>=0,score:score}}}function Fuse(list,options){options=options||{};var keys=options.keys;this.search=function(pattern){var searcher=new Searcher(pattern,options),i,j,item,text,dataLen=list.length,bitapResult,rawResults=[],resultMap={},rawResultsLen,existingResult,results=[],compute=null;function analyzeText(text,entity,index){if(text!==undefined&&text!==null&&typeof text==="string"){bitapResult=searcher.search(text);if(bitapResult.isMatch){existingResult=resultMap[index];if(existingResult){existingResult.score=Math.min(existingResult.score,bitapResult.score)}else{resultMap[index]={item:entity,score:bitapResult.score};rawResults.push(resultMap[index])}}}}if(typeof list[0]==="string"){for(i=0;i<dataLen;i++){analyzeText(list[i],i,i)}}else{for(i=0;i<dataLen;i++){item=list[i];for(j=0;j<keys.length;j++){analyzeText(item[keys[j]],item,i)}}}rawResults.sort(function(a,b){return a.score-b.score});rawResultsLen=rawResults.length;for(i=0;i<rawResultsLen;i++){results.push(options.id?rawResults[i].item[options.id]:rawResults[i].item)}return results}}if(typeof module!=="undefined"){if(typeof module.setExports==="function"){module.setExports(Fuse)}else if(module.exports){module.exports=Fuse}}else{window.Fuse=Fuse}}();
},{}],3:[function(require,module,exports){
/*
Kind of a stopgap measure for the upcoming [JavaScript
Map](http://wiki.ecmascript.org/doku.php?id=harmony:simple_maps_and_sets)

**Note:** due to JavaScript's limitations, hashing something other than Boolean,
Number, String, Undefined, Null, RegExp, Function requires a hack that inserts a
hidden unique property into the object. This means `set`, `get`, `has` and
`delete` must employ the same object, and not a mere identical copy as in the
case of, say, a string.

## Overview example:

```js
var map = new Map({'alice': 'wonderland', 20: 'ok'});
map.set('20', 5); // => 5
map.get('20'); // => 5
map.has('alice'); // => true
map.delete(20) // => true
var arr = [1, 2];
map.add(arr, 'goody'); // => 'goody'
map.has(arr); // => true
map.has([1, 2]); // => false. Needs to compare by reference
map.forEach(function(key, value) {
  console.log(key, value);
});
```

## Properties:

- size: The total number of `(key, value)` pairs.
*/
var Map, SPECIAL_TYPE_KEY_PREFIX, _extractDataType, _isSpecialType,
  __hasProp = {}.hasOwnProperty;

SPECIAL_TYPE_KEY_PREFIX = '_mapId_';

Map = (function() {

  Map._mapIdTracker = 0;

  Map._newMapId = function() {
    return this._mapIdTracker++;
  };

  function Map(objectToMap) {
    /*
        Pass an optional object whose (key, value) pair will be hashed. **Careful**
        not to pass something like {5: 'hi', '5': 'hello'}, since JavaScript's
        native object behavior will crush the first 5 property before it gets to
        constructor.
    */

    var key, value;
    this._content = {};
    this._itemId = 0;
    this._id = Map._newMapId();
    this.size = 0;
    for (key in objectToMap) {
      if (!__hasProp.call(objectToMap, key)) continue;
      value = objectToMap[key];
      this.set(key, value);
    }
  }

  Map.prototype.hash = function(key, makeHash) {
    var propertyForMap, type;
    if (makeHash == null) {
      makeHash = false;
    }
    /*
        The hash function for hashing keys is public. Feel free to replace it with
        your own. The `makeHash` parameter is optional and accepts a boolean
        (defaults to `false`) indicating whether or not to produce a new hash (for
        the first use, naturally).

        _Returns:_ the hash.
    */

    type = _extractDataType(key);
    if (_isSpecialType(key)) {
      propertyForMap = SPECIAL_TYPE_KEY_PREFIX + this._id;
      if (makeHash && !key[propertyForMap]) {
        key[propertyForMap] = this._itemId++;
      }
      return propertyForMap + '_' + key[propertyForMap];
    } else {
      return type + '_' + key;
    }
  };

  Map.prototype.set = function(key, value) {
    /*
        _Returns:_ value.
    */
    if (!this.has(key)) {
      this.size++;
    }
    this._content[this.hash(key, true)] = [value, key];
    return value;
  };

  Map.prototype.get = function(key) {
    /*
        _Returns:_ value corresponding to the key, or undefined if not found.
    */

    var _ref;
    return (_ref = this._content[this.hash(key)]) != null ? _ref[0] : void 0;
  };

  Map.prototype.has = function(key) {
    /*
        Check whether a value exists for the key.

        _Returns:_ true or false.
    */
    return this.hash(key) in this._content;
  };

  Map.prototype["delete"] = function(key) {
    /*
        Remove the (key, value) pair.

        _Returns:_ **true or false**. Unlike most of this library, this method
        doesn't return the deleted value. This is so that it conforms to the future
        JavaScript `map.delete()`'s behavior.
    */

    var hashedKey;
    hashedKey = this.hash(key);
    if (hashedKey in this._content) {
      delete this._content[hashedKey];
      if (_isSpecialType(key)) {
        delete key[SPECIAL_TYPE_KEY_PREFIX + this._id];
      }
      this.size--;
      return true;
    }
    return false;
  };

  Map.prototype.forEach = function(operation) {
    /*
        Traverse through the map. Pass a function of the form `fn(key, value)`.

        _Returns:_ undefined.
    */

    var key, value, _ref;
    _ref = this._content;
    for (key in _ref) {
      value = _ref[key];
      operation(value[1], value[0]);
    }
  };

  return Map;

})();

_isSpecialType = function(key) {
  var simpleHashableTypes, simpleType, type, _i, _len;
  simpleHashableTypes = ['Boolean', 'Number', 'String', 'Undefined', 'Null', 'RegExp', 'Function'];
  type = _extractDataType(key);
  for (_i = 0, _len = simpleHashableTypes.length; _i < _len; _i++) {
    simpleType = simpleHashableTypes[_i];
    if (type === simpleType) {
      return false;
    }
  }
  return true;
};

_extractDataType = function(type) {
  return Object.prototype.toString.apply(type).match(/\[object (.+)\]/)[1];
};

},{}],4:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v1.10.1
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2013-05-30T21:49Z
 */
(function( window, undefined ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+
//"use strict";
var
	// The deferred used on DOM ready
	readyList,

	// A central reference to the root jQuery(document)
	rootjQuery,

	// Support: IE<10
	// For `typeof xmlNode.method` instead of `xmlNode.method !== undefined`
	core_strundefined = typeof undefined,

	// Use the correct document accordingly with window argument (sandbox)
	location = window.location,
	document = window.document,
	docElem = document.documentElement,

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$,

	// [[Class]] -> type pairs
	class2type = {},

	// List of deleted data cache ids, so we can reuse them
	core_deletedIds = [],

	core_version = "1.10.1",

	// Save a reference to some core methods
	core_concat = core_deletedIds.concat,
	core_push = core_deletedIds.push,
	core_slice = core_deletedIds.slice,
	core_indexOf = core_deletedIds.indexOf,
	core_toString = class2type.toString,
	core_hasOwn = class2type.hasOwnProperty,
	core_trim = core_version.trim,

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Used for matching numbers
	core_pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,

	// Used for splitting on whitespace
	core_rnotwhite = /\S+/g,

	// Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	// Match a standalone tag
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

	// JSON RegExp
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	},

	// The ready event handler
	completed = function( event ) {

		// readyState === "complete" is good enough for us to call the dom ready in oldIE
		if ( document.addEventListener || event.type === "load" || document.readyState === "complete" ) {
			detach();
			jQuery.ready();
		}
	},
	// Clean-up method for dom ready events
	detach = function() {
		if ( document.addEventListener ) {
			document.removeEventListener( "DOMContentLoaded", completed, false );
			window.removeEventListener( "load", completed, false );

		} else {
			document.detachEvent( "onreadystatechange", completed );
			window.detachEvent( "onload", completed );
		}
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: core_version,

	constructor: jQuery,
	init: function( selector, context, rootjQuery ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// scripts is true for back-compat
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	},

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return core_slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	},

	slice: function() {
		return this.pushStack( core_slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: core_push,
	sort: [].sort,
	splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
	var src, copyIsArray, copy, name, options, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	// Non-digits removed to match rinlinejQuery
	expando: "jQuery" + ( core_version + Math.random() ).replace( /\D/g, "" ),

	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( !document.body ) {
			return setTimeout( jQuery.ready );
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		/* jshint eqeqeq: false */
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		if ( obj == null ) {
			return String( obj );
		}
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ core_toString.call(obj) ] || "object" :
			typeof obj;
	},

	isPlainObject: function( obj ) {
		var key;

		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!core_hasOwn.call(obj, "constructor") &&
				!core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Support: IE<9
		// Handle iteration over inherited properties before own properties.
		if ( jQuery.support.ownLast ) {
			for ( key in obj ) {
				return core_hasOwn.call( obj, key );
			}
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.
		for ( key in obj ) {}

		return key === undefined || core_hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	// data: string of html
	// context (optional): If specified, the fragment will be created in this context, defaults to document
	// keepScripts (optional): If true, will include scripts passed in the html string
	parseHTML: function( data, context, keepScripts ) {
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			keepScripts = context;
			context = false;
		}
		context = context || document;

		var parsed = rsingleTag.exec( data ),
			scripts = !keepScripts && [];

		// Single tag
		if ( parsed ) {
			return [ context.createElement( parsed[1] ) ];
		}

		parsed = jQuery.buildFragment( [ data ], context, scripts );
		if ( scripts ) {
			jQuery( scripts ).remove();
		}
		return jQuery.merge( [], parsed.childNodes );
	},

	parseJSON: function( data ) {
		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		if ( data === null ) {
			return data;
		}

		if ( typeof data === "string" ) {

			// Make sure leading/trailing whitespace is removed (IE can't handle it)
			data = jQuery.trim( data );

			if ( data ) {
				// Make sure the incoming data is actual JSON
				// Logic borrowed from http://json.org/json2.js
				if ( rvalidchars.test( data.replace( rvalidescape, "@" )
					.replace( rvalidtokens, "]" )
					.replace( rvalidbraces, "")) ) {

					return ( new Function( "return " + data ) )();
				}
			}
		}

		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		var xml, tmp;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && jQuery.trim( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Use native String.trim function wherever possible
	trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				core_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				core_push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( core_indexOf ) {
				return core_indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}
		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var retVal,
			ret = [],
			i = 0,
			length = elems.length;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return core_concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var args, proxy, tmp;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = core_slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( core_slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, raw ) {
		var i = 0,
			length = elems.length,
			bulk = key == null;

		// Sets many values
		if ( jQuery.type( key ) === "object" ) {
			chainable = true;
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
			}

		// Sets one value
		} else if ( value !== undefined ) {
			chainable = true;

			if ( !jQuery.isFunction( value ) ) {
				raw = true;
			}

			if ( bulk ) {
				// Bulk operations run against the entire set
				if ( raw ) {
					fn.call( elems, value );
					fn = null;

				// ...except when executing function values
				} else {
					bulk = fn;
					fn = function( elem, key, value ) {
						return bulk.call( jQuery( elem ), value );
					};
				}
			}

			if ( fn ) {
				for ( ; i < length; i++ ) {
					fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
				}
			}
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	},

	// A method for quickly swapping in/out CSS properties to get correct calculations.
	// Note: this method belongs to the css module but it's needed here for the support module.
	// If support gets modularized, this method should be moved back to the css module.
	swap: function( elem, options, callback, args ) {
		var ret, name,
			old = {};

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.apply( elem, args || [] );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	}
});

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		// Standards-based browsers support DOMContentLoaded
		} else if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );

		// If IE event model is used
		} else {
			// Ensure firing before onload, maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", completed );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", completed );

			// If IE and not a frame
			// continually check to see if the document is ready
			var top = false;

			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if ( top && top.doScroll ) {
				(function doScrollCheck() {
					if ( !jQuery.isReady ) {

						try {
							// Use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							top.doScroll("left");
						} catch(e) {
							return setTimeout( doScrollCheck, 50 );
						}

						// detach all dom ready events
						detach();

						// and execute any waiting functions
						jQuery.ready();
					}
				})();
			}
		}
	}
	return readyList.promise( obj );
};

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || type !== "function" &&
		( length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj );
}

// All jQuery objects should point back to these
rootjQuery = jQuery(document);
/*!
 * Sizzle CSS Selector Engine v1.9.4-pre
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2013-05-27
 */
(function( window, undefined ) {

var i,
	support,
	cachedruns,
	Expr,
	getText,
	isXML,
	compile,
	outermostContext,
	sortInput,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	hasDuplicate = false,
	sortOrder = function() { return 0; },

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:([*^$|!~]?=)" + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments quoted,
	//   then not containing pseudos/brackets,
	//   then attribute selectors/non-parenthetical expressions,
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + attributes.replace( 3, 8 ) + ")*)|.*)\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rsibling = new RegExp( whitespace + "*[+~]" ),
	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			// BMP codepoint
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && context.parentNode || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * For feature detection
 * @param {Function} fn The function to test for native support
 */
function isNative( fn ) {
	return rnative.test( fn + "" );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key += " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied if the test fails
 * @param {Boolean} test The result of a test. If true, null will be set as the handler in leiu of the specified handler
 */
function addHandle( attrs, handler, test ) {
	attrs = attrs.split("|");
	var current,
		i = attrs.length,
		setHandle = test ? null : handler;

	while ( i-- ) {
		// Don't override a user's handler
		if ( !(current = Expr.attrHandle[ attrs[i] ]) || current === handler ) {
			Expr.attrHandle[ attrs[i] ] = setHandle;
		}
	}
}

/**
 * Fetches boolean attributes by node
 * @param {Element} elem
 * @param {String} name
 */
function boolHandler( elem, name ) {
	// XML does not need to be checked as this will not be assigned for XML documents
	var val = elem.getAttributeNode( name );
	return val && val.specified ?
		val.value :
		elem[ name ] === true ? name.toLowerCase() : null;
}

/**
 * Fetches attributes without interpolation
 * http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
 * @param {Element} elem
 * @param {String} name
 */
function interpolationHandler( elem, name ) {
	// XML does not need to be checked as this will not be assigned for XML documents
	return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
}

/**
 * Uses defaultValue to retrieve value in IE6/7
 * @param {Element} elem
 * @param {String} name
 */
function valueHandler( elem ) {
	// Ignore the value *property* on inputs by using defaultValue
	// Fallback to Sizzle.attr by returning undefined where appropriate
	// XML does not need to be checked as this will not be assigned for XML documents
	if ( elem.nodeName.toLowerCase() === "input" ) {
		return elem.defaultValue;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns Returns -1 if a precedes b, 1 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Detect xml
 * @param {Element|Object} elem An element or a document
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.parentWindow;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	if ( parent && parent.frameElement ) {
		parent.attachEvent( "onbeforeunload", function() {
			setDocument();
		});
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {

		// Support: IE<8
		// Prevent attribute/property "interpolation"
		div.innerHTML = "<a href='#'></a>";
		addHandle( "type|href|height|width", interpolationHandler, div.firstChild.getAttribute("href") === "#" );

		// Support: IE<9
		// Use getAttributeNode to fetch booleans when getAttribute lies
		addHandle( booleans, boolHandler, div.getAttribute("disabled") == null );

		div.className = "i";
		return !div.getAttribute("className");
	});

	// Support: IE<9
	// Retrieving value should defer to defaultValue
	support.input = assert(function( div ) {
		div.innerHTML = "<input>";
		div.firstChild.setAttribute( "value", "" );
		return div.firstChild.getAttribute( "value" ) === "";
	});

	// IE6/7 still return empty string for value,
	// but are actually retrieving the property
	addHandle( "value", valueHandler, support.attributes && support.input );

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = assert(function( div ) {
		div.innerHTML = "<div class='a'></div><div class='a i'></div>";

		// Support: Safari<4
		// Catch class over-caching
		div.firstChild.className = "i";
		// Support: Opera<10
		// Catch gEBCN failure to find non-leading classes
		return div.getElementsByClassName("i").length === 2;
	});

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = isNative(doc.querySelectorAll)) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select><option selected=''></option></select>";

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {

			// Support: Opera 10-12/IE8
			// ^= $= *= and empty values
			// Should not select anything
			// Support: Windows 8 Native Apps
			// The type attribute is restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "t", "" );

			if ( div.querySelectorAll("[t^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = isNative( (matches = docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = isNative(docElem.contains) || docElem.compareDocumentPosition ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
	// Detached nodes confoundingly follow *each other*
	support.sortDetached = assert(function( div1 ) {
		// Should return 1, but returns 4 (following)
		return div1.compareDocumentPosition( doc.createElement("div") ) & 1;
	});

	// Document order sorting
	sortOrder = docElem.compareDocumentPosition ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var compare = b.compareDocumentPosition && a.compareDocumentPosition && a.compareDocumentPosition( b );

		if ( compare ) {
			// Disconnected nodes
			if ( compare & 1 ||
				(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

				// Choose the first element that is related to our preferred document
				if ( a === doc || contains(preferredDoc, a) ) {
					return -1;
				}
				if ( b === doc || contains(preferredDoc, b) ) {
					return 1;
				}

				// Maintain original order
				return sortInput ?
					( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
					0;
			}

			return compare & 4 ? -1 : 1;
		}

		// Not directly comparable, sort on existence of method
		return a.compareDocumentPosition ? -1 : 1;
	} :
	function( a, b ) {
		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Parentless nodes are either documents or disconnected
		} else if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [elem] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = ( fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined );

	return val === undefined ?
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null :
		val;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		for ( ; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (see #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[5] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] && match[4] !== undefined ) {
				match[2] = match[4];

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is only affected by element nodes and content nodes(including text(3), cdata(4)),
			//   not comment, processing instructions, or others
			// Thanks to Diego Perini for the nodeName shortcut
			//   Greater than "@" means alpha characters (specifically not starting with "#" or "?")
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeName > "@" || elem.nodeType === 3 || elem.nodeType === 4 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === elem.type );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

function tokenize( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( tokens = [] );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
}

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var data, cache, outerCache,
				dirkey = dirruns + " " + doneName;

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (cache = outerCache[ dir ]) && cache[0] === dirkey ) {
							if ( (data = cache[1]) === true || data === cachedruns ) {
								return data === true;
							}
						} else {
							cache = outerCache[ dir ] = [ dirkey ];
							cache[1] = matcher( elem, context, xml ) || cachedruns;
							if ( cache[1] === true ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	// A counter to specify which element is currently being matched
	var matcherCachedRuns = 0,
		bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, expandContext ) {
			var elem, j, matcher,
				setMatched = [],
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				outermost = expandContext != null,
				contextBackup = outermostContext,
				// We must always have either seed elements or context
				elems = seed || byElement && Expr.find["TAG"]( "*", expandContext && context.parentNode || context ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1);

			if ( outermost ) {
				outermostContext = context !== document && context;
				cachedruns = matcherCachedRuns;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			for ( ; (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
						cachedruns = ++matcherCachedRuns;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !group ) {
			group = tokenize( selector );
		}
		i = group.length;
		while ( i-- ) {
			cached = matcherFromTokens( group[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
	}
	return cached;
};

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function select( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		match = tokenize( selector );

	if ( !seed ) {
		// Try to minimize operations if there is only one group
		if ( match.length === 1 ) {

			// Take a shortcut and set the context if the root selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					support.getById && context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;
				}
				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && context.parentNode || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}
	}

	// Compile and execute a filtering function
	// Provide `match` to avoid retokenization if we modified the selector above
	compile( selector, match )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector )
	);
	return results;
}

// Deprecated
Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Initialize against the default document
setDocument();

// Support: Chrome<<14
// Always assume duplicates if they aren't passed to the comparison function
[0, 0].sort( sortOrder );
support.detectDuplicates = hasDuplicate;

jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})( window );
// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( core_rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,
		// Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};
jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ action + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
jQuery.support = (function( support ) {

	var all, a, input, select, fragment, opt, eventName, isSupported, i,
		div = document.createElement("div");

	// Setup
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";

	// Finish early in limited (non-browser) environments
	all = div.getElementsByTagName("*") || [];
	a = div.getElementsByTagName("a")[ 0 ];
	if ( !a || !a.style || !all.length ) {
		return support;
	}

	// First batch of tests
	select = document.createElement("select");
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName("input")[ 0 ];

	a.style.cssText = "top:1px;float:left;opacity:.5";

	// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
	support.getSetAttribute = div.className !== "t";

	// IE strips leading whitespace when .innerHTML is used
	support.leadingWhitespace = div.firstChild.nodeType === 3;

	// Make sure that tbody elements aren't automatically inserted
	// IE will insert them into empty tables
	support.tbody = !div.getElementsByTagName("tbody").length;

	// Make sure that link elements get serialized correctly by innerHTML
	// This requires a wrapper element in IE
	support.htmlSerialize = !!div.getElementsByTagName("link").length;

	// Get the style information from getAttribute
	// (IE uses .cssText instead)
	support.style = /top/.test( a.getAttribute("style") );

	// Make sure that URLs aren't manipulated
	// (IE normalizes it by default)
	support.hrefNormalized = a.getAttribute("href") === "/a";

	// Make sure that element opacity exists
	// (IE uses filter instead)
	// Use a regex to work around a WebKit issue. See #5145
	support.opacity = /^0.5/.test( a.style.opacity );

	// Verify style float existence
	// (IE uses styleFloat instead of cssFloat)
	support.cssFloat = !!a.style.cssFloat;

	// Check the default checkbox/radio value ("" on WebKit; "on" elsewhere)
	support.checkOn = !!input.value;

	// Make sure that a selected-by-default option has a working selected property.
	// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
	support.optSelected = opt.selected;

	// Tests for enctype support on a form (#6743)
	support.enctype = !!document.createElement("form").enctype;

	// Makes sure cloning an html5 element does not cause problems
	// Where outerHTML is undefined, this still works
	support.html5Clone = document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>";

	// Will be defined later
	support.inlineBlockNeedsLayout = false;
	support.shrinkWrapBlocks = false;
	support.pixelPosition = false;
	support.deleteExpando = true;
	support.noCloneEvent = true;
	support.reliableMarginRight = true;
	support.boxSizingReliable = true;

	// Make sure checked status is properly cloned
	input.checked = true;
	support.noCloneChecked = input.cloneNode( true ).checked;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Support: IE<9
	try {
		delete div.test;
	} catch( e ) {
		support.deleteExpando = false;
	}

	// Check if we can trust getAttribute("value")
	input = document.createElement("input");
	input.setAttribute( "value", "" );
	support.input = input.getAttribute( "value" ) === "";

	// Check if an input maintains its value after becoming a radio
	input.value = "t";
	input.setAttribute( "type", "radio" );
	support.radioValue = input.value === "t";

	// #11217 - WebKit loses check when the name is after the checked attribute
	input.setAttribute( "checked", "t" );
	input.setAttribute( "name", "t" );

	fragment = document.createDocumentFragment();
	fragment.appendChild( input );

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	support.appendChecked = input.checked;

	// WebKit doesn't clone checked state correctly in fragments
	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<9
	// Opera does not clone events (and typeof div.attachEvent === undefined).
	// IE9-10 clones events bound via attachEvent, but they don't trigger with .click()
	if ( div.attachEvent ) {
		div.attachEvent( "onclick", function() {
			support.noCloneEvent = false;
		});

		div.cloneNode( true ).click();
	}

	// Support: IE<9 (lack submit/change bubble), Firefox 17+ (lack focusin event)
	// Beware of CSP restrictions (https://developer.mozilla.org/en/Security/CSP)
	for ( i in { submit: true, change: true, focusin: true }) {
		div.setAttribute( eventName = "on" + i, "t" );

		support[ i + "Bubbles" ] = eventName in window || div.attributes[ eventName ].expando === false;
	}

	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	// Support: IE<9
	// Iteration over object's inherited properties before its own.
	for ( i in jQuery( support ) ) {
		break;
	}
	support.ownLast = i !== "0";

	// Run tests that need a body at doc ready
	jQuery(function() {
		var container, marginDiv, tds,
			divReset = "padding:0;margin:0;border:0;display:block;box-sizing:content-box;-moz-box-sizing:content-box;-webkit-box-sizing:content-box;",
			body = document.getElementsByTagName("body")[0];

		if ( !body ) {
			// Return for frameset docs that don't have a body
			return;
		}

		container = document.createElement("div");
		container.style.cssText = "border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px";

		body.appendChild( container ).appendChild( div );

		// Support: IE8
		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
		tds = div.getElementsByTagName("td");
		tds[ 0 ].style.cssText = "padding:0;margin:0;border:0;display:none";
		isSupported = ( tds[ 0 ].offsetHeight === 0 );

		tds[ 0 ].style.display = "";
		tds[ 1 ].style.display = "none";

		// Support: IE8
		// Check if empty table cells still have offsetWidth/Height
		support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

		// Check box-sizing and margin behavior.
		div.innerHTML = "";
		div.style.cssText = "box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;";

		// Workaround failing boxSizing test due to offsetWidth returning wrong value
		// with some non-1 values of body zoom, ticket #13543
		jQuery.swap( body, body.style.zoom != null ? { zoom: 1 } : {}, function() {
			support.boxSizing = div.offsetWidth === 4;
		});

		// Use window.getComputedStyle because jsdom on node.js will break without it.
		if ( window.getComputedStyle ) {
			support.pixelPosition = ( window.getComputedStyle( div, null ) || {} ).top !== "1%";
			support.boxSizingReliable = ( window.getComputedStyle( div, null ) || { width: "4px" } ).width === "4px";

			// Check if div with explicit width and no margin-right incorrectly
			// gets computed margin-right based on width of container. (#3333)
			// Fails in WebKit before Feb 2011 nightlies
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			marginDiv = div.appendChild( document.createElement("div") );
			marginDiv.style.cssText = div.style.cssText = divReset;
			marginDiv.style.marginRight = marginDiv.style.width = "0";
			div.style.width = "1px";

			support.reliableMarginRight =
				!parseFloat( ( window.getComputedStyle( marginDiv, null ) || {} ).marginRight );
		}

		if ( typeof div.style.zoom !== core_strundefined ) {
			// Support: IE<8
			// Check if natively block-level elements act like inline-block
			// elements when setting their display to 'inline' and giving
			// them layout
			div.innerHTML = "";
			div.style.cssText = divReset + "width:1px;padding:1px;display:inline;zoom:1";
			support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

			// Support: IE6
			// Check if elements with layout shrink-wrap their children
			div.style.display = "block";
			div.innerHTML = "<div></div>";
			div.firstChild.style.width = "5px";
			support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );

			if ( support.inlineBlockNeedsLayout ) {
				// Prevent IE 6 from affecting layout for positioned elements #11048
				// Prevent IE from shrinking the body in IE 7 mode #12869
				// Support: IE<8
				body.style.zoom = 1;
			}
		}

		body.removeChild( container );

		// Null elements to avoid leaks in IE
		container = div = tds = marginDiv = null;
	});

	// Null elements to avoid leaks in IE
	all = select = fragment = opt = a = input = null;

	return support;
})({});

var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
	rmultiDash = /([A-Z])/g;

function internalData( elem, name, data, pvt /* Internal Use Only */ ){
	if ( !jQuery.acceptData( elem ) ) {
		return;
	}

	var ret, thisCache,
		internalKey = jQuery.expando,

		// We have to handle DOM nodes and JS objects differently because IE6-7
		// can't GC object references properly across the DOM-JS boundary
		isNode = elem.nodeType,

		// Only DOM nodes need the global jQuery cache; JS object data is
		// attached directly to the object so GC can occur automatically
		cache = isNode ? jQuery.cache : elem,

		// Only defining an ID for JS objects if its cache already exists allows
		// the code to shortcut on the same path as a DOM node with no cache
		id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

	// Avoid doing any more work than we need to when trying to get data on an
	// object that has no data at all
	if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && data === undefined && typeof name === "string" ) {
		return;
	}

	if ( !id ) {
		// Only DOM nodes need a new unique ID for each element since their data
		// ends up in the global cache
		if ( isNode ) {
			id = elem[ internalKey ] = core_deletedIds.pop() || jQuery.guid++;
		} else {
			id = internalKey;
		}
	}

	if ( !cache[ id ] ) {
		// Avoid exposing jQuery metadata on plain JS objects when the object
		// is serialized using JSON.stringify
		cache[ id ] = isNode ? {} : { toJSON: jQuery.noop };
	}

	// An object can be passed to jQuery.data instead of a key/value pair; this gets
	// shallow copied over onto the existing cache
	if ( typeof name === "object" || typeof name === "function" ) {
		if ( pvt ) {
			cache[ id ] = jQuery.extend( cache[ id ], name );
		} else {
			cache[ id ].data = jQuery.extend( cache[ id ].data, name );
		}
	}

	thisCache = cache[ id ];

	// jQuery data() is stored in a separate object inside the object's internal data
	// cache in order to avoid key collisions between internal data and user-defined
	// data.
	if ( !pvt ) {
		if ( !thisCache.data ) {
			thisCache.data = {};
		}

		thisCache = thisCache.data;
	}

	if ( data !== undefined ) {
		thisCache[ jQuery.camelCase( name ) ] = data;
	}

	// Check for both converted-to-camel and non-converted data property names
	// If a data property was specified
	if ( typeof name === "string" ) {

		// First Try to find as-is property data
		ret = thisCache[ name ];

		// Test for null|undefined property data
		if ( ret == null ) {

			// Try to find the camelCased property
			ret = thisCache[ jQuery.camelCase( name ) ];
		}
	} else {
		ret = thisCache;
	}

	return ret;
}

function internalRemoveData( elem, name, pvt ) {
	if ( !jQuery.acceptData( elem ) ) {
		return;
	}

	var thisCache, i,
		isNode = elem.nodeType,

		// See jQuery.data for more information
		cache = isNode ? jQuery.cache : elem,
		id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

	// If there is already no cache entry for this object, there is no
	// purpose in continuing
	if ( !cache[ id ] ) {
		return;
	}

	if ( name ) {

		thisCache = pvt ? cache[ id ] : cache[ id ].data;

		if ( thisCache ) {

			// Support array or space separated string names for data keys
			if ( !jQuery.isArray( name ) ) {

				// try the string as a key before any manipulation
				if ( name in thisCache ) {
					name = [ name ];
				} else {

					// split the camel cased version by spaces unless a key with the spaces exists
					name = jQuery.camelCase( name );
					if ( name in thisCache ) {
						name = [ name ];
					} else {
						name = name.split(" ");
					}
				}
			} else {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = name.concat( jQuery.map( name, jQuery.camelCase ) );
			}

			i = name.length;
			while ( i-- ) {
				delete thisCache[ name[i] ];
			}

			// If there is no data left in the cache, we want to continue
			// and let the cache object itself get destroyed
			if ( pvt ? !isEmptyDataObject(thisCache) : !jQuery.isEmptyObject(thisCache) ) {
				return;
			}
		}
	}

	// See jQuery.data for more information
	if ( !pvt ) {
		delete cache[ id ].data;

		// Don't destroy the parent cache unless the internal data object
		// had been the only thing left in it
		if ( !isEmptyDataObject( cache[ id ] ) ) {
			return;
		}
	}

	// Destroy the cache
	if ( isNode ) {
		jQuery.cleanData( [ elem ], true );

	// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
	/* jshint eqeqeq: false */
	} else if ( jQuery.support.deleteExpando || cache != cache.window ) {
		/* jshint eqeqeq: true */
		delete cache[ id ];

	// When all else fails, null
	} else {
		cache[ id ] = null;
	}
}

jQuery.extend({
	cache: {},

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"applet": true,
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data ) {
		return internalData( elem, name, data );
	},

	removeData: function( elem, name ) {
		return internalRemoveData( elem, name );
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return internalData( elem, name, data, true );
	},

	_removeData: function( elem, name ) {
		return internalRemoveData( elem, name, true );
	},

	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		// Do not set data on non-element because it will not be cleared (#8335).
		if ( elem.nodeType && elem.nodeType !== 1 && elem.nodeType !== 9 ) {
			return false;
		}

		var noData = elem.nodeName && jQuery.noData[ elem.nodeName.toLowerCase() ];

		// nodes accept data unless otherwise specified; rejection can be conditional
		return !noData || noData !== true && elem.getAttribute("classid") === noData;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var attrs, name,
			data = null,
			i = 0,
			elem = this[0];

		// Special expections of .data basically thwart jQuery.access,
		// so implement the relevant behavior ourselves

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attrs = elem.attributes;
					for ( ; i < attrs.length; i++ ) {
						name = attrs[i].name;

						if ( name.indexOf("data-") === 0 ) {
							name = jQuery.camelCase( name.slice(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		return arguments.length > 1 ?

			// Sets one value
			this.each(function() {
				jQuery.data( this, key, value );
			}) :

			// Gets one value
			// Try to fetch any internally stored data first
			elem ? dataAttr( elem, key, jQuery.data( elem, key ) ) : null;
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
						data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}
jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray(data) ) {
					queue = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return jQuery._data( elem, key ) || jQuery._data( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				jQuery._removeData( elem, type + "queue" );
				jQuery._removeData( elem, key );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while( i-- ) {
			tmp = jQuery._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var nodeHook, boolHook,
	rclass = /[\t\r\n\f]/g,
	rreturn = /\r/g,
	rfocusable = /^(?:input|select|textarea|button|object)$/i,
	rclickable = /^(?:a|area)$/i,
	ruseDefault = /^(?:checked|selected)$/i,
	getSetAttribute = jQuery.support.getSetAttribute,
	getSetInput = jQuery.support.input;

jQuery.fn.extend({
	attr: function( name, value ) {
		return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	},

	prop: function( name, value ) {
		return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	},

	addClass: function( value ) {
		var classes, elem, cur, clazz, j,
			i = 0,
			len = this.length,
			proceed = typeof value === "string" && value;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( core_rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}
					elem.className = jQuery.trim( cur );

				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j,
			i = 0,
			len = this.length,
			proceed = arguments.length === 0 || typeof value === "string" && value;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( core_rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}
					elem.className = value ? jQuery.trim( cur ) : "";
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isBool = typeof stateVal === "boolean";

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					state = stateVal,
					classNames = value.match( core_rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					state = isBool ? state : !self.hasClass( className );
					self[ state ? "addClass" : "removeClass" ]( className );
				}

			// Toggle whole class name
			} else if ( type === core_strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed "false",
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	},

	val: function( value ) {
		var ret, hooks, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map(val, function ( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// Use proper attribute retrieval(#6932, #12072)
				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :
					elem.text;
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// oldIE doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected = jQuery.inArray( jQuery(option).val(), values ) >= 0) ) {
						optionSet = true;
					}
				}

				// force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	},

	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === core_strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( core_rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					if ( getSetInput && getSetAttribute || !ruseDefault.test( name ) ) {
						elem[ propName ] = false;
					// Support: IE<9
					// Also clear defaultChecked/defaultSelected (if appropriate)
					} else {
						elem[ jQuery.camelCase( "default-" + name ) ] =
							elem[ propName ] = false;
					}

				// See #9699 for explanation of this approach (setting first, then removal)
				} else {
					jQuery.attr( elem, name, "" );
				}

				elem.removeAttribute( getSetAttribute ? name : propName );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to default in case type is set after value during creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				return tabindex ?
					parseInt( tabindex, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						-1;
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else if ( getSetInput && getSetAttribute || !ruseDefault.test( name ) ) {
			// IE<8 needs the *property* name
			elem.setAttribute( !getSetAttribute && jQuery.propFix[ name ] || name, name );

		// Use defaultChecked and defaultSelected for oldIE
		} else {
			elem[ jQuery.camelCase( "default-" + name ) ] = elem[ name ] = true;
		}

		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = jQuery.expr.attrHandle[ name ] || jQuery.find.attr;

	jQuery.expr.attrHandle[ name ] = getSetInput && getSetAttribute || !ruseDefault.test( name ) ?
		function( elem, name, isXML ) {
			var fn = jQuery.expr.attrHandle[ name ],
				ret = isXML ?
					undefined :
					/* jshint eqeqeq: false */
					(jQuery.expr.attrHandle[ name ] = undefined) !=
						getter( elem, name, isXML ) ?

						name.toLowerCase() :
						null;
			jQuery.expr.attrHandle[ name ] = fn;
			return ret;
		} :
		function( elem, name, isXML ) {
			return isXML ?
				undefined :
				elem[ jQuery.camelCase( "default-" + name ) ] ?
					name.toLowerCase() :
					null;
		};
});

// fix oldIE attroperties
if ( !getSetInput || !getSetAttribute ) {
	jQuery.attrHooks.value = {
		set: function( elem, value, name ) {
			if ( jQuery.nodeName( elem, "input" ) ) {
				// Does not return so that setAttribute is also used
				elem.defaultValue = value;
			} else {
				// Use nodeHook if defined (#1954); otherwise setAttribute is fine
				return nodeHook && nodeHook.set( elem, value, name );
			}
		}
	};
}

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = {
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				elem.setAttributeNode(
					(ret = elem.ownerDocument.createAttribute( name ))
				);
			}

			ret.value = value += "";

			// Break association with cloned elements by also using setAttribute (#9646)
			return name === "value" || value === elem.getAttribute( name ) ?
				value :
				undefined;
		}
	};
	jQuery.expr.attrHandle.id = jQuery.expr.attrHandle.name = jQuery.expr.attrHandle.coords =
		// Some attributes are constructed with empty-string values when not defined
		function( elem, name, isXML ) {
			var ret;
			return isXML ?
				undefined :
				(ret = elem.getAttributeNode( name )) && ret.value !== "" ?
					ret.value :
					null;
		};
	jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret = elem.getAttributeNode( name );
			return ret && ret.specified ?
				ret.value :
				undefined;
		},
		set: nodeHook.set
	};

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		set: function( elem, value, name ) {
			nodeHook.set( elem, value === "" ? false : value, name );
		}
	};

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		};
	});
}


// Some attributes require a special call on IE
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !jQuery.support.hrefNormalized ) {
	// href/src property should get the full normalized URL (#10299/#12915)
	jQuery.each([ "href", "src" ], function( i, name ) {
		jQuery.propHooks[ name ] = {
			get: function( elem ) {
				return elem.getAttribute( name, 4 );
			}
		};
	});
}

if ( !jQuery.support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Note: IE uppercases css property names, but if we were to .toLowerCase()
			// .cssText, that would destroy case senstitivity in URL's, like in "background"
			return elem.style.cssText || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = value + "" );
		}
	};
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !jQuery.support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			// Support: Webkit
			// "" is returned instead of "on" if a value isn't specified
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});
var rformElems = /^(?:input|select|textarea)$/i,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {
		var tmp, events, t, handleObjIn,
			special, eventHandle, handleObj,
			handlers, type, namespaces, origType,
			elemData = jQuery._data( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== core_strundefined && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( core_rnotwhite ) || [""];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {
		var j, handleObj, tmp,
			origCount, t, events,
			special, handlers, type,
			namespaces, origType,
			elemData = jQuery.hasData( elem ) && jQuery._data( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( core_rnotwhite ) || [""];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery._removeData( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		var handle, ontype, cur,
			bubbleType, special, tmp, i,
			eventPath = [ elem || document ],
			type = core_hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = core_hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && elem[ type ] && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					try {
						elem[ type ]();
					} catch ( e ) {
						// IE<9 dies on focus/blur to hidden element (#1486,#12518)
						// only reproducible on winXP IE8 native, not IE9 in IE8 mode
					}
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, ret, handleObj, matched, j,
			handlerQueue = [],
			args = core_slice.call( arguments ),
			handlers = ( jQuery._data( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var sel, handleObj, matches, i,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			/* jshint eqeqeq: false */
			for ( ; cur != this; cur = cur.parentNode || this ) {
				/* jshint eqeqeq: true */

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && (cur.disabled !== true || event.type !== "click") ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: IE<9
		// Fix target property (#1925)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Support: Chrome 23+, Safari?
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// Support: IE<9
		// For mouse/key events, metaKey==false if it's undefined (#3368, #11328)
		event.metaKey = !!event.metaKey;

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var body, eventDoc, doc,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					try {
						this.focus();
						return false;
					} catch ( e ) {
						// Support: IE<9
						// If we error on focus to hidden element (#1486, #12518),
						// let .trigger() run the handlers
					}
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( jQuery.nodeName( this, "input" ) && this.type === "checkbox" && this.click ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Even when returnValue equals to undefined Firefox will still show alert
				if ( event.result !== undefined ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		var name = "on" + type;

		if ( elem.detachEvent ) {

			// #8545, #7054, preventing memory leaks for custom events in IE6-8
			// detachEvent needed property on element, by name of that event, to properly expose it to GC
			if ( typeof elem[ name ] === core_strundefined ) {
				elem[ name ] = null;
			}

			elem.detachEvent( name, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
			src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;
		if ( !e ) {
			return;
		}

		// If preventDefault exists, run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// Support: IE
		// Otherwise set the returnValue property of the original event to false
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;
		if ( !e ) {
			return;
		}
		// If stopPropagation exists, run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}

		// Support: IE
		// Set the cancelBubble property of the original event to true
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !jQuery._data( form, "submitBubbles" ) ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					jQuery._data( form, "submitBubbles", true );
				}
			});
			// return undefined since we don't need an event listener
		},

		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
						}
						// Allow triggered, simulated change events (#11500)
						jQuery.event.simulate( "change", this, event, true );
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "changeBubbles" ) ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					jQuery._data( elem, "changeBubbles", true );
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return !rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler while someone wants focusin/focusout
		var attaches = 0,
			handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				if ( attaches++ === 0 ) {
					document.addEventListener( orig, handler, true );
				}
			},
			teardown: function() {
				if ( --attaches === 0 ) {
					document.removeEventListener( orig, handler, true );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var type, origFn;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});
var isSimple = /^.[^:#\[\.,]*$/,
	rparentsprev = /^(?:parents|prev(?:Until|All))/,
	rneedsContext = jQuery.expr.match.needsContext,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			ret = [],
			self = this,
			len = self.length;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},

	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},

	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			ret = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					cur = ret.push( cur );
					break;
				}
			}
		}

		return this.pushStack( ret.length > 1 ? jQuery.unique( ret ) : ret );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.first().prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( jQuery.unique(all) );
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 );

	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				ret = jQuery.unique( ret );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				ret = ret.reverse();
			}
		}

		return this.pushStack( ret );
	};
});

jQuery.extend({
	filter: function( expr, elems, not ) {
		var elem = elems[ 0 ];

		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 && elem.nodeType === 1 ?
			jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
			jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
				return elem.nodeType === 1;
			}));
	},

	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) !== not;
	});
}
function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
		safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	manipulation_rcheckableType = /^(?:checkbox|radio)$/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		area: [ 1, "<map>", "</map>" ],
		param: [ 1, "<object>", "</object>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
		// unless wrapped in a div with non-breaking characters in front of it.
		_default: jQuery.support.htmlSerialize ? [ 0, "", "" ] : [ 1, "X<div>", "</div>"  ]
	},
	safeFragment = createSafeFragment( document ),
	fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

jQuery.fn.extend({
	text: function( value ) {
		return jQuery.access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	// keepData is for internal use only--do not document
	remove: function( selector, keepData ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem, false ) );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}

			// If this is a select, ensure that it displays empty (#12336)
			// Support: IE<9
			if ( elem.options && jQuery.nodeName( elem, "select" ) ) {
				elem.options.length = 0;
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function () {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return jQuery.access( this, function( value ) {
			var elem = this[0] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( jQuery.support.htmlSerialize || !rnoshimcache.test( value )  ) &&
				( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var
			// Snapshot the DOM in case .domManip sweeps something relevant into its fragment
			args = jQuery.map( this, function( elem ) {
				return [ elem.nextSibling, elem.parentNode ];
			}),
			i = 0;

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			var next = args[ i++ ],
				parent = args[ i++ ];

			if ( parent ) {
				// Don't use the snapshot next if it has moved (#13810)
				if ( next && next.parentNode !== parent ) {
					next = this.nextSibling;
				}
				jQuery( this ).remove();
				parent.insertBefore( elem, next );
			}
		// Allow new content to include elements from the context set
		}, true );

		// Force removal if there was no new content (e.g., from empty arguments)
		return i ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback, allowIntersection ) {

		// Flatten any nested arrays
		args = core_concat.apply( [], args );

		var first, node, hasScripts,
			scripts, doc, fragment,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[0],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction || !( l <= 1 || typeof value !== "string" || jQuery.support.checkClone || !rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[0] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback, allowIntersection );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, !allowIntersection && this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[i], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!jQuery._data( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Hope ajax is available...
								jQuery._evalUrl( node.src );
							} else {
								jQuery.globalEval( ( node.text || node.textContent || node.innerHTML || "" ).replace( rcleanScript, "" ) );
							}
						}
					}
				}

				// Fix #11809: Avoid leaking memory
				fragment = first = null;
			}
		}

		return this;
	}
});

// Support: IE<8
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType === 1 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (jQuery.find.attr( elem, "type" ) !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );
	if ( match ) {
		elem.type = match[1];
	} else {
		elem.removeAttribute("type");
	}
	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var elem,
		i = 0;
	for ( ; (elem = elems[i]) != null; i++ ) {
		jQuery._data( elem, "globalEval", !refElements || jQuery._data( refElements[i], "globalEval" ) );
	}
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function fixCloneNodeIssues( src, dest ) {
	var nodeName, e, data;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	nodeName = dest.nodeName.toLowerCase();

	// IE6-8 copies events bound via attachEvent when using cloneNode.
	if ( !jQuery.support.noCloneEvent && dest[ jQuery.expando ] ) {
		data = jQuery._data( dest );

		for ( e in data.events ) {
			jQuery.removeEvent( dest, e, data.handle );
		}

		// Event data gets referenced instead of copied if the expando gets copied too
		dest.removeAttribute( jQuery.expando );
	}

	// IE blanks contents when cloning scripts, and tries to evaluate newly-set text
	if ( nodeName === "script" && dest.text !== src.text ) {
		disableScript( dest ).text = src.text;
		restoreScript( dest );

	// IE6-10 improperly clones children of object elements using classid.
	// IE10 throws NoModificationAllowedError if parent is null, #12132.
	} else if ( nodeName === "object" ) {
		if ( dest.parentNode ) {
			dest.outerHTML = src.outerHTML;
		}

		// This path appears unavoidable for IE9. When cloning an object
		// element in IE9, the outerHTML strategy above is not sufficient.
		// If the src has innerHTML and the destination does not,
		// copy the src.innerHTML into the dest.innerHTML. #10324
		if ( jQuery.support.html5Clone && ( src.innerHTML && !jQuery.trim(dest.innerHTML) ) ) {
			dest.innerHTML = src.innerHTML;
		}

	} else if ( nodeName === "input" && manipulation_rcheckableType.test( src.type ) ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set

		dest.defaultChecked = dest.checked = src.checked;

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.defaultSelected = dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			i = 0,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone(true);
			jQuery( insert[i] )[ original ]( elems );

			// Modern browsers can apply jQuery collections as arrays, but oldIE needs a .get()
			core_push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});

function getAll( context, tag ) {
	var elems, elem,
		i = 0,
		found = typeof context.getElementsByTagName !== core_strundefined ? context.getElementsByTagName( tag || "*" ) :
			typeof context.querySelectorAll !== core_strundefined ? context.querySelectorAll( tag || "*" ) :
			undefined;

	if ( !found ) {
		for ( found = [], elems = context.childNodes || context; (elem = elems[i]) != null; i++ ) {
			if ( !tag || jQuery.nodeName( elem, tag ) ) {
				found.push( elem );
			} else {
				jQuery.merge( found, getAll( elem, tag ) );
			}
		}
	}

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], found ) :
		found;
}

// Used in buildFragment, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( manipulation_rcheckableType.test( elem.type ) ) {
		elem.defaultChecked = elem.checked;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var destElements, node, clone, i, srcElements,
			inPage = jQuery.contains( elem.ownerDocument, elem );

		if ( jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
			clone = elem.cloneNode( true );

		// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
		}

		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			// Fix all IE cloning issues
			for ( i = 0; (node = srcElements[i]) != null; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					fixCloneNodeIssues( node, destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0; (node = srcElements[i]) != null; i++ ) {
					cloneCopyEvent( node, destElements[i] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		destElements = srcElements = node = null;

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var j, elem, contains,
			tmp, tag, tbody, wrap,
			l = elems.length,

			// Ensure a safe fragment
			safe = createSafeFragment( context ),

			nodes = [],
			i = 0;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || safe.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;

					tmp.innerHTML = wrap[1] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[2];

					// Descend through wrappers to the right content
					j = wrap[0];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Manually add leading whitespace removed by IE
					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						nodes.push( context.createTextNode( rleadingWhitespace.exec( elem )[0] ) );
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !jQuery.support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						elem = tag === "table" && !rtbody.test( elem ) ?
							tmp.firstChild :

							// String was a bare <thead> or <tfoot>
							wrap[1] === "<table>" && !rtbody.test( elem ) ?
								tmp :
								0;

						j = elem && elem.childNodes.length;
						while ( j-- ) {
							if ( jQuery.nodeName( (tbody = elem.childNodes[j]), "tbody" ) && !tbody.childNodes.length ) {
								elem.removeChild( tbody );
							}
						}
					}

					jQuery.merge( nodes, tmp.childNodes );

					// Fix #12392 for WebKit and IE > 9
					tmp.textContent = "";

					// Fix #12392 for oldIE
					while ( tmp.firstChild ) {
						tmp.removeChild( tmp.firstChild );
					}

					// Remember the top-level container for proper cleanup
					tmp = safe.lastChild;
				}
			}
		}

		// Fix #11356: Clear elements from fragment
		if ( tmp ) {
			safe.removeChild( tmp );
		}

		// Reset defaultChecked for any radios and checkboxes
		// about to be appended to the DOM in IE 6/7 (#8060)
		if ( !jQuery.support.appendChecked ) {
			jQuery.grep( getAll( nodes, "input" ), fixDefaultChecked );
		}

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( safe.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		tmp = null;

		return safe;
	},

	cleanData: function( elems, /* internal */ acceptData ) {
		var elem, type, id, data,
			i = 0,
			internalKey = jQuery.expando,
			cache = jQuery.cache,
			deleteExpando = jQuery.support.deleteExpando,
			special = jQuery.event.special;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( acceptData || jQuery.acceptData( elem ) ) {

				id = elem[ internalKey ];
				data = id && cache[ id ];

				if ( data ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Remove cache only if it was not already removed by jQuery.event.remove
					if ( cache[ id ] ) {

						delete cache[ id ];

						// IE does not allow us to delete expando properties from nodes,
						// nor does it have a removeAttribute function on Document nodes;
						// we must handle all of these cases
						if ( deleteExpando ) {
							delete elem[ internalKey ];

						} else if ( typeof elem.removeAttribute !== core_strundefined ) {
							elem.removeAttribute( internalKey );

						} else {
							elem[ internalKey ] = null;
						}

						core_deletedIds.push( id );
					}
				}
			}
		}
	},

	_evalUrl: function( url ) {
		return jQuery.ajax({
			url: url,
			type: "GET",
			dataType: "script",
			async: false,
			global: false,
			"throws": true
		});
	}
});
jQuery.fn.extend({
	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});
var iframe, getStyles, curCSS,
	ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity\s*=\s*([^)]*)/,
	rposition = /^(top|right|bottom|left)$/,
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rmargin = /^margin/,
	rnumsplit = new RegExp( "^(" + core_pnum + ")(.*)$", "i" ),
	rnumnonpx = new RegExp( "^(" + core_pnum + ")(?!px)[a-z%]+$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + core_pnum + ")", "i" ),
	elemdisplay = { BODY: "block" },

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: 0,
		fontWeight: 400
	},

	cssExpand = [ "Top", "Right", "Bottom", "Left" ],
	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name.charAt(0).toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function isHidden( elem, el ) {
	// isHidden might be called from jQuery#filter function;
	// in that case, element will be second argument
	elem = el || elem;
	return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = jQuery._data( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = jQuery._data( elem, "olddisplay", css_defaultDisplay(elem.nodeName) );
			}
		} else {

			if ( !values[ index ] ) {
				hidden = isHidden( elem );

				if ( display && display !== "none" || !hidden ) {
					jQuery._data( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );
				}
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.fn.extend({
	css: function( name, value ) {
		return jQuery.access( this, function( elem, name, value ) {
			var len, styles,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		var bool = typeof state === "boolean";

		return this.each(function() {
			if ( bool ? state : isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Fixes #8908, it can be done more correctly by specifing setters in cssHooks,
			// but it would mean to define eight (for every problematic property) identical functions
			if ( !jQuery.support.clearCloneStyle && value === "" && name.indexOf("background") === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {

				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
				// Fixes bug #5509
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var num, val, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

// NOTE: we've included the "window" in window.getComputedStyle
// because jsdom on node.js will break without it.
if ( window.getComputedStyle ) {
	getStyles = function( elem ) {
		return window.getComputedStyle( elem, null );
	};

	curCSS = function( elem, name, _computed ) {
		var width, minWidth, maxWidth,
			computed = _computed || getStyles( elem ),

			// getPropertyValue is only needed for .css('filter') in IE9, see #12537
			ret = computed ? computed.getPropertyValue( name ) || computed[ name ] : undefined,
			style = elem.style;

		if ( computed ) {

			if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
				ret = jQuery.style( elem, name );
			}

			// A tribute to the "awesome hack by Dean Edwards"
			// Chrome < 17 and Safari 5.0 uses "computed value" instead of "used value" for margin-right
			// Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
			// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
			if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

				// Remember the original values
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				// Put in the new values to get a computed value out
				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				// Revert the changed values
				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret;
	};
} else if ( document.documentElement.currentStyle ) {
	getStyles = function( elem ) {
		return elem.currentStyle;
	};

	curCSS = function( elem, name, _computed ) {
		var left, rs, rsLeft,
			computed = _computed || getStyles( elem ),
			ret = computed ? computed[ name ] : undefined,
			style = elem.style;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && style[ name ] ) {
			ret = style[ name ];
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		// but not position css attributes, as those are proportional to the parent element instead
		// and we can't measure the parent instead because it might trigger a "stacking dolls" problem
		if ( rnumnonpx.test( ret ) && !rposition.test( name ) ) {

			// Remember the original values
			left = style.left;
			rs = elem.runtimeStyle;
			rsLeft = rs && rs.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				rs.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				rs.left = rsLeft;
			}
		}

		return ret === "" ? "auto" : ret;
	};
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = jQuery.support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

// Try to determine the default display value of an element
function css_defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {
			// Use the already-created iframe if possible
			iframe = ( iframe ||
				jQuery("<iframe frameborder='0' width='0' height='0'/>")
				.css( "cssText", "display:block !important" )
			).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = ( iframe[0].contentWindow || iframe[0].contentDocument ).document;
			doc.write("<!doctype html><html><body>");
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}

// Called ONLY from within css_defaultDisplay
function actualDisplay( name, doc ) {
	var elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),
		display = jQuery.css( elem[0], "display" );
	elem.remove();
	return display;
}

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				return elem.offsetWidth === 0 && rdisplayswap.test( jQuery.css( elem, "display" ) ) ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.support.boxSizing && jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

if ( !jQuery.support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			// if value === "", then remove inline opacity #12685
			if ( ( value >= 1 || value === "" ) &&
					jQuery.trim( filter.replace( ralpha, "" ) ) === "" &&
					style.removeAttribute ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there is no filter style applied in a css rule or unset inline opacity, we are done
				if ( value === "" || currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

// These hooks cannot be added until DOM ready because the support test
// for it is not run until after DOM ready
jQuery(function() {
	if ( !jQuery.support.reliableMarginRight ) {
		jQuery.cssHooks.marginRight = {
			get: function( elem, computed ) {
				if ( computed ) {
					// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
					// Work around by temporarily setting element display to inline-block
					return jQuery.swap( elem, { "display": "inline-block" },
						curCSS, [ elem, "marginRight" ] );
				}
			}
		};
	}

	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// getComputedStyle returns percent when specified for top/left/bottom/right
	// rather than make the css module depend on the offset module, we just check for it here
	if ( !jQuery.support.pixelPosition && jQuery.fn.position ) {
		jQuery.each( [ "top", "left" ], function( i, prop ) {
			jQuery.cssHooks[ prop ] = {
				get: function( elem, computed ) {
					if ( computed ) {
						computed = curCSS( elem, prop );
						// if curCSS returns percentage, fallback to offset
						return rnumnonpx.test( computed ) ?
							jQuery( elem ).position()[ prop ] + "px" :
							computed;
					}
				}
			};
		});
	}

});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.hidden = function( elem ) {
		// Support: Opera <= 12.12
		// Opera reports offsetWidths and offsetHeights less than zero on some elements
		return elem.offsetWidth <= 0 && elem.offsetHeight <= 0 ||
			(!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || jQuery.css( elem, "display" )) === "none");
	};

	jQuery.expr.filters.visible = function( elem ) {
		return !jQuery.expr.filters.hidden( elem );
	};
}

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});
var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function(){
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function(){
			var type = this.type;
			// Use .is(":disabled") so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !manipulation_rcheckableType.test( type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

//Serialize an array of form elements or a set of
//key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}
jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});
var
	// Document location
	ajaxLocParts,
	ajaxLocation,
	ajax_nonce = jQuery.now(),

	ajax_rquery = /\?/,
	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( core_rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType[0] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var deep, key,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, response, type,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off, url.length );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ){
	jQuery.fn[ type ] = function( fn ){
		return this.on( type, fn );
	};
});

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // Cross-domain detection vars
			parts,
			// Loop variable
			i,
			// URL without anti-cache param
			cacheURL,
			// Response headers as string
			responseHeadersString,
			// timeout handle
			timeoutTimer,

			// To know if global events are to be dispatched
			fireGlobals,

			transport,
			// Response headers
			responseHeaders,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( core_rnotwhite ) || [""];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( ajax_rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + ajax_nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( ajax_rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ajax_nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {
	var firstDataType, ct, finalDataType, type,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}
// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || jQuery("head")[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement("script");

				script.async = true;

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( script.parentNode ) {
							script.parentNode.removeChild( script );
						}

						// Dereference the script
						script = null;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};

				// Circumvent IE6 bugs with base elements (#2709 and #4378) by prepending
				// Use native DOM manipulation to avoid our domManip AJAX trickery
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( undefined, true );
				}
			}
		};
	}
});
var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( ajax_nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( ajax_rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});
var xhrCallbacks, xhrSupported,
	xhrId = 0,
	// #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject && function() {
		// Abort all pending requests
		var key;
		for ( key in xhrCallbacks ) {
			xhrCallbacks[ key ]( undefined, true );
		}
	};

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject("Microsoft.XMLHTTP");
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
xhrSupported = jQuery.ajaxSettings.xhr();
jQuery.support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
xhrSupported = jQuery.support.ajax = !!xhrSupported;

// Create transport if the browser can provide an xhr
if ( xhrSupported ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var handle, i,
						xhr = s.xhr();

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers["X-Requested-With"] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( err ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {
						var status, responseHeaders, statusText, responses;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occurred
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									responses = {};
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									if ( typeof xhr.responseText === "string" ) {
										responses.text = xhr.responseText;
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					if ( !s.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback );
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback( undefined, true );
					}
				}
			};
		}
	});
}
var fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*
					// Use a string for doubling factor so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur()
				// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		}]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// we're done with this property
			return tween;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = jQuery._data( elem, "fxshow" );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		if ( jQuery.css( elem, "display" ) === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			if ( !jQuery.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";

			} else {
				style.zoom = 1;
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !jQuery.support.shrinkWrapBlocks ) {
			anim.always(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}


	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {
				continue;
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = jQuery._data( elem, "fxshow", {} );
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;
			jQuery._removeData( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9
// Panic based approach to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || jQuery._data( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = jQuery._data( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = jQuery._data( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// enable finishing flag on private data
			data.finish = true;

			// empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// turn off finishing flag
			delete data.finish;
		});
	}
});

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth? 1 : 0;
	for( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p*Math.PI ) / 2;
	}
};

jQuery.timers = [];
jQuery.fx = Tween.prototype.init;
jQuery.fx.tick = function() {
	var timer,
		timers = jQuery.timers,
		i = 0;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	if ( timer() && jQuery.timers.push( timer ) ) {
		jQuery.fx.start();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};

// Back Compat <1.8 extension point
jQuery.fx.step = {};

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}
jQuery.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				jQuery.offset.setOffset( this, options, i );
			});
	}

	var docElem, win,
		box = { top: 0, left: 0 },
		elem = this[ 0 ],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return;
	}

	docElem = doc.documentElement;

	// Make sure it's not a disconnected DOM node
	if ( !jQuery.contains( docElem, elem ) ) {
		return box;
	}

	// If we don't have gBCR, just use 0,0 rather than error
	// BlackBerry 5, iOS 3 (original iPhone)
	if ( typeof elem.getBoundingClientRect !== core_strundefined ) {
		box = elem.getBoundingClientRect();
	}
	win = getWindow( doc );
	return {
		top: box.top  + ( win.pageYOffset || docElem.scrollTop )  - ( docElem.clientTop  || 0 ),
		left: box.left + ( win.pageXOffset || docElem.scrollLeft ) - ( docElem.clientLeft || 0 )
	};
};

jQuery.offset = {

	setOffset: function( elem, options, i ) {
		var position = jQuery.css( elem, "position" );

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = jQuery( elem ),
			curOffset = curElem.offset(),
			curCSSTop = jQuery.css( elem, "top" ),
			curCSSLeft = jQuery.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


jQuery.fn.extend({

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			parentOffset = { top: 0, left: 0 },
			elem = this[ 0 ];

		// fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is it's only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// we assume that getBoundingClientRect is available when computed position is fixed
			offset = elem.getBoundingClientRect();
		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top  += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		return {
			top:  offset.top  - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true)
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;
			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position") === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent || docElem;
		});
	}
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return jQuery.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					win.document.documentElement[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}
// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return jQuery.access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
					// unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});
// Limit scope pollution from any deprecated API
// (function() {

// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;

// })();
if ( typeof module === "object" && module && typeof module.exports === "object" ) {
	// Expose jQuery as module.exports in loaders that implement the Node
	// module pattern (including browserify). Do not create the global, since
	// the user will be storing it themselves locally, and globals are frowned
	// upon in the Node module world.
	module.exports = jQuery;
} else {
	// Otherwise expose jQuery to the global object as usual
	window.jQuery = window.$ = jQuery;

	// Register as a named AMD module, since jQuery can be concatenated with other
	// files that may use define, but not via a proper concatenation script that
	// understands anonymous AMD modules. A named AMD is safest and most robust
	// way to register. Lowercase jquery is used because AMD module names are
	// derived from file names, and jQuery is normally delivered in a lowercase
	// file name. Do this after creating the global so that if an AMD module wants
	// to call noConflict to hide this version of jQuery, it will work.
	if ( typeof define === "function" && define.amd ) {
		define( "jquery", [], function () { return jQuery; } );
	}
}

})( window );

},{}],5:[function(require,module,exports){
// Globals: dict, currentWord, suggestionsIndex, suggestions, document
var jQuery = require("./jquery-1.10.1.js").jQueyr;
var Fuse = require("./fuse.min.js").Fuse;
var Bacon = require("./Bacon.js").Bacon;
var ALLDATA = require("./thesaurus").thes;
var Map = require("./hashmap.js").Map;


var Please = (function($) {
    // NEW CLEAN CODE FROM HERE
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
        gmail: {},
        icloud: {},
        jsfiddle: {},
        wiki: {},
        default: {}
    }

    var suggestionsBox = {
        draw: makeBox,
        curIndex: 0,
        nextSuggestion: function() {
            this.curIndex = (this.curIndex - 1 + this.suggestions.length) % this.suggestions.length;
            this.draw();
        },
        prevSuggestion: function() {
            this.curIndex = (this.curIndex + 1 + this.suggestions.length) % this.suggestions.length;
            this.draw();
        },
        suggestions: []
    }

    // This is called whenever we want to save the current dictionary into the
    // local storage area. We pass a some data to save and a callback which
    // will be called when the data has been saved. The arguments sent to the
    // call back are {data: data}. In the case of setLocalStorage, the data
    // will be just a string indicating that we're done saving.
    function saveDictionary(dict, callback) {
        chrome.extension.sendRequest(
            {method: "setLocalStorage", data: dict},
            callback);
    }

    // This is called whenever we want an update on the stored dicitonary
    // It will send a request to the background script which will query the
    // localstorage database and send a response of the form {data: data}
    function loadDictionary(callback) {
        chrome.extension.sendRequest(
            {method: "getLocalStorage", data: "dictionary"},
            function(response) {
                dictionary = response.data;
                if(callback)
                    callback();
        });
    }

    // This function has to be called in order for everything to work.
    // It setsup the event handlers, loads the thesaurus, queries the
    // database for the current dictionary and sets up a message passing port
    // between the background script and this script
    function start(callback) {
        // $(document).keydown(keyPressed);
        $(document)

        // Load thesaurus, rough way (TODO: change that loading)
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

        loadDictionary(callback);
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
            parseKeyPress(key, getCaretPosition(key.target) - 1, getText(key.target));
        }
    }

    function parseKeyPress(key) {
        if (!key) return;

        switch (key.which) {
            case KEYS.escape:
                $(".foundString").contents().unwrap();
                break;
            case KEYS.f:
                // TODO: clean this too
                if(key.ctrlKey && key.shiftKey) {
                    var search = prompt("Search for: ");
                    if(search === null)
                        return;

                    var splittedSearch = search.split(":");

                    if(splittedSearch.length === 1) {
                        please.getRelevant(splittedSearch[0]);
                        return;
                    }
                    searchInCategory(splittedSearch[0], splittedSearch[1], function(result) {
                        // TODO: check createTextBox and make it nice
                        // createTextbox(result, splittedSearch[1]);
                    });
                }
                break;
            case KEYS.c:
                if(key.ctrlKey && key.shiftKey) {
                    var cat = prompt("Save under: ");

                    if(cat || cat.length === 0)
                        return;
                    // TODO: check categorizeHighlightedText and make it nice
                    // categorizeHighlightedText(cat);
                }
                break;
            case KEYS.biggerThan:
                if(key.ctrlKey) {
                    suggestionsBox.nextSuggestion();
                }
                break;
            case KEYS.smallerThan:
                if(key.ctrlKey) {
                    suggestionsBox.prevSuggestion();
               }
               break;
            case KEYS.space:
                if(key.ctrlKey) {
                    // TODO: AUTOCOMPLETE STUFF HERE
                } else {
                    // TODO: save the word that was just typed in dictionary
                }
                break;
            default:
                return;
        }

        if (key.which === SPACE_KEY && key.ctrlKey) { // Ctrl + Space -- autocomplete
            // var curWord = getCurWord(cursorIndex, text);
            // // suggestions = getSuggestions(curWord);

            // replaceWord(key.target, cursorIndex - curWord.length, curWord, suggestions[suggestionsIndex]);
            // if(suggestions[suggestionsIndex]) {
            //     setCaretPosition(key.target, cursorIndex + suggestions[suggestionsIndex].length - curWord.length + 1);
            //     // setCursor(key.target, 5);
            // }

            // if(suggestions[suggestionsIndex]) {
            //     offsetLeft += 7*(suggestions[suggestionsIndex].length - curWord.length + 1);
            // }
            // clearSuggestions();

        } else if (isAlpha(String.fromCharCode(key.which)) || key.which === 8) {
            if(key.which === F_KEY && key.ctrlKey && key.altKey) {

            }
            if(key.which === C_KEY && key.ctrlKey && key.altKey && key.shiftKey) {

            }

            // if(doubleBackspace == 2) {
            //     if(dict.length) {
            //         dict.length--;
            //         savedDict.save({dict: dict});
            //     }
            // }
            // var curWord = getCurWord(cursorIndex, text);
            // suggestions = getSuggestions(curWord);
            // suggestionsIndex = 0;

            // var pos = $(key.target).getCaretPosition();
            // var textPos = $(key.target).position();
            // var thirdPos = (web === "gmail" ? {left: 830 + offsetLeft, top: 310 + offsetTop} : {left: 0, top: 0})
            // thirdPos = (web === "jsfiddle" ? {left: 260 + offsetLeft, top: 170 + offsetTop} : thirdPos);

            // thirdPos = (web === "wiki" ? {left: 210, top: 230 + offsetTop} : thirdPos);

            // $("#tip").css({
            //     left: pos.left + textPos.left + thirdPos.left,
            //     top: 5 + pos.top + textPos.top + thirdPos.top
            // }).show();

            // makeBox();

            // if (text.length === 1 && key.which === 8){
            //     clearSuggestions();
            // }
        } else if (key.which === UP_KEY && key.ctrlKey) { // Up

        } else if (key.which === DOWN_KEY && key.ctrlKey) { // Down

        } else if (isWhitespace(String.fromCharCode(key.which))) {
            // if(key.which === 13) {
            //     offsetTop += offsetConstant;
            //     offsetLeft = 0;
            // }
            // var word = getCurWord(cursorIndex, text);
            // if(word) {
            //     var found = false;
            //     for (var i = 0; i < dict.length; i++) {
            //         if (dict[i] === word) {
            //             found = true;
            //             break;
            //         }
            //     }
            //     if (!found && word.length > 4){
            //         dict.push(word);
            //         didYouMean(word, function(correct) {
            //             console.log("Did you mean: " + correct);
            //         });
            //     }

            // }
            // clearSuggestions();
        }
    }

    // TODO: clean this up
    function makeBox(){
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
    }


    function isAlpha(ch) {
        return (ALPHAS.indexOf(ch) != -1)
    }


    // TO HERE
    var dict = [];
    var SavedDictionary = null;
    var savedDict = null;
    var suggestionsIndex = 0;
    var suggestions = [];

    var USER_ID = "123456789";
    var doubleBackspace = 0;
    var offsetLeft = 0, offsetTop = 0;
    var offsetConstant = 4;
    var isOn = null;


    var please = {
        start: function(callback) {

            Parse.initialize("vGoyexsmOZWiBc75B1J7QWiQloHuQ0VlaXjl88b2", "IyL0wnodV3e41IytbRhqxBt2JSFekFHKAds7u0Kt");

            SavedDictionary = Parse.Object.extend("SavedDictionary");
            // savedDict = new SavedDictionary();

            // Get the thesaurus
            // $.get("thesaurus", function(data) {
            //
            // });

        },


    };
    // function loadDictionary(callback) {
    //     console.log("Querying database...");
    //     var query = new Parse.Query(SavedDictionary);

    //     query.equalTo("USER_ID", USER_ID);
    //     query.find({
    //         success: function(saveDictionary) {
    //             savedDict = saveDictionary[0];
    //             if(savedDict){
    //                 dict = saveDictionary[0].get("dict");
    //                 isOn = saveDictionary[0].get("state");
    //                 // console.log(dict);

    //                 // Rewrite push so that we save it everytime we push
    //                 dict.push = function (){
    //                     for( var i = 0, l = arguments.length; i < l; i++ )
    //                     {
    //                         this[this.length] = arguments[i];
    //                     }

    //                     console.log("dict " + dict);

    //                     if(savedDict) {
    //                         savedDict.save({'dict': dict}, {
    //                             success: function() {
    //                                 savedDict.set('dict', dict);
    //                                 console.log("saved");
    //                             },
    //                             error: function(obj, error) {
    //                                 console.log("ERROR");
    //                             }
    //                         });
    //                     }
    //                     return this.length;
    //                 };
    //                 var div = document.createElement('div');
    //                 $(div).addClass("searchResult");
    //                 $(div).html("<span style='position: absolute; top: 30px; left: 30px;'>SuperText ready.</span>");
    //                 $(div).css({opacity: 1, width: 150, height: 100, "font-size": 20, left: "calc(100% - 151px)", top: "0px", "background-image": "-webkit-linear-gradient(right bottom, #FFFFFF 0%, GhostWhite 100%)"});
    //                 document.body.appendChild(div);
    //                 $(div).animate({opacity: 0}, 1500);

    //                 console.log("Dictionary loaded.");
    //                 if(callback)
    //                     callback();
    //             } else {
    //                 savedDict = new SavedDictionary();
    //                 savedDict.set("USER_ID", USER_ID);
    //                 savedDict.set("dict", []);
    //                 savedDict.set("request", "");
    //                 savedDict.save();
    //             }
    //         },
    //         error: function(object, error) {
    //             console.log("Error: " + error);
    //         }
    //     })
    // }

    function clearSuggestions(){
        suggestions = [];
        makeBox();
    }

    function parseKeyPress(key, cursorIndex, text) {
        if (!key) return;
        // Check at end of text or followed by whitespace
        if (text.length > cursorIndex + 1 && isAlpha(text.charAt(cursorIndex + 1))) {
            clearSuggestions();
            return;
        }
        if(key.which === 27) {
            $(".foundString").removeClass("foundString");
        }
        if(key.ctrlKey || key.shiftKey) {
            if(key.which !== SPACE_KEY && key.which !== UP_KEY && key.which !== DOWN_KEY && key.which !== F_KEY && key.which !== C_KEY) {
                return;
            }
        }
        if (key.which === SPACE_KEY && key.ctrlKey) { // Ctrl + Space -- autocomplete
            // var curWord = getCurWord(cursorIndex, text);
            // // suggestions = getSuggestions(curWord);

            // replaceWord(key.target, cursorIndex - curWord.length, curWord, suggestions[suggestionsIndex]);
            // if(suggestions[suggestionsIndex]) {
            //     setCaretPosition(key.target, cursorIndex + suggestions[suggestionsIndex].length - curWord.length + 1);
            //     // setCursor(key.target, 5);
            // }

            // if(suggestions[suggestionsIndex]) {
            //     offsetLeft += 7*(suggestions[suggestionsIndex].length - curWord.length + 1);
            // }
            // clearSuggestions();

        } else if (isAlpha(String.fromCharCode(key.which)) || key.which === 8) {
             // alpha or backspace
             if(key.which === 8) {
                doubleBackspace++;

                offsetLeft -= offsetConstant;
             } else {
                offsetLeft += offsetConstant;
                doubleBackspace = 0;
             }


            if(key.which === F_KEY && key.ctrlKey && key.altKey) {
                var search = prompt("Enter search word like so category:word");

                if(search === null)
                    return;
                var splittedSearch = search.split(":");
                // console.log(splittedSearch);

                if(splittedSearch.length === 1) {
                    please.getRelevant(splittedSearch[0]);
                    return;
                }
                searchInCategory(splittedSearch[0], splittedSearch[1], function(result) {
                    createTextbox(result, splittedSearch[1]);
                    // console.log(result);
                });
            }
            if(key.which === C_KEY && key.ctrlKey && key.altKey && key.shiftKey) {
                var cat = prompt("Enter a category to save the highlighted text");
                if(cat && cat.length ===0)
                    return;
                categorizeHighlightedText(cat);
            }

            // if(doubleBackspace == 2) {
            //     if(dict.length) {
            //         dict.length--;
            //         savedDict.save({dict: dict});
            //     }
            // }
            // var curWord = getCurWord(cursorIndex, text);
            // suggestions = getSuggestions(curWord);
            // suggestionsIndex = 0;

            // var pos = $(key.target).getCaretPosition();
            // var textPos = $(key.target).position();
            // var thirdPos = (web === "gmail" ? {left: 830 + offsetLeft, top: 310 + offsetTop} : {left: 0, top: 0})
            // thirdPos = (web === "jsfiddle" ? {left: 260 + offsetLeft, top: 170 + offsetTop} : thirdPos);

            // thirdPos = (web === "wiki" ? {left: 210, top: 230 + offsetTop} : thirdPos);

            // $("#tip").css({
            //     left: pos.left + textPos.left + thirdPos.left,
            //     top: 5 + pos.top + textPos.top + thirdPos.top
            // }).show();

            // makeBox();

            // if (text.length === 1 && key.which === 8){
            //     clearSuggestions();
            // }
        } else if (key.which === UP_KEY && key.ctrlKey) { // Up
            suggestionsIndex = (suggestionsIndex - 1 + suggestions.length) % suggestions.length;
            makeBox();
        } else if (key.which === DOWN_KEY && key.ctrlKey) { // Down
            suggestionsIndex = (suggestionsIndex + 1) % suggestions.length;

            makeBox();
        } else if (isWhitespace(String.fromCharCode(key.which))) {
            // if(key.which === 13) {
            //     offsetTop += offsetConstant;
            //     offsetLeft = 0;
            // }
            // var word = getCurWord(cursorIndex, text);
            // if(word) {
            //     var found = false;
            //     for (var i = 0; i < dict.length; i++) {
            //         if (dict[i] === word) {
            //             found = true;
            //             break;
            //         }
            //     }
            //     if (!found && word.length > 4){
            //         dict.push(word);
            //         didYouMean(word, function(correct) {
            //             console.log("Did you mean: " + correct);
            //         });
            //     }

            // }
            // clearSuggestions();
        }
    }
    function didYouMean(word, callback) {
        var query = new Parse.Query("SavedDictionary");
        query.equalTo("USER_ID", USER_ID);

        query.find({
            success: function(data) {
                var dictionary = data[0].get("didyoumean");
                var f = new Fuse(dictionary);
                result = f.search(word);
                callback(dict[result[0]])
            },
            error: function(data, error) {

            }
        });
    }

    function setEndOfContenteditable(contentEditableElement)
    {
        contentEditableElement = $(".Am.Al.editable.LW-avf")[0];

        // while(contentEditableElement.lastChild &&
        //       contentEditableElement.lastChild.tagName.toLowerCase() != 'br') {
        //     contentEditableElement = contentEditableElement.lastChild;
        // }

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
    // function setCursor(node,pos){
    //     if(web === "gmail") {
    //         setEndOfContenteditable(node);
    //         return;
    //     }
    // var node = (typeof node == "string" ||
    // node instanceof String) ? document.getElementById(node) : node;
    //     if(!node){
    //         return false;
    //     }else if(node.createTextRange){
    //         var textRange = node.createTextRange();
    //         textRange.collapse(true);
    //         textRange.moveEnd(pos);
    //         textRange.moveStart(pos);
    //         textRange.select();
    //         return true;
    //     }else if(node.setSelectionRange){
    //         node.setSelectionRange(pos,pos);
    //         return true;
    //     }
    //     return false;
    // }
    function getCurWord(cursorIndex, text) {
        var beg = 0;
        for (var i = cursorIndex; i >= 0; i--) {
            if (isWhitespace(text.charAt(i))) {
                beg = i + 1;
                break;
            }
        }
        return text.substring(beg, cursorIndex + 1);
    }

    function replaceWord(div, pos, oldWord, newWord) {
        console.log("Replace '" + oldWord + "' with '" + newWord + "'");

        if(newWord) {
            if(web === "facebook") {
                // var txt = $(div).children('textarea').context.value;
                // while(txt.length && txt[txt.length - 1] !== ' ') {
                //     txt.length--;
                // }
                // $(div).children('textarea').context.value = (txt.join('') + words[0]);
                // console.log($(div).children('textarea').context.value);
                console.log("Not handling facebook yet...");
            } else if(web === "gmail") {
                var txt = $(div).html().trim();
                var first = txt.substring(0, pos + 1);
                var last = txt.substring(pos + oldWord.length + 1, txt.length);
                $(div).html(first + newWord + last);
            } else {
                var txt = $(div).val().trim();
                var first = txt.substring(0, pos + 1);
                var last = txt.substring(pos + oldWord.length + 1, txt.length);
                $(div).val(first + newWord + last);
            }
        }
    }
    function getText(div) {
        if(web === "facebook") {
            console.log("NOPE");
        } else if(web === "gmail") {
            return $(div).html().replace("&nbsp;", " ");
        } else if (web === "icloud"){
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
        var query = new Parse.Query("SavedDictionary");
        query.equalTo("USER_ID", USER_ID);
        query.find({
          success: function(results) {
            var list = (category ? results[0].get(category) : results[0].get(category));
            // console.log("list: " + list);
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
          },
          error: function(error) {
            alert("Error: " + error.code + " " + error.message);
          }
        });
    }
    function saveInCategory(category, highlight) {
        //var data = Parse.Object.extend();
        var query = new Parse.Query("SavedDictionary");
        query.equalTo("USER_ID", USER_ID);
        query.find({
            success: function(results) {
                var list = results[0].get(category);
                if (list) {
                    list.push(highlight);
                } else {
                    list = [highlight];
                }

                results[0].set(category, list);
                results[0].save();
              },
              error: function(error) {
                alert("Error: " + error.code + " " + error.message);
              }
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
        console.log("saved: " + html);
       saveInCategory(category, html);

    }

    function createTextbox(text, search) {
        if(text.length === 0 || search.length === 0)
            text = "No matching category or word found.";
        var textbox = document.createElement('div');
        var inside = document.createElement('div');
        var body = text.toLowerCase();
        search = search.split(" ");

        for (var i = 0; i < search.length; i++) {
            var index = body.indexOf(search[i]);
            while (index != -1) {
                var beginning = body.substring(0,index);
                var middle = '<span class="foundString">' + search[i] + "</span>";
                var end = body.substring(index + search[i].length, body.length);
                body = beginning + middle + end;
                index = body.indexOf(search[i], index + middle.length);
                // console.log(index + "  " + search[i]);
            }
        }
        $(inside).html(body);
        $(inside).addClass("inside");
        $(textbox).addClass("searchResult");
        textbox.appendChild(inside);
        document.body.appendChild(textbox);
        $(document).click(function() {
            $(textbox).remove();
        });
    }

    return please;
})(jQuery);


Please.start();


},{"./Bacon.js":1,"./fuse.min.js":2,"./hashmap.js":3,"./jquery-1.10.1.js":4,"./thesaurus":6}],6:[function(require,module,exports){
var ALLDATA = "foul                dirty soiled disgusting unpleasant*\
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

},{}]},{},[5])
;