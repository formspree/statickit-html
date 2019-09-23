var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var runtime_1 = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined$1; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined$1) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined$1;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined$1;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined$1;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined$1, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined$1;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined$1;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined$1;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined$1;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined$1;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   module.exports 
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}
});

var regenerator = runtime_1;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

var asyncToGenerator = _asyncToGenerator;

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var classCallCheck = _classCallCheck;

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var createClass = _createClass;

// Polyfill from  https://github.com/MaxArt2501/base64-js/blob/master/base64.js
(function () {
  // base64 character set, plus padding character (=)
  var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
      // Regular expression to check formal correctness of base64 encoded strings
  b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;

  window.btoa = window.btoa || function (string) {
    string = String(string);
    var bitmap,
        a,
        b,
        c,
        result = '',
        i = 0,
        rest = string.length % 3; // To determine the final padding

    for (; i < string.length;) {
      if ((a = string.charCodeAt(i++)) > 255 || (b = string.charCodeAt(i++)) > 255 || (c = string.charCodeAt(i++)) > 255) throw new TypeError("Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range.");
      bitmap = a << 16 | b << 8 | c;
      result += b64.charAt(bitmap >> 18 & 63) + b64.charAt(bitmap >> 12 & 63) + b64.charAt(bitmap >> 6 & 63) + b64.charAt(bitmap & 63);
    } // If there's need of padding, replace the last 'A's with equal signs


    return rest ? result.slice(0, rest - 3) + '==='.substring(rest) : result;
  };

  window.atob = window.atob || function (string) {
    // atob can work with strings with whitespaces, even inside the encoded part,
    // but only \t, \n, \f, \r and ' ', which can be stripped.
    string = String(string).replace(/[\t\n\f\r ]+/g, '');
    if (!b64re.test(string)) throw new TypeError("Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded."); // Adding the padding if missing, for semplicity

    string += '=='.slice(2 - (string.length & 3));
    var bitmap,
        result = '',
        r1,
        r2,
        i = 0;

    for (; i < string.length;) {
      bitmap = b64.indexOf(string.charAt(i++)) << 18 | b64.indexOf(string.charAt(i++)) << 12 | (r1 = b64.indexOf(string.charAt(i++))) << 6 | (r2 = b64.indexOf(string.charAt(i++)));
      result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255) : r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255) : String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
    }

    return result;
  };
})();

/**
 * Base-64 encodes a (JSON-castable) object.
 *
 * @param {object} obj - The object to encode.
 * @returns {string}
 */

var encode = function encode(obj) {
  return window.btoa(JSON.stringify(obj));
};
/**
 * Appends a key-value pair to a target.
 *
 * @param {object|FormData} target
 * @param {string} key
 * @param {string} value
 */

var append = function append(target, key, value) {
  if (target.append) {
    target.append(key, value);
  } else {
    data[key] = value;
  }
};

var O = 'object';
var check = function (it) {
  return it && it.Math == Math && it;
};

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global_1 =
  // eslint-disable-next-line no-undef
  check(typeof globalThis == O && globalThis) ||
  check(typeof window == O && window) ||
  check(typeof self == O && self) ||
  check(typeof commonjsGlobal == O && commonjsGlobal) ||
  // eslint-disable-next-line no-new-func
  Function('return this')();

var fails = function (exec) {
  try {
    return !!exec();
  } catch (error) {
    return true;
  }
};

// Thank's IE8 for his funny defineProperty
var descriptors = !fails(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// Nashorn ~ JDK8 bug
var NASHORN_BUG = getOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

// `Object.prototype.propertyIsEnumerable` method implementation
// https://tc39.github.io/ecma262/#sec-object.prototype.propertyisenumerable
var f = NASHORN_BUG ? function propertyIsEnumerable(V) {
  var descriptor = getOwnPropertyDescriptor(this, V);
  return !!descriptor && descriptor.enumerable;
} : nativePropertyIsEnumerable;

var objectPropertyIsEnumerable = {
	f: f
};

var createPropertyDescriptor = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var toString = {}.toString;

var classofRaw = function (it) {
  return toString.call(it).slice(8, -1);
};

var split = ''.split;

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var indexedObject = fails(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins
  return !Object('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classofRaw(it) == 'String' ? split.call(it, '') : Object(it);
} : Object;

// `RequireObjectCoercible` abstract operation
// https://tc39.github.io/ecma262/#sec-requireobjectcoercible
var requireObjectCoercible = function (it) {
  if (it == undefined) throw TypeError("Can't call method on " + it);
  return it;
};

// toObject with fallback for non-array-like ES3 strings



var toIndexedObject = function (it) {
  return indexedObject(requireObjectCoercible(it));
};

var isObject = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

// `ToPrimitive` abstract operation
// https://tc39.github.io/ecma262/#sec-toprimitive
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
var toPrimitive = function (input, PREFERRED_STRING) {
  if (!isObject(input)) return input;
  var fn, val;
  if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
  if (typeof (fn = input.valueOf) == 'function' && !isObject(val = fn.call(input))) return val;
  if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject(val = fn.call(input))) return val;
  throw TypeError("Can't convert object to primitive value");
};

var hasOwnProperty = {}.hasOwnProperty;

var has = function (it, key) {
  return hasOwnProperty.call(it, key);
};

var document$1 = global_1.document;
// typeof document.createElement is 'object' in old IE
var EXISTS = isObject(document$1) && isObject(document$1.createElement);

var documentCreateElement = function (it) {
  return EXISTS ? document$1.createElement(it) : {};
};

// Thank's IE8 for his funny defineProperty
var ie8DomDefine = !descriptors && !fails(function () {
  return Object.defineProperty(documentCreateElement('div'), 'a', {
    get: function () { return 7; }
  }).a != 7;
});

var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// `Object.getOwnPropertyDescriptor` method
// https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptor
var f$1 = descriptors ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject(O);
  P = toPrimitive(P, true);
  if (ie8DomDefine) try {
    return nativeGetOwnPropertyDescriptor(O, P);
  } catch (error) { /* empty */ }
  if (has(O, P)) return createPropertyDescriptor(!objectPropertyIsEnumerable.f.call(O, P), O[P]);
};

var objectGetOwnPropertyDescriptor = {
	f: f$1
};

var replacement = /#|\.prototype\./;

var isForced = function (feature, detection) {
  var value = data$1[normalize(feature)];
  return value == POLYFILL ? true
    : value == NATIVE ? false
    : typeof detection == 'function' ? fails(detection)
    : !!detection;
};

var normalize = isForced.normalize = function (string) {
  return String(string).replace(replacement, '.').toLowerCase();
};

var data$1 = isForced.data = {};
var NATIVE = isForced.NATIVE = 'N';
var POLYFILL = isForced.POLYFILL = 'P';

var isForced_1 = isForced;

var path = {};

var aFunction = function (it) {
  if (typeof it != 'function') {
    throw TypeError(String(it) + ' is not a function');
  } return it;
};

// optional / simple context binding
var bindContext = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 0: return function () {
      return fn.call(that);
    };
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

var anObject = function (it) {
  if (!isObject(it)) {
    throw TypeError(String(it) + ' is not an object');
  } return it;
};

var nativeDefineProperty = Object.defineProperty;

// `Object.defineProperty` method
// https://tc39.github.io/ecma262/#sec-object.defineproperty
var f$2 = descriptors ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (ie8DomDefine) try {
    return nativeDefineProperty(O, P, Attributes);
  } catch (error) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

var objectDefineProperty = {
	f: f$2
};

var hide = descriptors ? function (object, key, value) {
  return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;






var wrapConstructor = function (NativeConstructor) {
  var Wrapper = function (a, b, c) {
    if (this instanceof NativeConstructor) {
      switch (arguments.length) {
        case 0: return new NativeConstructor();
        case 1: return new NativeConstructor(a);
        case 2: return new NativeConstructor(a, b);
      } return new NativeConstructor(a, b, c);
    } return NativeConstructor.apply(this, arguments);
  };
  Wrapper.prototype = NativeConstructor.prototype;
  return Wrapper;
};

/*
  options.target      - name of the target object
  options.global      - target is the global object
  options.stat        - export as static methods of target
  options.proto       - export as prototype methods of target
  options.real        - real prototype method for the `pure` version
  options.forced      - export even if the native feature is available
  options.bind        - bind methods to the target, required for the `pure` version
  options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe      - use the simple assignment of property instead of delete + defineProperty
  options.sham        - add a flag to not completely full polyfills
  options.enumerable  - export as enumerable property
  options.noTargetGet - prevent calling a getter on target
*/
var _export = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var PROTO = options.proto;

  var nativeSource = GLOBAL ? global_1 : STATIC ? global_1[TARGET] : (global_1[TARGET] || {}).prototype;

  var target = GLOBAL ? path : path[TARGET] || (path[TARGET] = {});
  var targetPrototype = target.prototype;

  var FORCED, USE_NATIVE, VIRTUAL_PROTOTYPE;
  var key, sourceProperty, targetProperty, nativeProperty, resultProperty, descriptor;

  for (key in source) {
    FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
    // contains in native
    USE_NATIVE = !FORCED && nativeSource && has(nativeSource, key);

    targetProperty = target[key];

    if (USE_NATIVE) if (options.noTargetGet) {
      descriptor = getOwnPropertyDescriptor$1(nativeSource, key);
      nativeProperty = descriptor && descriptor.value;
    } else nativeProperty = nativeSource[key];

    // export native or implementation
    sourceProperty = (USE_NATIVE && nativeProperty) ? nativeProperty : source[key];

    if (USE_NATIVE && typeof targetProperty === typeof sourceProperty) continue;

    // bind timers to global for call from export context
    if (options.bind && USE_NATIVE) resultProperty = bindContext(sourceProperty, global_1);
    // wrap global constructors for prevent changs in this version
    else if (options.wrap && USE_NATIVE) resultProperty = wrapConstructor(sourceProperty);
    // make static versions for prototype methods
    else if (PROTO && typeof sourceProperty == 'function') resultProperty = bindContext(Function.call, sourceProperty);
    // default case
    else resultProperty = sourceProperty;

    // add a flag to not completely full polyfills
    if (options.sham || (sourceProperty && sourceProperty.sham) || (targetProperty && targetProperty.sham)) {
      hide(resultProperty, 'sham', true);
    }

    target[key] = resultProperty;

    if (PROTO) {
      VIRTUAL_PROTOTYPE = TARGET + 'Prototype';
      if (!has(path, VIRTUAL_PROTOTYPE)) hide(path, VIRTUAL_PROTOTYPE, {});
      // export virtual prototype methods
      path[VIRTUAL_PROTOTYPE][key] = sourceProperty;
      // export real prototype methods
      if (options.real && targetPrototype && !targetPrototype[key]) hide(targetPrototype, key, sourceProperty);
    }
  }
};

var ceil = Math.ceil;
var floor = Math.floor;

// `ToInteger` abstract operation
// https://tc39.github.io/ecma262/#sec-tointeger
var toInteger = function (argument) {
  return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
};

var min = Math.min;

// `ToLength` abstract operation
// https://tc39.github.io/ecma262/#sec-tolength
var toLength = function (argument) {
  return argument > 0 ? min(toInteger(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
};

var max = Math.max;
var min$1 = Math.min;

// Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(length, length).
var toAbsoluteIndex = function (index, length) {
  var integer = toInteger(index);
  return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
};

// `Array.prototype.{ indexOf, includes }` methods implementation
var createMethod = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) {
      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var arrayIncludes = {
  // `Array.prototype.includes` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  includes: createMethod(true),
  // `Array.prototype.indexOf` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
  indexOf: createMethod(false)
};

var hiddenKeys = {};

var indexOf = arrayIncludes.indexOf;


var objectKeysInternal = function (object, names) {
  var O = toIndexedObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~indexOf(result, key) || result.push(key);
  }
  return result;
};

// IE8- don't enum bug keys
var enumBugKeys = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];

// `Object.keys` method
// https://tc39.github.io/ecma262/#sec-object.keys
var objectKeys = Object.keys || function keys(O) {
  return objectKeysInternal(O, enumBugKeys);
};

var f$3 = Object.getOwnPropertySymbols;

var objectGetOwnPropertySymbols = {
	f: f$3
};

// `ToObject` abstract operation
// https://tc39.github.io/ecma262/#sec-toobject
var toObject = function (argument) {
  return Object(requireObjectCoercible(argument));
};

var nativeAssign = Object.assign;

// `Object.assign` method
// https://tc39.github.io/ecma262/#sec-object.assign
// should work with symbols and should have deterministic property order (V8 bug)
var objectAssign = !nativeAssign || fails(function () {
  var A = {};
  var B = {};
  // eslint-disable-next-line no-undef
  var symbol = Symbol();
  var alphabet = 'abcdefghijklmnopqrst';
  A[symbol] = 7;
  alphabet.split('').forEach(function (chr) { B[chr] = chr; });
  return nativeAssign({}, A)[symbol] != 7 || objectKeys(nativeAssign({}, B)).join('') != alphabet;
}) ? function assign(target, source) { // eslint-disable-line no-unused-vars
  var T = toObject(target);
  var argumentsLength = arguments.length;
  var index = 1;
  var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
  var propertyIsEnumerable = objectPropertyIsEnumerable.f;
  while (argumentsLength > index) {
    var S = indexedObject(arguments[index++]);
    var keys = getOwnPropertySymbols ? objectKeys(S).concat(getOwnPropertySymbols(S)) : objectKeys(S);
    var length = keys.length;
    var j = 0;
    var key;
    while (length > j) {
      key = keys[j++];
      if (!descriptors || propertyIsEnumerable.call(S, key)) T[key] = S[key];
    }
  } return T;
} : nativeAssign;

// `Object.assign` method
// https://tc39.github.io/ecma262/#sec-object.assign
_export({ target: 'Object', stat: true, forced: Object.assign !== objectAssign }, {
  assign: objectAssign
});

var assign = path.Object.assign;

var assign$1 = assign;

var StaticKit =
/*#__PURE__*/
function () {
  function StaticKit() {
    var _this = this;

    classCallCheck(this, StaticKit);

    this.session = {
      loadedAt: 1 * new Date(),
      mousemove: 0,
      keydown: 0,
      webdriver: navigator.webdriver || document.documentElement.getAttribute('webdriver') || !!window.callPhantom || !!window._phantom
    };
    window.addEventListener('mousemove', function () {
      _this.session.mousemove += 1;
    });
    window.addEventListener('keydown', function () {
      _this.session.keydown += 1;
    });
  }
  /**
   * Submits a form.
   *
   * @param {object} props
   * @returns {object}
   */


  createClass(StaticKit, [{
    key: "submitForm",
    value: function () {
      var _submitForm = asyncToGenerator(
      /*#__PURE__*/
      regenerator.mark(function _callee(props) {
        var endpoint, url, data, session, response, body;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (props.id) {
                  _context.next = 2;
                  break;
                }

                throw new Error('You must provide an `id` for the form');

              case 2:
                endpoint = props.endpoint || 'https://api.statickit.com';
                url = "".concat(endpoint, "/j/forms/").concat(props.id, "/submissions");
                data = props.data || {};
                session = assign$1({}, this.session, {
                  submittedAt: 1 * new Date()
                });
                append(data, '_t', encode(session));
                _context.next = 9;
                return fetch(url, {
                  method: 'POST',
                  mode: 'cors',
                  body: data
                });

              case 9:
                response = _context.sent;
                _context.next = 12;
                return response.json();

              case 12:
                body = _context.sent;
                return _context.abrupt("return", {
                  body: body,
                  response: response
                });

              case 14:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function submitForm(_x) {
        return _submitForm.apply(this, arguments);
      }

      return submitForm;
    }()
  }]);

  return StaticKit;
}();
/**
 * Constructs the client object.
 */


var index = (function () {
  return new StaticKit();
});

function _typeof(obj) {
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function asyncGeneratorStep$1(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator$1(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep$1(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep$1(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule$1(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
var browserSplit = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

var indexOf$1 = [].indexOf;

var indexof = function(arr, obj){
  if (indexOf$1) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};

// contains, add, remove, toggle


var classList = ClassList;

function ClassList(elem) {
    var cl = elem.classList;

    if (cl) {
        return cl
    }

    var classList = {
        add: add
        , remove: remove
        , contains: contains
        , toggle: toggle
        , toString: $toString
        , length: 0
        , item: item
    };

    return classList

    function add(token) {
        var list = getTokens();
        if (indexof(list, token) > -1) {
            return
        }
        list.push(token);
        setTokens(list);
    }

    function remove(token) {
        var list = getTokens()
            , index = indexof(list, token);

        if (index === -1) {
            return
        }

        list.splice(index, 1);
        setTokens(list);
    }

    function contains(token) {
        return indexof(getTokens(), token) > -1
    }

    function toggle(token) {
        if (contains(token)) {
            remove(token);
            return false
        } else {
            add(token);
            return true
        }
    }

    function $toString() {
        return elem.className
    }

    function item(index) {
        var tokens = getTokens();
        return tokens[index] || null
    }

    function getTokens() {
        var className = elem.className;

        return filter(className.split(" "), isTruthy)
    }

    function setTokens(list) {
        var length = list.length;

        elem.className = list.join(" ");
        classList.length = length;

        for (var i = 0; i < list.length; i++) {
            classList[i] = list[i];
        }

        delete list[length];
    }
}

function filter (arr, fn) {
    var ret = [];
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) ret.push(arr[i]);
    }
    return ret
}

function isTruthy(value) {
    return !!value
}

/**
 * Utils for HTML attributes
 * @module html-attributes
 */

// property to attribute names
var PROPS_TO_ATTRS = {
  'className': 'class',
  'htmlFor': 'for',
};

// map of attributes to the elements they affect
// see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
var HTML_ATTRIBUTES = {
  'accept': new Set([
    'form',
    'input',
  ]),

  'accept-charset': new Set([
    'form',
  ]),

  'accesskey': 'GLOBAL',

  'action': new Set([
    'form',
  ]),

  'align': new Set([
    'applet',
    'caption',
    'col',
    'colgroup',
    'hr',
    'iframe',
    'img',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
  ]),

  'alt': new Set([
    'applet',
    'area',
    'img',
    'input',
  ]),

  'async': new Set([
    'script',
  ]),

  'autocomplete': new Set([
    'form',
    'input',
  ]),

  'autofocus': new Set([
    'button',
    'input',
    'keygen',
    'select',
    'textarea',
  ]),

  'autoplay': new Set([
    'audio',
    'video',
  ]),

  'autosave': new Set([
    'input',
  ]),

  'bgcolor': new Set([
    'body',
    'col',
    'colgroup',
    'marquee',
    'table',
    'tbody',
    'tfoot',
    'td',
    'th',
    'tr',
  ]),

  'border': new Set([
    'img',
    'object',
    'table',
  ]),

  'buffered': new Set([
    'audio',
    'video',
  ]),

  'challenge': new Set([
    'keygen',
  ]),

  'charset': new Set([
    'meta',
    'script',
  ]),

  'checked': new Set([
    'command',
    'input',
  ]),

  'cite': new Set([
    'blockquote',
    'del',
    'ins',
    'q',
  ]),

  'class': 'GLOBAL',

  'code': new Set([
    'applet',
  ]),

  'codebase': new Set([
    'applet',
  ]),

  'color': new Set([
    'basefont',
    'font',
    'hr',
  ]),

  'cols': new Set([
    'textarea',
  ]),

  'colspan': new Set([
    'td',
    'th',
  ]),

  'content': new Set([
    'meta',
  ]),

  'contenteditable': 'GLOBAL',

  'contextmenu': 'GLOBAL',

  'controls': new Set([
    'audio',
    'video',
  ]),

  'coords': new Set([
    'area',
  ]),

  'data': new Set([
    'object',
  ]),

  'datetime': new Set([
    'del',
    'ins',
    'time',
  ]),

  'default': new Set([
    'track',
  ]),

  'defer': new Set([
    'script',
  ]),

  'dir': 'GLOBAL',

  'dirname': new Set([
    'input',
    'textarea',
  ]),

  'disabled': new Set([
    'button',
    'command',
    'fieldset',
    'input',
    'keygen',
    'optgroup',
    'option',
    'select',
    'textarea',
  ]),

  'download': new Set([
    'a',
    'area',
  ]),

  'draggable': 'GLOBAL',

  'dropzone': 'GLOBAL',

  'enctype': new Set([
    'form',
  ]),

  'for': new Set([
    'label',
    'output',
  ]),

  'form': new Set([
    'button',
    'fieldset',
    'input',
    'keygen',
    'label',
    'meter',
    'object',
    'output',
    'progress',
    'select',
    'textarea',
  ]),

  'formaction': new Set([
    'input',
    'button',
  ]),

  'headers': new Set([
    'td',
    'th',
  ]),

  'height': new Set([
    'canvas',
    'embed',
    'iframe',
    'img',
    'input',
    'object',
    'video',
  ]),

  'hidden': 'GLOBAL',

  'high': new Set([
    'meter',
  ]),

  'href': new Set([
    'a',
    'area',
    'base',
    'link',
  ]),

  'hreflang': new Set([
    'a',
    'area',
    'link',
  ]),

  'http-equiv': new Set([
    'meta',
  ]),

  'icon': new Set([
    'command',
  ]),

  'id': 'GLOBAL',

  'ismap': new Set([
    'img',
  ]),

  'itemprop': 'GLOBAL',

  'keytype': new Set([
    'keygen',
  ]),

  'kind': new Set([
    'track',
  ]),

  'label': new Set([
    'track',
  ]),

  'lang': 'GLOBAL',

  'language': new Set([
    'script',
  ]),

  'list': new Set([
    'input',
  ]),

  'loop': new Set([
    'audio',
    'bgsound',
    'marquee',
    'video',
  ]),

  'low': new Set([
    'meter',
  ]),

  'manifest': new Set([
    'html',
  ]),

  'max': new Set([
    'input',
    'meter',
    'progress',
  ]),

  'maxlength': new Set([
    'input',
    'textarea',
  ]),

  'media': new Set([
    'a',
    'area',
    'link',
    'source',
    'style',
  ]),

  'method': new Set([
    'form',
  ]),

  'min': new Set([
    'input',
    'meter',
  ]),

  'multiple': new Set([
    'input',
    'select',
  ]),

  'muted': new Set([
    'video',
  ]),

  'name': new Set([
    'button',
    'form',
    'fieldset',
    'iframe',
    'input',
    'keygen',
    'object',
    'output',
    'select',
    'textarea',
    'map',
    'meta',
    'param',
  ]),

  'novalidate': new Set([
    'form',
  ]),

  'open': new Set([
    'details',
  ]),

  'optimum': new Set([
    'meter',
  ]),

  'pattern': new Set([
    'input',
  ]),

  'ping': new Set([
    'a',
    'area',
  ]),

  'placeholder': new Set([
    'input',
    'textarea',
  ]),

  'poster': new Set([
    'video',
  ]),

  'preload': new Set([
    'audio',
    'video',
  ]),

  'radiogroup': new Set([
    'command',
  ]),

  'readonly': new Set([
    'input',
    'textarea',
  ]),

  'rel': new Set([
    'a',
    'area',
    'link',
  ]),

  'required': new Set([
    'input',
    'select',
    'textarea',
  ]),

  'reversed': new Set([
    'ol',
  ]),

  'rows': new Set([
    'textarea',
  ]),

  'rowspan': new Set([
    'td',
    'th',
  ]),

  'sandbox': new Set([
    'iframe',
  ]),

  'scope': new Set([
    'th',
  ]),

  'scoped': new Set([
    'style',
  ]),

  'seamless': new Set([
    'iframe',
  ]),

  'selected': new Set([
    'option',
  ]),

  'shape': new Set([
    'a',
    'area',
  ]),

  'size': new Set([
    'input',
    'select',
  ]),

  'sizes': new Set([
    'img',
    'link',
    'source',
  ]),

  'span': new Set([
    'col',
    'colgroup',
  ]),

  'spellcheck': 'GLOBAL',

  'src': new Set([
    'audio',
    'embed',
    'iframe',
    'img',
    'input',
    'script',
    'source',
    'track',
    'video',
  ]),

  'srcdoc': new Set([
    'iframe',
  ]),

  'srclang': new Set([
    'track',
  ]),

  'srcset': new Set([
    'img',
  ]),

  'start': new Set([
    'ol',
  ]),

  'step': new Set([
    'input',
  ]),

  'style': 'GLOBAL',

  'summary': new Set([
    'table',
  ]),

  'tabindex': 'GLOBAL',

  'target': new Set([
    'a',
    'area',
    'base',
    'form',
  ]),

  'title': 'GLOBAL',

  'type': new Set([
    'button',
    'input',
    'command',
    'embed',
    'object',
    'script',
    'source',
    'style',
    'menu',
  ]),

  'usemap': new Set([
    'img',
    'input',
    'object',
  ]),

  'value': new Set([
    'button',
    'option',
    'input',
    'li',
    'meter',
    'progress',
    'param',
  ]),

  'width': new Set([
    'canvas',
    'embed',
    'iframe',
    'img',
    'input',
    'object',
    'video',
  ]),

  'wrap': new Set([
    'textarea',
  ]),
};

function isStandardAttribute(attrName, tagName) {
  tagName = tagName.toLowerCase();
  var attr = HTML_ATTRIBUTES[attrName.toLowerCase()];
  return !!attr && (
    attr === 'GLOBAL' ||
    attr.has(tagName)
  );
}

function propToAttr(prop) {
  return PROPS_TO_ATTRS[prop] || prop;
}

var htmlAttributes = {
  isStandardAttribute: isStandardAttribute,
  propToAttr: propToAttr,
};

function Event(type, data) {
  this.type = type;
  this.target = null;
  Object.keys(data || {}).forEach(function(attr) {
    this[attr] = data[attr];
  }, this);
}

Event.prototype.preventDefault = function() {
  // not implemented
};

Event.prototype.stopPropagation = function() {
  // not implemented
};

Event.prototype.stopImmediatePropagation = function() {
  // not implemented
};

function addEventListener(eventType, listener) {
  this._eventListeners = this._eventListeners || {};
  this._eventListeners[eventType] = this._eventListeners[eventType] || [];
  var listeners = this._eventListeners[eventType];
  if (listeners.indexOf(listener) === -1) {
    listeners.push(listener);
  }
}

function removeEventListener(eventType, listener) {
  var listeners = this._eventListeners && this._eventListeners[eventType];
  if (listeners) {
    var index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
}

function dispatchEvent(event) {
  event.target = this; // native browser dispatchEvent mutates event to set target, so do that here
  var listeners = this._eventListeners && this._eventListeners[event.type];
  if (listeners) {
    listeners.forEach(function(listener) {
      listener(event);
    });
  }
  return true; // event stopPropagation not implemented so always return true
}

function Document() {}

Document.prototype.createTextNode = function(v) {
  var n = new Text();
  n.textContent = v;
  n.nodeName = '#text';
  n.nodeType = 3;
  return n;
};

Document.prototype.createElement = function(nodeName) {
  var el = new Element();
  el.nodeName = el.tagName = nodeName;
  return el;
};

Document.prototype.createComment = function(data) {
  var el = new Comment();
  el.data = data;
  return el;
};

Document.prototype.addEventListener = addEventListener;
Document.prototype.removeEventListener = removeEventListener;
Document.prototype.dispatchEvent = dispatchEvent;

function Node() {}

Text.prototype = new Node();

Element.prototype = new Node();

Comment.prototype = new Node();

function Style(el) {
  this.el = el;
  this.styles = [];
}

Style.prototype.setProperty = function(n, v) {
  this.el._setProperty(this.styles, {name: n, value: v});
};

Style.prototype.getProperty = function(n) {
  return this.el._getProperty(this.styles, n);
};

Style.prototype.__defineGetter__('cssText', function () {
  var stylified = '';
  this.styles.forEach(function(s) {
    stylified += s.name + ':' + s.value + ';';
  });
  return stylified;
});

Style.prototype.__defineSetter__('cssText', function (v) {
  this.styles.length = 0;

  // parse cssText and set style attributes
  v.split(';').forEach(function(part) {
    var splitPoint = part.indexOf(':');
    if (splitPoint) {
      var key = part.slice(0, splitPoint).trim();
      var value = part.slice(splitPoint + 1).trim();
      this.setProperty(key, value);
    }
  }, this);
});

function Attribute(name, value){
  if (name) {
    this.name = name;
    this.value = value ? value : '';
  }
}

function Element() {
  var self = this;

  this.style = new Style(this);
  this.classList = classList(this);
  this.childNodes = [];
  this.attributes = [];
  this.dataset = {};
  this.className = '';

  this._setProperty = function(arr, obj, key, val) {
    var p = self._getProperty(arr, key);
    if (p) {
      p.value = String(val);
      return;
    }
    arr.push('function' === typeof obj ? new obj(key.toLowerCase(), String(val)) : obj);
  };

  this._getProperty = function(arr, key) {
    if (!key) return;
    key = key.toLowerCase();
    for (var i = 0; i < arr.length; i++) {
      if (key === arr[i].name) return arr[i];
    }
  };
}

Element.prototype.nodeType = 1;

Element.prototype.appendChild = function(child) {
  child.parentElement = this;
  this.childNodes.push(child);
  return child;
};

Element.prototype.setAttribute = function(n, v) {
  if (n === 'style') {
    this.style.cssText = v;
  } else {
    this._setProperty(this.attributes, Attribute, n, v);
  }
};

Element.prototype.getAttribute = function(n) {
  if (n === 'style') {
    return this.style.cssText;
  } else {
    var result = this._getProperty(this.attributes, n);
    return typeof result !== 'undefined' ? result.value : null;
  }
};

Element.prototype.removeAttribute = function(n) {
  if (n === 'class') {
    delete this.className;
  } else {
    for (var i = 0, len = this.attributes.length; i < len; i++) {
      if (this.attributes[i].name === n) {
        this.attributes.splice(i, 1);
        break;
      }
    }
  }
};

Element.prototype.replaceChild = function(newChild, oldChild) {
  var self = this;
  var replaced = false;
  this.childNodes.forEach(function(child, index) {
    if (child === oldChild) {
      self.childNodes[index] = newChild;
      newChild.parentElement = this;
      replaced = true;
    }
  });
  if (replaced) return oldChild;
};

Element.prototype.removeChild = function(rChild) {
  var self = this;
  var removed = true;
  this.childNodes.forEach(function(child, index) {
    if (child === rChild) {
      // use splice to keep a clean childNode array
      self.childNodes.splice(index, 1);
      rChild.parentElement = null;
      removed = true;
    }
  });
  if (removed) return rChild;
};

Element.prototype.insertBefore = function(newChild, existingChild) {
  var childNodes = this.childNodes;

  if (existingChild === null) {
    childNodes.push(newChild);
  } else {
    for (var i = 0, len = childNodes.length; i < len; i++) {
      var child = childNodes[i];
      if (child === existingChild) {
        i === 0 ? childNodes.unshift(newChild) : childNodes.splice(i, 0, newChild);
        break;
      }
    }
  }
  newChild.parentElement = this;

  return newChild;
};

Element.prototype.addEventListener = addEventListener;
Element.prototype.removeEventListener = removeEventListener;
Element.prototype.dispatchEvent = dispatchEvent;

Element.prototype.insertAdjacentHTML = function(position, text) {
  // https://developer.mozilla.org/en-US/docs/Web/API/Element.insertAdjacentHTML
  // Not too much work to implement similar to innerHTML below.
};

Element.prototype.__defineGetter__('innerHTML', function() {
  // regurgitate set innerHTML
  var s = this.childNodes.html || '';
  this.childNodes.forEach(function(e) {
    s += (e.outerHTML || e.textContent);
  });
  return s;
});

Element.prototype.__defineSetter__('innerHTML', function(v) {
  //only handle this simple case that doesn't need parsing
  //this case is useful... parsing is hard and will need added deps!
  this.childNodes.length = 0;

  // hack to preserve set innerHTML - no parsing just regurgitation
  this.childNodes.html = v;
});

Element.prototype.__defineGetter__('outerHTML', function() {
  var a = [],  self = this;
  var VOID_ELEMENTS = {
    AREA: true,
    BASE: true,
    BR: true,
    COL: true,
    EMBED: true,
    HR: true,
    IMG: true,
    INPUT: true,
    KEYGEN: true,
    LINK: true,
    META: true,
    PARAM: true,
    SOURCE: true,
    TRACK: true,
    WBR: true,
  };

  function _stringify(arr) {
    var attr = [], value;
    arr.forEach(function(a) {
      value = ('style' != a.name) ? a.value : self.style.cssText;
      attr.push(a.name + '=' + '\"' + escapeAttribute(value) + '\"');
    });
    return attr.length ? ' ' + attr.join(" ") : '';
  }

  function _dataify(data) {
    var attr = [];
    Object.keys(data).forEach(function(name) {
      attr.push('data-' + name + '=' + '\"' + escapeAttribute(data[name]) + '\"');
    });
    return attr.length ? ' ' + attr.join(" ") : '';
  }

  function _propertify() {
    var props = [];
    for (var key in self) {
      var attrName = htmlAttributes.propToAttr(key);
      if (
        self.hasOwnProperty(key) &&
        ['string', 'boolean', 'number'].indexOf(typeof self[key]) !== -1 &&
        htmlAttributes.isStandardAttribute(attrName, self.nodeName) &&
        _shouldOutputProp(key, attrName)
      ) {
        props.push({name: attrName, value: self[key]});
      }
    }
    return props ? _stringify(props) : '';
  }

  function _shouldOutputProp(prop, attr) {
    if (self.getAttribute(attr)) {
      // let explicitly-set attributes override props
      return false;
    } else {
      if (prop === 'className' && !self[prop]) {
        return false;
      }
    }
    return true;
  }

  var attrs = this.style.cssText ? this.attributes.concat([{name: 'style'}]) : this.attributes;

  a.push('<' + this.nodeName + _propertify() + _stringify(attrs) + _dataify(this.dataset) + '>');

  if (!VOID_ELEMENTS[this.nodeName.toUpperCase()]) {
    a.push(this.innerHTML);
    a.push('</' + this.nodeName + '>');
  }

  return a.join('');
});

Element.prototype.__defineGetter__('textContent', function() {
  var s = '';
  this.childNodes.forEach(function(e) {
    s += e.textContent;
  });
  return s;
});

Element.prototype.__defineSetter__('textContent', function(v) {
  var textNode = new Text();
  textNode.textContent = v;
  this.childNodes = [textNode];
  return v;
});

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(s) {
  return escapeHTML(s).replace(/"/g, '&quot;');
}

Element.prototype.nodeValue = null;

function Text() {}

Text.prototype.nodeType = 3;

Text.prototype.nodeName = '#text';

Text.prototype.__defineGetter__('textContent', function() {
  return escapeHTML(this.value || '');
});

Text.prototype.__defineSetter__('textContent', function(v) {
  this.value = v;
});

Text.prototype.__defineGetter__('nodeValue', function() {
  return escapeHTML(this.value || '');
});

Text.prototype.__defineSetter__('nodeValue', function(v) {
  this.value = v;
});

Text.prototype.__defineGetter__('length', function() {
  return (this.value || '').length;
});

Text.prototype.replaceData = function(offset, length, str) {
  this.value = this.value.slice(0, offset) + str + this.value.slice(offset + length);
};

function Comment() {}

Comment.prototype.nodeType = 8;

Comment.prototype.nodeName = '#comment';

Comment.prototype.__defineGetter__('data', function() {
  return this.value;
});

Comment.prototype.__defineSetter__('data', function(v) {
  this.value = v;
});

Comment.prototype.__defineGetter__('outerHTML', function() {
  return '<!--' + escapeHTML(this.value || '') + '-->';
});

Comment.prototype.__defineGetter__('nodeValue', function() {
  return escapeHTML(this.value || '');
});

Comment.prototype.__defineSetter__('nodeValue', function(v) {
  this.value = v;
});

function defineParentNode(obj) {
  obj.__defineGetter__('parentNode', function () { return this.parentElement; });
}

defineParentNode(Element.prototype);
defineParentNode(Comment.prototype);
defineParentNode(Text.prototype);
defineParentNode(Node.prototype);

var htmlElement = {
  Document: Document,
  Node: Node,
  Element: Element,
  Comment: Comment,
  Text: Text,
  document: new Document(),
  Event: Event,
  CustomEvent: Event,
};

var hyperscript = createCommonjsModule$1(function (module) {
var w = typeof window === 'undefined' ? htmlElement : window;
var document = w.document;
var Text = w.Text;

function context () {

  var cleanupFuncs = [];

  function h() {
    var args = [].slice.call(arguments), e = null;
    function item (l) {
      var r;
      function parseClass (string) {
        // Our minimal parser doesn’t understand escaping CSS special
        // characters like `#`. Don’t use them. More reading:
        // https://mathiasbynens.be/notes/css-escapes .

        var m = browserSplit(string, /([\.#]?[^\s#.]+)/);
        if(/^\.|#/.test(m[1]))
          e = document.createElement('div');
        forEach(m, function (v) {
          var s = v.substring(1,v.length);
          if(!v) return
          if(!e)
            e = document.createElement(v);
          else if (v[0] === '.')
            classList(e).add(s);
          else if (v[0] === '#')
            e.setAttribute('id', s);
        });
      }

      if(l == null)
        ;
      else if('string' === typeof l) {
        if(!e)
          parseClass(l);
        else
          e.appendChild(r = document.createTextNode(l));
      }
      else if('number' === typeof l
        || 'boolean' === typeof l
        || l instanceof Date
        || l instanceof RegExp ) {
          e.appendChild(r = document.createTextNode(l.toString()));
      }
      //there might be a better way to handle this...
      else if (isArray(l))
        forEach(l, item);
      else if(isNode(l))
        e.appendChild(r = l);
      else if(l instanceof Text)
        e.appendChild(r = l);
      else if ('object' === typeof l) {
        for (var k in l) {
          if('function' === typeof l[k]) {
            if(/^on\w+/.test(k)) {
              (function (k, l) { // capture k, l in the closure
                if (e.addEventListener){
                  e.addEventListener(k.substring(2), l[k], false);
                  cleanupFuncs.push(function(){
                    e.removeEventListener(k.substring(2), l[k], false);
                  });
                }else{
                  e.attachEvent(k, l[k]);
                  cleanupFuncs.push(function(){
                    e.detachEvent(k, l[k]);
                  });
                }
              })(k, l);
            } else {
              // observable
              e[k] = l[k]();
              cleanupFuncs.push(l[k](function (v) {
                e[k] = v;
              }));
            }
          }
          else if(k === 'style') {
            if('string' === typeof l[k]) {
              e.style.cssText = l[k];
            }else{
              for (var s in l[k]) (function(s, v) {
                if('function' === typeof v) {
                  // observable
                  e.style.setProperty(s, v());
                  cleanupFuncs.push(v(function (val) {
                    e.style.setProperty(s, val);
                  }));
                } else
                  var match = l[k][s].match(/(.*)\W+!important\W*$/);
                  if (match) {
                    e.style.setProperty(s, match[1], 'important');
                  } else {
                    e.style.setProperty(s, l[k][s]);
                  }
              })(s, l[k][s]);
            }
          } else if(k === 'attrs') {
            for (var v in l[k]) {
              e.setAttribute(v, l[k][v]);
            }
          }
          else if (k.substr(0, 5) === "data-") {
            e.setAttribute(k, l[k]);
          } else {
            e[k] = l[k];
          }
        }
      } else if ('function' === typeof l) {
        //assume it's an observable!
        var v = l();
        e.appendChild(r = isNode(v) ? v : document.createTextNode(v));

        cleanupFuncs.push(l(function (v) {
          if(isNode(v) && r.parentElement)
            r.parentElement.replaceChild(v, r), r = v;
          else
            r.textContent = v;
        }));
      }

      return r
    }
    while(args.length)
      item(args.shift());

    return e
  }

  h.cleanup = function () {
    for (var i = 0; i < cleanupFuncs.length; i++){
      cleanupFuncs[i]();
    }
    cleanupFuncs.length = 0;
  };

  return h
}

var h = module.exports = context();
h.context = context;

function isNode (el) {
  return el && el.nodeName && el.nodeType
}

function forEach (arr, fn) {
  if (arr.forEach) return arr.forEach(fn)
  for (var i = 0; i < arr.length; i++) fn(arr[i], i);
}

function isArray (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]'
}
});

var O$1 = 'object';
var check$1 = function (it) {
  return it && it.Math == Math && it;
};

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global_1$1 =
  // eslint-disable-next-line no-undef
  check$1(typeof globalThis == O$1 && globalThis) ||
  check$1(typeof window == O$1 && window) ||
  check$1(typeof self == O$1 && self) ||
  check$1(typeof commonjsGlobal$1 == O$1 && commonjsGlobal$1) ||
  // eslint-disable-next-line no-new-func
  Function('return this')();

var fails$1 = function (exec) {
  try {
    return !!exec();
  } catch (error) {
    return true;
  }
};

// Thank's IE8 for his funny defineProperty
var descriptors$1 = !fails$1(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

var nativePropertyIsEnumerable$1 = {}.propertyIsEnumerable;
var getOwnPropertyDescriptor$2 = Object.getOwnPropertyDescriptor;

// Nashorn ~ JDK8 bug
var NASHORN_BUG$1 = getOwnPropertyDescriptor$2 && !nativePropertyIsEnumerable$1.call({ 1: 2 }, 1);

// `Object.prototype.propertyIsEnumerable` method implementation
// https://tc39.github.io/ecma262/#sec-object.prototype.propertyisenumerable
var f$4 = NASHORN_BUG$1 ? function propertyIsEnumerable(V) {
  var descriptor = getOwnPropertyDescriptor$2(this, V);
  return !!descriptor && descriptor.enumerable;
} : nativePropertyIsEnumerable$1;

var objectPropertyIsEnumerable$1 = {
	f: f$4
};

var createPropertyDescriptor$1 = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var toString$1 = {}.toString;

var classofRaw$1 = function (it) {
  return toString$1.call(it).slice(8, -1);
};

var split$1 = ''.split;

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var indexedObject$1 = fails$1(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins
  return !Object('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classofRaw$1(it) == 'String' ? split$1.call(it, '') : Object(it);
} : Object;

// `RequireObjectCoercible` abstract operation
// https://tc39.github.io/ecma262/#sec-requireobjectcoercible
var requireObjectCoercible$1 = function (it) {
  if (it == undefined) throw TypeError("Can't call method on " + it);
  return it;
};

// toObject with fallback for non-array-like ES3 strings



var toIndexedObject$1 = function (it) {
  return indexedObject$1(requireObjectCoercible$1(it));
};

var isObject$1 = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

// `ToPrimitive` abstract operation
// https://tc39.github.io/ecma262/#sec-toprimitive
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
var toPrimitive$1 = function (input, PREFERRED_STRING) {
  if (!isObject$1(input)) return input;
  var fn, val;
  if (PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject$1(val = fn.call(input))) return val;
  if (typeof (fn = input.valueOf) == 'function' && !isObject$1(val = fn.call(input))) return val;
  if (!PREFERRED_STRING && typeof (fn = input.toString) == 'function' && !isObject$1(val = fn.call(input))) return val;
  throw TypeError("Can't convert object to primitive value");
};

var hasOwnProperty$1 = {}.hasOwnProperty;

var has$1 = function (it, key) {
  return hasOwnProperty$1.call(it, key);
};

var document$2 = global_1$1.document;
// typeof document.createElement is 'object' in old IE
var EXISTS$1 = isObject$1(document$2) && isObject$1(document$2.createElement);

var documentCreateElement$1 = function (it) {
  return EXISTS$1 ? document$2.createElement(it) : {};
};

// Thank's IE8 for his funny defineProperty
var ie8DomDefine$1 = !descriptors$1 && !fails$1(function () {
  return Object.defineProperty(documentCreateElement$1('div'), 'a', {
    get: function () { return 7; }
  }).a != 7;
});

var nativeGetOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

// `Object.getOwnPropertyDescriptor` method
// https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptor
var f$5 = descriptors$1 ? nativeGetOwnPropertyDescriptor$1 : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject$1(O);
  P = toPrimitive$1(P, true);
  if (ie8DomDefine$1) try {
    return nativeGetOwnPropertyDescriptor$1(O, P);
  } catch (error) { /* empty */ }
  if (has$1(O, P)) return createPropertyDescriptor$1(!objectPropertyIsEnumerable$1.f.call(O, P), O[P]);
};

var objectGetOwnPropertyDescriptor$1 = {
	f: f$5
};

var replacement$1 = /#|\.prototype\./;

var isForced$1 = function (feature, detection) {
  var value = data$2[normalize$1(feature)];
  return value == POLYFILL$1 ? true
    : value == NATIVE$1 ? false
    : typeof detection == 'function' ? fails$1(detection)
    : !!detection;
};

var normalize$1 = isForced$1.normalize = function (string) {
  return String(string).replace(replacement$1, '.').toLowerCase();
};

var data$2 = isForced$1.data = {};
var NATIVE$1 = isForced$1.NATIVE = 'N';
var POLYFILL$1 = isForced$1.POLYFILL = 'P';

var isForced_1$1 = isForced$1;

var path$1 = {};

var aFunction$1 = function (it) {
  if (typeof it != 'function') {
    throw TypeError(String(it) + ' is not a function');
  } return it;
};

// optional / simple context binding
var bindContext$1 = function (fn, that, length) {
  aFunction$1(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 0: return function () {
      return fn.call(that);
    };
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

var anObject$1 = function (it) {
  if (!isObject$1(it)) {
    throw TypeError(String(it) + ' is not an object');
  } return it;
};

var nativeDefineProperty$1 = Object.defineProperty;

// `Object.defineProperty` method
// https://tc39.github.io/ecma262/#sec-object.defineproperty
var f$6 = descriptors$1 ? nativeDefineProperty$1 : function defineProperty(O, P, Attributes) {
  anObject$1(O);
  P = toPrimitive$1(P, true);
  anObject$1(Attributes);
  if (ie8DomDefine$1) try {
    return nativeDefineProperty$1(O, P, Attributes);
  } catch (error) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

var objectDefineProperty$1 = {
	f: f$6
};

var hide$1 = descriptors$1 ? function (object, key, value) {
  return objectDefineProperty$1.f(object, key, createPropertyDescriptor$1(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var getOwnPropertyDescriptor$3 = objectGetOwnPropertyDescriptor$1.f;






var wrapConstructor$1 = function (NativeConstructor) {
  var Wrapper = function (a, b, c) {
    if (this instanceof NativeConstructor) {
      switch (arguments.length) {
        case 0: return new NativeConstructor();
        case 1: return new NativeConstructor(a);
        case 2: return new NativeConstructor(a, b);
      } return new NativeConstructor(a, b, c);
    } return NativeConstructor.apply(this, arguments);
  };
  Wrapper.prototype = NativeConstructor.prototype;
  return Wrapper;
};

/*
  options.target      - name of the target object
  options.global      - target is the global object
  options.stat        - export as static methods of target
  options.proto       - export as prototype methods of target
  options.real        - real prototype method for the `pure` version
  options.forced      - export even if the native feature is available
  options.bind        - bind methods to the target, required for the `pure` version
  options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe      - use the simple assignment of property instead of delete + defineProperty
  options.sham        - add a flag to not completely full polyfills
  options.enumerable  - export as enumerable property
  options.noTargetGet - prevent calling a getter on target
*/
var _export$1 = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var PROTO = options.proto;

  var nativeSource = GLOBAL ? global_1$1 : STATIC ? global_1$1[TARGET] : (global_1$1[TARGET] || {}).prototype;

  var target = GLOBAL ? path$1 : path$1[TARGET] || (path$1[TARGET] = {});
  var targetPrototype = target.prototype;

  var FORCED, USE_NATIVE, VIRTUAL_PROTOTYPE;
  var key, sourceProperty, targetProperty, nativeProperty, resultProperty, descriptor;

  for (key in source) {
    FORCED = isForced_1$1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
    // contains in native
    USE_NATIVE = !FORCED && nativeSource && has$1(nativeSource, key);

    targetProperty = target[key];

    if (USE_NATIVE) if (options.noTargetGet) {
      descriptor = getOwnPropertyDescriptor$3(nativeSource, key);
      nativeProperty = descriptor && descriptor.value;
    } else nativeProperty = nativeSource[key];

    // export native or implementation
    sourceProperty = (USE_NATIVE && nativeProperty) ? nativeProperty : source[key];

    if (USE_NATIVE && typeof targetProperty === typeof sourceProperty) continue;

    // bind timers to global for call from export context
    if (options.bind && USE_NATIVE) resultProperty = bindContext$1(sourceProperty, global_1$1);
    // wrap global constructors for prevent changs in this version
    else if (options.wrap && USE_NATIVE) resultProperty = wrapConstructor$1(sourceProperty);
    // make static versions for prototype methods
    else if (PROTO && typeof sourceProperty == 'function') resultProperty = bindContext$1(Function.call, sourceProperty);
    // default case
    else resultProperty = sourceProperty;

    // add a flag to not completely full polyfills
    if (options.sham || (sourceProperty && sourceProperty.sham) || (targetProperty && targetProperty.sham)) {
      hide$1(resultProperty, 'sham', true);
    }

    target[key] = resultProperty;

    if (PROTO) {
      VIRTUAL_PROTOTYPE = TARGET + 'Prototype';
      if (!has$1(path$1, VIRTUAL_PROTOTYPE)) hide$1(path$1, VIRTUAL_PROTOTYPE, {});
      // export virtual prototype methods
      path$1[VIRTUAL_PROTOTYPE][key] = sourceProperty;
      // export real prototype methods
      if (options.real && targetPrototype && !targetPrototype[key]) hide$1(targetPrototype, key, sourceProperty);
    }
  }
};

var ceil$1 = Math.ceil;
var floor$1 = Math.floor;

// `ToInteger` abstract operation
// https://tc39.github.io/ecma262/#sec-tointeger
var toInteger$1 = function (argument) {
  return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor$1 : ceil$1)(argument);
};

var min$2 = Math.min;

// `ToLength` abstract operation
// https://tc39.github.io/ecma262/#sec-tolength
var toLength$1 = function (argument) {
  return argument > 0 ? min$2(toInteger$1(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
};

var max$1 = Math.max;
var min$3 = Math.min;

// Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(length, length).
var toAbsoluteIndex$1 = function (index, length) {
  var integer = toInteger$1(index);
  return integer < 0 ? max$1(integer + length, 0) : min$3(integer, length);
};

// `Array.prototype.{ indexOf, includes }` methods implementation
var createMethod$1 = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject$1($this);
    var length = toLength$1(O.length);
    var index = toAbsoluteIndex$1(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) {
      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var arrayIncludes$1 = {
  // `Array.prototype.includes` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  includes: createMethod$1(true),
  // `Array.prototype.indexOf` method
  // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
  indexOf: createMethod$1(false)
};

var hiddenKeys$1 = {};

var indexOf$2 = arrayIncludes$1.indexOf;


var objectKeysInternal$1 = function (object, names) {
  var O = toIndexedObject$1(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) !has$1(hiddenKeys$1, key) && has$1(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has$1(O, key = names[i++])) {
    ~indexOf$2(result, key) || result.push(key);
  }
  return result;
};

// IE8- don't enum bug keys
var enumBugKeys$1 = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];

// `Object.keys` method
// https://tc39.github.io/ecma262/#sec-object.keys
var objectKeys$1 = Object.keys || function keys(O) {
  return objectKeysInternal$1(O, enumBugKeys$1);
};

var f$7 = Object.getOwnPropertySymbols;

var objectGetOwnPropertySymbols$1 = {
	f: f$7
};

// `ToObject` abstract operation
// https://tc39.github.io/ecma262/#sec-toobject
var toObject$1 = function (argument) {
  return Object(requireObjectCoercible$1(argument));
};

var nativeAssign$1 = Object.assign;

// `Object.assign` method
// https://tc39.github.io/ecma262/#sec-object.assign
// should work with symbols and should have deterministic property order (V8 bug)
var objectAssign$1 = !nativeAssign$1 || fails$1(function () {
  var A = {};
  var B = {};
  // eslint-disable-next-line no-undef
  var symbol = Symbol();
  var alphabet = 'abcdefghijklmnopqrst';
  A[symbol] = 7;
  alphabet.split('').forEach(function (chr) { B[chr] = chr; });
  return nativeAssign$1({}, A)[symbol] != 7 || objectKeys$1(nativeAssign$1({}, B)).join('') != alphabet;
}) ? function assign(target, source) { // eslint-disable-line no-unused-vars
  var T = toObject$1(target);
  var argumentsLength = arguments.length;
  var index = 1;
  var getOwnPropertySymbols = objectGetOwnPropertySymbols$1.f;
  var propertyIsEnumerable = objectPropertyIsEnumerable$1.f;
  while (argumentsLength > index) {
    var S = indexedObject$1(arguments[index++]);
    var keys = getOwnPropertySymbols ? objectKeys$1(S).concat(getOwnPropertySymbols(S)) : objectKeys$1(S);
    var length = keys.length;
    var j = 0;
    var key;
    while (length > j) {
      key = keys[j++];
      if (!descriptors$1 || propertyIsEnumerable.call(S, key)) T[key] = S[key];
    }
  } return T;
} : nativeAssign$1;

// `Object.assign` method
// https://tc39.github.io/ecma262/#sec-object.assign
_export$1({ target: 'Object', stat: true, forced: Object.assign !== objectAssign$1 }, {
  assign: objectAssign$1
});

var assign$2 = path$1.Object.assign;

var assign$3 = assign$2;

var toCamel = function toCamel(s) {
  return s.replace(/([-_][a-z])/gi, function ($1) {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
};

var onSuccess = function onSuccess(config, _resp) {
  var h = config.h,
      form = config.form;
  var replacement = h('div', {}, 'Thank you!');
  form.parentNode.replaceChild(replacement, form);
};

var enable = function enable(config) {
  var buttons = config.form.querySelectorAll("[type='submit']:disabled");
  Array.from(buttons).forEach(function (button) {
    button.disabled = false;
  });
};

var disable = function disable(config) {
  var buttons = config.form.querySelectorAll("[type='submit']:enabled");
  Array.from(buttons).forEach(function (button) {
    button.disabled = true;
  });
};

var renderErrors = function renderErrors(config, errors) {
  var elements = config.form.querySelectorAll('[data-sk-error]');

  var errorFor = function errorFor(field) {
    return errors.find(function (error) {
      return error.field == field;
    });
  };

  Array.from(elements).forEach(function (element) {
    var error = errorFor(element.dataset.skError);

    if (!error) {
      element.innerHTML = '';
      return;
    }

    var fieldConfig = config.fields[error.field] || {};
    var errorMessages = fieldConfig.errorMessages || {};
    var prefix = fieldConfig.prettyName || 'This field';
    var code = toCamel((error.code || '').toLowerCase());
    var fullMessage = errorMessages[code] || "".concat(prefix, " ").concat(error.message);
    element.innerHTML = fullMessage;
  });
};

var submit =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator$1(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(client, config) {
    var id, form, enable, disable, renderErrors, onSubmit, onSuccess, onError, endpoint, data, formData, prop, result, errors;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            id = config.id, form = config.form, enable = config.enable, disable = config.disable, renderErrors = config.renderErrors, onSubmit = config.onSubmit, onSuccess = config.onSuccess, onError = config.onError, endpoint = config.endpoint, data = config.data;
            formData = new FormData(form); // Append data from config

            if (_typeof(data) === 'object') {
              for (prop in data) {
                if (typeof data[prop] === 'function') {
                  formData.append(prop, data[prop].call(null, config));
                } else {
                  formData.append(prop, data[prop]);
                }
              }
            } // Clear visible errors before submitting


            renderErrors(config, []);
            disable(config);
            onSubmit(config);
            if (config.debug) console.log(id, 'Submitting');
            _context.prev = 7;
            _context.next = 10;
            return client.submitForm({
              id: id,
              endpoint: endpoint,
              data: formData
            });

          case 10:
            result = _context.sent;

            if (result.response.status == 200) {
              if (config.debug) console.log(id, 'Submitted', result);
              onSuccess(config, result.body);
            } else {
              errors = result.body.errors;
              if (config.debug) console.log(id, 'Validation error', result);
              renderErrors(config, errors);
              onError(config, errors);
            }

            _context.next = 18;
            break;

          case 14:
            _context.prev = 14;
            _context.t0 = _context["catch"](7);
            if (config.debug) console.log(id, 'Unexpected error', _context.t0);
            onFailure(config, _context.t0);

          case 18:
            _context.prev = 18;
            enable(config);
            return _context.finish(18);

          case 21:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[7, 14, 18, 21]]);
  }));

  return function submit(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
/**
 * Default configuration.
 */


var defaults = {
  h: hyperscript,
  onInit: function onInit() {},
  onSubmit: function onSubmit() {},
  onError: function onError() {},
  onFailure: function onFailure() {},
  onSuccess: onSuccess,
  enable: enable,
  disable: disable,
  renderErrors: renderErrors,
  endpoint: 'https://api.statickit.com',
  data: {},
  fields: {},
  debug: false
};

var setup = function setup(client, config) {
  var id = config.id,
      form = config.form,
      onInit = config.onInit,
      enable = config.enable;
  if (config.debug) console.log(id, 'Initializing');
  form.addEventListener('submit',
  /*#__PURE__*/
  function () {
    var _ref2 = _asyncToGenerator$1(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee2(ev) {
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              ev.preventDefault();
              _context2.next = 3;
              return submit(client, config);

            case 3:
              return _context2.abrupt("return", true);

            case 4:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));

    return function (_x3) {
      return _ref2.apply(this, arguments);
    };
  }());
  enable(config);
  onInit(config);
  return true;
};

var getFormElement = function getFormElement(nodeOrSelector) {
  if (nodeOrSelector.tagName == 'FORM') {
    return nodeOrSelector;
  } else {
    return document.querySelector(nodeOrSelector);
  }
};

var init = function init(client, props) {
  if (!props.id) throw new Error('You must define an `id` property');
  if (!props.element) throw new Error('You must define an `element` property');
  var form = getFormElement(props.element);
  if (!form) throw new Error("Element `".concat(props.element, "` not found"));
  var config = assign$3({}, defaults, props, {
    form: form
  });
  return setup(client, config);
};

var forms = {
  init: init
};

var client = index();

var ready = function ready(fn) {
  if (document.readyState != 'loading') {
    fn();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    document.attachEvent('onreadystatechange', function () {
      if (document.readyState != 'loading') fn();
    });
  }
};

var api = {
  form: function form(method) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var props = args[0];

    switch (method) {
      case 'init':
        return forms.init(client, props);

      default:
        // To retain backwards compatiblilty with
        // setting `element` selector as the second
        // argument: sk('form', '#myform', { ... })
        props.element = method;
        return forms.init(client, props);
    }
  }
};

var run = function run(scope) {
  var method = api[scope];
  if (!method) throw new Error("Method `".concat(scope, "` does not exist"));

  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  return method.apply(null, args);
};

window.sk = window.sk || function () {
  (sk.q = sk.q || []).push(arguments);
};

ready(function () {
  var queue = window.sk ? sk.q || [] : [];
  window.sk = run;
  queue.forEach(function (args) {
    run.apply(null, args);
  });
});
var index$1 = window.sk;

export default index$1;
