var statickit = (function () {
  'use strict';

  var ready = (function (fn) {
    if (document.readyState != 'loading') {
      fn();
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function () {
        if (document.readyState != 'loading') fn();
      });
    }
  });

  var logger = (function (tag) {
    return {
      log: function log() {

        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
      },
      error: function error() {

        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }
      }
    };
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

  function createCommonjsModule(fn, module) {
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

  var hyperscript = createCommonjsModule(function (module) {
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

  window.__skt || (window.__skt = {});
  var telemetry = {
    set: function set(key, val) {
      window.__skt[key] = val;
      return val;
    },
    get: function get(key, defaultValue) {
      return window.__skt[key] || defaultValue;
    },
    inc: function inc(key) {
      var val = (window.__skt[key] || 0) + 1;
      window.__skt[key] = val;
      return val;
    },
    data: function data() {
      return window.__skt;
    }
  };

  var toCamel = function toCamel(s) {
    return s.replace(/([-_][a-z])/gi, function ($1) {
      return $1.toUpperCase().replace('-', '').replace('_', '');
    });
  };

  /**
   * The default init callback.
   */

  var onInit = function onInit(config) {
    config.enable(config);
  };
  /**
   * The default submit callback.
   */


  var onSubmit = function onSubmit(config) {
    config.renderErrors(config, []);
    config.disable(config);
  };
  /**
   * The default success callback.
   */


  var onSuccess = function onSuccess(config, resp) {
    var h = config.h,
        form = config.form;
    var replacement = h('div', {}, 'Thank you!');
    form.parentNode.replaceChild(replacement, form);
  };
  /**
   * The default error callback.
   */


  var onError = function onError(config, errors) {
    config.renderErrors(config, errors);
  };
  /**
   * The default failure callback.
   */


  var onFailure = function onFailure(config) {};
  /**
   * The default enable hook.
   */


  var enable = function enable(config) {
    var buttons = config.form.querySelectorAll("[type='submit']:disabled");
    Array.from(buttons).forEach(function (button) {
      button.disabled = false;
    });
  };
  /**
   * The default disable hook.
   */


  var disable = function disable(config) {
    var buttons = config.form.querySelectorAll("[type='submit']:enabled");
    Array.from(buttons).forEach(function (button) {
      button.disabled = true;
    });
  };
  /**
   * The default error rendering hook.
   */


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
  /**
   * Submits the form.
   */


  var submit = function submit(config) {
    var id = config.id,
        form = config.form,
        enable = config.enable,
        onSubmit = config.onSubmit,
        onSuccess = config.onSuccess,
        onError = config.onError,
        endpoint = config.endpoint,
        data = config.data;
    var url = endpoint + '/j/forms/' + id + '/submissions';
    var formData = new FormData(form); // Append data from config

    if (_typeof(data) === 'object') {
      for (var prop in data) {
        if (typeof data[prop] === 'function') {
          formData.append(prop, data[prop].call(null, config));
        } else {
          formData.append(prop, data[prop]);
        }
      }
    }

    var telemetryData = Object.assign(telemetry.data(), {
      submittedAt: 1 * new Date()
    });
    formData.append('_t', window.btoa(JSON.stringify(telemetryData)));
    onSubmit(config);
    logger().log(id, 'Submitting');
    fetch(url, {
      method: 'POST',
      mode: 'cors',
      body: formData
    }).then(function (response) {
      response.json().then(function (data) {
        switch (response.status) {
          case 200:
            logger().log(id, 'Submitted', data);
            onSuccess(config);
            break;

          case 422:
            logger().log(id, 'Validation error', data);
            onError(config, data.errors);
            break;

          default:
            logger().log(id, 'Unexpected error', data);
            break;
        }

        return true;
      });
    })["catch"](function (error) {
      logger().log(id, 'Unexpected error ', error);
      return true;
    })["finally"](function () {
      enable(config);
      return true;
    });
    return true;
  };
  /**
   * Default configuration.
   */


  var defaults = {
    h: hyperscript,
    onInit: onInit,
    onSubmit: onSubmit,
    onSuccess: onSuccess,
    onError: onError,
    onFailure: onFailure,
    enable: enable,
    disable: disable,
    renderErrors: renderErrors,
    endpoint: 'https://api.statickit.com',
    data: {},
    fields: {}
  };
  /**
   * Setup the form.
   */

  var setup = function setup(config) {
    var id = config.id,
        form = config.form,
        onInit = config.onInit;
    logger().log(id, 'Initializing');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      submit(config);
    });
    onInit(config);
    return true;
  };

  var init = function init(selector, props) {
    var form = document.querySelector(selector);
    var config = Object.assign(defaults, props, {
      form: form
    });

    if (!form) {
      logger().log('Element `' + selector + '` not found');
      return;
    }

    if (!config.id) {
      logger().log('You must define an `id` property');
      return;
    }

    return setup(config);
  };

  var forms = {
    init: init
  };

  if (typeof Object.assign !== 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, 'assign', {
      value: function assign(target, varArgs) {

        if (target === null || target === undefined) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];

          if (nextSource !== null && nextSource !== undefined) {
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }

        return to;
      },
      writable: true,
      configurable: true
    });
  } // Polyfill from  https://github.com/MaxArt2501/base64-js/blob/master/base64.js


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

  var queue = window.sk ? window.sk.q : [];
  var api = {
    form: function form() {
      return forms.init.apply(forms, arguments);
    }
  };

  var run = function run() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var scope = args[0];
    var methodArgs = args.slice(1);
    var method = api[scope];

    if (!method) {
      logger().log('Method `' + scope + '` does not exist');
      return;
    }

    return method.apply(null, methodArgs);
  };

  telemetry.set('loadedAt', 1 * new Date());
  window.addEventListener('mousemove', function () {
    telemetry.inc('mousemove');
  });
  window.addEventListener('keydown', function () {
    telemetry.inc('keydown');
  });
  telemetry.set('webdriver', navigator.webdriver || document.documentElement.getAttribute('webdriver') || !!window.callPhantom || !!window._phantom);

  window.sk = window.sk || function () {
    (sk.q = sk.q || []).push(arguments);
  };

  ready(function () {
    window.sk = run;
    queue.forEach(run);
  });
  var index = window.sk;

  return index;

}());
