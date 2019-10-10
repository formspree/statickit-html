var statickit = (function () {
  'use strict';

  var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  function btoa(string) {
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
  }

  /**
   * Base-64 encodes a (JSON-castable) object.
   *
   * @param {object} obj - The object to encode.
   * @returns {string}
   */

  var encode = function encode(obj) {
    return btoa(JSON.stringify(obj));
  };
  /**
   * Appends a key-value pair to a target.
   *
   * @param {object|FormData} target
   * @param {string} key
   * @param {string} value
   */

  var append = function append(target, key, value) {
    if (target instanceof FormData) {
      target.append(key, value);
    } else {
      target[key] = value;
    }
  };

  /**
   * @this {Promise}
   */
  function finallyConstructor(callback) {
    var constructor = this.constructor;
    return this.then(
      function(value) {
        // @ts-ignore
        return constructor.resolve(callback()).then(function() {
          return value;
        });
      },
      function(reason) {
        // @ts-ignore
        return constructor.resolve(callback()).then(function() {
          // @ts-ignore
          return constructor.reject(reason);
        });
      }
    );
  }

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function isArray(x) {
    return Boolean(x && typeof x.length !== 'undefined');
  }

  function noop() {}

  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function() {
      fn.apply(thisArg, arguments);
    };
  }

  /**
   * @constructor
   * @param {Function} fn
   */
  function Promise(fn) {
    if (!(this instanceof Promise))
      throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    /** @type {!number} */
    this._state = 0;
    /** @type {!boolean} */
    this._handled = false;
    /** @type {Promise|undefined} */
    this._value = undefined;
    /** @type {!Array<!Function>} */
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    Promise._immediateFn(function() {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self)
        throw new TypeError('A promise cannot be resolved with itself.');
      if (
        newValue &&
        (typeof newValue === 'object' || typeof newValue === 'function')
      ) {
        var then = newValue.then;
        if (newValue instanceof Promise) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise._immediateFn(function() {
        if (!self._handled) {
          Promise._unhandledRejectionFn(self._value);
        }
      });
    }

    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  /**
   * @constructor
   */
  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(
        function(value) {
          if (done) return;
          done = true;
          resolve(self, value);
        },
        function(reason) {
          if (done) return;
          done = true;
          reject(self, reason);
        }
      );
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise.prototype['catch'] = function(onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function(onFulfilled, onRejected) {
    // @ts-ignore
    var prom = new this.constructor(noop);

    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise.prototype['finally'] = finallyConstructor;

  Promise.all = function(arr) {
    return new Promise(function(resolve, reject) {
      if (!isArray(arr)) {
        return reject(new TypeError('Promise.all accepts an array'));
      }

      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(
                val,
                function(val) {
                  res(i, val);
                },
                reject
              );
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function(value) {
    if (value && typeof value === 'object' && value.constructor === Promise) {
      return value;
    }

    return new Promise(function(resolve) {
      resolve(value);
    });
  };

  Promise.reject = function(value) {
    return new Promise(function(resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function(arr) {
    return new Promise(function(resolve, reject) {
      if (!isArray(arr)) {
        return reject(new TypeError('Promise.race accepts an array'));
      }

      for (var i = 0, len = arr.length; i < len; i++) {
        Promise.resolve(arr[i]).then(resolve, reject);
      }
    });
  };

  // Use polyfill for setImmediate for performance gains
  Promise._immediateFn =
    // @ts-ignore
    (typeof setImmediate === 'function' &&
      function(fn) {
        // @ts-ignore
        setImmediate(fn);
      }) ||
    function(fn) {
      setTimeoutFunc(fn, 0);
    };

  Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var fetchBrowser = createCommonjsModule(function (module, exports) {
  (function (self) {

    function fetchPonyfill(options) {
      var Promise = options && options.Promise || self.Promise;
      var XMLHttpRequest = options && options.XMLHttpRequest || self.XMLHttpRequest;
      var global = self;

      return (function () {
        var self = Object.create(global, {
          fetch: {
            value: undefined,
            writable: true
          }
        });

        (function(self) {

          if (self.fetch) {
            return
          }

          var support = {
            searchParams: 'URLSearchParams' in self,
            iterable: 'Symbol' in self && 'iterator' in Symbol,
            blob: 'FileReader' in self && 'Blob' in self && (function() {
              try {
                new Blob();
                return true
              } catch(e) {
                return false
              }
            })(),
            formData: 'FormData' in self,
            arrayBuffer: 'ArrayBuffer' in self
          };

          if (support.arrayBuffer) {
            var viewClasses = [
              '[object Int8Array]',
              '[object Uint8Array]',
              '[object Uint8ClampedArray]',
              '[object Int16Array]',
              '[object Uint16Array]',
              '[object Int32Array]',
              '[object Uint32Array]',
              '[object Float32Array]',
              '[object Float64Array]'
            ];

            var isDataView = function(obj) {
              return obj && DataView.prototype.isPrototypeOf(obj)
            };

            var isArrayBufferView = ArrayBuffer.isView || function(obj) {
              return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
            };
          }

          function normalizeName(name) {
            if (typeof name !== 'string') {
              name = String(name);
            }
            if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
              throw new TypeError('Invalid character in header field name')
            }
            return name.toLowerCase()
          }

          function normalizeValue(value) {
            if (typeof value !== 'string') {
              value = String(value);
            }
            return value
          }

          // Build a destructive iterator for the value list
          function iteratorFor(items) {
            var iterator = {
              next: function() {
                var value = items.shift();
                return {done: value === undefined, value: value}
              }
            };

            if (support.iterable) {
              iterator[Symbol.iterator] = function() {
                return iterator
              };
            }

            return iterator
          }

          function Headers(headers) {
            this.map = {};

            if (headers instanceof Headers) {
              headers.forEach(function(value, name) {
                this.append(name, value);
              }, this);
            } else if (Array.isArray(headers)) {
              headers.forEach(function(header) {
                this.append(header[0], header[1]);
              }, this);
            } else if (headers) {
              Object.getOwnPropertyNames(headers).forEach(function(name) {
                this.append(name, headers[name]);
              }, this);
            }
          }

          Headers.prototype.append = function(name, value) {
            name = normalizeName(name);
            value = normalizeValue(value);
            var oldValue = this.map[name];
            this.map[name] = oldValue ? oldValue+','+value : value;
          };

          Headers.prototype['delete'] = function(name) {
            delete this.map[normalizeName(name)];
          };

          Headers.prototype.get = function(name) {
            name = normalizeName(name);
            return this.has(name) ? this.map[name] : null
          };

          Headers.prototype.has = function(name) {
            return this.map.hasOwnProperty(normalizeName(name))
          };

          Headers.prototype.set = function(name, value) {
            this.map[normalizeName(name)] = normalizeValue(value);
          };

          Headers.prototype.forEach = function(callback, thisArg) {
            for (var name in this.map) {
              if (this.map.hasOwnProperty(name)) {
                callback.call(thisArg, this.map[name], name, this);
              }
            }
          };

          Headers.prototype.keys = function() {
            var items = [];
            this.forEach(function(value, name) { items.push(name); });
            return iteratorFor(items)
          };

          Headers.prototype.values = function() {
            var items = [];
            this.forEach(function(value) { items.push(value); });
            return iteratorFor(items)
          };

          Headers.prototype.entries = function() {
            var items = [];
            this.forEach(function(value, name) { items.push([name, value]); });
            return iteratorFor(items)
          };

          if (support.iterable) {
            Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
          }

          function consumed(body) {
            if (body.bodyUsed) {
              return Promise.reject(new TypeError('Already read'))
            }
            body.bodyUsed = true;
          }

          function fileReaderReady(reader) {
            return new Promise(function(resolve, reject) {
              reader.onload = function() {
                resolve(reader.result);
              };
              reader.onerror = function() {
                reject(reader.error);
              };
            })
          }

          function readBlobAsArrayBuffer(blob) {
            var reader = new FileReader();
            var promise = fileReaderReady(reader);
            reader.readAsArrayBuffer(blob);
            return promise
          }

          function readBlobAsText(blob) {
            var reader = new FileReader();
            var promise = fileReaderReady(reader);
            reader.readAsText(blob);
            return promise
          }

          function readArrayBufferAsText(buf) {
            var view = new Uint8Array(buf);
            var chars = new Array(view.length);

            for (var i = 0; i < view.length; i++) {
              chars[i] = String.fromCharCode(view[i]);
            }
            return chars.join('')
          }

          function bufferClone(buf) {
            if (buf.slice) {
              return buf.slice(0)
            } else {
              var view = new Uint8Array(buf.byteLength);
              view.set(new Uint8Array(buf));
              return view.buffer
            }
          }

          function Body() {
            this.bodyUsed = false;

            this._initBody = function(body) {
              this._bodyInit = body;
              if (!body) {
                this._bodyText = '';
              } else if (typeof body === 'string') {
                this._bodyText = body;
              } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
                this._bodyBlob = body;
              } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
                this._bodyFormData = body;
              } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
                this._bodyText = body.toString();
              } else if (support.arrayBuffer && support.blob && isDataView(body)) {
                this._bodyArrayBuffer = bufferClone(body.buffer);
                // IE 10-11 can't handle a DataView body.
                this._bodyInit = new Blob([this._bodyArrayBuffer]);
              } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
                this._bodyArrayBuffer = bufferClone(body);
              } else {
                throw new Error('unsupported BodyInit type')
              }

              if (!this.headers.get('content-type')) {
                if (typeof body === 'string') {
                  this.headers.set('content-type', 'text/plain;charset=UTF-8');
                } else if (this._bodyBlob && this._bodyBlob.type) {
                  this.headers.set('content-type', this._bodyBlob.type);
                } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
                  this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
                }
              }
            };

            if (support.blob) {
              this.blob = function() {
                var rejected = consumed(this);
                if (rejected) {
                  return rejected
                }

                if (this._bodyBlob) {
                  return Promise.resolve(this._bodyBlob)
                } else if (this._bodyArrayBuffer) {
                  return Promise.resolve(new Blob([this._bodyArrayBuffer]))
                } else if (this._bodyFormData) {
                  throw new Error('could not read FormData body as blob')
                } else {
                  return Promise.resolve(new Blob([this._bodyText]))
                }
              };

              this.arrayBuffer = function() {
                if (this._bodyArrayBuffer) {
                  return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
                } else {
                  return this.blob().then(readBlobAsArrayBuffer)
                }
              };
            }

            this.text = function() {
              var rejected = consumed(this);
              if (rejected) {
                return rejected
              }

              if (this._bodyBlob) {
                return readBlobAsText(this._bodyBlob)
              } else if (this._bodyArrayBuffer) {
                return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
              } else if (this._bodyFormData) {
                throw new Error('could not read FormData body as text')
              } else {
                return Promise.resolve(this._bodyText)
              }
            };

            if (support.formData) {
              this.formData = function() {
                return this.text().then(decode)
              };
            }

            this.json = function() {
              return this.text().then(JSON.parse)
            };

            return this
          }

          // HTTP methods whose capitalization should be normalized
          var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

          function normalizeMethod(method) {
            var upcased = method.toUpperCase();
            return (methods.indexOf(upcased) > -1) ? upcased : method
          }

          function Request(input, options) {
            options = options || {};
            var body = options.body;

            if (input instanceof Request) {
              if (input.bodyUsed) {
                throw new TypeError('Already read')
              }
              this.url = input.url;
              this.credentials = input.credentials;
              if (!options.headers) {
                this.headers = new Headers(input.headers);
              }
              this.method = input.method;
              this.mode = input.mode;
              if (!body && input._bodyInit != null) {
                body = input._bodyInit;
                input.bodyUsed = true;
              }
            } else {
              this.url = String(input);
            }

            this.credentials = options.credentials || this.credentials || 'omit';
            if (options.headers || !this.headers) {
              this.headers = new Headers(options.headers);
            }
            this.method = normalizeMethod(options.method || this.method || 'GET');
            this.mode = options.mode || this.mode || null;
            this.referrer = null;

            if ((this.method === 'GET' || this.method === 'HEAD') && body) {
              throw new TypeError('Body not allowed for GET or HEAD requests')
            }
            this._initBody(body);
          }

          Request.prototype.clone = function() {
            return new Request(this, { body: this._bodyInit })
          };

          function decode(body) {
            var form = new FormData();
            body.trim().split('&').forEach(function(bytes) {
              if (bytes) {
                var split = bytes.split('=');
                var name = split.shift().replace(/\+/g, ' ');
                var value = split.join('=').replace(/\+/g, ' ');
                form.append(decodeURIComponent(name), decodeURIComponent(value));
              }
            });
            return form
          }

          function parseHeaders(rawHeaders) {
            var headers = new Headers();
            // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
            // https://tools.ietf.org/html/rfc7230#section-3.2
            var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
            preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
              var parts = line.split(':');
              var key = parts.shift().trim();
              if (key) {
                var value = parts.join(':').trim();
                headers.append(key, value);
              }
            });
            return headers
          }

          Body.call(Request.prototype);

          function Response(bodyInit, options) {
            if (!options) {
              options = {};
            }

            this.type = 'default';
            this.status = options.status === undefined ? 200 : options.status;
            this.ok = this.status >= 200 && this.status < 300;
            this.statusText = 'statusText' in options ? options.statusText : 'OK';
            this.headers = new Headers(options.headers);
            this.url = options.url || '';
            this._initBody(bodyInit);
          }

          Body.call(Response.prototype);

          Response.prototype.clone = function() {
            return new Response(this._bodyInit, {
              status: this.status,
              statusText: this.statusText,
              headers: new Headers(this.headers),
              url: this.url
            })
          };

          Response.error = function() {
            var response = new Response(null, {status: 0, statusText: ''});
            response.type = 'error';
            return response
          };

          var redirectStatuses = [301, 302, 303, 307, 308];

          Response.redirect = function(url, status) {
            if (redirectStatuses.indexOf(status) === -1) {
              throw new RangeError('Invalid status code')
            }

            return new Response(null, {status: status, headers: {location: url}})
          };

          self.Headers = Headers;
          self.Request = Request;
          self.Response = Response;

          self.fetch = function(input, init) {
            return new Promise(function(resolve, reject) {
              var request = new Request(input, init);
              var xhr = new XMLHttpRequest();

              xhr.onload = function() {
                var options = {
                  status: xhr.status,
                  statusText: xhr.statusText,
                  headers: parseHeaders(xhr.getAllResponseHeaders() || '')
                };
                options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
                var body = 'response' in xhr ? xhr.response : xhr.responseText;
                resolve(new Response(body, options));
              };

              xhr.onerror = function() {
                reject(new TypeError('Network request failed'));
              };

              xhr.ontimeout = function() {
                reject(new TypeError('Network request failed'));
              };

              xhr.open(request.method, request.url, true);

              if (request.credentials === 'include') {
                xhr.withCredentials = true;
              } else if (request.credentials === 'omit') {
                xhr.withCredentials = false;
              }

              if ('responseType' in xhr && support.blob) {
                xhr.responseType = 'blob';
              }

              request.headers.forEach(function(value, name) {
                xhr.setRequestHeader(name, value);
              });

              xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
            })
          };
          self.fetch.polyfill = true;
        })(typeof self !== 'undefined' ? self : this);


        return {
          fetch: self.fetch,
          Headers: self.Headers,
          Request: self.Request,
          Response: self.Response
        };
      }());
    }

    {
      module.exports = fetchPonyfill;
    }
  }(typeof self !== 'undefined' ? self : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : commonjsGlobal));
  });

  /*
  object-assign
  (c) Sindre Sorhus
  @license MIT
  */
  /* eslint-disable no-unused-vars */
  var getOwnPropertySymbols = Object.getOwnPropertySymbols;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var propIsEnumerable = Object.prototype.propertyIsEnumerable;

  function toObject(val) {
  	if (val === null || val === undefined) {
  		throw new TypeError('Object.assign cannot be called with null or undefined');
  	}

  	return Object(val);
  }

  function shouldUseNative() {
  	try {
  		if (!Object.assign) {
  			return false;
  		}

  		// Detect buggy property enumeration order in older V8 versions.

  		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
  		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
  		test1[5] = 'de';
  		if (Object.getOwnPropertyNames(test1)[0] === '5') {
  			return false;
  		}

  		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
  		var test2 = {};
  		for (var i = 0; i < 10; i++) {
  			test2['_' + String.fromCharCode(i)] = i;
  		}
  		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
  			return test2[n];
  		});
  		if (order2.join('') !== '0123456789') {
  			return false;
  		}

  		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
  		var test3 = {};
  		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
  			test3[letter] = letter;
  		});
  		if (Object.keys(Object.assign({}, test3)).join('') !==
  				'abcdefghijklmnopqrst') {
  			return false;
  		}

  		return true;
  	} catch (err) {
  		// We don't expect any of the above to throw, but better to be safe.
  		return false;
  	}
  }

  var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
  	var from;
  	var to = toObject(target);
  	var symbols;

  	for (var s = 1; s < arguments.length; s++) {
  		from = Object(arguments[s]);

  		for (var key in from) {
  			if (hasOwnProperty.call(from, key)) {
  				to[key] = from[key];
  			}
  		}

  		if (getOwnPropertySymbols) {
  			symbols = getOwnPropertySymbols(from);
  			for (var i = 0; i < symbols.length; i++) {
  				if (propIsEnumerable.call(from, symbols[i])) {
  					to[symbols[i]] = from[symbols[i]];
  				}
  			}
  		}
  	}

  	return to;
  };

  var serializeBody = function serializeBody(data) {
    if (data instanceof FormData) return data;
    JSON.stringify(data);
  };
  /**
   * The client constructor.
   */


  function StaticKit() {
    var _this = this;

    this.session = {
      loadedAt: 1 * new Date(),
      mousemove: 0,
      keydown: 0,
      webdriver: navigator.webdriver || document.documentElement.getAttribute('webdriver') || !!window.callPhantom || !!window._phantom
    };

    this._onMouseMove = function () {
      _this.session.mousemove += 1;
    };

    this._onKeyDown = function () {
      _this.session.keydown += 1;
    };

    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('keydown', this._onKeyDown);
  }
  /**
   * Tears down the client instance.
   */


  StaticKit.prototype.teardown = function teardown() {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('keydown', this._onKeyDown);
  };
  /**
   * Submits a form.
   *
   * Returns a `Promise` that resolves to `{body, response}`.
   *
   * @param {object} props
   * @returns {Promise}
   */


  StaticKit.prototype.submitForm = function submitForm(props) {
    if (!props.id) {
      throw new Error('You must provide an `id` for the form');
    }

    var fetchImpl = props.fetchImpl || fetchBrowser({
      Promise: Promise
    }).fetch;
    var endpoint = props.endpoint || 'https://api.statickit.com';
    var url = "".concat(endpoint, "/j/forms/").concat(props.id, "/submissions");
    var data = props.data || {};
    var session = objectAssign({}, this.session, {
      submittedAt: 1 * new Date()
    });
    append(data, '_t', encode(session));
    var request = {
      method: 'POST',
      mode: 'cors',
      body: serializeBody(data)
    };

    if (!(data instanceof FormData)) {
      request.headers = {
        'Content-Type': 'application/json'
      };
    }

    return fetchImpl(url, request).then(function (response) {
      return response.json().then(function (body) {
        return {
          body: body,
          response: response
        };
      });
    });
  };
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

  var indexOf = [].indexOf;

  var indexof = function(arr, obj){
    if (indexOf) return arr.indexOf(obj);
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

  var toCamel = function toCamel(s) {
    return s.replace(/([-_][a-z])/gi, function ($1) {
      return $1.toUpperCase().replace('-', '').replace('_', '');
    });
  };

  /*
  object-assign
  (c) Sindre Sorhus
  @license MIT
  */
  /* eslint-disable no-unused-vars */
  var getOwnPropertySymbols$1 = Object.getOwnPropertySymbols;
  var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
  var propIsEnumerable$1 = Object.prototype.propertyIsEnumerable;

  function toObject$1(val) {
  	if (val === null || val === undefined) {
  		throw new TypeError('Object.assign cannot be called with null or undefined');
  	}

  	return Object(val);
  }

  function shouldUseNative$1() {
  	try {
  		if (!Object.assign) {
  			return false;
  		}

  		// Detect buggy property enumeration order in older V8 versions.

  		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
  		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
  		test1[5] = 'de';
  		if (Object.getOwnPropertyNames(test1)[0] === '5') {
  			return false;
  		}

  		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
  		var test2 = {};
  		for (var i = 0; i < 10; i++) {
  			test2['_' + String.fromCharCode(i)] = i;
  		}
  		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
  			return test2[n];
  		});
  		if (order2.join('') !== '0123456789') {
  			return false;
  		}

  		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
  		var test3 = {};
  		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
  			test3[letter] = letter;
  		});
  		if (Object.keys(Object.assign({}, test3)).join('') !==
  				'abcdefghijklmnopqrst') {
  			return false;
  		}

  		return true;
  	} catch (err) {
  		// We don't expect any of the above to throw, but better to be safe.
  		return false;
  	}
  }

  var objectAssign$1 = shouldUseNative$1() ? Object.assign : function (target, source) {
  	var from;
  	var to = toObject$1(target);
  	var symbols;

  	for (var s = 1; s < arguments.length; s++) {
  		from = Object(arguments[s]);

  		for (var key in from) {
  			if (hasOwnProperty$1.call(from, key)) {
  				to[key] = from[key];
  			}
  		}

  		if (getOwnPropertySymbols$1) {
  			symbols = getOwnPropertySymbols$1(from);
  			for (var i = 0; i < symbols.length; i++) {
  				if (propIsEnumerable$1.call(from, symbols[i])) {
  					to[symbols[i]] = from[symbols[i]];
  				}
  			}
  		}
  	}

  	return to;
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

  var submit = function submit(client, config) {
    var id = config.id,
        form = config.form,
        enable = config.enable,
        disable = config.disable,
        renderErrors = config.renderErrors,
        onSubmit = config.onSubmit,
        onSuccess = config.onSuccess,
        onError = config.onError,
        endpoint = config.endpoint,
        data = config.data;
    var formData = new FormData(form); // Append data from config

    if (_typeof(data) === 'object') {
      for (var prop in data) {
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
    return client.submitForm({
      id: id,
      endpoint: endpoint,
      data: formData
    }).then(function (result) {
      if (result.response.status == 200) {
        if (config.debug) console.log(id, 'Submitted', result);
        onSuccess(config, result.body);
      } else {
        var errors = result.body.errors;
        if (config.debug) console.log(id, 'Validation error', result);
        renderErrors(config, errors);
        onError(config, errors);
      }
    })["catch"](function (e) {
      if (config.debug) console.log(id, 'Unexpected error', e);
      onFailure(config, e);
    })["finally"](function () {
      enable(config);
    });
  };
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
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      submit(client, config);
      return true;
    });
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
    var config = objectAssign$1({}, defaults, props, {
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

  return index$1;

}());
