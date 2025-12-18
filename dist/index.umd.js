(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react')) :
	typeof define === 'function' && define.amd ? define(['exports', 'react'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.AomiWidget = {}, global.React));
})(this, (function (exports, require$$0) { 'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var eventemitter3 = {exports: {}};

	(function (module) {

		var has = Object.prototype.hasOwnProperty
		  , prefix = '~';

		/**
		 * Constructor to create a storage for our `EE` objects.
		 * An `Events` instance is a plain object whose properties are event names.
		 *
		 * @constructor
		 * @private
		 */
		function Events() {}

		//
		// We try to not inherit from `Object.prototype`. In some engines creating an
		// instance in this way is faster than calling `Object.create(null)` directly.
		// If `Object.create(null)` is not supported we prefix the event names with a
		// character to make sure that the built-in object properties are not
		// overridden or used as an attack vector.
		//
		if (Object.create) {
		  Events.prototype = Object.create(null);

		  //
		  // This hack is needed because the `__proto__` property is still inherited in
		  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
		  //
		  if (!new Events().__proto__) prefix = false;
		}

		/**
		 * Representation of a single event listener.
		 *
		 * @param {Function} fn The listener function.
		 * @param {*} context The context to invoke the listener with.
		 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
		 * @constructor
		 * @private
		 */
		function EE(fn, context, once) {
		  this.fn = fn;
		  this.context = context;
		  this.once = once || false;
		}

		/**
		 * Add a listener for a given event.
		 *
		 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn The listener function.
		 * @param {*} context The context to invoke the listener with.
		 * @param {Boolean} once Specify if the listener is a one-time listener.
		 * @returns {EventEmitter}
		 * @private
		 */
		function addListener(emitter, event, fn, context, once) {
		  if (typeof fn !== 'function') {
		    throw new TypeError('The listener must be a function');
		  }

		  var listener = new EE(fn, context || emitter, once)
		    , evt = prefix ? prefix + event : event;

		  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
		  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
		  else emitter._events[evt] = [emitter._events[evt], listener];

		  return emitter;
		}

		/**
		 * Clear event by name.
		 *
		 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
		 * @param {(String|Symbol)} evt The Event name.
		 * @private
		 */
		function clearEvent(emitter, evt) {
		  if (--emitter._eventsCount === 0) emitter._events = new Events();
		  else delete emitter._events[evt];
		}

		/**
		 * Minimal `EventEmitter` interface that is molded against the Node.js
		 * `EventEmitter` interface.
		 *
		 * @constructor
		 * @public
		 */
		function EventEmitter() {
		  this._events = new Events();
		  this._eventsCount = 0;
		}

		/**
		 * Return an array listing the events for which the emitter has registered
		 * listeners.
		 *
		 * @returns {Array}
		 * @public
		 */
		EventEmitter.prototype.eventNames = function eventNames() {
		  var names = []
		    , events
		    , name;

		  if (this._eventsCount === 0) return names;

		  for (name in (events = this._events)) {
		    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
		  }

		  if (Object.getOwnPropertySymbols) {
		    return names.concat(Object.getOwnPropertySymbols(events));
		  }

		  return names;
		};

		/**
		 * Return the listeners registered for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @returns {Array} The registered listeners.
		 * @public
		 */
		EventEmitter.prototype.listeners = function listeners(event) {
		  var evt = prefix ? prefix + event : event
		    , handlers = this._events[evt];

		  if (!handlers) return [];
		  if (handlers.fn) return [handlers.fn];

		  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
		    ee[i] = handlers[i].fn;
		  }

		  return ee;
		};

		/**
		 * Return the number of listeners listening to a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @returns {Number} The number of listeners.
		 * @public
		 */
		EventEmitter.prototype.listenerCount = function listenerCount(event) {
		  var evt = prefix ? prefix + event : event
		    , listeners = this._events[evt];

		  if (!listeners) return 0;
		  if (listeners.fn) return 1;
		  return listeners.length;
		};

		/**
		 * Calls each of the listeners registered for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @returns {Boolean} `true` if the event had listeners, else `false`.
		 * @public
		 */
		EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
		  var evt = prefix ? prefix + event : event;

		  if (!this._events[evt]) return false;

		  var listeners = this._events[evt]
		    , len = arguments.length
		    , args
		    , i;

		  if (listeners.fn) {
		    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

		    switch (len) {
		      case 1: return listeners.fn.call(listeners.context), true;
		      case 2: return listeners.fn.call(listeners.context, a1), true;
		      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
		      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
		      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
		      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
		    }

		    for (i = 1, args = new Array(len -1); i < len; i++) {
		      args[i - 1] = arguments[i];
		    }

		    listeners.fn.apply(listeners.context, args);
		  } else {
		    var length = listeners.length
		      , j;

		    for (i = 0; i < length; i++) {
		      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

		      switch (len) {
		        case 1: listeners[i].fn.call(listeners[i].context); break;
		        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
		        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
		        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
		        default:
		          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
		            args[j - 1] = arguments[j];
		          }

		          listeners[i].fn.apply(listeners[i].context, args);
		      }
		    }
		  }

		  return true;
		};

		/**
		 * Add a listener for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn The listener function.
		 * @param {*} [context=this] The context to invoke the listener with.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.on = function on(event, fn, context) {
		  return addListener(this, event, fn, context, false);
		};

		/**
		 * Add a one-time listener for a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn The listener function.
		 * @param {*} [context=this] The context to invoke the listener with.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.once = function once(event, fn, context) {
		  return addListener(this, event, fn, context, true);
		};

		/**
		 * Remove the listeners of a given event.
		 *
		 * @param {(String|Symbol)} event The event name.
		 * @param {Function} fn Only remove the listeners that match this function.
		 * @param {*} context Only remove the listeners that have this context.
		 * @param {Boolean} once Only remove one-time listeners.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
		  var evt = prefix ? prefix + event : event;

		  if (!this._events[evt]) return this;
		  if (!fn) {
		    clearEvent(this, evt);
		    return this;
		  }

		  var listeners = this._events[evt];

		  if (listeners.fn) {
		    if (
		      listeners.fn === fn &&
		      (!once || listeners.once) &&
		      (!context || listeners.context === context)
		    ) {
		      clearEvent(this, evt);
		    }
		  } else {
		    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
		      if (
		        listeners[i].fn !== fn ||
		        (once && !listeners[i].once) ||
		        (context && listeners[i].context !== context)
		      ) {
		        events.push(listeners[i]);
		      }
		    }

		    //
		    // Reset the array, or remove it completely if we have no more listeners.
		    //
		    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
		    else clearEvent(this, evt);
		  }

		  return this;
		};

		/**
		 * Remove all listeners, or those of the specified event.
		 *
		 * @param {(String|Symbol)} [event] The event name.
		 * @returns {EventEmitter} `this`.
		 * @public
		 */
		EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
		  var evt;

		  if (event) {
		    evt = prefix ? prefix + event : event;
		    if (this._events[evt]) clearEvent(this, evt);
		  } else {
		    this._events = new Events();
		    this._eventsCount = 0;
		  }

		  return this;
		};

		//
		// Alias methods names because people roll like that.
		//
		EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
		EventEmitter.prototype.addListener = EventEmitter.prototype.on;

		//
		// Expose the prefix.
		//
		EventEmitter.prefixed = prefix;

		//
		// Allow `EventEmitter` to be imported as module namespace.
		//
		EventEmitter.EventEmitter = EventEmitter;

		//
		// Expose the module.
		//
		{
		  module.exports = EventEmitter;
		} 
	} (eventemitter3));

	var eventemitter3Exports = eventemitter3.exports;
	var EventEmitter = /*@__PURE__*/getDefaultExportFromCjs(eventemitter3Exports);

	/*
	 * ============================================================================
	 * MAIN WIDGET CONFIGURATION
	 * ============================================================================
	 */
	var SurfaceMode;
	(function (SurfaceMode) {
	    SurfaceMode["INLINE"] = "inline";
	    SurfaceMode["IFRAME"] = "iframe";
	})(SurfaceMode || (SurfaceMode = {}));
	/*
	 * ============================================================================
	 * WIDGET STATE TYPES
	 * ============================================================================
	 */
	var ConnectionStatus;
	(function (ConnectionStatus) {
	    ConnectionStatus["CONNECTING"] = "connecting";
	    ConnectionStatus["CONNECTED"] = "connected";
	    ConnectionStatus["DISCONNECTED"] = "disconnected";
	    ConnectionStatus["ERROR"] = "error";
	    ConnectionStatus["RECONNECTING"] = "reconnecting";
	})(ConnectionStatus || (ConnectionStatus = {}));
	function createWidgetError(code, message, details) {
	    const error = new Error(message);
	    error.name = `WidgetError(${code})`;
	    error.code = code;
	    error.details = details;
	    return error;
	}

	// Constants for the Aomi Chat Widget
	/*
	 * ============================================================================
	 * WIDGET DEFAULTS
	 * ============================================================================
	 */
	const DEFAULT_WIDGET_WIDTH = '400px';
	const DEFAULT_WIDGET_HEIGHT = '600px';
	const DEFAULT_MAX_HEIGHT = 800;
	const DEFAULT_MESSAGE_LENGTH = 2000;
	const DEFAULT_RECONNECT_ATTEMPTS = 5;
	const DEFAULT_RECONNECT_DELAY = 3000;
	const DEFAULT_RENDER_SURFACE = SurfaceMode.IFRAME;
	/*
	 * ============================================================================
	 * NETWORK CONSTANTS
	 * ============================================================================
	 */
	const SUPPORTED_CHAINS = {
	    1: 'Ethereum',
	    5: 'Goerli',
	    11155111: 'Sepolia',
	    100: 'Gnosis',
	    137: 'Polygon',
	    42161: 'Arbitrum One',
	    8453: 'Base',
	    10: 'Optimism',
	    1337: 'Localhost',
	    31337: 'Anvil',
	    59140: 'Linea Sepolia',
	    59144: 'Linea',
	};
	const DEFAULT_CHAIN_ID = 1;
	const DEFAULT_WIDGET_THEME = {
	    palette: {
	        primary: '#111827',
	        background: '#ffffff',
	        surface: '#f8fafc',
	        text: '#0f172a',
	        textSecondary: '#475569',
	        border: '#e2e8f0',
	        success: '#059669',
	        error: '#dc2626',
	        warning: '#f97316',
	        accent: '#2563eb',
	    },
	    fonts: {
	        primary: '"Inter", "Helvetica Neue", Arial, sans-serif',
	        monospace: '"JetBrains Mono", "SF Mono", monospace',
	    },
	};
	/*
	 * ============================================================================
	 * ERROR CODES
	 * ============================================================================
	 */
	const ERROR_CODES = {
	    // Configuration errors
	    INVALID_CONFIG: 'INVALID_CONFIG',
	    MISSING_APP_CODE: 'MISSING_APP_CODE',
	    INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
	    // Connection errors
	    CONNECTION_FAILED: 'CONNECTION_FAILED',
	    CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
	    BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
	    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
	    // Wallet errors
	    WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
	    WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
	    UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
	    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
	    TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',
	    // Chat errors
	    MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
	    RATE_LIMITED: 'RATE_LIMITED',
	    INVALID_MESSAGE: 'INVALID_MESSAGE',
	    SESSION_EXPIRED: 'SESSION_EXPIRED',
	    // General errors
	    PERMISSION_DENIED: 'PERMISSION_DENIED',
	    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
	    PROVIDER_ERROR: 'PROVIDER_ERROR',
	};
	/*
	 * ============================================================================
	 * EVENT NAMES
	 * ============================================================================
	 */
	const WIDGET_EVENTS = {
	    // Widget lifecycle
	    READY: 'ready',
	    DESTROY: 'destroy',
	    RESIZE: 'resize',
	    // Chat events
	    MESSAGE: 'message',
	    PROCESSING_CHANGE: 'processingChange',
	    // Connection events
	    CONNECTION_CHANGE: 'connectionChange',
	    SESSION_START: 'sessionStart',
	    SESSION_END: 'sessionEnd',
	    // Wallet events
	    WALLET_CONNECT: 'walletConnect',
	    WALLET_DISCONNECT: 'walletDisconnect',
	    NETWORK_CHANGE: 'networkChange',
	    TRANSACTION_REQUEST: 'transactionRequest',
	    // Error events
	    ERROR: 'error',
	};
	/*
	 * ============================================================================
	 * CSS CLASS NAMES
	 * ============================================================================
	 */
	const CSS_CLASSES = {
	    // Root classes
	    WIDGET_ROOT: 'aomi-chat-widget',
	    WIDGET_CONTAINER: 'aomi-chat-container',
	    WIDGET_IFRAME: 'aomi-chat-iframe',
	    // Component classes
	    CHAT_INTERFACE: 'aomi-chat-interface',
	    CHAT_HEADER: 'aomi-chat-header',
	    CHAT_TITLE: 'aomi-chat-title',
	    CHAT_BODY: 'aomi-chat-body',
	    MESSAGE_LIST: 'aomi-message-list',
	    MESSAGE_CONTAINER: 'aomi-message-container',
	    MESSAGE_BUBBLE: 'aomi-message',
	    MESSAGE_USER: 'aomi-message-user',
	    MESSAGE_ASSISTANT: 'aomi-message-assistant',
	    MESSAGE_SYSTEM: 'aomi-message-system',
	    ACTION_BAR: 'aomi-action-bar',
	    MESSAGE_INPUT: 'aomi-message-input',
	    INPUT_FORM: 'aomi-chat-input-form',
	    INPUT_FIELD: 'aomi-chat-input-field',
	    SEND_BUTTON: 'aomi-chat-send-button',
	    WALLET_STATUS: 'aomi-wallet-status',
	    // State classes
	    LOADING: 'aomi-loading',
	    ERROR: 'aomi-error',
	    DISABLED: 'aomi-disabled',
	    CONNECTED: 'aomi-connected',
	    DISCONNECTED: 'aomi-disconnected',
	};
	/*
	 * ============================================================================
	 * API ENDPOINTS
	 * ============================================================================
	 */
	const API_ENDPOINTS = {
	    CHAT: '/api/chat',
	    CHAT_STREAM: '/api/chat/stream',
	    STATE: '/api/state',
	    INTERRUPT: '/api/interrupt',
	    SYSTEM: '/api/system',
	    MCP_COMMAND: '/api/mcp-command',
	    HEALTH: '/health',
	};
	/*
	 * ============================================================================
	 * TIMING CONSTANTS
	 * ============================================================================
	 */
	const TIMING = {
	    MESSAGE_ANIMATION_DURATION: 300,
	    CONNECTION_TIMEOUT: 10000,
	    RETRY_DELAY: 1000,
	    HEARTBEAT_INTERVAL: 30000,
	    SESSION_TIMEOUT: 3600000, // 1 hour
	};

	function convertBackendMessage(message, index, previousMessage) {
	    const sender = message.sender === 'user'
	        ? 'user'
	        : message.sender === 'system'
	            ? 'system'
	            : 'assistant';
	    const parsedTimestamp = message.timestamp ? new Date(message.timestamp) : new Date();
	    const timestamp = Number.isNaN(parsedTimestamp.valueOf()) ? new Date() : parsedTimestamp;
	    const idBase = message.timestamp || `${sender}-${index}`;
	    const toolStream = normaliseToolStream(message.tool_stream ?? message.toolStream);
	    return {
	        id: previousMessage?.id ?? `${idBase}-${index}`,
	        type: sender,
	        content: message.content ?? '',
	        timestamp,
	        metadata: {
	            streaming: Boolean(message.is_streaming),
	        },
	        toolStream,
	    };
	}
	function resolveBackendBoolean(value) {
	    if (typeof value === 'boolean') {
	        return value;
	    }
	    if (typeof value === 'string') {
	        return value.toLowerCase() === 'true';
	    }
	    return null;
	}
	function normaliseToolStream(raw) {
	    if (!raw)
	        return undefined;
	    if (Array.isArray(raw)) {
	        const [topic, content] = raw;
	        return typeof topic === 'string'
	            ? {
	                topic,
	                content: typeof content === 'string' ? content : '',
	            }
	            : undefined;
	    }
	    if (typeof raw === 'object') {
	        const { topic, content } = raw;
	        return typeof topic === 'string'
	            ? {
	                topic,
	                content: typeof content === 'string' ? content : '',
	            }
	            : undefined;
	    }
	    return undefined;
	}
	function areToolStreamsEqual(a, b) {
	    if (!a && !b)
	        return true;
	    if (!a || !b)
	        return false;
	    return a.topic === b.topic && a.content === b.content;
	}
	function validateTransactionPayload(transaction) {
	    if (!isEthereumAddress(transaction.to)) {
	        throw new Error('Invalid recipient address');
	    }
	    if (!isHex$1(transaction.value)) {
	        throw new Error('Invalid transaction value');
	    }
	    if (transaction.data && !isHex$1(transaction.data)) {
	        throw new Error('Invalid transaction data');
	    }
	    if (transaction.gas && !isHex$1(transaction.gas)) {
	        throw new Error('Invalid gas value');
	    }
	}
	function isHex$1(value) {
	    return /^0x[0-9a-fA-F]*$/.test(value);
	}
	/*
	 * ============================================================================
	 * VALIDATION UTILITIES
	 * ============================================================================
	 */
	/**
	 * Validates widget configuration parameters
	 */
	function validateWidgetParams(params) {
	    if (!params.appCode || typeof params.appCode !== 'string') {
	        return ['appCode is required and must be a string'];
	    }
	    return [];
	}
	/*
	 * ============================================================================
	 * SESSION UTILITIES
	 * ============================================================================
	 */
	/**
	 * Generates a unique session ID
	 */
	function generateSessionId() {
	    // Use crypto.randomUUID if available (modern browsers)
	    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
	        return crypto.randomUUID();
	    }
	    // Fallback UUID v4 implementation
	    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
	        const r = Math.random() * 16 | 0;
	        const v = c === 'x' ? r : (r & 0x3 | 0x8);
	        return v.toString(16);
	    });
	}
	/*
	 * ============================================================================
	 * DOM UTILITIES
	 * ============================================================================
	 */
	/**
	 * Creates a DOM element with classes and attributes
	 */
	function createElement(tagName, options = {}, doc) {
	    const targetDocument = doc ?? (typeof document !== 'undefined' ? document : null);
	    if (!targetDocument) {
	        throw new Error('No document available for DOM operations');
	    }
	    const element = targetDocument.createElement(tagName);
	    // Set classes
	    if (options.className) {
	        if (Array.isArray(options.className)) {
	            element.classList.add(...options.className);
	        }
	        else {
	            element.className = options.className;
	        }
	    }
	    // Set attributes
	    if (options.attributes) {
	        Object.entries(options.attributes).forEach(([key, value]) => {
	            element.setAttribute(key, value);
	        });
	    }
	    // Set styles
	    if (options.styles) {
	        Object.assign(element.style, options.styles);
	    }
	    // Add children
	    if (options.children) {
	        options.children.forEach(child => {
	            if (typeof child === 'string') {
	                element.appendChild(targetDocument.createTextNode(child));
	            }
	            else {
	                element.appendChild(child);
	            }
	        });
	    }
	    return element;
	}
	/*
	 * ============================================================================
	 * TYPE GUARDS
	 * ============================================================================
	 */
	/**
	 * Type guard to check if a value is a valid Ethereum address
	 */
	function isEthereumAddress(value) {
	    if (typeof value !== 'string')
	        return false;
	    return /^0x[a-fA-F0-9]{40}$/.test(value);
	}
	/**
	 * Type guard to check if a value is a valid transaction hash
	 */
	function isTransactionHash(value) {
	    if (typeof value !== 'string')
	        return false;
	    return /^0x[a-fA-F0-9]{64}$/.test(value);
	}
	/*
	 * ============================================================================
	 * ASYNC UTILITIES
	 * ============================================================================
	 */
	/**
	 * Creates a promise that rejects after a timeout
	 */
	function withTimeout$1(promise, timeoutMs) {
	    return Promise.race([
	        promise,
	        new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)),
	    ]);
	}
	/*
	 * ============================================================================
	 * ENVIRONMENT UTILITIES
	 * ============================================================================
	 */
	/**
	 * Detects if running in a browser environment
	 */
	function isBrowser() {
	    return typeof window !== 'undefined' && typeof document !== 'undefined';
	}
	/*
	 * ============================================================================
	 * FORMATTING UTILITIES
	 * ============================================================================
	 */
	/**
	 * Truncates an Ethereum address for display
	 */
	function truncateAddress(address, startChars = 6, endChars = 4) {
	    if (!isEthereumAddress(address))
	        return address;
	    if (address.length <= startChars + endChars)
	        return address;
	    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
	}

	/*! @license DOMPurify 3.3.0 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.0/LICENSE */

	const {
	  entries,
	  setPrototypeOf,
	  isFrozen,
	  getPrototypeOf,
	  getOwnPropertyDescriptor
	} = Object;
	let {
	  freeze,
	  seal,
	  create
	} = Object; // eslint-disable-line import/no-mutable-exports
	let {
	  apply,
	  construct
	} = typeof Reflect !== 'undefined' && Reflect;
	if (!freeze) {
	  freeze = function freeze(x) {
	    return x;
	  };
	}
	if (!seal) {
	  seal = function seal(x) {
	    return x;
	  };
	}
	if (!apply) {
	  apply = function apply(func, thisArg) {
	    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
	      args[_key - 2] = arguments[_key];
	    }
	    return func.apply(thisArg, args);
	  };
	}
	if (!construct) {
	  construct = function construct(Func) {
	    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
	      args[_key2 - 1] = arguments[_key2];
	    }
	    return new Func(...args);
	  };
	}
	const arrayForEach = unapply(Array.prototype.forEach);
	const arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
	const arrayPop = unapply(Array.prototype.pop);
	const arrayPush = unapply(Array.prototype.push);
	const arraySplice = unapply(Array.prototype.splice);
	const stringToLowerCase = unapply(String.prototype.toLowerCase);
	const stringToString = unapply(String.prototype.toString);
	const stringMatch = unapply(String.prototype.match);
	const stringReplace = unapply(String.prototype.replace);
	const stringIndexOf = unapply(String.prototype.indexOf);
	const stringTrim = unapply(String.prototype.trim);
	const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
	const regExpTest = unapply(RegExp.prototype.test);
	const typeErrorCreate = unconstruct(TypeError);
	/**
	 * Creates a new function that calls the given function with a specified thisArg and arguments.
	 *
	 * @param func - The function to be wrapped and called.
	 * @returns A new function that calls the given function with a specified thisArg and arguments.
	 */
	function unapply(func) {
	  return function (thisArg) {
	    if (thisArg instanceof RegExp) {
	      thisArg.lastIndex = 0;
	    }
	    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
	      args[_key3 - 1] = arguments[_key3];
	    }
	    return apply(func, thisArg, args);
	  };
	}
	/**
	 * Creates a new function that constructs an instance of the given constructor function with the provided arguments.
	 *
	 * @param func - The constructor function to be wrapped and called.
	 * @returns A new function that constructs an instance of the given constructor function with the provided arguments.
	 */
	function unconstruct(Func) {
	  return function () {
	    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
	      args[_key4] = arguments[_key4];
	    }
	    return construct(Func, args);
	  };
	}
	/**
	 * Add properties to a lookup table
	 *
	 * @param set - The set to which elements will be added.
	 * @param array - The array containing elements to be added to the set.
	 * @param transformCaseFunc - An optional function to transform the case of each element before adding to the set.
	 * @returns The modified set with added elements.
	 */
	function addToSet(set, array) {
	  let transformCaseFunc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : stringToLowerCase;
	  if (setPrototypeOf) {
	    // Make 'in' and truthy checks like Boolean(set.constructor)
	    // independent of any properties defined on Object.prototype.
	    // Prevent prototype setters from intercepting set as a this value.
	    setPrototypeOf(set, null);
	  }
	  let l = array.length;
	  while (l--) {
	    let element = array[l];
	    if (typeof element === 'string') {
	      const lcElement = transformCaseFunc(element);
	      if (lcElement !== element) {
	        // Config presets (e.g. tags.js, attrs.js) are immutable.
	        if (!isFrozen(array)) {
	          array[l] = lcElement;
	        }
	        element = lcElement;
	      }
	    }
	    set[element] = true;
	  }
	  return set;
	}
	/**
	 * Clean up an array to harden against CSPP
	 *
	 * @param array - The array to be cleaned.
	 * @returns The cleaned version of the array
	 */
	function cleanArray(array) {
	  for (let index = 0; index < array.length; index++) {
	    const isPropertyExist = objectHasOwnProperty(array, index);
	    if (!isPropertyExist) {
	      array[index] = null;
	    }
	  }
	  return array;
	}
	/**
	 * Shallow clone an object
	 *
	 * @param object - The object to be cloned.
	 * @returns A new object that copies the original.
	 */
	function clone(object) {
	  const newObject = create(null);
	  for (const [property, value] of entries(object)) {
	    const isPropertyExist = objectHasOwnProperty(object, property);
	    if (isPropertyExist) {
	      if (Array.isArray(value)) {
	        newObject[property] = cleanArray(value);
	      } else if (value && typeof value === 'object' && value.constructor === Object) {
	        newObject[property] = clone(value);
	      } else {
	        newObject[property] = value;
	      }
	    }
	  }
	  return newObject;
	}
	/**
	 * This method automatically checks if the prop is function or getter and behaves accordingly.
	 *
	 * @param object - The object to look up the getter function in its prototype chain.
	 * @param prop - The property name for which to find the getter function.
	 * @returns The getter function found in the prototype chain or a fallback function.
	 */
	function lookupGetter(object, prop) {
	  while (object !== null) {
	    const desc = getOwnPropertyDescriptor(object, prop);
	    if (desc) {
	      if (desc.get) {
	        return unapply(desc.get);
	      }
	      if (typeof desc.value === 'function') {
	        return unapply(desc.value);
	      }
	    }
	    object = getPrototypeOf(object);
	  }
	  function fallbackValue() {
	    return null;
	  }
	  return fallbackValue;
	}

	const html$1 = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'search', 'section', 'select', 'shadow', 'slot', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);
	const svg$1 = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'enterkeyhint', 'exportparts', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'inputmode', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'part', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);
	const svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);
	// List of SVG elements that are disallowed by default.
	// We still need to know them so that we can do namespace
	// checks properly in case one wants to add them to
	// allow-list.
	const svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);
	const mathMl$1 = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'mprescripts']);
	// Similarly to SVG, we want to know all MathML elements,
	// even those that we disallow by default.
	const mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);
	const text = freeze(['#text']);

	const html$2 = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'exportparts', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inert', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'nonce', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'part', 'pattern', 'placeholder', 'playsinline', 'popover', 'popovertarget', 'popovertargetaction', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'slot', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'wrap', 'xmlns', 'slot']);
	const svg = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'amplitude', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'exponent', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'intercept', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'mask-type', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'slope', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'tablevalues', 'targetx', 'targety', 'transform', 'transform-origin', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);
	const mathMl = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);
	const xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

	// eslint-disable-next-line unicorn/better-regex
	const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
	const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
	const TMPLIT_EXPR = seal(/\$\{[\w\W]*/gm); // eslint-disable-line unicorn/better-regex
	const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/); // eslint-disable-line no-useless-escape
	const ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
	const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
	);
	const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
	const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g // eslint-disable-line no-control-regex
	);
	const DOCTYPE_NAME = seal(/^html$/i);
	const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);

	var EXPRESSIONS = /*#__PURE__*/Object.freeze({
	  __proto__: null,
	  ARIA_ATTR: ARIA_ATTR,
	  ATTR_WHITESPACE: ATTR_WHITESPACE,
	  CUSTOM_ELEMENT: CUSTOM_ELEMENT,
	  DATA_ATTR: DATA_ATTR,
	  DOCTYPE_NAME: DOCTYPE_NAME,
	  ERB_EXPR: ERB_EXPR,
	  IS_ALLOWED_URI: IS_ALLOWED_URI,
	  IS_SCRIPT_OR_DATA: IS_SCRIPT_OR_DATA,
	  MUSTACHE_EXPR: MUSTACHE_EXPR,
	  TMPLIT_EXPR: TMPLIT_EXPR
	});

	/* eslint-disable @typescript-eslint/indent */
	// https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
	const NODE_TYPE = {
	  element: 1,
	  text: 3,
	  // Deprecated
	  progressingInstruction: 7,
	  comment: 8,
	  document: 9};
	const getGlobal = function getGlobal() {
	  return typeof window === 'undefined' ? null : window;
	};
	/**
	 * Creates a no-op policy for internal use only.
	 * Don't export this function outside this module!
	 * @param trustedTypes The policy factory.
	 * @param purifyHostElement The Script element used to load DOMPurify (to determine policy name suffix).
	 * @return The policy created (or null, if Trusted Types
	 * are not supported or creating the policy failed).
	 */
	const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
	  if (typeof trustedTypes !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
	    return null;
	  }
	  // Allow the callers to control the unique policy name
	  // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
	  // Policy creation with duplicate names throws in Trusted Types.
	  let suffix = null;
	  const ATTR_NAME = 'data-tt-policy-suffix';
	  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
	    suffix = purifyHostElement.getAttribute(ATTR_NAME);
	  }
	  const policyName = 'dompurify' + (suffix ? '#' + suffix : '');
	  try {
	    return trustedTypes.createPolicy(policyName, {
	      createHTML(html) {
	        return html;
	      },
	      createScriptURL(scriptUrl) {
	        return scriptUrl;
	      }
	    });
	  } catch (_) {
	    // Policy creation failed (most likely another DOMPurify script has
	    // already run). Skip creating the policy, as this will only cause errors
	    // if TT are enforced.
	    console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
	    return null;
	  }
	};
	const _createHooksMap = function _createHooksMap() {
	  return {
	    afterSanitizeAttributes: [],
	    afterSanitizeElements: [],
	    afterSanitizeShadowDOM: [],
	    beforeSanitizeAttributes: [],
	    beforeSanitizeElements: [],
	    beforeSanitizeShadowDOM: [],
	    uponSanitizeAttribute: [],
	    uponSanitizeElement: [],
	    uponSanitizeShadowNode: []
	  };
	};
	function createDOMPurify() {
	  let window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();
	  const DOMPurify = root => createDOMPurify(root);
	  DOMPurify.version = '3.3.0';
	  DOMPurify.removed = [];
	  if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document || !window.Element) {
	    // Not running in a browser, provide a factory function
	    // so that you can pass your own Window
	    DOMPurify.isSupported = false;
	    return DOMPurify;
	  }
	  let {
	    document
	  } = window;
	  const originalDocument = document;
	  const currentScript = originalDocument.currentScript;
	  const {
	    DocumentFragment,
	    HTMLTemplateElement,
	    Node,
	    Element,
	    NodeFilter,
	    NamedNodeMap = window.NamedNodeMap || window.MozNamedAttrMap,
	    HTMLFormElement,
	    DOMParser,
	    trustedTypes
	  } = window;
	  const ElementPrototype = Element.prototype;
	  const cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
	  const remove = lookupGetter(ElementPrototype, 'remove');
	  const getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
	  const getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
	  const getParentNode = lookupGetter(ElementPrototype, 'parentNode');
	  // As per issue #47, the web-components registry is inherited by a
	  // new document created via createHTMLDocument. As per the spec
	  // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
	  // a new empty registry is used when creating a template contents owner
	  // document, so we use that as our parent document to ensure nothing
	  // is inherited.
	  if (typeof HTMLTemplateElement === 'function') {
	    const template = document.createElement('template');
	    if (template.content && template.content.ownerDocument) {
	      document = template.content.ownerDocument;
	    }
	  }
	  let trustedTypesPolicy;
	  let emptyHTML = '';
	  const {
	    implementation,
	    createNodeIterator,
	    createDocumentFragment,
	    getElementsByTagName
	  } = document;
	  const {
	    importNode
	  } = originalDocument;
	  let hooks = _createHooksMap();
	  /**
	   * Expose whether this browser supports running the full DOMPurify.
	   */
	  DOMPurify.isSupported = typeof entries === 'function' && typeof getParentNode === 'function' && implementation && implementation.createHTMLDocument !== undefined;
	  const {
	    MUSTACHE_EXPR,
	    ERB_EXPR,
	    TMPLIT_EXPR,
	    DATA_ATTR,
	    ARIA_ATTR,
	    IS_SCRIPT_OR_DATA,
	    ATTR_WHITESPACE,
	    CUSTOM_ELEMENT
	  } = EXPRESSIONS;
	  let {
	    IS_ALLOWED_URI: IS_ALLOWED_URI$1
	  } = EXPRESSIONS;
	  /**
	   * We consider the elements and attributes below to be safe. Ideally
	   * don't add any new ones but feel free to remove unwanted ones.
	   */
	  /* allowed element names */
	  let ALLOWED_TAGS = null;
	  const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);
	  /* Allowed attribute names */
	  let ALLOWED_ATTR = null;
	  const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html$2, ...svg, ...mathMl, ...xml]);
	  /*
	   * Configure how DOMPurify should handle custom elements and their attributes as well as customized built-in elements.
	   * @property {RegExp|Function|null} tagNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any custom elements)
	   * @property {RegExp|Function|null} attributeNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any attributes not on the allow list)
	   * @property {boolean} allowCustomizedBuiltInElements allow custom elements derived from built-ins if they pass CUSTOM_ELEMENT_HANDLING.tagNameCheck. Default: `false`.
	   */
	  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
	    tagNameCheck: {
	      writable: true,
	      configurable: false,
	      enumerable: true,
	      value: null
	    },
	    attributeNameCheck: {
	      writable: true,
	      configurable: false,
	      enumerable: true,
	      value: null
	    },
	    allowCustomizedBuiltInElements: {
	      writable: true,
	      configurable: false,
	      enumerable: true,
	      value: false
	    }
	  }));
	  /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
	  let FORBID_TAGS = null;
	  /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
	  let FORBID_ATTR = null;
	  /* Config object to store ADD_TAGS/ADD_ATTR functions (when used as functions) */
	  const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
	    tagCheck: {
	      writable: true,
	      configurable: false,
	      enumerable: true,
	      value: null
	    },
	    attributeCheck: {
	      writable: true,
	      configurable: false,
	      enumerable: true,
	      value: null
	    }
	  }));
	  /* Decide if ARIA attributes are okay */
	  let ALLOW_ARIA_ATTR = true;
	  /* Decide if custom data attributes are okay */
	  let ALLOW_DATA_ATTR = true;
	  /* Decide if unknown protocols are okay */
	  let ALLOW_UNKNOWN_PROTOCOLS = false;
	  /* Decide if self-closing tags in attributes are allowed.
	   * Usually removed due to a mXSS issue in jQuery 3.0 */
	  let ALLOW_SELF_CLOSE_IN_ATTR = true;
	  /* Output should be safe for common template engines.
	   * This means, DOMPurify removes data attributes, mustaches and ERB
	   */
	  let SAFE_FOR_TEMPLATES = false;
	  /* Output should be safe even for XML used within HTML and alike.
	   * This means, DOMPurify removes comments when containing risky content.
	   */
	  let SAFE_FOR_XML = true;
	  /* Decide if document with <html>... should be returned */
	  let WHOLE_DOCUMENT = false;
	  /* Track whether config is already set on this instance of DOMPurify. */
	  let SET_CONFIG = false;
	  /* Decide if all elements (e.g. style, script) must be children of
	   * document.body. By default, browsers might move them to document.head */
	  let FORCE_BODY = false;
	  /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
	   * string (or a TrustedHTML object if Trusted Types are supported).
	   * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
	   */
	  let RETURN_DOM = false;
	  /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
	   * string  (or a TrustedHTML object if Trusted Types are supported) */
	  let RETURN_DOM_FRAGMENT = false;
	  /* Try to return a Trusted Type object instead of a string, return a string in
	   * case Trusted Types are not supported  */
	  let RETURN_TRUSTED_TYPE = false;
	  /* Output should be free from DOM clobbering attacks?
	   * This sanitizes markups named with colliding, clobberable built-in DOM APIs.
	   */
	  let SANITIZE_DOM = true;
	  /* Achieve full DOM Clobbering protection by isolating the namespace of named
	   * properties and JS variables, mitigating attacks that abuse the HTML/DOM spec rules.
	   *
	   * HTML/DOM spec rules that enable DOM Clobbering:
	   *   - Named Access on Window (§7.3.3)
	   *   - DOM Tree Accessors (§3.1.5)
	   *   - Form Element Parent-Child Relations (§4.10.3)
	   *   - Iframe srcdoc / Nested WindowProxies (§4.8.5)
	   *   - HTMLCollection (§4.2.10.2)
	   *
	   * Namespace isolation is implemented by prefixing `id` and `name` attributes
	   * with a constant string, i.e., `user-content-`
	   */
	  let SANITIZE_NAMED_PROPS = false;
	  const SANITIZE_NAMED_PROPS_PREFIX = 'user-content-';
	  /* Keep element content when removing element? */
	  let KEEP_CONTENT = true;
	  /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
	   * of importing it into a new Document and returning a sanitized copy */
	  let IN_PLACE = false;
	  /* Allow usage of profiles like html, svg and mathMl */
	  let USE_PROFILES = {};
	  /* Tags to ignore content of when KEEP_CONTENT is true */
	  let FORBID_CONTENTS = null;
	  const DEFAULT_FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);
	  /* Tags that are safe for data: URIs */
	  let DATA_URI_TAGS = null;
	  const DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);
	  /* Attributes safe for values like "javascript:" */
	  let URI_SAFE_ATTRIBUTES = null;
	  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'role', 'summary', 'title', 'value', 'style', 'xmlns']);
	  const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
	  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
	  const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
	  /* Document namespace */
	  let NAMESPACE = HTML_NAMESPACE;
	  let IS_EMPTY_INPUT = false;
	  /* Allowed XHTML+XML namespaces */
	  let ALLOWED_NAMESPACES = null;
	  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
	  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);
	  let HTML_INTEGRATION_POINTS = addToSet({}, ['annotation-xml']);
	  // Certain elements are allowed in both SVG and HTML
	  // namespace. We need to specify them explicitly
	  // so that they don't get erroneously deleted from
	  // HTML namespace.
	  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ['title', 'style', 'font', 'a', 'script']);
	  /* Parsing of strict XHTML documents */
	  let PARSER_MEDIA_TYPE = null;
	  const SUPPORTED_PARSER_MEDIA_TYPES = ['application/xhtml+xml', 'text/html'];
	  const DEFAULT_PARSER_MEDIA_TYPE = 'text/html';
	  let transformCaseFunc = null;
	  /* Keep a reference to config to pass to hooks */
	  let CONFIG = null;
	  /* Ideally, do not touch anything below this line */
	  /* ______________________________________________ */
	  const formElement = document.createElement('form');
	  const isRegexOrFunction = function isRegexOrFunction(testValue) {
	    return testValue instanceof RegExp || testValue instanceof Function;
	  };
	  /**
	   * _parseConfig
	   *
	   * @param cfg optional config literal
	   */
	  // eslint-disable-next-line complexity
	  const _parseConfig = function _parseConfig() {
	    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	    if (CONFIG && CONFIG === cfg) {
	      return;
	    }
	    /* Shield configuration object from tampering */
	    if (!cfg || typeof cfg !== 'object') {
	      cfg = {};
	    }
	    /* Shield configuration object from prototype pollution */
	    cfg = clone(cfg);
	    PARSER_MEDIA_TYPE =
	    // eslint-disable-next-line unicorn/prefer-includes
	    SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
	    // HTML tags and attributes are not case-sensitive, converting to lowercase. Keeping XHTML as is.
	    transformCaseFunc = PARSER_MEDIA_TYPE === 'application/xhtml+xml' ? stringToString : stringToLowerCase;
	    /* Set configuration parameters */
	    ALLOWED_TAGS = objectHasOwnProperty(cfg, 'ALLOWED_TAGS') ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
	    ALLOWED_ATTR = objectHasOwnProperty(cfg, 'ALLOWED_ATTR') ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
	    ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, 'ALLOWED_NAMESPACES') ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
	    URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, 'ADD_URI_SAFE_ATTR') ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR, transformCaseFunc) : DEFAULT_URI_SAFE_ATTRIBUTES;
	    DATA_URI_TAGS = objectHasOwnProperty(cfg, 'ADD_DATA_URI_TAGS') ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS, transformCaseFunc) : DEFAULT_DATA_URI_TAGS;
	    FORBID_CONTENTS = objectHasOwnProperty(cfg, 'FORBID_CONTENTS') ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
	    FORBID_TAGS = objectHasOwnProperty(cfg, 'FORBID_TAGS') ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : clone({});
	    FORBID_ATTR = objectHasOwnProperty(cfg, 'FORBID_ATTR') ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : clone({});
	    USE_PROFILES = objectHasOwnProperty(cfg, 'USE_PROFILES') ? cfg.USE_PROFILES : false;
	    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
	    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
	    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
	    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false; // Default true
	    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
	    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false; // Default true
	    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
	    RETURN_DOM = cfg.RETURN_DOM || false; // Default false
	    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
	    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
	    FORCE_BODY = cfg.FORCE_BODY || false; // Default false
	    SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
	    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false; // Default false
	    KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
	    IN_PLACE = cfg.IN_PLACE || false; // Default false
	    IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
	    NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
	    MATHML_TEXT_INTEGRATION_POINTS = cfg.MATHML_TEXT_INTEGRATION_POINTS || MATHML_TEXT_INTEGRATION_POINTS;
	    HTML_INTEGRATION_POINTS = cfg.HTML_INTEGRATION_POINTS || HTML_INTEGRATION_POINTS;
	    CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || {};
	    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
	      CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
	    }
	    if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
	      CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
	    }
	    if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === 'boolean') {
	      CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
	    }
	    if (SAFE_FOR_TEMPLATES) {
	      ALLOW_DATA_ATTR = false;
	    }
	    if (RETURN_DOM_FRAGMENT) {
	      RETURN_DOM = true;
	    }
	    /* Parse profile info */
	    if (USE_PROFILES) {
	      ALLOWED_TAGS = addToSet({}, text);
	      ALLOWED_ATTR = [];
	      if (USE_PROFILES.html === true) {
	        addToSet(ALLOWED_TAGS, html$1);
	        addToSet(ALLOWED_ATTR, html$2);
	      }
	      if (USE_PROFILES.svg === true) {
	        addToSet(ALLOWED_TAGS, svg$1);
	        addToSet(ALLOWED_ATTR, svg);
	        addToSet(ALLOWED_ATTR, xml);
	      }
	      if (USE_PROFILES.svgFilters === true) {
	        addToSet(ALLOWED_TAGS, svgFilters);
	        addToSet(ALLOWED_ATTR, svg);
	        addToSet(ALLOWED_ATTR, xml);
	      }
	      if (USE_PROFILES.mathMl === true) {
	        addToSet(ALLOWED_TAGS, mathMl$1);
	        addToSet(ALLOWED_ATTR, mathMl);
	        addToSet(ALLOWED_ATTR, xml);
	      }
	    }
	    /* Merge configuration parameters */
	    if (cfg.ADD_TAGS) {
	      if (typeof cfg.ADD_TAGS === 'function') {
	        EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
	      } else {
	        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
	          ALLOWED_TAGS = clone(ALLOWED_TAGS);
	        }
	        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
	      }
	    }
	    if (cfg.ADD_ATTR) {
	      if (typeof cfg.ADD_ATTR === 'function') {
	        EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
	      } else {
	        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
	          ALLOWED_ATTR = clone(ALLOWED_ATTR);
	        }
	        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
	      }
	    }
	    if (cfg.ADD_URI_SAFE_ATTR) {
	      addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
	    }
	    if (cfg.FORBID_CONTENTS) {
	      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
	        FORBID_CONTENTS = clone(FORBID_CONTENTS);
	      }
	      addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
	    }
	    /* Add #text in case KEEP_CONTENT is set to true */
	    if (KEEP_CONTENT) {
	      ALLOWED_TAGS['#text'] = true;
	    }
	    /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
	    if (WHOLE_DOCUMENT) {
	      addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
	    }
	    /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
	    if (ALLOWED_TAGS.table) {
	      addToSet(ALLOWED_TAGS, ['tbody']);
	      delete FORBID_TAGS.tbody;
	    }
	    if (cfg.TRUSTED_TYPES_POLICY) {
	      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== 'function') {
	        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
	      }
	      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== 'function') {
	        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
	      }
	      // Overwrite existing TrustedTypes policy.
	      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
	      // Sign local variables required by `sanitize`.
	      emptyHTML = trustedTypesPolicy.createHTML('');
	    } else {
	      // Uninitialized policy, attempt to initialize the internal dompurify policy.
	      if (trustedTypesPolicy === undefined) {
	        trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
	      }
	      // If creating the internal policy succeeded sign internal variables.
	      if (trustedTypesPolicy !== null && typeof emptyHTML === 'string') {
	        emptyHTML = trustedTypesPolicy.createHTML('');
	      }
	    }
	    // Prevent further manipulation of configuration.
	    // Not available in IE8, Safari 5, etc.
	    if (freeze) {
	      freeze(cfg);
	    }
	    CONFIG = cfg;
	  };
	  /* Keep track of all possible SVG and MathML tags
	   * so that we can perform the namespace checks
	   * correctly. */
	  const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
	  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
	  /**
	   * @param element a DOM element whose namespace is being checked
	   * @returns Return false if the element has a
	   *  namespace that a spec-compliant parser would never
	   *  return. Return true otherwise.
	   */
	  const _checkValidNamespace = function _checkValidNamespace(element) {
	    let parent = getParentNode(element);
	    // In JSDOM, if we're inside shadow DOM, then parentNode
	    // can be null. We just simulate parent in this case.
	    if (!parent || !parent.tagName) {
	      parent = {
	        namespaceURI: NAMESPACE,
	        tagName: 'template'
	      };
	    }
	    const tagName = stringToLowerCase(element.tagName);
	    const parentTagName = stringToLowerCase(parent.tagName);
	    if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
	      return false;
	    }
	    if (element.namespaceURI === SVG_NAMESPACE) {
	      // The only way to switch from HTML namespace to SVG
	      // is via <svg>. If it happens via any other tag, then
	      // it should be killed.
	      if (parent.namespaceURI === HTML_NAMESPACE) {
	        return tagName === 'svg';
	      }
	      // The only way to switch from MathML to SVG is via`
	      // svg if parent is either <annotation-xml> or MathML
	      // text integration points.
	      if (parent.namespaceURI === MATHML_NAMESPACE) {
	        return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
	      }
	      // We only allow elements that are defined in SVG
	      // spec. All others are disallowed in SVG namespace.
	      return Boolean(ALL_SVG_TAGS[tagName]);
	    }
	    if (element.namespaceURI === MATHML_NAMESPACE) {
	      // The only way to switch from HTML namespace to MathML
	      // is via <math>. If it happens via any other tag, then
	      // it should be killed.
	      if (parent.namespaceURI === HTML_NAMESPACE) {
	        return tagName === 'math';
	      }
	      // The only way to switch from SVG to MathML is via
	      // <math> and HTML integration points
	      if (parent.namespaceURI === SVG_NAMESPACE) {
	        return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
	      }
	      // We only allow elements that are defined in MathML
	      // spec. All others are disallowed in MathML namespace.
	      return Boolean(ALL_MATHML_TAGS[tagName]);
	    }
	    if (element.namespaceURI === HTML_NAMESPACE) {
	      // The only way to switch from SVG to HTML is via
	      // HTML integration points, and from MathML to HTML
	      // is via MathML text integration points
	      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
	        return false;
	      }
	      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
	        return false;
	      }
	      // We disallow tags that are specific for MathML
	      // or SVG and should never appear in HTML namespace
	      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
	    }
	    // For XHTML and XML documents that support custom namespaces
	    if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && ALLOWED_NAMESPACES[element.namespaceURI]) {
	      return true;
	    }
	    // The code should never reach this place (this means
	    // that the element somehow got namespace that is not
	    // HTML, SVG, MathML or allowed via ALLOWED_NAMESPACES).
	    // Return false just in case.
	    return false;
	  };
	  /**
	   * _forceRemove
	   *
	   * @param node a DOM node
	   */
	  const _forceRemove = function _forceRemove(node) {
	    arrayPush(DOMPurify.removed, {
	      element: node
	    });
	    try {
	      // eslint-disable-next-line unicorn/prefer-dom-node-remove
	      getParentNode(node).removeChild(node);
	    } catch (_) {
	      remove(node);
	    }
	  };
	  /**
	   * _removeAttribute
	   *
	   * @param name an Attribute name
	   * @param element a DOM node
	   */
	  const _removeAttribute = function _removeAttribute(name, element) {
	    try {
	      arrayPush(DOMPurify.removed, {
	        attribute: element.getAttributeNode(name),
	        from: element
	      });
	    } catch (_) {
	      arrayPush(DOMPurify.removed, {
	        attribute: null,
	        from: element
	      });
	    }
	    element.removeAttribute(name);
	    // We void attribute values for unremovable "is" attributes
	    if (name === 'is') {
	      if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
	        try {
	          _forceRemove(element);
	        } catch (_) {}
	      } else {
	        try {
	          element.setAttribute(name, '');
	        } catch (_) {}
	      }
	    }
	  };
	  /**
	   * _initDocument
	   *
	   * @param dirty - a string of dirty markup
	   * @return a DOM, filled with the dirty markup
	   */
	  const _initDocument = function _initDocument(dirty) {
	    /* Create a HTML document */
	    let doc = null;
	    let leadingWhitespace = null;
	    if (FORCE_BODY) {
	      dirty = '<remove></remove>' + dirty;
	    } else {
	      /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
	      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
	      leadingWhitespace = matches && matches[0];
	    }
	    if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && NAMESPACE === HTML_NAMESPACE) {
	      // Root of XHTML doc must contain xmlns declaration (see https://www.w3.org/TR/xhtml1/normative.html#strict)
	      dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + '</body></html>';
	    }
	    const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
	    /*
	     * Use the DOMParser API by default, fallback later if needs be
	     * DOMParser not work for svg when has multiple root element.
	     */
	    if (NAMESPACE === HTML_NAMESPACE) {
	      try {
	        doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
	      } catch (_) {}
	    }
	    /* Use createHTMLDocument in case DOMParser is not available */
	    if (!doc || !doc.documentElement) {
	      doc = implementation.createDocument(NAMESPACE, 'template', null);
	      try {
	        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
	      } catch (_) {
	        // Syntax error if dirtyPayload is invalid xml
	      }
	    }
	    const body = doc.body || doc.documentElement;
	    if (dirty && leadingWhitespace) {
	      body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
	    }
	    /* Work on whole document or just its body */
	    if (NAMESPACE === HTML_NAMESPACE) {
	      return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
	    }
	    return WHOLE_DOCUMENT ? doc.documentElement : body;
	  };
	  /**
	   * Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document.
	   *
	   * @param root The root element or node to start traversing on.
	   * @return The created NodeIterator
	   */
	  const _createNodeIterator = function _createNodeIterator(root) {
	    return createNodeIterator.call(root.ownerDocument || root, root,
	    // eslint-disable-next-line no-bitwise
	    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
	  };
	  /**
	   * _isClobbered
	   *
	   * @param element element to check for clobbering attacks
	   * @return true if clobbered, false if safe
	   */
	  const _isClobbered = function _isClobbered(element) {
	    return element instanceof HTMLFormElement && (typeof element.nodeName !== 'string' || typeof element.textContent !== 'string' || typeof element.removeChild !== 'function' || !(element.attributes instanceof NamedNodeMap) || typeof element.removeAttribute !== 'function' || typeof element.setAttribute !== 'function' || typeof element.namespaceURI !== 'string' || typeof element.insertBefore !== 'function' || typeof element.hasChildNodes !== 'function');
	  };
	  /**
	   * Checks whether the given object is a DOM node.
	   *
	   * @param value object to check whether it's a DOM node
	   * @return true is object is a DOM node
	   */
	  const _isNode = function _isNode(value) {
	    return typeof Node === 'function' && value instanceof Node;
	  };
	  function _executeHooks(hooks, currentNode, data) {
	    arrayForEach(hooks, hook => {
	      hook.call(DOMPurify, currentNode, data, CONFIG);
	    });
	  }
	  /**
	   * _sanitizeElements
	   *
	   * @protect nodeName
	   * @protect textContent
	   * @protect removeChild
	   * @param currentNode to check for permission to exist
	   * @return true if node was killed, false if left alive
	   */
	  const _sanitizeElements = function _sanitizeElements(currentNode) {
	    let content = null;
	    /* Execute a hook if present */
	    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
	    /* Check if element is clobbered or can clobber */
	    if (_isClobbered(currentNode)) {
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Now let's check the element's type and name */
	    const tagName = transformCaseFunc(currentNode.nodeName);
	    /* Execute a hook if present */
	    _executeHooks(hooks.uponSanitizeElement, currentNode, {
	      tagName,
	      allowedTags: ALLOWED_TAGS
	    });
	    /* Detect mXSS attempts abusing namespace confusion */
	    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w!]/g, currentNode.innerHTML) && regExpTest(/<[/\w!]/g, currentNode.textContent)) {
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Remove any occurrence of processing instructions */
	    if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Remove any kind of possibly harmful comments */
	    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Remove element if anything forbids its presence */
	    if (!(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName])) {
	      /* Check if we have a custom element to handle */
	      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
	        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
	          return false;
	        }
	        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
	          return false;
	        }
	      }
	      /* Keep content except for bad-listed elements */
	      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
	        const parentNode = getParentNode(currentNode) || currentNode.parentNode;
	        const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
	        if (childNodes && parentNode) {
	          const childCount = childNodes.length;
	          for (let i = childCount - 1; i >= 0; --i) {
	            const childClone = cloneNode(childNodes[i], true);
	            childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
	            parentNode.insertBefore(childClone, getNextSibling(currentNode));
	          }
	        }
	      }
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Check whether element has a valid namespace */
	    if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Make sure that older browsers don't get fallback-tag mXSS */
	    if ((tagName === 'noscript' || tagName === 'noembed' || tagName === 'noframes') && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
	      _forceRemove(currentNode);
	      return true;
	    }
	    /* Sanitize element content to be template-safe */
	    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
	      /* Get the element's text content */
	      content = currentNode.textContent;
	      arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
	        content = stringReplace(content, expr, ' ');
	      });
	      if (currentNode.textContent !== content) {
	        arrayPush(DOMPurify.removed, {
	          element: currentNode.cloneNode()
	        });
	        currentNode.textContent = content;
	      }
	    }
	    /* Execute a hook if present */
	    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
	    return false;
	  };
	  /**
	   * _isValidAttribute
	   *
	   * @param lcTag Lowercase tag name of containing element.
	   * @param lcName Lowercase attribute name.
	   * @param value Attribute value.
	   * @return Returns true if `value` is valid, otherwise false.
	   */
	  // eslint-disable-next-line complexity
	  const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
	    /* Make sure attribute cannot clobber */
	    if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
	      return false;
	    }
	    /* Allow valid data-* attributes: At least one character after "-"
	        (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
	        XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
	        We don't need to check the value; it's always URI safe. */
	    if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR, lcName)) ; else if (EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
	      if (
	      // First condition does a very basic check if a) it's basically a valid custom element tagname AND
	      // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
	      // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
	      _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName, lcTag)) ||
	      // Alternative, second condition checks if it's an `is`-attribute, AND
	      // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
	      lcName === 'is' && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))) ; else {
	        return false;
	      }
	      /* Check value is safe. First, is attr inert? If so, is safe */
	    } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if (value) {
	      return false;
	    } else ;
	    return true;
	  };
	  /**
	   * _isBasicCustomElement
	   * checks if at least one dash is included in tagName, and it's not the first char
	   * for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
	   *
	   * @param tagName name of the tag of the node to sanitize
	   * @returns Returns true if the tag name meets the basic criteria for a custom element, otherwise false.
	   */
	  const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
	    return tagName !== 'annotation-xml' && stringMatch(tagName, CUSTOM_ELEMENT);
	  };
	  /**
	   * _sanitizeAttributes
	   *
	   * @protect attributes
	   * @protect nodeName
	   * @protect removeAttribute
	   * @protect setAttribute
	   *
	   * @param currentNode to sanitize
	   */
	  const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
	    /* Execute a hook if present */
	    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
	    const {
	      attributes
	    } = currentNode;
	    /* Check if we have attributes; if not we might have a text node */
	    if (!attributes || _isClobbered(currentNode)) {
	      return;
	    }
	    const hookEvent = {
	      attrName: '',
	      attrValue: '',
	      keepAttr: true,
	      allowedAttributes: ALLOWED_ATTR,
	      forceKeepAttr: undefined
	    };
	    let l = attributes.length;
	    /* Go backwards over all attributes; safely remove bad ones */
	    while (l--) {
	      const attr = attributes[l];
	      const {
	        name,
	        namespaceURI,
	        value: attrValue
	      } = attr;
	      const lcName = transformCaseFunc(name);
	      const initValue = attrValue;
	      let value = name === 'value' ? initValue : stringTrim(initValue);
	      /* Execute a hook if present */
	      hookEvent.attrName = lcName;
	      hookEvent.attrValue = value;
	      hookEvent.keepAttr = true;
	      hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
	      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
	      value = hookEvent.attrValue;
	      /* Full DOM Clobbering protection via namespace isolation,
	       * Prefix id and name attributes with `user-content-`
	       */
	      if (SANITIZE_NAMED_PROPS && (lcName === 'id' || lcName === 'name')) {
	        // Remove the attribute with this value
	        _removeAttribute(name, currentNode);
	        // Prefix the value and later re-create the attribute with the sanitized value
	        value = SANITIZE_NAMED_PROPS_PREFIX + value;
	      }
	      /* Work around a security issue with comments inside attributes */
	      if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|title|textarea)/i, value)) {
	        _removeAttribute(name, currentNode);
	        continue;
	      }
	      /* Make sure we cannot easily use animated hrefs, even if animations are allowed */
	      if (lcName === 'attributename' && stringMatch(value, 'href')) {
	        _removeAttribute(name, currentNode);
	        continue;
	      }
	      /* Did the hooks approve of the attribute? */
	      if (hookEvent.forceKeepAttr) {
	        continue;
	      }
	      /* Did the hooks approve of the attribute? */
	      if (!hookEvent.keepAttr) {
	        _removeAttribute(name, currentNode);
	        continue;
	      }
	      /* Work around a security issue in jQuery 3.0 */
	      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
	        _removeAttribute(name, currentNode);
	        continue;
	      }
	      /* Sanitize attribute content to be template-safe */
	      if (SAFE_FOR_TEMPLATES) {
	        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
	          value = stringReplace(value, expr, ' ');
	        });
	      }
	      /* Is `value` valid for this attribute? */
	      const lcTag = transformCaseFunc(currentNode.nodeName);
	      if (!_isValidAttribute(lcTag, lcName, value)) {
	        _removeAttribute(name, currentNode);
	        continue;
	      }
	      /* Handle attributes that require Trusted Types */
	      if (trustedTypesPolicy && typeof trustedTypes === 'object' && typeof trustedTypes.getAttributeType === 'function') {
	        if (namespaceURI) ; else {
	          switch (trustedTypes.getAttributeType(lcTag, lcName)) {
	            case 'TrustedHTML':
	              {
	                value = trustedTypesPolicy.createHTML(value);
	                break;
	              }
	            case 'TrustedScriptURL':
	              {
	                value = trustedTypesPolicy.createScriptURL(value);
	                break;
	              }
	          }
	        }
	      }
	      /* Handle invalid data-* attribute set by try-catching it */
	      if (value !== initValue) {
	        try {
	          if (namespaceURI) {
	            currentNode.setAttributeNS(namespaceURI, name, value);
	          } else {
	            /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
	            currentNode.setAttribute(name, value);
	          }
	          if (_isClobbered(currentNode)) {
	            _forceRemove(currentNode);
	          } else {
	            arrayPop(DOMPurify.removed);
	          }
	        } catch (_) {
	          _removeAttribute(name, currentNode);
	        }
	      }
	    }
	    /* Execute a hook if present */
	    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
	  };
	  /**
	   * _sanitizeShadowDOM
	   *
	   * @param fragment to iterate over recursively
	   */
	  const _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
	    let shadowNode = null;
	    const shadowIterator = _createNodeIterator(fragment);
	    /* Execute a hook if present */
	    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
	    while (shadowNode = shadowIterator.nextNode()) {
	      /* Execute a hook if present */
	      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
	      /* Sanitize tags and elements */
	      _sanitizeElements(shadowNode);
	      /* Check attributes next */
	      _sanitizeAttributes(shadowNode);
	      /* Deep shadow DOM detected */
	      if (shadowNode.content instanceof DocumentFragment) {
	        _sanitizeShadowDOM(shadowNode.content);
	      }
	    }
	    /* Execute a hook if present */
	    _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
	  };
	  // eslint-disable-next-line complexity
	  DOMPurify.sanitize = function (dirty) {
	    let cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	    let body = null;
	    let importedNode = null;
	    let currentNode = null;
	    let returnNode = null;
	    /* Make sure we have a string to sanitize.
	      DO NOT return early, as this will return the wrong type if
	      the user has requested a DOM object rather than a string */
	    IS_EMPTY_INPUT = !dirty;
	    if (IS_EMPTY_INPUT) {
	      dirty = '<!-->';
	    }
	    /* Stringify, in case dirty is an object */
	    if (typeof dirty !== 'string' && !_isNode(dirty)) {
	      if (typeof dirty.toString === 'function') {
	        dirty = dirty.toString();
	        if (typeof dirty !== 'string') {
	          throw typeErrorCreate('dirty is not a string, aborting');
	        }
	      } else {
	        throw typeErrorCreate('toString is not a function');
	      }
	    }
	    /* Return dirty HTML if DOMPurify cannot run */
	    if (!DOMPurify.isSupported) {
	      return dirty;
	    }
	    /* Assign config vars */
	    if (!SET_CONFIG) {
	      _parseConfig(cfg);
	    }
	    /* Clean up removed elements */
	    DOMPurify.removed = [];
	    /* Check if dirty is correctly typed for IN_PLACE */
	    if (typeof dirty === 'string') {
	      IN_PLACE = false;
	    }
	    if (IN_PLACE) {
	      /* Do some early pre-sanitization to avoid unsafe root nodes */
	      if (dirty.nodeName) {
	        const tagName = transformCaseFunc(dirty.nodeName);
	        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
	          throw typeErrorCreate('root node is forbidden and cannot be sanitized in-place');
	        }
	      }
	    } else if (dirty instanceof Node) {
	      /* If dirty is a DOM element, append to an empty document to avoid
	         elements being stripped by the parser */
	      body = _initDocument('<!---->');
	      importedNode = body.ownerDocument.importNode(dirty, true);
	      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === 'BODY') {
	        /* Node is already a body, use as is */
	        body = importedNode;
	      } else if (importedNode.nodeName === 'HTML') {
	        body = importedNode;
	      } else {
	        // eslint-disable-next-line unicorn/prefer-dom-node-append
	        body.appendChild(importedNode);
	      }
	    } else {
	      /* Exit directly if we have nothing to do */
	      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
	      // eslint-disable-next-line unicorn/prefer-includes
	      dirty.indexOf('<') === -1) {
	        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
	      }
	      /* Initialize the document to work on */
	      body = _initDocument(dirty);
	      /* Check we have a DOM node from the data */
	      if (!body) {
	        return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : '';
	      }
	    }
	    /* Remove first element node (ours) if FORCE_BODY is set */
	    if (body && FORCE_BODY) {
	      _forceRemove(body.firstChild);
	    }
	    /* Get node iterator */
	    const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);
	    /* Now start iterating over the created document */
	    while (currentNode = nodeIterator.nextNode()) {
	      /* Sanitize tags and elements */
	      _sanitizeElements(currentNode);
	      /* Check attributes next */
	      _sanitizeAttributes(currentNode);
	      /* Shadow DOM detected, sanitize it */
	      if (currentNode.content instanceof DocumentFragment) {
	        _sanitizeShadowDOM(currentNode.content);
	      }
	    }
	    /* If we sanitized `dirty` in-place, return it. */
	    if (IN_PLACE) {
	      return dirty;
	    }
	    /* Return sanitized string or DOM */
	    if (RETURN_DOM) {
	      if (RETURN_DOM_FRAGMENT) {
	        returnNode = createDocumentFragment.call(body.ownerDocument);
	        while (body.firstChild) {
	          // eslint-disable-next-line unicorn/prefer-dom-node-append
	          returnNode.appendChild(body.firstChild);
	        }
	      } else {
	        returnNode = body;
	      }
	      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
	        /*
	          AdoptNode() is not used because internal state is not reset
	          (e.g. the past names map of a HTMLFormElement), this is safe
	          in theory but we would rather not risk another attack vector.
	          The state that is cloned by importNode() is explicitly defined
	          by the specs.
	        */
	        returnNode = importNode.call(originalDocument, returnNode, true);
	      }
	      return returnNode;
	    }
	    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
	    /* Serialize doctype if allowed */
	    if (WHOLE_DOCUMENT && ALLOWED_TAGS['!doctype'] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
	      serializedHTML = '<!DOCTYPE ' + body.ownerDocument.doctype.name + '>\n' + serializedHTML;
	    }
	    /* Sanitize final string template-safe */
	    if (SAFE_FOR_TEMPLATES) {
	      arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
	        serializedHTML = stringReplace(serializedHTML, expr, ' ');
	      });
	    }
	    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
	  };
	  DOMPurify.setConfig = function () {
	    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	    _parseConfig(cfg);
	    SET_CONFIG = true;
	  };
	  DOMPurify.clearConfig = function () {
	    CONFIG = null;
	    SET_CONFIG = false;
	  };
	  DOMPurify.isValidAttribute = function (tag, attr, value) {
	    /* Initialize shared config vars if necessary. */
	    if (!CONFIG) {
	      _parseConfig({});
	    }
	    const lcTag = transformCaseFunc(tag);
	    const lcName = transformCaseFunc(attr);
	    return _isValidAttribute(lcTag, lcName, value);
	  };
	  DOMPurify.addHook = function (entryPoint, hookFunction) {
	    if (typeof hookFunction !== 'function') {
	      return;
	    }
	    arrayPush(hooks[entryPoint], hookFunction);
	  };
	  DOMPurify.removeHook = function (entryPoint, hookFunction) {
	    if (hookFunction !== undefined) {
	      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
	      return index === -1 ? undefined : arraySplice(hooks[entryPoint], index, 1)[0];
	    }
	    return arrayPop(hooks[entryPoint]);
	  };
	  DOMPurify.removeHooks = function (entryPoint) {
	    hooks[entryPoint] = [];
	  };
	  DOMPurify.removeAllHooks = function () {
	    hooks = _createHooksMap();
	  };
	  return DOMPurify;
	}
	var purify = createDOMPurify();

	/**
	 * marked v12.0.2 - a markdown parser
	 * Copyright (c) 2011-2024, Christopher Jeffrey. (MIT Licensed)
	 * https://github.com/markedjs/marked
	 */

	/**
	 * DO NOT EDIT THIS FILE
	 * The code in this file is generated from files in ./src/
	 */

	/**
	 * Gets the original marked default options.
	 */
	function _getDefaults() {
	    return {
	        async: false,
	        breaks: false,
	        extensions: null,
	        gfm: true,
	        hooks: null,
	        pedantic: false,
	        renderer: null,
	        silent: false,
	        tokenizer: null,
	        walkTokens: null
	    };
	}
	let _defaults = _getDefaults();
	function changeDefaults(newDefaults) {
	    _defaults = newDefaults;
	}

	/**
	 * Helpers
	 */
	const escapeTest = /[&<>"']/;
	const escapeReplace = new RegExp(escapeTest.source, 'g');
	const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
	const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
	const escapeReplacements = {
	    '&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    "'": '&#39;'
	};
	const getEscapeReplacement = (ch) => escapeReplacements[ch];
	function escape$1(html, encode) {
	    if (encode) {
	        if (escapeTest.test(html)) {
	            return html.replace(escapeReplace, getEscapeReplacement);
	        }
	    }
	    else {
	        if (escapeTestNoEncode.test(html)) {
	            return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
	        }
	    }
	    return html;
	}
	const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
	function unescape(html) {
	    // explicitly match decimal, hex, and named HTML entities
	    return html.replace(unescapeTest, (_, n) => {
	        n = n.toLowerCase();
	        if (n === 'colon')
	            return ':';
	        if (n.charAt(0) === '#') {
	            return n.charAt(1) === 'x'
	                ? String.fromCharCode(parseInt(n.substring(2), 16))
	                : String.fromCharCode(+n.substring(1));
	        }
	        return '';
	    });
	}
	const caret = /(^|[^\[])\^/g;
	function edit(regex, opt) {
	    let source = typeof regex === 'string' ? regex : regex.source;
	    opt = opt || '';
	    const obj = {
	        replace: (name, val) => {
	            let valSource = typeof val === 'string' ? val : val.source;
	            valSource = valSource.replace(caret, '$1');
	            source = source.replace(name, valSource);
	            return obj;
	        },
	        getRegex: () => {
	            return new RegExp(source, opt);
	        }
	    };
	    return obj;
	}
	function cleanUrl(href) {
	    try {
	        href = encodeURI(href).replace(/%25/g, '%');
	    }
	    catch (e) {
	        return null;
	    }
	    return href;
	}
	const noopTest = { exec: () => null };
	function splitCells(tableRow, count) {
	    // ensure that every cell-delimiting pipe has a space
	    // before it to distinguish it from an escaped pipe
	    const row = tableRow.replace(/\|/g, (match, offset, str) => {
	        let escaped = false;
	        let curr = offset;
	        while (--curr >= 0 && str[curr] === '\\')
	            escaped = !escaped;
	        if (escaped) {
	            // odd number of slashes means | is escaped
	            // so we leave it alone
	            return '|';
	        }
	        else {
	            // add space before unescaped |
	            return ' |';
	        }
	    }), cells = row.split(/ \|/);
	    let i = 0;
	    // First/last cell in a row cannot be empty if it has no leading/trailing pipe
	    if (!cells[0].trim()) {
	        cells.shift();
	    }
	    if (cells.length > 0 && !cells[cells.length - 1].trim()) {
	        cells.pop();
	    }
	    if (count) {
	        if (cells.length > count) {
	            cells.splice(count);
	        }
	        else {
	            while (cells.length < count)
	                cells.push('');
	        }
	    }
	    for (; i < cells.length; i++) {
	        // leading or trailing whitespace is ignored per the gfm spec
	        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
	    }
	    return cells;
	}
	/**
	 * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
	 * /c*$/ is vulnerable to REDOS.
	 *
	 * @param str
	 * @param c
	 * @param invert Remove suffix of non-c chars instead. Default falsey.
	 */
	function rtrim(str, c, invert) {
	    const l = str.length;
	    if (l === 0) {
	        return '';
	    }
	    // Length of suffix matching the invert condition.
	    let suffLen = 0;
	    // Step left until we fail to match the invert condition.
	    while (suffLen < l) {
	        const currChar = str.charAt(l - suffLen - 1);
	        if (currChar === c && true) {
	            suffLen++;
	        }
	        else {
	            break;
	        }
	    }
	    return str.slice(0, l - suffLen);
	}
	function findClosingBracket(str, b) {
	    if (str.indexOf(b[1]) === -1) {
	        return -1;
	    }
	    let level = 0;
	    for (let i = 0; i < str.length; i++) {
	        if (str[i] === '\\') {
	            i++;
	        }
	        else if (str[i] === b[0]) {
	            level++;
	        }
	        else if (str[i] === b[1]) {
	            level--;
	            if (level < 0) {
	                return i;
	            }
	        }
	    }
	    return -1;
	}

	function outputLink(cap, link, raw, lexer) {
	    const href = link.href;
	    const title = link.title ? escape$1(link.title) : null;
	    const text = cap[1].replace(/\\([\[\]])/g, '$1');
	    if (cap[0].charAt(0) !== '!') {
	        lexer.state.inLink = true;
	        const token = {
	            type: 'link',
	            raw,
	            href,
	            title,
	            text,
	            tokens: lexer.inlineTokens(text)
	        };
	        lexer.state.inLink = false;
	        return token;
	    }
	    return {
	        type: 'image',
	        raw,
	        href,
	        title,
	        text: escape$1(text)
	    };
	}
	function indentCodeCompensation(raw, text) {
	    const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
	    if (matchIndentToCode === null) {
	        return text;
	    }
	    const indentToCode = matchIndentToCode[1];
	    return text
	        .split('\n')
	        .map(node => {
	        const matchIndentInNode = node.match(/^\s+/);
	        if (matchIndentInNode === null) {
	            return node;
	        }
	        const [indentInNode] = matchIndentInNode;
	        if (indentInNode.length >= indentToCode.length) {
	            return node.slice(indentToCode.length);
	        }
	        return node;
	    })
	        .join('\n');
	}
	/**
	 * Tokenizer
	 */
	class _Tokenizer {
	    options;
	    rules; // set by the lexer
	    lexer; // set by the lexer
	    constructor(options) {
	        this.options = options || _defaults;
	    }
	    space(src) {
	        const cap = this.rules.block.newline.exec(src);
	        if (cap && cap[0].length > 0) {
	            return {
	                type: 'space',
	                raw: cap[0]
	            };
	        }
	    }
	    code(src) {
	        const cap = this.rules.block.code.exec(src);
	        if (cap) {
	            const text = cap[0].replace(/^ {1,4}/gm, '');
	            return {
	                type: 'code',
	                raw: cap[0],
	                codeBlockStyle: 'indented',
	                text: !this.options.pedantic
	                    ? rtrim(text, '\n')
	                    : text
	            };
	        }
	    }
	    fences(src) {
	        const cap = this.rules.block.fences.exec(src);
	        if (cap) {
	            const raw = cap[0];
	            const text = indentCodeCompensation(raw, cap[3] || '');
	            return {
	                type: 'code',
	                raw,
	                lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, '$1') : cap[2],
	                text
	            };
	        }
	    }
	    heading(src) {
	        const cap = this.rules.block.heading.exec(src);
	        if (cap) {
	            let text = cap[2].trim();
	            // remove trailing #s
	            if (/#$/.test(text)) {
	                const trimmed = rtrim(text, '#');
	                if (this.options.pedantic) {
	                    text = trimmed.trim();
	                }
	                else if (!trimmed || / $/.test(trimmed)) {
	                    // CommonMark requires space before trailing #s
	                    text = trimmed.trim();
	                }
	            }
	            return {
	                type: 'heading',
	                raw: cap[0],
	                depth: cap[1].length,
	                text,
	                tokens: this.lexer.inline(text)
	            };
	        }
	    }
	    hr(src) {
	        const cap = this.rules.block.hr.exec(src);
	        if (cap) {
	            return {
	                type: 'hr',
	                raw: cap[0]
	            };
	        }
	    }
	    blockquote(src) {
	        const cap = this.rules.block.blockquote.exec(src);
	        if (cap) {
	            // precede setext continuation with 4 spaces so it isn't a setext
	            let text = cap[0].replace(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, '\n    $1');
	            text = rtrim(text.replace(/^ *>[ \t]?/gm, ''), '\n');
	            const top = this.lexer.state.top;
	            this.lexer.state.top = true;
	            const tokens = this.lexer.blockTokens(text);
	            this.lexer.state.top = top;
	            return {
	                type: 'blockquote',
	                raw: cap[0],
	                tokens,
	                text
	            };
	        }
	    }
	    list(src) {
	        let cap = this.rules.block.list.exec(src);
	        if (cap) {
	            let bull = cap[1].trim();
	            const isordered = bull.length > 1;
	            const list = {
	                type: 'list',
	                raw: '',
	                ordered: isordered,
	                start: isordered ? +bull.slice(0, -1) : '',
	                loose: false,
	                items: []
	            };
	            bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
	            if (this.options.pedantic) {
	                bull = isordered ? bull : '[*+-]';
	            }
	            // Get next list item
	            const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);
	            let raw = '';
	            let itemContents = '';
	            let endsWithBlankLine = false;
	            // Check if current bullet point can start a new List Item
	            while (src) {
	                let endEarly = false;
	                if (!(cap = itemRegex.exec(src))) {
	                    break;
	                }
	                if (this.rules.block.hr.test(src)) { // End list if bullet was actually HR (possibly move into itemRegex?)
	                    break;
	                }
	                raw = cap[0];
	                src = src.substring(raw.length);
	                let line = cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(3 * t.length));
	                let nextLine = src.split('\n', 1)[0];
	                let indent = 0;
	                if (this.options.pedantic) {
	                    indent = 2;
	                    itemContents = line.trimStart();
	                }
	                else {
	                    indent = cap[2].search(/[^ ]/); // Find first non-space char
	                    indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
	                    itemContents = line.slice(indent);
	                    indent += cap[1].length;
	                }
	                let blankLine = false;
	                if (!line && /^ *$/.test(nextLine)) { // Items begin with at most one blank line
	                    raw += nextLine + '\n';
	                    src = src.substring(nextLine.length + 1);
	                    endEarly = true;
	                }
	                if (!endEarly) {
	                    const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`);
	                    const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
	                    const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
	                    const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
	                    // Check if following lines should be included in List Item
	                    while (src) {
	                        const rawLine = src.split('\n', 1)[0];
	                        nextLine = rawLine;
	                        // Re-align to follow commonmark nesting rules
	                        if (this.options.pedantic) {
	                            nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
	                        }
	                        // End list item if found code fences
	                        if (fencesBeginRegex.test(nextLine)) {
	                            break;
	                        }
	                        // End list item if found start of new heading
	                        if (headingBeginRegex.test(nextLine)) {
	                            break;
	                        }
	                        // End list item if found start of new bullet
	                        if (nextBulletRegex.test(nextLine)) {
	                            break;
	                        }
	                        // Horizontal rule found
	                        if (hrRegex.test(src)) {
	                            break;
	                        }
	                        if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) { // Dedent if possible
	                            itemContents += '\n' + nextLine.slice(indent);
	                        }
	                        else {
	                            // not enough indentation
	                            if (blankLine) {
	                                break;
	                            }
	                            // paragraph continuation unless last line was a different block level element
	                            if (line.search(/[^ ]/) >= 4) { // indented code block
	                                break;
	                            }
	                            if (fencesBeginRegex.test(line)) {
	                                break;
	                            }
	                            if (headingBeginRegex.test(line)) {
	                                break;
	                            }
	                            if (hrRegex.test(line)) {
	                                break;
	                            }
	                            itemContents += '\n' + nextLine;
	                        }
	                        if (!blankLine && !nextLine.trim()) { // Check if current line is blank
	                            blankLine = true;
	                        }
	                        raw += rawLine + '\n';
	                        src = src.substring(rawLine.length + 1);
	                        line = nextLine.slice(indent);
	                    }
	                }
	                if (!list.loose) {
	                    // If the previous item ended with a blank line, the list is loose
	                    if (endsWithBlankLine) {
	                        list.loose = true;
	                    }
	                    else if (/\n *\n *$/.test(raw)) {
	                        endsWithBlankLine = true;
	                    }
	                }
	                let istask = null;
	                let ischecked;
	                // Check for task list items
	                if (this.options.gfm) {
	                    istask = /^\[[ xX]\] /.exec(itemContents);
	                    if (istask) {
	                        ischecked = istask[0] !== '[ ] ';
	                        itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
	                    }
	                }
	                list.items.push({
	                    type: 'list_item',
	                    raw,
	                    task: !!istask,
	                    checked: ischecked,
	                    loose: false,
	                    text: itemContents,
	                    tokens: []
	                });
	                list.raw += raw;
	            }
	            // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
	            list.items[list.items.length - 1].raw = raw.trimEnd();
	            (list.items[list.items.length - 1]).text = itemContents.trimEnd();
	            list.raw = list.raw.trimEnd();
	            // Item child tokens handled here at end because we needed to have the final item to trim it first
	            for (let i = 0; i < list.items.length; i++) {
	                this.lexer.state.top = false;
	                list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
	                if (!list.loose) {
	                    // Check if list should be loose
	                    const spacers = list.items[i].tokens.filter(t => t.type === 'space');
	                    const hasMultipleLineBreaks = spacers.length > 0 && spacers.some(t => /\n.*\n/.test(t.raw));
	                    list.loose = hasMultipleLineBreaks;
	                }
	            }
	            // Set all items to loose if list is loose
	            if (list.loose) {
	                for (let i = 0; i < list.items.length; i++) {
	                    list.items[i].loose = true;
	                }
	            }
	            return list;
	        }
	    }
	    html(src) {
	        const cap = this.rules.block.html.exec(src);
	        if (cap) {
	            const token = {
	                type: 'html',
	                block: true,
	                raw: cap[0],
	                pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
	                text: cap[0]
	            };
	            return token;
	        }
	    }
	    def(src) {
	        const cap = this.rules.block.def.exec(src);
	        if (cap) {
	            const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
	            const href = cap[2] ? cap[2].replace(/^<(.*)>$/, '$1').replace(this.rules.inline.anyPunctuation, '$1') : '';
	            const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, '$1') : cap[3];
	            return {
	                type: 'def',
	                tag,
	                raw: cap[0],
	                href,
	                title
	            };
	        }
	    }
	    table(src) {
	        const cap = this.rules.block.table.exec(src);
	        if (!cap) {
	            return;
	        }
	        if (!/[:|]/.test(cap[2])) {
	            // delimiter row must have a pipe (|) or colon (:) otherwise it is a setext heading
	            return;
	        }
	        const headers = splitCells(cap[1]);
	        const aligns = cap[2].replace(/^\||\| *$/g, '').split('|');
	        const rows = cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, '').split('\n') : [];
	        const item = {
	            type: 'table',
	            raw: cap[0],
	            header: [],
	            align: [],
	            rows: []
	        };
	        if (headers.length !== aligns.length) {
	            // header and align columns must be equal, rows can be different.
	            return;
	        }
	        for (const align of aligns) {
	            if (/^ *-+: *$/.test(align)) {
	                item.align.push('right');
	            }
	            else if (/^ *:-+: *$/.test(align)) {
	                item.align.push('center');
	            }
	            else if (/^ *:-+ *$/.test(align)) {
	                item.align.push('left');
	            }
	            else {
	                item.align.push(null);
	            }
	        }
	        for (const header of headers) {
	            item.header.push({
	                text: header,
	                tokens: this.lexer.inline(header)
	            });
	        }
	        for (const row of rows) {
	            item.rows.push(splitCells(row, item.header.length).map(cell => {
	                return {
	                    text: cell,
	                    tokens: this.lexer.inline(cell)
	                };
	            }));
	        }
	        return item;
	    }
	    lheading(src) {
	        const cap = this.rules.block.lheading.exec(src);
	        if (cap) {
	            return {
	                type: 'heading',
	                raw: cap[0],
	                depth: cap[2].charAt(0) === '=' ? 1 : 2,
	                text: cap[1],
	                tokens: this.lexer.inline(cap[1])
	            };
	        }
	    }
	    paragraph(src) {
	        const cap = this.rules.block.paragraph.exec(src);
	        if (cap) {
	            const text = cap[1].charAt(cap[1].length - 1) === '\n'
	                ? cap[1].slice(0, -1)
	                : cap[1];
	            return {
	                type: 'paragraph',
	                raw: cap[0],
	                text,
	                tokens: this.lexer.inline(text)
	            };
	        }
	    }
	    text(src) {
	        const cap = this.rules.block.text.exec(src);
	        if (cap) {
	            return {
	                type: 'text',
	                raw: cap[0],
	                text: cap[0],
	                tokens: this.lexer.inline(cap[0])
	            };
	        }
	    }
	    escape(src) {
	        const cap = this.rules.inline.escape.exec(src);
	        if (cap) {
	            return {
	                type: 'escape',
	                raw: cap[0],
	                text: escape$1(cap[1])
	            };
	        }
	    }
	    tag(src) {
	        const cap = this.rules.inline.tag.exec(src);
	        if (cap) {
	            if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
	                this.lexer.state.inLink = true;
	            }
	            else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
	                this.lexer.state.inLink = false;
	            }
	            if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
	                this.lexer.state.inRawBlock = true;
	            }
	            else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
	                this.lexer.state.inRawBlock = false;
	            }
	            return {
	                type: 'html',
	                raw: cap[0],
	                inLink: this.lexer.state.inLink,
	                inRawBlock: this.lexer.state.inRawBlock,
	                block: false,
	                text: cap[0]
	            };
	        }
	    }
	    link(src) {
	        const cap = this.rules.inline.link.exec(src);
	        if (cap) {
	            const trimmedUrl = cap[2].trim();
	            if (!this.options.pedantic && /^</.test(trimmedUrl)) {
	                // commonmark requires matching angle brackets
	                if (!(/>$/.test(trimmedUrl))) {
	                    return;
	                }
	                // ending angle bracket cannot be escaped
	                const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
	                if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
	                    return;
	                }
	            }
	            else {
	                // find closing parenthesis
	                const lastParenIndex = findClosingBracket(cap[2], '()');
	                if (lastParenIndex > -1) {
	                    const start = cap[0].indexOf('!') === 0 ? 5 : 4;
	                    const linkLen = start + cap[1].length + lastParenIndex;
	                    cap[2] = cap[2].substring(0, lastParenIndex);
	                    cap[0] = cap[0].substring(0, linkLen).trim();
	                    cap[3] = '';
	                }
	            }
	            let href = cap[2];
	            let title = '';
	            if (this.options.pedantic) {
	                // split pedantic href and title
	                const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
	                if (link) {
	                    href = link[1];
	                    title = link[3];
	                }
	            }
	            else {
	                title = cap[3] ? cap[3].slice(1, -1) : '';
	            }
	            href = href.trim();
	            if (/^</.test(href)) {
	                if (this.options.pedantic && !(/>$/.test(trimmedUrl))) {
	                    // pedantic allows starting angle bracket without ending angle bracket
	                    href = href.slice(1);
	                }
	                else {
	                    href = href.slice(1, -1);
	                }
	            }
	            return outputLink(cap, {
	                href: href ? href.replace(this.rules.inline.anyPunctuation, '$1') : href,
	                title: title ? title.replace(this.rules.inline.anyPunctuation, '$1') : title
	            }, cap[0], this.lexer);
	        }
	    }
	    reflink(src, links) {
	        let cap;
	        if ((cap = this.rules.inline.reflink.exec(src))
	            || (cap = this.rules.inline.nolink.exec(src))) {
	            const linkString = (cap[2] || cap[1]).replace(/\s+/g, ' ');
	            const link = links[linkString.toLowerCase()];
	            if (!link) {
	                const text = cap[0].charAt(0);
	                return {
	                    type: 'text',
	                    raw: text,
	                    text
	                };
	            }
	            return outputLink(cap, link, cap[0], this.lexer);
	        }
	    }
	    emStrong(src, maskedSrc, prevChar = '') {
	        let match = this.rules.inline.emStrongLDelim.exec(src);
	        if (!match)
	            return;
	        // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
	        if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
	            return;
	        const nextChar = match[1] || match[2] || '';
	        if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
	            // unicode Regex counts emoji as 1 char; spread into array for proper count (used multiple times below)
	            const lLength = [...match[0]].length - 1;
	            let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
	            const endReg = match[0][0] === '*' ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
	            endReg.lastIndex = 0;
	            // Clip maskedSrc to same section of string as src (move to lexer?)
	            maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
	            while ((match = endReg.exec(maskedSrc)) != null) {
	                rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
	                if (!rDelim)
	                    continue; // skip single * in __abc*abc__
	                rLength = [...rDelim].length;
	                if (match[3] || match[4]) { // found another Left Delim
	                    delimTotal += rLength;
	                    continue;
	                }
	                else if (match[5] || match[6]) { // either Left or Right Delim
	                    if (lLength % 3 && !((lLength + rLength) % 3)) {
	                        midDelimTotal += rLength;
	                        continue; // CommonMark Emphasis Rules 9-10
	                    }
	                }
	                delimTotal -= rLength;
	                if (delimTotal > 0)
	                    continue; // Haven't found enough closing delimiters
	                // Remove extra characters. *a*** -> *a*
	                rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
	                // char length can be >1 for unicode characters;
	                const lastCharLength = [...match[0]][0].length;
	                const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
	                // Create `em` if smallest delimiter has odd char count. *a***
	                if (Math.min(lLength, rLength) % 2) {
	                    const text = raw.slice(1, -1);
	                    return {
	                        type: 'em',
	                        raw,
	                        text,
	                        tokens: this.lexer.inlineTokens(text)
	                    };
	                }
	                // Create 'strong' if smallest delimiter has even char count. **a***
	                const text = raw.slice(2, -2);
	                return {
	                    type: 'strong',
	                    raw,
	                    text,
	                    tokens: this.lexer.inlineTokens(text)
	                };
	            }
	        }
	    }
	    codespan(src) {
	        const cap = this.rules.inline.code.exec(src);
	        if (cap) {
	            let text = cap[2].replace(/\n/g, ' ');
	            const hasNonSpaceChars = /[^ ]/.test(text);
	            const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
	            if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
	                text = text.substring(1, text.length - 1);
	            }
	            text = escape$1(text, true);
	            return {
	                type: 'codespan',
	                raw: cap[0],
	                text
	            };
	        }
	    }
	    br(src) {
	        const cap = this.rules.inline.br.exec(src);
	        if (cap) {
	            return {
	                type: 'br',
	                raw: cap[0]
	            };
	        }
	    }
	    del(src) {
	        const cap = this.rules.inline.del.exec(src);
	        if (cap) {
	            return {
	                type: 'del',
	                raw: cap[0],
	                text: cap[2],
	                tokens: this.lexer.inlineTokens(cap[2])
	            };
	        }
	    }
	    autolink(src) {
	        const cap = this.rules.inline.autolink.exec(src);
	        if (cap) {
	            let text, href;
	            if (cap[2] === '@') {
	                text = escape$1(cap[1]);
	                href = 'mailto:' + text;
	            }
	            else {
	                text = escape$1(cap[1]);
	                href = text;
	            }
	            return {
	                type: 'link',
	                raw: cap[0],
	                text,
	                href,
	                tokens: [
	                    {
	                        type: 'text',
	                        raw: text,
	                        text
	                    }
	                ]
	            };
	        }
	    }
	    url(src) {
	        let cap;
	        if (cap = this.rules.inline.url.exec(src)) {
	            let text, href;
	            if (cap[2] === '@') {
	                text = escape$1(cap[0]);
	                href = 'mailto:' + text;
	            }
	            else {
	                // do extended autolink path validation
	                let prevCapZero;
	                do {
	                    prevCapZero = cap[0];
	                    cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? '';
	                } while (prevCapZero !== cap[0]);
	                text = escape$1(cap[0]);
	                if (cap[1] === 'www.') {
	                    href = 'http://' + cap[0];
	                }
	                else {
	                    href = cap[0];
	                }
	            }
	            return {
	                type: 'link',
	                raw: cap[0],
	                text,
	                href,
	                tokens: [
	                    {
	                        type: 'text',
	                        raw: text,
	                        text
	                    }
	                ]
	            };
	        }
	    }
	    inlineText(src) {
	        const cap = this.rules.inline.text.exec(src);
	        if (cap) {
	            let text;
	            if (this.lexer.state.inRawBlock) {
	                text = cap[0];
	            }
	            else {
	                text = escape$1(cap[0]);
	            }
	            return {
	                type: 'text',
	                raw: cap[0],
	                text
	            };
	        }
	    }
	}

	/**
	 * Block-Level Grammar
	 */
	const newline = /^(?: *(?:\n|$))+/;
	const blockCode = /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/;
	const fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
	const hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
	const heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
	const bullet = /(?:[*+-]|\d{1,9}[.)])/;
	const lheading = edit(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/)
	    .replace(/bull/g, bullet) // lists can interrupt
	    .replace(/blockCode/g, / {4}/) // indented code blocks can interrupt
	    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/) // fenced code blocks can interrupt
	    .replace(/blockquote/g, / {0,3}>/) // blockquote can interrupt
	    .replace(/heading/g, / {0,3}#{1,6}/) // ATX heading can interrupt
	    .replace(/html/g, / {0,3}<[^\n>]+>\n/) // block html can interrupt
	    .getRegex();
	const _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
	const blockText = /^[^\n]+/;
	const _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
	const def = edit(/^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/)
	    .replace('label', _blockLabel)
	    .replace('title', /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
	    .getRegex();
	const list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/)
	    .replace(/bull/g, bullet)
	    .getRegex();
	const _tag = 'address|article|aside|base|basefont|blockquote|body|caption'
	    + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
	    + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
	    + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
	    + '|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title'
	    + '|tr|track|ul';
	const _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
	const html = edit('^ {0,3}(?:' // optional indentation
	    + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
	    + '|comment[^\\n]*(\\n+|$)' // (2)
	    + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
	    + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
	    + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
	    + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (6)
	    + '|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) open tag
	    + '|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) closing tag
	    + ')', 'i')
	    .replace('comment', _comment)
	    .replace('tag', _tag)
	    .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
	    .getRegex();
	const paragraph = edit(_paragraph)
	    .replace('hr', hr)
	    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
	    .replace('|lheading', '') // setext headings don't interrupt commonmark paragraphs
	    .replace('|table', '')
	    .replace('blockquote', ' {0,3}>')
	    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
	    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
	    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
	    .replace('tag', _tag) // pars can be interrupted by type (6) html blocks
	    .getRegex();
	const blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
	    .replace('paragraph', paragraph)
	    .getRegex();
	/**
	 * Normal Block Grammar
	 */
	const blockNormal = {
	    blockquote,
	    code: blockCode,
	    def,
	    fences,
	    heading,
	    hr,
	    html,
	    lheading,
	    list,
	    newline,
	    paragraph,
	    table: noopTest,
	    text: blockText
	};
	/**
	 * GFM Block Grammar
	 */
	const gfmTable = edit('^ *([^\\n ].*)\\n' // Header
	    + ' {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)' // Align
	    + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)') // Cells
	    .replace('hr', hr)
	    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
	    .replace('blockquote', ' {0,3}>')
	    .replace('code', ' {4}[^\\n]')
	    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
	    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
	    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
	    .replace('tag', _tag) // tables can be interrupted by type (6) html blocks
	    .getRegex();
	const blockGfm = {
	    ...blockNormal,
	    table: gfmTable,
	    paragraph: edit(_paragraph)
	        .replace('hr', hr)
	        .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
	        .replace('|lheading', '') // setext headings don't interrupt commonmark paragraphs
	        .replace('table', gfmTable) // interrupt paragraphs with table
	        .replace('blockquote', ' {0,3}>')
	        .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
	        .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
	        .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
	        .replace('tag', _tag) // pars can be interrupted by type (6) html blocks
	        .getRegex()
	};
	/**
	 * Pedantic grammar (original John Gruber's loose markdown specification)
	 */
	const blockPedantic = {
	    ...blockNormal,
	    html: edit('^ *(?:comment *(?:\\n|\\s*$)'
	        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
	        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
	        .replace('comment', _comment)
	        .replace(/tag/g, '(?!(?:'
	        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
	        + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
	        + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
	        .getRegex(),
	    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
	    heading: /^(#{1,6})(.*)(?:\n+|$)/,
	    fences: noopTest, // fences not supported
	    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
	    paragraph: edit(_paragraph)
	        .replace('hr', hr)
	        .replace('heading', ' *#{1,6} *[^\n]')
	        .replace('lheading', lheading)
	        .replace('|table', '')
	        .replace('blockquote', ' {0,3}>')
	        .replace('|fences', '')
	        .replace('|list', '')
	        .replace('|html', '')
	        .replace('|tag', '')
	        .getRegex()
	};
	/**
	 * Inline-Level Grammar
	 */
	const escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
	const inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
	const br = /^( {2,}|\\)\n(?!\s*$)/;
	const inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
	// list of unicode punctuation marks, plus any missing characters from CommonMark spec
	const _punctuation = '\\p{P}\\p{S}';
	const punctuation = edit(/^((?![*_])[\spunctuation])/, 'u')
	    .replace(/punctuation/g, _punctuation).getRegex();
	// sequences em should skip over [title](link), `code`, <html>
	const blockSkip = /\[[^[\]]*?\]\([^\(\)]*?\)|`[^`]*?`|<[^<>]*?>/g;
	const emStrongLDelim = edit(/^(?:\*+(?:((?!\*)[punct])|[^\s*]))|^_+(?:((?!_)[punct])|([^\s_]))/, 'u')
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	const emStrongRDelimAst = edit('^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)' // Skip orphan inside strong
	    + '|[^*]+(?=[^*])' // Consume to delim
	    + '|(?!\\*)[punct](\\*+)(?=[\\s]|$)' // (1) #*** can only be a Right Delimiter
	    + '|[^punct\\s](\\*+)(?!\\*)(?=[punct\\s]|$)' // (2) a***#, a*** can only be a Right Delimiter
	    + '|(?!\\*)[punct\\s](\\*+)(?=[^punct\\s])' // (3) #***a, ***a can only be Left Delimiter
	    + '|[\\s](\\*+)(?!\\*)(?=[punct])' // (4) ***# can only be Left Delimiter
	    + '|(?!\\*)[punct](\\*+)(?!\\*)(?=[punct])' // (5) #***# can be either Left or Right Delimiter
	    + '|[^punct\\s](\\*+)(?=[^punct\\s])', 'gu') // (6) a***a can be either Left or Right Delimiter
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	// (6) Not allowed for _
	const emStrongRDelimUnd = edit('^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)' // Skip orphan inside strong
	    + '|[^_]+(?=[^_])' // Consume to delim
	    + '|(?!_)[punct](_+)(?=[\\s]|$)' // (1) #___ can only be a Right Delimiter
	    + '|[^punct\\s](_+)(?!_)(?=[punct\\s]|$)' // (2) a___#, a___ can only be a Right Delimiter
	    + '|(?!_)[punct\\s](_+)(?=[^punct\\s])' // (3) #___a, ___a can only be Left Delimiter
	    + '|[\\s](_+)(?!_)(?=[punct])' // (4) ___# can only be Left Delimiter
	    + '|(?!_)[punct](_+)(?!_)(?=[punct])', 'gu') // (5) #___# can be either Left or Right Delimiter
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	const anyPunctuation = edit(/\\([punct])/, 'gu')
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	const autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
	    .replace('scheme', /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
	    .replace('email', /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/)
	    .getRegex();
	const _inlineComment = edit(_comment).replace('(?:-->|$)', '-->').getRegex();
	const tag = edit('^comment'
	    + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
	    + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
	    + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
	    + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
	    + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>') // CDATA section
	    .replace('comment', _inlineComment)
	    .replace('attribute', /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
	    .getRegex();
	const _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
	const link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/)
	    .replace('label', _inlineLabel)
	    .replace('href', /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/)
	    .replace('title', /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
	    .getRegex();
	const reflink = edit(/^!?\[(label)\]\[(ref)\]/)
	    .replace('label', _inlineLabel)
	    .replace('ref', _blockLabel)
	    .getRegex();
	const nolink = edit(/^!?\[(ref)\](?:\[\])?/)
	    .replace('ref', _blockLabel)
	    .getRegex();
	const reflinkSearch = edit('reflink|nolink(?!\\()', 'g')
	    .replace('reflink', reflink)
	    .replace('nolink', nolink)
	    .getRegex();
	/**
	 * Normal Inline Grammar
	 */
	const inlineNormal = {
	    _backpedal: noopTest, // only used for GFM url
	    anyPunctuation,
	    autolink,
	    blockSkip,
	    br,
	    code: inlineCode,
	    del: noopTest,
	    emStrongLDelim,
	    emStrongRDelimAst,
	    emStrongRDelimUnd,
	    escape,
	    link,
	    nolink,
	    punctuation,
	    reflink,
	    reflinkSearch,
	    tag,
	    text: inlineText,
	    url: noopTest
	};
	/**
	 * Pedantic Inline Grammar
	 */
	const inlinePedantic = {
	    ...inlineNormal,
	    link: edit(/^!?\[(label)\]\((.*?)\)/)
	        .replace('label', _inlineLabel)
	        .getRegex(),
	    reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
	        .replace('label', _inlineLabel)
	        .getRegex()
	};
	/**
	 * GFM Inline Grammar
	 */
	const inlineGfm = {
	    ...inlineNormal,
	    escape: edit(escape).replace('])', '~|])').getRegex(),
	    url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, 'i')
	        .replace('email', /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
	        .getRegex(),
	    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
	    del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
	    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
	};
	/**
	 * GFM + Line Breaks Inline Grammar
	 */
	const inlineBreaks = {
	    ...inlineGfm,
	    br: edit(br).replace('{2,}', '*').getRegex(),
	    text: edit(inlineGfm.text)
	        .replace('\\b_', '\\b_| {2,}\\n')
	        .replace(/\{2,\}/g, '*')
	        .getRegex()
	};
	/**
	 * exports
	 */
	const block = {
	    normal: blockNormal,
	    gfm: blockGfm,
	    pedantic: blockPedantic
	};
	const inline = {
	    normal: inlineNormal,
	    gfm: inlineGfm,
	    breaks: inlineBreaks,
	    pedantic: inlinePedantic
	};

	/**
	 * Block Lexer
	 */
	class _Lexer {
	    tokens;
	    options;
	    state;
	    tokenizer;
	    inlineQueue;
	    constructor(options) {
	        // TokenList cannot be created in one go
	        this.tokens = [];
	        this.tokens.links = Object.create(null);
	        this.options = options || _defaults;
	        this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
	        this.tokenizer = this.options.tokenizer;
	        this.tokenizer.options = this.options;
	        this.tokenizer.lexer = this;
	        this.inlineQueue = [];
	        this.state = {
	            inLink: false,
	            inRawBlock: false,
	            top: true
	        };
	        const rules = {
	            block: block.normal,
	            inline: inline.normal
	        };
	        if (this.options.pedantic) {
	            rules.block = block.pedantic;
	            rules.inline = inline.pedantic;
	        }
	        else if (this.options.gfm) {
	            rules.block = block.gfm;
	            if (this.options.breaks) {
	                rules.inline = inline.breaks;
	            }
	            else {
	                rules.inline = inline.gfm;
	            }
	        }
	        this.tokenizer.rules = rules;
	    }
	    /**
	     * Expose Rules
	     */
	    static get rules() {
	        return {
	            block,
	            inline
	        };
	    }
	    /**
	     * Static Lex Method
	     */
	    static lex(src, options) {
	        const lexer = new _Lexer(options);
	        return lexer.lex(src);
	    }
	    /**
	     * Static Lex Inline Method
	     */
	    static lexInline(src, options) {
	        const lexer = new _Lexer(options);
	        return lexer.inlineTokens(src);
	    }
	    /**
	     * Preprocessing
	     */
	    lex(src) {
	        src = src
	            .replace(/\r\n|\r/g, '\n');
	        this.blockTokens(src, this.tokens);
	        for (let i = 0; i < this.inlineQueue.length; i++) {
	            const next = this.inlineQueue[i];
	            this.inlineTokens(next.src, next.tokens);
	        }
	        this.inlineQueue = [];
	        return this.tokens;
	    }
	    blockTokens(src, tokens = []) {
	        if (this.options.pedantic) {
	            src = src.replace(/\t/g, '    ').replace(/^ +$/gm, '');
	        }
	        else {
	            src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
	                return leading + '    '.repeat(tabs.length);
	            });
	        }
	        let token;
	        let lastToken;
	        let cutSrc;
	        let lastParagraphClipped;
	        while (src) {
	            if (this.options.extensions
	                && this.options.extensions.block
	                && this.options.extensions.block.some((extTokenizer) => {
	                    if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
	                        src = src.substring(token.raw.length);
	                        tokens.push(token);
	                        return true;
	                    }
	                    return false;
	                })) {
	                continue;
	            }
	            // newline
	            if (token = this.tokenizer.space(src)) {
	                src = src.substring(token.raw.length);
	                if (token.raw.length === 1 && tokens.length > 0) {
	                    // if there's a single \n as a spacer, it's terminating the last line,
	                    // so move it there so that we don't get unnecessary paragraph tags
	                    tokens[tokens.length - 1].raw += '\n';
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // code
	            if (token = this.tokenizer.code(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                // An indented code block cannot interrupt a paragraph.
	                if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.text;
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // fences
	            if (token = this.tokenizer.fences(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // heading
	            if (token = this.tokenizer.heading(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // hr
	            if (token = this.tokenizer.hr(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // blockquote
	            if (token = this.tokenizer.blockquote(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // list
	            if (token = this.tokenizer.list(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // html
	            if (token = this.tokenizer.html(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // def
	            if (token = this.tokenizer.def(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.raw;
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else if (!this.tokens.links[token.tag]) {
	                    this.tokens.links[token.tag] = {
	                        href: token.href,
	                        title: token.title
	                    };
	                }
	                continue;
	            }
	            // table (gfm)
	            if (token = this.tokenizer.table(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // lheading
	            if (token = this.tokenizer.lheading(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // top-level paragraph
	            // prevent paragraph consuming extensions by clipping 'src' to extension start
	            cutSrc = src;
	            if (this.options.extensions && this.options.extensions.startBlock) {
	                let startIndex = Infinity;
	                const tempSrc = src.slice(1);
	                let tempStart;
	                this.options.extensions.startBlock.forEach((getStartIndex) => {
	                    tempStart = getStartIndex.call({ lexer: this }, tempSrc);
	                    if (typeof tempStart === 'number' && tempStart >= 0) {
	                        startIndex = Math.min(startIndex, tempStart);
	                    }
	                });
	                if (startIndex < Infinity && startIndex >= 0) {
	                    cutSrc = src.substring(0, startIndex + 1);
	                }
	            }
	            if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
	                lastToken = tokens[tokens.length - 1];
	                if (lastParagraphClipped && lastToken.type === 'paragraph') {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.text;
	                    this.inlineQueue.pop();
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                lastParagraphClipped = (cutSrc.length !== src.length);
	                src = src.substring(token.raw.length);
	                continue;
	            }
	            // text
	            if (token = this.tokenizer.text(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && lastToken.type === 'text') {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.text;
	                    this.inlineQueue.pop();
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            if (src) {
	                const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
	                if (this.options.silent) {
	                    console.error(errMsg);
	                    break;
	                }
	                else {
	                    throw new Error(errMsg);
	                }
	            }
	        }
	        this.state.top = true;
	        return tokens;
	    }
	    inline(src, tokens = []) {
	        this.inlineQueue.push({ src, tokens });
	        return tokens;
	    }
	    /**
	     * Lexing/Compiling
	     */
	    inlineTokens(src, tokens = []) {
	        let token, lastToken, cutSrc;
	        // String with links masked to avoid interference with em and strong
	        let maskedSrc = src;
	        let match;
	        let keepPrevChar, prevChar;
	        // Mask out reflinks
	        if (this.tokens.links) {
	            const links = Object.keys(this.tokens.links);
	            if (links.length > 0) {
	                while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
	                    if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
	                        maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
	                    }
	                }
	            }
	        }
	        // Mask out other blocks
	        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
	            maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
	        }
	        // Mask out escaped characters
	        while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
	            maskedSrc = maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
	        }
	        while (src) {
	            if (!keepPrevChar) {
	                prevChar = '';
	            }
	            keepPrevChar = false;
	            // extensions
	            if (this.options.extensions
	                && this.options.extensions.inline
	                && this.options.extensions.inline.some((extTokenizer) => {
	                    if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
	                        src = src.substring(token.raw.length);
	                        tokens.push(token);
	                        return true;
	                    }
	                    return false;
	                })) {
	                continue;
	            }
	            // escape
	            if (token = this.tokenizer.escape(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // tag
	            if (token = this.tokenizer.tag(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && token.type === 'text' && lastToken.type === 'text') {
	                    lastToken.raw += token.raw;
	                    lastToken.text += token.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // link
	            if (token = this.tokenizer.link(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // reflink, nolink
	            if (token = this.tokenizer.reflink(src, this.tokens.links)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && token.type === 'text' && lastToken.type === 'text') {
	                    lastToken.raw += token.raw;
	                    lastToken.text += token.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // em & strong
	            if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // code
	            if (token = this.tokenizer.codespan(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // br
	            if (token = this.tokenizer.br(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // del (gfm)
	            if (token = this.tokenizer.del(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // autolink
	            if (token = this.tokenizer.autolink(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // url (gfm)
	            if (!this.state.inLink && (token = this.tokenizer.url(src))) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // text
	            // prevent inlineText consuming extensions by clipping 'src' to extension start
	            cutSrc = src;
	            if (this.options.extensions && this.options.extensions.startInline) {
	                let startIndex = Infinity;
	                const tempSrc = src.slice(1);
	                let tempStart;
	                this.options.extensions.startInline.forEach((getStartIndex) => {
	                    tempStart = getStartIndex.call({ lexer: this }, tempSrc);
	                    if (typeof tempStart === 'number' && tempStart >= 0) {
	                        startIndex = Math.min(startIndex, tempStart);
	                    }
	                });
	                if (startIndex < Infinity && startIndex >= 0) {
	                    cutSrc = src.substring(0, startIndex + 1);
	                }
	            }
	            if (token = this.tokenizer.inlineText(cutSrc)) {
	                src = src.substring(token.raw.length);
	                if (token.raw.slice(-1) !== '_') { // Track prevChar before string of ____ started
	                    prevChar = token.raw.slice(-1);
	                }
	                keepPrevChar = true;
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && lastToken.type === 'text') {
	                    lastToken.raw += token.raw;
	                    lastToken.text += token.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            if (src) {
	                const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
	                if (this.options.silent) {
	                    console.error(errMsg);
	                    break;
	                }
	                else {
	                    throw new Error(errMsg);
	                }
	            }
	        }
	        return tokens;
	    }
	}

	/**
	 * Renderer
	 */
	class _Renderer {
	    options;
	    constructor(options) {
	        this.options = options || _defaults;
	    }
	    code(code, infostring, escaped) {
	        const lang = (infostring || '').match(/^\S*/)?.[0];
	        code = code.replace(/\n$/, '') + '\n';
	        if (!lang) {
	            return '<pre><code>'
	                + (escaped ? code : escape$1(code, true))
	                + '</code></pre>\n';
	        }
	        return '<pre><code class="language-'
	            + escape$1(lang)
	            + '">'
	            + (escaped ? code : escape$1(code, true))
	            + '</code></pre>\n';
	    }
	    blockquote(quote) {
	        return `<blockquote>\n${quote}</blockquote>\n`;
	    }
	    html(html, block) {
	        return html;
	    }
	    heading(text, level, raw) {
	        // ignore IDs
	        return `<h${level}>${text}</h${level}>\n`;
	    }
	    hr() {
	        return '<hr>\n';
	    }
	    list(body, ordered, start) {
	        const type = ordered ? 'ol' : 'ul';
	        const startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
	        return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
	    }
	    listitem(text, task, checked) {
	        return `<li>${text}</li>\n`;
	    }
	    checkbox(checked) {
	        return '<input '
	            + (checked ? 'checked="" ' : '')
	            + 'disabled="" type="checkbox">';
	    }
	    paragraph(text) {
	        return `<p>${text}</p>\n`;
	    }
	    table(header, body) {
	        if (body)
	            body = `<tbody>${body}</tbody>`;
	        return '<table>\n'
	            + '<thead>\n'
	            + header
	            + '</thead>\n'
	            + body
	            + '</table>\n';
	    }
	    tablerow(content) {
	        return `<tr>\n${content}</tr>\n`;
	    }
	    tablecell(content, flags) {
	        const type = flags.header ? 'th' : 'td';
	        const tag = flags.align
	            ? `<${type} align="${flags.align}">`
	            : `<${type}>`;
	        return tag + content + `</${type}>\n`;
	    }
	    /**
	     * span level renderer
	     */
	    strong(text) {
	        return `<strong>${text}</strong>`;
	    }
	    em(text) {
	        return `<em>${text}</em>`;
	    }
	    codespan(text) {
	        return `<code>${text}</code>`;
	    }
	    br() {
	        return '<br>';
	    }
	    del(text) {
	        return `<del>${text}</del>`;
	    }
	    link(href, title, text) {
	        const cleanHref = cleanUrl(href);
	        if (cleanHref === null) {
	            return text;
	        }
	        href = cleanHref;
	        let out = '<a href="' + href + '"';
	        if (title) {
	            out += ' title="' + title + '"';
	        }
	        out += '>' + text + '</a>';
	        return out;
	    }
	    image(href, title, text) {
	        const cleanHref = cleanUrl(href);
	        if (cleanHref === null) {
	            return text;
	        }
	        href = cleanHref;
	        let out = `<img src="${href}" alt="${text}"`;
	        if (title) {
	            out += ` title="${title}"`;
	        }
	        out += '>';
	        return out;
	    }
	    text(text) {
	        return text;
	    }
	}

	/**
	 * TextRenderer
	 * returns only the textual part of the token
	 */
	class _TextRenderer {
	    // no need for block level renderers
	    strong(text) {
	        return text;
	    }
	    em(text) {
	        return text;
	    }
	    codespan(text) {
	        return text;
	    }
	    del(text) {
	        return text;
	    }
	    html(text) {
	        return text;
	    }
	    text(text) {
	        return text;
	    }
	    link(href, title, text) {
	        return '' + text;
	    }
	    image(href, title, text) {
	        return '' + text;
	    }
	    br() {
	        return '';
	    }
	}

	/**
	 * Parsing & Compiling
	 */
	class _Parser {
	    options;
	    renderer;
	    textRenderer;
	    constructor(options) {
	        this.options = options || _defaults;
	        this.options.renderer = this.options.renderer || new _Renderer();
	        this.renderer = this.options.renderer;
	        this.renderer.options = this.options;
	        this.textRenderer = new _TextRenderer();
	    }
	    /**
	     * Static Parse Method
	     */
	    static parse(tokens, options) {
	        const parser = new _Parser(options);
	        return parser.parse(tokens);
	    }
	    /**
	     * Static Parse Inline Method
	     */
	    static parseInline(tokens, options) {
	        const parser = new _Parser(options);
	        return parser.parseInline(tokens);
	    }
	    /**
	     * Parse Loop
	     */
	    parse(tokens, top = true) {
	        let out = '';
	        for (let i = 0; i < tokens.length; i++) {
	            const token = tokens[i];
	            // Run any renderer extensions
	            if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
	                const genericToken = token;
	                const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
	                if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(genericToken.type)) {
	                    out += ret || '';
	                    continue;
	                }
	            }
	            switch (token.type) {
	                case 'space': {
	                    continue;
	                }
	                case 'hr': {
	                    out += this.renderer.hr();
	                    continue;
	                }
	                case 'heading': {
	                    const headingToken = token;
	                    out += this.renderer.heading(this.parseInline(headingToken.tokens), headingToken.depth, unescape(this.parseInline(headingToken.tokens, this.textRenderer)));
	                    continue;
	                }
	                case 'code': {
	                    const codeToken = token;
	                    out += this.renderer.code(codeToken.text, codeToken.lang, !!codeToken.escaped);
	                    continue;
	                }
	                case 'table': {
	                    const tableToken = token;
	                    let header = '';
	                    // header
	                    let cell = '';
	                    for (let j = 0; j < tableToken.header.length; j++) {
	                        cell += this.renderer.tablecell(this.parseInline(tableToken.header[j].tokens), { header: true, align: tableToken.align[j] });
	                    }
	                    header += this.renderer.tablerow(cell);
	                    let body = '';
	                    for (let j = 0; j < tableToken.rows.length; j++) {
	                        const row = tableToken.rows[j];
	                        cell = '';
	                        for (let k = 0; k < row.length; k++) {
	                            cell += this.renderer.tablecell(this.parseInline(row[k].tokens), { header: false, align: tableToken.align[k] });
	                        }
	                        body += this.renderer.tablerow(cell);
	                    }
	                    out += this.renderer.table(header, body);
	                    continue;
	                }
	                case 'blockquote': {
	                    const blockquoteToken = token;
	                    const body = this.parse(blockquoteToken.tokens);
	                    out += this.renderer.blockquote(body);
	                    continue;
	                }
	                case 'list': {
	                    const listToken = token;
	                    const ordered = listToken.ordered;
	                    const start = listToken.start;
	                    const loose = listToken.loose;
	                    let body = '';
	                    for (let j = 0; j < listToken.items.length; j++) {
	                        const item = listToken.items[j];
	                        const checked = item.checked;
	                        const task = item.task;
	                        let itemBody = '';
	                        if (item.task) {
	                            const checkbox = this.renderer.checkbox(!!checked);
	                            if (loose) {
	                                if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
	                                    item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
	                                    if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
	                                        item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
	                                    }
	                                }
	                                else {
	                                    item.tokens.unshift({
	                                        type: 'text',
	                                        text: checkbox + ' '
	                                    });
	                                }
	                            }
	                            else {
	                                itemBody += checkbox + ' ';
	                            }
	                        }
	                        itemBody += this.parse(item.tokens, loose);
	                        body += this.renderer.listitem(itemBody, task, !!checked);
	                    }
	                    out += this.renderer.list(body, ordered, start);
	                    continue;
	                }
	                case 'html': {
	                    const htmlToken = token;
	                    out += this.renderer.html(htmlToken.text, htmlToken.block);
	                    continue;
	                }
	                case 'paragraph': {
	                    const paragraphToken = token;
	                    out += this.renderer.paragraph(this.parseInline(paragraphToken.tokens));
	                    continue;
	                }
	                case 'text': {
	                    let textToken = token;
	                    let body = textToken.tokens ? this.parseInline(textToken.tokens) : textToken.text;
	                    while (i + 1 < tokens.length && tokens[i + 1].type === 'text') {
	                        textToken = tokens[++i];
	                        body += '\n' + (textToken.tokens ? this.parseInline(textToken.tokens) : textToken.text);
	                    }
	                    out += top ? this.renderer.paragraph(body) : body;
	                    continue;
	                }
	                default: {
	                    const errMsg = 'Token with "' + token.type + '" type was not found.';
	                    if (this.options.silent) {
	                        console.error(errMsg);
	                        return '';
	                    }
	                    else {
	                        throw new Error(errMsg);
	                    }
	                }
	            }
	        }
	        return out;
	    }
	    /**
	     * Parse Inline Tokens
	     */
	    parseInline(tokens, renderer) {
	        renderer = renderer || this.renderer;
	        let out = '';
	        for (let i = 0; i < tokens.length; i++) {
	            const token = tokens[i];
	            // Run any renderer extensions
	            if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
	                const ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
	                if (ret !== false || !['escape', 'html', 'link', 'image', 'strong', 'em', 'codespan', 'br', 'del', 'text'].includes(token.type)) {
	                    out += ret || '';
	                    continue;
	                }
	            }
	            switch (token.type) {
	                case 'escape': {
	                    const escapeToken = token;
	                    out += renderer.text(escapeToken.text);
	                    break;
	                }
	                case 'html': {
	                    const tagToken = token;
	                    out += renderer.html(tagToken.text);
	                    break;
	                }
	                case 'link': {
	                    const linkToken = token;
	                    out += renderer.link(linkToken.href, linkToken.title, this.parseInline(linkToken.tokens, renderer));
	                    break;
	                }
	                case 'image': {
	                    const imageToken = token;
	                    out += renderer.image(imageToken.href, imageToken.title, imageToken.text);
	                    break;
	                }
	                case 'strong': {
	                    const strongToken = token;
	                    out += renderer.strong(this.parseInline(strongToken.tokens, renderer));
	                    break;
	                }
	                case 'em': {
	                    const emToken = token;
	                    out += renderer.em(this.parseInline(emToken.tokens, renderer));
	                    break;
	                }
	                case 'codespan': {
	                    const codespanToken = token;
	                    out += renderer.codespan(codespanToken.text);
	                    break;
	                }
	                case 'br': {
	                    out += renderer.br();
	                    break;
	                }
	                case 'del': {
	                    const delToken = token;
	                    out += renderer.del(this.parseInline(delToken.tokens, renderer));
	                    break;
	                }
	                case 'text': {
	                    const textToken = token;
	                    out += renderer.text(textToken.text);
	                    break;
	                }
	                default: {
	                    const errMsg = 'Token with "' + token.type + '" type was not found.';
	                    if (this.options.silent) {
	                        console.error(errMsg);
	                        return '';
	                    }
	                    else {
	                        throw new Error(errMsg);
	                    }
	                }
	            }
	        }
	        return out;
	    }
	}

	class _Hooks {
	    options;
	    constructor(options) {
	        this.options = options || _defaults;
	    }
	    static passThroughHooks = new Set([
	        'preprocess',
	        'postprocess',
	        'processAllTokens'
	    ]);
	    /**
	     * Process markdown before marked
	     */
	    preprocess(markdown) {
	        return markdown;
	    }
	    /**
	     * Process HTML after marked is finished
	     */
	    postprocess(html) {
	        return html;
	    }
	    /**
	     * Process all tokens before walk tokens
	     */
	    processAllTokens(tokens) {
	        return tokens;
	    }
	}

	class Marked {
	    defaults = _getDefaults();
	    options = this.setOptions;
	    parse = this.#parseMarkdown(_Lexer.lex, _Parser.parse);
	    parseInline = this.#parseMarkdown(_Lexer.lexInline, _Parser.parseInline);
	    Parser = _Parser;
	    Renderer = _Renderer;
	    TextRenderer = _TextRenderer;
	    Lexer = _Lexer;
	    Tokenizer = _Tokenizer;
	    Hooks = _Hooks;
	    constructor(...args) {
	        this.use(...args);
	    }
	    /**
	     * Run callback for every token
	     */
	    walkTokens(tokens, callback) {
	        let values = [];
	        for (const token of tokens) {
	            values = values.concat(callback.call(this, token));
	            switch (token.type) {
	                case 'table': {
	                    const tableToken = token;
	                    for (const cell of tableToken.header) {
	                        values = values.concat(this.walkTokens(cell.tokens, callback));
	                    }
	                    for (const row of tableToken.rows) {
	                        for (const cell of row) {
	                            values = values.concat(this.walkTokens(cell.tokens, callback));
	                        }
	                    }
	                    break;
	                }
	                case 'list': {
	                    const listToken = token;
	                    values = values.concat(this.walkTokens(listToken.items, callback));
	                    break;
	                }
	                default: {
	                    const genericToken = token;
	                    if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
	                        this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
	                            const tokens = genericToken[childTokens].flat(Infinity);
	                            values = values.concat(this.walkTokens(tokens, callback));
	                        });
	                    }
	                    else if (genericToken.tokens) {
	                        values = values.concat(this.walkTokens(genericToken.tokens, callback));
	                    }
	                }
	            }
	        }
	        return values;
	    }
	    use(...args) {
	        const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
	        args.forEach((pack) => {
	            // copy options to new object
	            const opts = { ...pack };
	            // set async to true if it was set to true before
	            opts.async = this.defaults.async || opts.async || false;
	            // ==-- Parse "addon" extensions --== //
	            if (pack.extensions) {
	                pack.extensions.forEach((ext) => {
	                    if (!ext.name) {
	                        throw new Error('extension name required');
	                    }
	                    if ('renderer' in ext) { // Renderer extensions
	                        const prevRenderer = extensions.renderers[ext.name];
	                        if (prevRenderer) {
	                            // Replace extension with func to run new extension but fall back if false
	                            extensions.renderers[ext.name] = function (...args) {
	                                let ret = ext.renderer.apply(this, args);
	                                if (ret === false) {
	                                    ret = prevRenderer.apply(this, args);
	                                }
	                                return ret;
	                            };
	                        }
	                        else {
	                            extensions.renderers[ext.name] = ext.renderer;
	                        }
	                    }
	                    if ('tokenizer' in ext) { // Tokenizer Extensions
	                        if (!ext.level || (ext.level !== 'block' && ext.level !== 'inline')) {
	                            throw new Error("extension level must be 'block' or 'inline'");
	                        }
	                        const extLevel = extensions[ext.level];
	                        if (extLevel) {
	                            extLevel.unshift(ext.tokenizer);
	                        }
	                        else {
	                            extensions[ext.level] = [ext.tokenizer];
	                        }
	                        if (ext.start) { // Function to check for start of token
	                            if (ext.level === 'block') {
	                                if (extensions.startBlock) {
	                                    extensions.startBlock.push(ext.start);
	                                }
	                                else {
	                                    extensions.startBlock = [ext.start];
	                                }
	                            }
	                            else if (ext.level === 'inline') {
	                                if (extensions.startInline) {
	                                    extensions.startInline.push(ext.start);
	                                }
	                                else {
	                                    extensions.startInline = [ext.start];
	                                }
	                            }
	                        }
	                    }
	                    if ('childTokens' in ext && ext.childTokens) { // Child tokens to be visited by walkTokens
	                        extensions.childTokens[ext.name] = ext.childTokens;
	                    }
	                });
	                opts.extensions = extensions;
	            }
	            // ==-- Parse "overwrite" extensions --== //
	            if (pack.renderer) {
	                const renderer = this.defaults.renderer || new _Renderer(this.defaults);
	                for (const prop in pack.renderer) {
	                    if (!(prop in renderer)) {
	                        throw new Error(`renderer '${prop}' does not exist`);
	                    }
	                    if (prop === 'options') {
	                        // ignore options property
	                        continue;
	                    }
	                    const rendererProp = prop;
	                    const rendererFunc = pack.renderer[rendererProp];
	                    const prevRenderer = renderer[rendererProp];
	                    // Replace renderer with func to run extension, but fall back if false
	                    renderer[rendererProp] = (...args) => {
	                        let ret = rendererFunc.apply(renderer, args);
	                        if (ret === false) {
	                            ret = prevRenderer.apply(renderer, args);
	                        }
	                        return ret || '';
	                    };
	                }
	                opts.renderer = renderer;
	            }
	            if (pack.tokenizer) {
	                const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
	                for (const prop in pack.tokenizer) {
	                    if (!(prop in tokenizer)) {
	                        throw new Error(`tokenizer '${prop}' does not exist`);
	                    }
	                    if (['options', 'rules', 'lexer'].includes(prop)) {
	                        // ignore options, rules, and lexer properties
	                        continue;
	                    }
	                    const tokenizerProp = prop;
	                    const tokenizerFunc = pack.tokenizer[tokenizerProp];
	                    const prevTokenizer = tokenizer[tokenizerProp];
	                    // Replace tokenizer with func to run extension, but fall back if false
	                    // @ts-expect-error cannot type tokenizer function dynamically
	                    tokenizer[tokenizerProp] = (...args) => {
	                        let ret = tokenizerFunc.apply(tokenizer, args);
	                        if (ret === false) {
	                            ret = prevTokenizer.apply(tokenizer, args);
	                        }
	                        return ret;
	                    };
	                }
	                opts.tokenizer = tokenizer;
	            }
	            // ==-- Parse Hooks extensions --== //
	            if (pack.hooks) {
	                const hooks = this.defaults.hooks || new _Hooks();
	                for (const prop in pack.hooks) {
	                    if (!(prop in hooks)) {
	                        throw new Error(`hook '${prop}' does not exist`);
	                    }
	                    if (prop === 'options') {
	                        // ignore options property
	                        continue;
	                    }
	                    const hooksProp = prop;
	                    const hooksFunc = pack.hooks[hooksProp];
	                    const prevHook = hooks[hooksProp];
	                    if (_Hooks.passThroughHooks.has(prop)) {
	                        // @ts-expect-error cannot type hook function dynamically
	                        hooks[hooksProp] = (arg) => {
	                            if (this.defaults.async) {
	                                return Promise.resolve(hooksFunc.call(hooks, arg)).then(ret => {
	                                    return prevHook.call(hooks, ret);
	                                });
	                            }
	                            const ret = hooksFunc.call(hooks, arg);
	                            return prevHook.call(hooks, ret);
	                        };
	                    }
	                    else {
	                        // @ts-expect-error cannot type hook function dynamically
	                        hooks[hooksProp] = (...args) => {
	                            let ret = hooksFunc.apply(hooks, args);
	                            if (ret === false) {
	                                ret = prevHook.apply(hooks, args);
	                            }
	                            return ret;
	                        };
	                    }
	                }
	                opts.hooks = hooks;
	            }
	            // ==-- Parse WalkTokens extensions --== //
	            if (pack.walkTokens) {
	                const walkTokens = this.defaults.walkTokens;
	                const packWalktokens = pack.walkTokens;
	                opts.walkTokens = function (token) {
	                    let values = [];
	                    values.push(packWalktokens.call(this, token));
	                    if (walkTokens) {
	                        values = values.concat(walkTokens.call(this, token));
	                    }
	                    return values;
	                };
	            }
	            this.defaults = { ...this.defaults, ...opts };
	        });
	        return this;
	    }
	    setOptions(opt) {
	        this.defaults = { ...this.defaults, ...opt };
	        return this;
	    }
	    lexer(src, options) {
	        return _Lexer.lex(src, options ?? this.defaults);
	    }
	    parser(tokens, options) {
	        return _Parser.parse(tokens, options ?? this.defaults);
	    }
	    #parseMarkdown(lexer, parser) {
	        return (src, options) => {
	            const origOpt = { ...options };
	            const opt = { ...this.defaults, ...origOpt };
	            // Show warning if an extension set async to true but the parse was called with async: false
	            if (this.defaults.async === true && origOpt.async === false) {
	                if (!opt.silent) {
	                    console.warn('marked(): The async option was set to true by an extension. The async: false option sent to parse will be ignored.');
	                }
	                opt.async = true;
	            }
	            const throwError = this.#onError(!!opt.silent, !!opt.async);
	            // throw error in case of non string input
	            if (typeof src === 'undefined' || src === null) {
	                return throwError(new Error('marked(): input parameter is undefined or null'));
	            }
	            if (typeof src !== 'string') {
	                return throwError(new Error('marked(): input parameter is of type '
	                    + Object.prototype.toString.call(src) + ', string expected'));
	            }
	            if (opt.hooks) {
	                opt.hooks.options = opt;
	            }
	            if (opt.async) {
	                return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src)
	                    .then(src => lexer(src, opt))
	                    .then(tokens => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens)
	                    .then(tokens => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens)
	                    .then(tokens => parser(tokens, opt))
	                    .then(html => opt.hooks ? opt.hooks.postprocess(html) : html)
	                    .catch(throwError);
	            }
	            try {
	                if (opt.hooks) {
	                    src = opt.hooks.preprocess(src);
	                }
	                let tokens = lexer(src, opt);
	                if (opt.hooks) {
	                    tokens = opt.hooks.processAllTokens(tokens);
	                }
	                if (opt.walkTokens) {
	                    this.walkTokens(tokens, opt.walkTokens);
	                }
	                let html = parser(tokens, opt);
	                if (opt.hooks) {
	                    html = opt.hooks.postprocess(html);
	                }
	                return html;
	            }
	            catch (e) {
	                return throwError(e);
	            }
	        };
	    }
	    #onError(silent, async) {
	        return (e) => {
	            e.message += '\nPlease report this to https://github.com/markedjs/marked.';
	            if (silent) {
	                const msg = '<p>An error occurred:</p><pre>'
	                    + escape$1(e.message + '', true)
	                    + '</pre>';
	                if (async) {
	                    return Promise.resolve(msg);
	                }
	                return msg;
	            }
	            if (async) {
	                return Promise.reject(e);
	            }
	            throw e;
	        };
	    }
	}

	const markedInstance = new Marked();
	function marked(src, opt) {
	    return markedInstance.parse(src, opt);
	}
	/**
	 * Sets the default options.
	 *
	 * @param options Hash of options
	 */
	marked.options =
	    marked.setOptions = function (options) {
	        markedInstance.setOptions(options);
	        marked.defaults = markedInstance.defaults;
	        changeDefaults(marked.defaults);
	        return marked;
	    };
	/**
	 * Gets the original marked default options.
	 */
	marked.getDefaults = _getDefaults;
	marked.defaults = _defaults;
	/**
	 * Use Extension
	 */
	marked.use = function (...args) {
	    markedInstance.use(...args);
	    marked.defaults = markedInstance.defaults;
	    changeDefaults(marked.defaults);
	    return marked;
	};
	/**
	 * Run callback for every token
	 */
	marked.walkTokens = function (tokens, callback) {
	    return markedInstance.walkTokens(tokens, callback);
	};
	/**
	 * Compiles markdown to HTML without enclosing `p` tag.
	 *
	 * @param src String of markdown source to be compiled
	 * @param options Hash of options
	 * @return String of compiled HTML
	 */
	marked.parseInline = markedInstance.parseInline;
	/**
	 * Expose
	 */
	marked.Parser = _Parser;
	marked.parser = _Parser.parse;
	marked.Renderer = _Renderer;
	marked.TextRenderer = _TextRenderer;
	marked.Lexer = _Lexer;
	marked.lexer = _Lexer.lex;
	marked.Tokenizer = _Tokenizer;
	marked.Hooks = _Hooks;
	marked.parse = marked;
	marked.options;
	marked.setOptions;
	marked.use;
	marked.walkTokens;
	marked.parseInline;
	_Parser.parse;
	_Lexer.lex;

	const ALLOWED_TAGS = [
	    'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'hr', 'i',
	    'img', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
	];
	/**
	 * Renders markdown into a styled HTMLElement mirroring the product-mono implementation.
	 */
	function renderMarkdown(content, options, doc) {
	    const targetDocument = doc ?? (typeof document !== 'undefined' ? document : null);
	    if (!targetDocument) {
	        throw new Error('Markdown rendering requires a Document context');
	    }
	    const renderer = createRenderer();
	    const parser = new Marked();
	    parser.use({ renderer });
	    parser.setOptions({
	        gfm: true,
	        breaks: false,
	    });
	    const parsed = parser.parse(content || '');
	    const rawHtml = typeof parsed === 'string' ? parsed : '';
	    const sanitized = purify.sanitize(rawHtml, {
	        ALLOWED_TAGS,
	        ADD_ATTR: ['target', 'rel'],
	    });
	    const container = targetDocument.createElement('div');
	    container.className = 'aomi-markdown';
	    container.innerHTML = sanitized;
	    applyBaseStyles(container, options);
	    styleElements(container, options);
	    return container;
	}
	/**
	 * Creates a marked renderer.
	 */
	function createRenderer() {
	    return new _Renderer();
	}
	/**
	 * Applies base container styles.
	 */
	function applyBaseStyles(container, options) {
	    container.style.display = 'flex';
	    container.style.flexDirection = 'column';
	    container.style.fontFamily = options.fontFamily;
	    container.style.gap = '0';
	}
	/**
	 * Applies styles to markdown elements.
	 */
	function styleElements(container, options) {
	    const { monospaceFontFamily } = options;
	    container.querySelectorAll('p').forEach((element) => {
	        if (!(element instanceof HTMLElement))
	            return;
	        element.className = 'aomi-md-paragraph';
	    });
	    container.querySelectorAll('a').forEach((anchor) => {
	        if (!(anchor instanceof HTMLAnchorElement))
	            return;
	        anchor.className = 'aomi-md-link';
	        if (!anchor.getAttribute('target')) {
	            anchor.setAttribute('target', '_blank');
	        }
	        anchor.setAttribute('rel', 'noreferrer');
	    });
	    container.querySelectorAll('ul').forEach((list) => {
	        if (!(list instanceof HTMLElement))
	            return;
	        list.className = 'aomi-md-list aomi-md-list-unordered';
	    });
	    container.querySelectorAll('ol').forEach((list) => {
	        if (!(list instanceof HTMLElement))
	            return;
	        list.className = 'aomi-md-list aomi-md-list-ordered';
	    });
	    container.querySelectorAll('li').forEach((item) => {
	        if (!(item instanceof HTMLElement))
	            return;
	        item.className = 'aomi-md-list-item';
	    });
	    container.querySelectorAll('pre').forEach((block) => {
	        if (!(block instanceof HTMLElement))
	            return;
	        block.className = 'aomi-md-code-block';
	        block.style.overflowX = 'auto';
	        block.style.fontFamily = monospaceFontFamily;
	        const code = block.querySelector('code');
	        if (code instanceof HTMLElement) {
	            code.className = 'aomi-md-code-block-content';
	            code.style.fontFamily = monospaceFontFamily;
	            code.style.display = 'block';
	            code.style.whiteSpace = 'pre';
	        }
	    });
	    container.querySelectorAll('code').forEach((inline) => {
	        if (!(inline instanceof HTMLElement))
	            return;
	        if (inline.parentElement?.tagName === 'PRE')
	            return;
	        inline.className = 'aomi-md-code-inline';
	        inline.style.display = 'inline';
	        inline.style.fontFamily = monospaceFontFamily;
	    });
	    container.querySelectorAll('blockquote').forEach((blockquote) => {
	        if (!(blockquote instanceof HTMLElement))
	            return;
	        blockquote.className = 'aomi-md-blockquote';
	    });
	    styleHeadings(container);
	    styleTables(container);
	    container.querySelectorAll('hr').forEach((divider) => {
	        if (!(divider instanceof HTMLElement))
	            return;
	        divider.className = 'aomi-md-hr';
	        divider.style.border = 'none';
	    });
	    container.querySelectorAll('img').forEach((image) => {
	        if (!(image instanceof HTMLImageElement))
	            return;
	        image.className = 'aomi-md-image';
	        image.style.maxWidth = '100%';
	    });
	}
	/**
	 * Styles headings.
	 */
	function styleHeadings(container) {
	    container.querySelectorAll('h1').forEach((heading) => {
	        if (!(heading instanceof HTMLElement))
	            return;
	        heading.className = 'aomi-md-heading aomi-md-heading-1';
	    });
	    container.querySelectorAll('h2').forEach((heading) => {
	        if (!(heading instanceof HTMLElement))
	            return;
	        heading.className = 'aomi-md-heading aomi-md-heading-2';
	    });
	    container.querySelectorAll('h3').forEach((heading) => {
	        if (!(heading instanceof HTMLElement))
	            return;
	        heading.className = 'aomi-md-heading aomi-md-heading-3';
	    });
	}
	/**
	 * Wraps and styles tables.
	 */
	function styleTables(container) {
	    container.querySelectorAll('table').forEach((table) => {
	        if (!(table instanceof HTMLTableElement))
	            return;
	        if (!table.parentElement?.classList.contains('aomi-md-table-wrapper')) {
	            const wrapper = container.ownerDocument?.createElement('div');
	            if (!wrapper)
	                return;
	            wrapper.className = 'aomi-md-table-wrapper';
	            wrapper.style.overflowX = 'auto';
	            table.parentElement?.replaceChild(wrapper, table);
	            wrapper.appendChild(table);
	        }
	        table.className = 'aomi-md-table';
	        table.style.width = '100%';
	        table.style.borderCollapse = 'collapse';
	        table.querySelectorAll('thead').forEach((thead) => {
	            if (!(thead instanceof HTMLElement))
	                return;
	            thead.className = 'aomi-md-table-head';
	        });
	        table.querySelectorAll('tbody').forEach((tbody) => {
	            if (!(tbody instanceof HTMLElement))
	                return;
	            tbody.className = 'aomi-md-table-body';
	        });
	        table.querySelectorAll('th').forEach((cell) => {
	            if (!(cell instanceof HTMLElement))
	                return;
	            cell.className = 'aomi-md-table-cell aomi-md-table-header';
	            cell.style.textAlign = 'left';
	        });
	        table.querySelectorAll('td').forEach((cell) => {
	            if (!(cell instanceof HTMLElement))
	                return;
	            cell.className = 'aomi-md-table-cell aomi-md-table-data';
	        });
	    });
	}

	function resolveWidgetParams(params) {
	    const width = params.width || DEFAULT_WIDGET_WIDTH;
	    const height = params.height || DEFAULT_WIDGET_HEIGHT;
	    const theme = mergeTheme(DEFAULT_WIDGET_THEME, params.theme);
	    return {
	        width,
	        height,
	        renderSurface: params.surfaceMode ?? DEFAULT_RENDER_SURFACE,
	        placeholder: params.placeholder,
	        theme,
	    };
	}
	function mergeTheme(base, override) {
	    return {
	        palette: {
	            ...base.palette,
	            ...(override?.palette ?? {}),
	        },
	        fonts: {
	            ...base.fonts,
	            ...(override?.fonts ?? {}),
	        },
	    };
	}

	/*
	 * ChatManager - Manages chat connection, state, and communication
	 * Adapted from your existing chat-manager.ts
	 */
	/*
	 * ============================================================================
	 * CHAT MANAGER CLASS
	 * ============================================================================
	 */
	class ChatManager extends EventEmitter {
	    constructor(config = {}) {
	        super();
	        this.eventSource = null;
	        this.reconnectAttempt = 0;
	        this.reconnectTimer = null;
	        this.heartbeatTimer = null;
	        this.lastPendingTransactionRaw = null;
	        this.config = {
	            backendUrl: config.backendUrl || 'http://localhost:8080',
	            sessionId: config.sessionId || generateSessionId(),
	            maxMessageLength: config.maxMessageLength || 2000,
	            reconnectAttempts: config.reconnectAttempts || 5,
	            reconnectDelay: config.reconnectDelay || 3000,
	            ...config,
	        };
	        this.state = {
	            messages: [],
	            isProcessing: false,
	            connectionStatus: ConnectionStatus.DISCONNECTED,
	            sessionId: this.config.sessionId,
	        };
	    }
	    /*
	     * ============================================================================
	     * PUBLIC API
	     * ============================================================================
	     */
	    /**
	     * Gets the current state
	     */
	    getState() {
	        return { ...this.state };
	    }
	    /**
	     * Gets the session ID
	     */
	    getSessionId() {
	        return this.config.sessionId;
	    }
	    /**
	     * Sets a new session ID and reconnects if needed
	     */
	    setSessionId(sessionId) {
	        this.config.sessionId = sessionId;
	        this.state.sessionId = sessionId;
	        if (this.state.connectionStatus === ConnectionStatus.CONNECTED) {
	            this.connectSSE();
	        }
	    }
	    /**
	     * Connects to the backend via Server-Sent Events
	     */
	    async connectSSE() {
	        this.setConnectionStatus(ConnectionStatus.CONNECTING);
	        // Close existing connection
	        this.disconnectSSE();
	        try {
	            const url = `${this.config.backendUrl}${API_ENDPOINTS.CHAT_STREAM}?session_id=${this.config.sessionId}`;
	            this.eventSource = new EventSource(url);
	            this.eventSource.onopen = () => {
	                console.warn('SSE connection opened:', url);
	                this.setConnectionStatus(ConnectionStatus.CONNECTED);
	                this.reconnectAttempt = 0;
	                this.startHeartbeat();
	                this.refreshState().catch((error) => {
	                    console.warn('Failed to refresh chat state after opening SSE connection:', error);
	                });
	            };
	            this.eventSource.onmessage = (event) => {
	                try {
	                    const data = JSON.parse(event.data);
	                    this.updateChatState(data);
	                }
	                catch (error) {
	                    console.error('Failed to parse SSE message:', error);
	                    this.emit('error', createWidgetError(ERROR_CODES.INVALID_MESSAGE, 'Invalid message format'));
	                }
	            };
	            this.eventSource.onerror = (event) => {
	                console.error('SSE connection error:', event);
	                this.handleConnectionError();
	            };
	        }
	        catch (error) {
	            console.error('Failed to create SSE connection:', error);
	            this.emit('error', createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Failed to establish connection'));
	            this.handleConnectionError();
	        }
	    }
	    /**
	     * Disconnects from the backend
	     */
	    disconnectSSE() {
	        if (this.eventSource) {
	            this.eventSource.close();
	            this.eventSource = null;
	        }
	        this.stopHeartbeat();
	        this.clearReconnectTimer();
	        this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
	    }
	    async refreshState() {
	        try {
	            const response = await withTimeout$1(fetch(`${this.config.backendUrl}${API_ENDPOINTS.STATE}?session_id=${this.config.sessionId}`, {
	                method: 'GET',
	            }), TIMING.CONNECTION_TIMEOUT);
	            if (!response.ok) {
	                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	            }
	            const payload = await response.json();
	            this.updateChatState(payload);
	        }
	        catch (error) {
	            console.warn('Failed to fetch chat state:', error);
	        }
	    }
	    /**
	     * Sends a message to the backend
	     */
	    async sendMessage(message) {
	        const trimmedMessage = message.trim();
	        if (!trimmedMessage) {
	            throw createWidgetError(ERROR_CODES.INVALID_MESSAGE, 'Message cannot be empty');
	        }
	        if (trimmedMessage.length > this.config.maxMessageLength) {
	            throw createWidgetError(ERROR_CODES.MESSAGE_TOO_LONG, `Message exceeds ${this.config.maxMessageLength} characters`);
	        }
	        if (this.state.connectionStatus !== ConnectionStatus.CONNECTED) {
	            throw createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Not connected to backend');
	        }
	        if (this.state.isProcessing) {
	            throw createWidgetError(ERROR_CODES.RATE_LIMITED, 'Previous message is still being processed');
	        }
	        try {
	            const payload = await this.postToBackend(API_ENDPOINTS.CHAT, {
	                message: trimmedMessage,
	                session_id: this.config.sessionId,
	            });
	            this.updateChatState(payload);
	        }
	        catch (error) {
	            console.error('Failed to send message:', error);
	            throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send message');
	        }
	    }
	    /**
	     * Sends a system message
	     */
	    async sendSystemMessage(message) {
	        try {
	            const payload = await this.postToBackend(API_ENDPOINTS.SYSTEM, {
	                message,
	                session_id: this.config.sessionId,
	            });
	            this.updateChatState(payload);
	        }
	        catch (error) {
	            console.error('Failed to send system message:', error);
	            throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send system message');
	        }
	    }
	    /**
	     * Interrupts current processing
	     */
	    async interrupt() {
	        try {
	            const payload = await this.postToBackend(API_ENDPOINTS.INTERRUPT, {
	                session_id: this.config.sessionId,
	            });
	            this.updateChatState(payload);
	        }
	        catch (error) {
	            console.error('Failed to interrupt:', error);
	            throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to interrupt processing');
	        }
	    }
	    /**
	     * Sends transaction result back to backend
	     */
	    async sendTransactionResult(success, txHash, error) {
	        try {
	            await this.sendSystemMessage(`Transaction ${success ? 'completed' : 'failed'}${txHash ? `: ${txHash}` : ''}${error ? ` (${error})` : ''}`);
	        }
	        catch (err) {
	            console.error('Failed to send transaction result:', err);
	        }
	    }
	    /**
	     * Clears all messages
	     */
	    clearMessages() {
	        this.state.messages = [];
	        this.emitStateChange();
	    }
	    /**
	     * Destroys the chat manager
	     */
	    destroy() {
	        this.disconnectSSE();
	        this.removeAllListeners();
	    }
	    /*
	     * ============================================================================
	     * PRIVATE METHODS
	     * ============================================================================
	     */
	    updateChatState(payload) {
	        if (!payload) {
	            return;
	        }
	        const previousMessages = this.state.messages.slice();
	        let stateChanged = false;
	        if (Array.isArray(payload.messages)) {
	            const converted = payload.messages
	                .filter((msg) => Boolean(msg))
	                .map((msg, index) => convertBackendMessage(msg, index, previousMessages[index]));
	            this.state.messages = converted;
	            stateChanged = true;
	            converted.forEach((message, index) => {
	                const previous = previousMessages[index];
	                const isNewMessage = !previous || previous.id !== message.id;
	                const contentChanged = previous && previous.content !== message.content;
	                const toolStreamChanged = previous && !areToolStreamsEqual(previous.toolStream, message.toolStream);
	                if (isNewMessage || contentChanged || toolStreamChanged) {
	                    this.emit('message', message);
	                }
	            });
	        }
	        const processingFlag = resolveBackendBoolean(payload.isProcessing ?? payload.is_processing);
	        if (processingFlag !== null && processingFlag !== this.state.isProcessing) {
	            this.state.isProcessing = processingFlag;
	            stateChanged = true;
	        }
	        if ('pending_wallet_tx' in payload) {
	            const raw = payload.pending_wallet_tx ?? null;
	            if (raw === null) {
	                if (this.state.pendingTransaction) {
	                    this.state.pendingTransaction = undefined;
	                    this.lastPendingTransactionRaw = null;
	                    stateChanged = true;
	                }
	            }
	            else if (raw !== this.lastPendingTransactionRaw) {
	                this.lastPendingTransactionRaw = raw;
	                try {
	                    const parsed = JSON.parse(raw);
	                    this.state.pendingTransaction = parsed;
	                    stateChanged = true;
	                    this.emit('transactionRequest', parsed);
	                }
	                catch (error) {
	                    console.error('Failed to parse wallet transaction request:', error);
	                }
	            }
	        }
	        if (stateChanged) {
	            this.emitStateChange();
	        }
	    }
	    setConnectionStatus(status) {
	        if (this.state.connectionStatus !== status) {
	            this.state.connectionStatus = status;
	            this.emit('connectionChange', status);
	            this.emitStateChange();
	        }
	    }
	    emitStateChange() {
	        this.emit('stateChange', this.getState());
	    }
	    async postToBackend(endpoint, data) {
	        const url = `${this.config.backendUrl}${endpoint}`;
	        try {
	            const response = await withTimeout$1(fetch(url, {
	                method: 'POST',
	                headers: {
	                    'Content-Type': 'application/json',
	                },
	                body: JSON.stringify(data),
	            }), TIMING.CONNECTION_TIMEOUT);
	            if (!response.ok) {
	                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	            }
	            return await response.json();
	        }
	        catch (error) {
	            if (error instanceof Error && error.message.includes('timed out')) {
	                throw createWidgetError(ERROR_CODES.CONNECTION_TIMEOUT, 'Request timed out');
	            }
	            throw createWidgetError(ERROR_CODES.CONNECTION_FAILED, `Request failed: ${error}`);
	        }
	    }
	    handleConnectionError() {
	        this.setConnectionStatus(ConnectionStatus.ERROR);
	        this.stopHeartbeat();
	        if (this.reconnectAttempt < this.config.reconnectAttempts) {
	            this.scheduleReconnect();
	        }
	        else {
	            this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
	            this.emit('error', createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Max reconnection attempts reached'));
	        }
	    }
	    scheduleReconnect() {
	        this.clearReconnectTimer();
	        this.setConnectionStatus(ConnectionStatus.RECONNECTING);
	        const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempt);
	        this.reconnectAttempt++;
	        console.warn(`Scheduling reconnect attempt ${this.reconnectAttempt} in ${delay}ms`);
	        this.reconnectTimer = setTimeout(() => {
	            this.connectSSE().catch(error => {
	                console.error('Reconnection attempt failed:', error);
	            });
	        }, delay);
	    }
	    clearReconnectTimer() {
	        if (this.reconnectTimer) {
	            clearTimeout(this.reconnectTimer);
	            this.reconnectTimer = null;
	        }
	    }
	    startHeartbeat() {
	        this.stopHeartbeat();
	        this.heartbeatTimer = setInterval(() => {
	            if (this.state.connectionStatus === ConnectionStatus.CONNECTED && this.eventSource) {
	                // Check if connection is still alive
	                if (this.eventSource.readyState !== EventSource.OPEN) {
	                    console.warn('SSE connection lost, attempting to reconnect');
	                    this.handleConnectionError();
	                }
	            }
	        }, TIMING.HEARTBEAT_INTERVAL);
	    }
	    stopHeartbeat() {
	        if (this.heartbeatTimer) {
	            clearInterval(this.heartbeatTimer);
	            this.heartbeatTimer = null;
	        }
	    }
	}

	/* [Multicall3](https://github.com/mds1/multicall) */
	const multicall3Abi = [
	    {
	        inputs: [
	            {
	                components: [
	                    {
	                        name: 'target',
	                        type: 'address',
	                    },
	                    {
	                        name: 'allowFailure',
	                        type: 'bool',
	                    },
	                    {
	                        name: 'callData',
	                        type: 'bytes',
	                    },
	                ],
	                name: 'calls',
	                type: 'tuple[]',
	            },
	        ],
	        name: 'aggregate3',
	        outputs: [
	            {
	                components: [
	                    {
	                        name: 'success',
	                        type: 'bool',
	                    },
	                    {
	                        name: 'returnData',
	                        type: 'bytes',
	                    },
	                ],
	                name: 'returnData',
	                type: 'tuple[]',
	            },
	        ],
	        stateMutability: 'view',
	        type: 'function',
	    },
	    {
	        inputs: [],
	        name: 'getCurrentBlockTimestamp',
	        outputs: [
	            {
	                internalType: 'uint256',
	                name: 'timestamp',
	                type: 'uint256',
	            },
	        ],
	        stateMutability: 'view',
	        type: 'function',
	    },
	];
	const batchGatewayAbi = [
	    {
	        name: 'query',
	        type: 'function',
	        stateMutability: 'view',
	        inputs: [
	            {
	                type: 'tuple[]',
	                name: 'queries',
	                components: [
	                    {
	                        type: 'address',
	                        name: 'sender',
	                    },
	                    {
	                        type: 'string[]',
	                        name: 'urls',
	                    },
	                    {
	                        type: 'bytes',
	                        name: 'data',
	                    },
	                ],
	            },
	        ],
	        outputs: [
	            {
	                type: 'bool[]',
	                name: 'failures',
	            },
	            {
	                type: 'bytes[]',
	                name: 'responses',
	            },
	        ],
	    },
	    {
	        name: 'HttpError',
	        type: 'error',
	        inputs: [
	            {
	                type: 'uint16',
	                name: 'status',
	            },
	            {
	                type: 'string',
	                name: 'message',
	            },
	        ],
	    },
	];

	function formatAbiItem$1(abiItem, { includeName = false } = {}) {
	    if (abiItem.type !== 'function' &&
	        abiItem.type !== 'event' &&
	        abiItem.type !== 'error')
	        throw new InvalidDefinitionTypeError(abiItem.type);
	    return `${abiItem.name}(${formatAbiParams(abiItem.inputs, { includeName })})`;
	}
	function formatAbiParams(params, { includeName = false } = {}) {
	    if (!params)
	        return '';
	    return params
	        .map((param) => formatAbiParam(param, { includeName }))
	        .join(includeName ? ', ' : ',');
	}
	function formatAbiParam(param, { includeName }) {
	    if (param.type.startsWith('tuple')) {
	        return `(${formatAbiParams(param.components, { includeName })})${param.type.slice('tuple'.length)}`;
	    }
	    return param.type + (includeName && param.name ? ` ${param.name}` : '');
	}

	function isHex(value, { strict = true } = {}) {
	    if (!value)
	        return false;
	    if (typeof value !== 'string')
	        return false;
	    return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith('0x');
	}

	/**
	 * @description Retrieves the size of the value (in bytes).
	 *
	 * @param value The value (hex or byte array) to retrieve the size of.
	 * @returns The size of the value (in bytes).
	 */
	function size$2(value) {
	    if (isHex(value, { strict: false }))
	        return Math.ceil((value.length - 2) / 2);
	    return value.length;
	}

	const version$3 = '2.38.6';

	let errorConfig = {
	    getDocsUrl: ({ docsBaseUrl, docsPath = '', docsSlug, }) => docsPath
	        ? `${docsBaseUrl ?? 'https://viem.sh'}${docsPath}${docsSlug ? `#${docsSlug}` : ''}`
	        : undefined,
	    version: `viem@${version$3}`,
	};
	let BaseError$3 = class BaseError extends Error {
	    constructor(shortMessage, args = {}) {
	        const details = (() => {
	            if (args.cause instanceof BaseError)
	                return args.cause.details;
	            if (args.cause?.message)
	                return args.cause.message;
	            return args.details;
	        })();
	        const docsPath = (() => {
	            if (args.cause instanceof BaseError)
	                return args.cause.docsPath || args.docsPath;
	            return args.docsPath;
	        })();
	        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
	        const message = [
	            shortMessage || 'An error occurred.',
	            '',
	            ...(args.metaMessages ? [...args.metaMessages, ''] : []),
	            ...(docsUrl ? [`Docs: ${docsUrl}`] : []),
	            ...(details ? [`Details: ${details}`] : []),
	            ...(errorConfig.version ? [`Version: ${errorConfig.version}`] : []),
	        ].join('\n');
	        super(message, args.cause ? { cause: args.cause } : undefined);
	        Object.defineProperty(this, "details", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "docsPath", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "metaMessages", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "shortMessage", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "version", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'BaseError'
	        });
	        this.details = details;
	        this.docsPath = docsPath;
	        this.metaMessages = args.metaMessages;
	        this.name = args.name ?? this.name;
	        this.shortMessage = shortMessage;
	        this.version = version$3;
	    }
	    walk(fn) {
	        return walk$1(this, fn);
	    }
	};
	function walk$1(err, fn) {
	    if (fn?.(err))
	        return err;
	    if (err &&
	        typeof err === 'object' &&
	        'cause' in err &&
	        err.cause !== undefined)
	        return walk$1(err.cause, fn);
	    return fn ? null : err;
	}

	class AbiConstructorNotFoundError extends BaseError$3 {
	    constructor({ docsPath }) {
	        super([
	            'A constructor was not found on the ABI.',
	            'Make sure you are using the correct ABI and that the constructor exists on it.',
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiConstructorNotFoundError',
	        });
	    }
	}
	class AbiConstructorParamsNotFoundError extends BaseError$3 {
	    constructor({ docsPath }) {
	        super([
	            'Constructor arguments were provided (`args`), but a constructor parameters (`inputs`) were not found on the ABI.',
	            'Make sure you are using the correct ABI, and that the `inputs` attribute on the constructor exists.',
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiConstructorParamsNotFoundError',
	        });
	    }
	}
	class AbiDecodingDataSizeTooSmallError extends BaseError$3 {
	    constructor({ data, params, size, }) {
	        super([`Data size of ${size} bytes is too small for given parameters.`].join('\n'), {
	            metaMessages: [
	                `Params: (${formatAbiParams(params, { includeName: true })})`,
	                `Data:   ${data} (${size} bytes)`,
	            ],
	            name: 'AbiDecodingDataSizeTooSmallError',
	        });
	        Object.defineProperty(this, "data", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "params", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "size", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.data = data;
	        this.params = params;
	        this.size = size;
	    }
	}
	class AbiDecodingZeroDataError extends BaseError$3 {
	    constructor() {
	        super('Cannot decode zero data ("0x") with ABI parameters.', {
	            name: 'AbiDecodingZeroDataError',
	        });
	    }
	}
	class AbiEncodingArrayLengthMismatchError extends BaseError$3 {
	    constructor({ expectedLength, givenLength, type, }) {
	        super([
	            `ABI encoding array length mismatch for type ${type}.`,
	            `Expected length: ${expectedLength}`,
	            `Given length: ${givenLength}`,
	        ].join('\n'), { name: 'AbiEncodingArrayLengthMismatchError' });
	    }
	}
	class AbiEncodingBytesSizeMismatchError extends BaseError$3 {
	    constructor({ expectedSize, value }) {
	        super(`Size of bytes "${value}" (bytes${size$2(value)}) does not match expected size (bytes${expectedSize}).`, { name: 'AbiEncodingBytesSizeMismatchError' });
	    }
	}
	class AbiEncodingLengthMismatchError extends BaseError$3 {
	    constructor({ expectedLength, givenLength, }) {
	        super([
	            'ABI encoding params/values length mismatch.',
	            `Expected length (params): ${expectedLength}`,
	            `Given length (values): ${givenLength}`,
	        ].join('\n'), { name: 'AbiEncodingLengthMismatchError' });
	    }
	}
	class AbiErrorInputsNotFoundError extends BaseError$3 {
	    constructor(errorName, { docsPath }) {
	        super([
	            `Arguments (\`args\`) were provided to "${errorName}", but "${errorName}" on the ABI does not contain any parameters (\`inputs\`).`,
	            'Cannot encode error result without knowing what the parameter types are.',
	            'Make sure you are using the correct ABI and that the inputs exist on it.',
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiErrorInputsNotFoundError',
	        });
	    }
	}
	class AbiErrorNotFoundError extends BaseError$3 {
	    constructor(errorName, { docsPath } = {}) {
	        super([
	            `Error ${errorName ? `"${errorName}" ` : ''}not found on ABI.`,
	            'Make sure you are using the correct ABI and that the error exists on it.',
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiErrorNotFoundError',
	        });
	    }
	}
	class AbiErrorSignatureNotFoundError extends BaseError$3 {
	    constructor(signature, { docsPath }) {
	        super([
	            `Encoded error signature "${signature}" not found on ABI.`,
	            'Make sure you are using the correct ABI and that the error exists on it.',
	            `You can look up the decoded signature here: https://openchain.xyz/signatures?query=${signature}.`,
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiErrorSignatureNotFoundError',
	        });
	        Object.defineProperty(this, "signature", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.signature = signature;
	    }
	}
	class AbiFunctionNotFoundError extends BaseError$3 {
	    constructor(functionName, { docsPath } = {}) {
	        super([
	            `Function ${functionName ? `"${functionName}" ` : ''}not found on ABI.`,
	            'Make sure you are using the correct ABI and that the function exists on it.',
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiFunctionNotFoundError',
	        });
	    }
	}
	class AbiFunctionOutputsNotFoundError extends BaseError$3 {
	    constructor(functionName, { docsPath }) {
	        super([
	            `Function "${functionName}" does not contain any \`outputs\` on ABI.`,
	            'Cannot decode function result without knowing what the parameter types are.',
	            'Make sure you are using the correct ABI and that the function exists on it.',
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiFunctionOutputsNotFoundError',
	        });
	    }
	}
	class AbiFunctionSignatureNotFoundError extends BaseError$3 {
	    constructor(signature, { docsPath }) {
	        super([
	            `Encoded function signature "${signature}" not found on ABI.`,
	            'Make sure you are using the correct ABI and that the function exists on it.',
	            `You can look up the signature here: https://openchain.xyz/signatures?query=${signature}.`,
	        ].join('\n'), {
	            docsPath,
	            name: 'AbiFunctionSignatureNotFoundError',
	        });
	    }
	}
	class AbiItemAmbiguityError extends BaseError$3 {
	    constructor(x, y) {
	        super('Found ambiguous types in overloaded ABI items.', {
	            metaMessages: [
	                `\`${x.type}\` in \`${formatAbiItem$1(x.abiItem)}\`, and`,
	                `\`${y.type}\` in \`${formatAbiItem$1(y.abiItem)}\``,
	                '',
	                'These types encode differently and cannot be distinguished at runtime.',
	                'Remove one of the ambiguous items in the ABI.',
	            ],
	            name: 'AbiItemAmbiguityError',
	        });
	    }
	}
	class InvalidAbiEncodingTypeError extends BaseError$3 {
	    constructor(type, { docsPath }) {
	        super([
	            `Type "${type}" is not a valid encoding type.`,
	            'Please provide a valid ABI type.',
	        ].join('\n'), { docsPath, name: 'InvalidAbiEncodingType' });
	    }
	}
	class InvalidAbiDecodingTypeError extends BaseError$3 {
	    constructor(type, { docsPath }) {
	        super([
	            `Type "${type}" is not a valid decoding type.`,
	            'Please provide a valid ABI type.',
	        ].join('\n'), { docsPath, name: 'InvalidAbiDecodingType' });
	    }
	}
	class InvalidArrayError extends BaseError$3 {
	    constructor(value) {
	        super([`Value "${value}" is not a valid array.`].join('\n'), {
	            name: 'InvalidArrayError',
	        });
	    }
	}
	class InvalidDefinitionTypeError extends BaseError$3 {
	    constructor(type) {
	        super([
	            `"${type}" is not a valid definition type.`,
	            'Valid types: "function", "event", "error"',
	        ].join('\n'), { name: 'InvalidDefinitionTypeError' });
	    }
	}

	class InvalidAddressError extends BaseError$3 {
	    constructor({ address }) {
	        super(`Address "${address}" is invalid.`, {
	            metaMessages: [
	                '- Address must be a hex value of 20 bytes (40 hex characters).',
	                '- Address must match its checksum counterpart.',
	            ],
	            name: 'InvalidAddressError',
	        });
	    }
	}

	class SliceOffsetOutOfBoundsError extends BaseError$3 {
	    constructor({ offset, position, size, }) {
	        super(`Slice ${position === 'start' ? 'starting' : 'ending'} at offset "${offset}" is out-of-bounds (size: ${size}).`, { name: 'SliceOffsetOutOfBoundsError' });
	    }
	}
	let SizeExceedsPaddingSizeError$1 = class SizeExceedsPaddingSizeError extends BaseError$3 {
	    constructor({ size, targetSize, type, }) {
	        super(`${type.charAt(0).toUpperCase()}${type
            .slice(1)
            .toLowerCase()} size (${size}) exceeds padding size (${targetSize}).`, { name: 'SizeExceedsPaddingSizeError' });
	    }
	};
	class InvalidBytesLengthError extends BaseError$3 {
	    constructor({ size, targetSize, type, }) {
	        super(`${type.charAt(0).toUpperCase()}${type
            .slice(1)
            .toLowerCase()} is expected to be ${targetSize} ${type} long, but is ${size} ${type} long.`, { name: 'InvalidBytesLengthError' });
	    }
	}

	function pad$1(hexOrBytes, { dir, size = 32 } = {}) {
	    if (typeof hexOrBytes === 'string')
	        return padHex(hexOrBytes, { dir, size });
	    return padBytes(hexOrBytes, { dir, size });
	}
	function padHex(hex_, { dir, size = 32 } = {}) {
	    if (size === null)
	        return hex_;
	    const hex = hex_.replace('0x', '');
	    if (hex.length > size * 2)
	        throw new SizeExceedsPaddingSizeError$1({
	            size: Math.ceil(hex.length / 2),
	            targetSize: size,
	            type: 'hex',
	        });
	    return `0x${hex[dir === 'right' ? 'padEnd' : 'padStart'](size * 2, '0')}`;
	}
	function padBytes(bytes, { dir, size = 32 } = {}) {
	    if (size === null)
	        return bytes;
	    if (bytes.length > size)
	        throw new SizeExceedsPaddingSizeError$1({
	            size: bytes.length,
	            targetSize: size,
	            type: 'bytes',
	        });
	    const paddedBytes = new Uint8Array(size);
	    for (let i = 0; i < size; i++) {
	        const padEnd = dir === 'right';
	        paddedBytes[padEnd ? i : size - i - 1] =
	            bytes[padEnd ? i : bytes.length - i - 1];
	    }
	    return paddedBytes;
	}

	let IntegerOutOfRangeError$1 = class IntegerOutOfRangeError extends BaseError$3 {
	    constructor({ max, min, signed, size, value, }) {
	        super(`Number "${value}" is not in safe ${size ? `${size * 8}-bit ${signed ? 'signed' : 'unsigned'} ` : ''}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: 'IntegerOutOfRangeError' });
	    }
	};
	class InvalidBytesBooleanError extends BaseError$3 {
	    constructor(bytes) {
	        super(`Bytes value "${bytes}" is not a valid boolean. The bytes array must contain a single byte of either a 0 or 1 value.`, {
	            name: 'InvalidBytesBooleanError',
	        });
	    }
	}
	class SizeOverflowError extends BaseError$3 {
	    constructor({ givenSize, maxSize }) {
	        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: 'SizeOverflowError' });
	    }
	}

	function trim(hexOrBytes, { dir = 'left' } = {}) {
	    let data = typeof hexOrBytes === 'string' ? hexOrBytes.replace('0x', '') : hexOrBytes;
	    let sliceLength = 0;
	    for (let i = 0; i < data.length - 1; i++) {
	        if (data[dir === 'left' ? i : data.length - i - 1].toString() === '0')
	            sliceLength++;
	        else
	            break;
	    }
	    data =
	        dir === 'left'
	            ? data.slice(sliceLength)
	            : data.slice(0, data.length - sliceLength);
	    if (typeof hexOrBytes === 'string') {
	        if (data.length === 1 && dir === 'right')
	            data = `${data}0`;
	        return `0x${data.length % 2 === 1 ? `0${data}` : data}`;
	    }
	    return data;
	}

	function assertSize(hexOrBytes, { size }) {
	    if (size$2(hexOrBytes) > size)
	        throw new SizeOverflowError({
	            givenSize: size$2(hexOrBytes),
	            maxSize: size,
	        });
	}
	/**
	 * Decodes a hex value into a bigint.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromHex#hextobigint
	 *
	 * @param hex Hex value to decode.
	 * @param opts Options.
	 * @returns BigInt value.
	 *
	 * @example
	 * import { hexToBigInt } from 'viem'
	 * const data = hexToBigInt('0x1a4', { signed: true })
	 * // 420n
	 *
	 * @example
	 * import { hexToBigInt } from 'viem'
	 * const data = hexToBigInt('0x00000000000000000000000000000000000000000000000000000000000001a4', { size: 32 })
	 * // 420n
	 */
	function hexToBigInt(hex, opts = {}) {
	    const { signed } = opts;
	    if (opts.size)
	        assertSize(hex, { size: opts.size });
	    const value = BigInt(hex);
	    if (!signed)
	        return value;
	    const size = (hex.length - 2) / 2;
	    const max = (1n << (BigInt(size) * 8n - 1n)) - 1n;
	    if (value <= max)
	        return value;
	    return value - BigInt(`0x${'f'.padStart(size * 2, 'f')}`) - 1n;
	}
	/**
	 * Decodes a hex string into a number.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromHex#hextonumber
	 *
	 * @param hex Hex value to decode.
	 * @param opts Options.
	 * @returns Number value.
	 *
	 * @example
	 * import { hexToNumber } from 'viem'
	 * const data = hexToNumber('0x1a4')
	 * // 420
	 *
	 * @example
	 * import { hexToNumber } from 'viem'
	 * const data = hexToBigInt('0x00000000000000000000000000000000000000000000000000000000000001a4', { size: 32 })
	 * // 420
	 */
	function hexToNumber$1(hex, opts = {}) {
	    return Number(hexToBigInt(hex, opts));
	}
	/**
	 * Decodes a hex value into a UTF-8 string.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromHex#hextostring
	 *
	 * @param hex Hex value to decode.
	 * @param opts Options.
	 * @returns String value.
	 *
	 * @example
	 * import { hexToString } from 'viem'
	 * const data = hexToString('0x48656c6c6f20576f726c6421')
	 * // 'Hello world!'
	 *
	 * @example
	 * import { hexToString } from 'viem'
	 * const data = hexToString('0x48656c6c6f20576f726c64210000000000000000000000000000000000000000', {
	 *  size: 32,
	 * })
	 * // 'Hello world'
	 */
	function hexToString(hex, opts = {}) {
	    let bytes = hexToBytes$1(hex);
	    if (opts.size) {
	        assertSize(bytes, { size: opts.size });
	        bytes = trim(bytes, { dir: 'right' });
	    }
	    return new TextDecoder().decode(bytes);
	}

	const hexes$1 = /*#__PURE__*/ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, '0'));
	/**
	 * Encodes a string, number, bigint, or ByteArray into a hex string
	 *
	 * - Docs: https://viem.sh/docs/utilities/toHex
	 * - Example: https://viem.sh/docs/utilities/toHex#usage
	 *
	 * @param value Value to encode.
	 * @param opts Options.
	 * @returns Hex value.
	 *
	 * @example
	 * import { toHex } from 'viem'
	 * const data = toHex('Hello world')
	 * // '0x48656c6c6f20776f726c6421'
	 *
	 * @example
	 * import { toHex } from 'viem'
	 * const data = toHex(420)
	 * // '0x1a4'
	 *
	 * @example
	 * import { toHex } from 'viem'
	 * const data = toHex('Hello world', { size: 32 })
	 * // '0x48656c6c6f20776f726c64210000000000000000000000000000000000000000'
	 */
	function toHex(value, opts = {}) {
	    if (typeof value === 'number' || typeof value === 'bigint')
	        return numberToHex(value, opts);
	    if (typeof value === 'string') {
	        return stringToHex(value, opts);
	    }
	    if (typeof value === 'boolean')
	        return boolToHex(value, opts);
	    return bytesToHex$1(value, opts);
	}
	/**
	 * Encodes a boolean into a hex string
	 *
	 * - Docs: https://viem.sh/docs/utilities/toHex#booltohex
	 *
	 * @param value Value to encode.
	 * @param opts Options.
	 * @returns Hex value.
	 *
	 * @example
	 * import { boolToHex } from 'viem'
	 * const data = boolToHex(true)
	 * // '0x1'
	 *
	 * @example
	 * import { boolToHex } from 'viem'
	 * const data = boolToHex(false)
	 * // '0x0'
	 *
	 * @example
	 * import { boolToHex } from 'viem'
	 * const data = boolToHex(true, { size: 32 })
	 * // '0x0000000000000000000000000000000000000000000000000000000000000001'
	 */
	function boolToHex(value, opts = {}) {
	    const hex = `0x${Number(value)}`;
	    if (typeof opts.size === 'number') {
	        assertSize(hex, { size: opts.size });
	        return pad$1(hex, { size: opts.size });
	    }
	    return hex;
	}
	/**
	 * Encodes a bytes array into a hex string
	 *
	 * - Docs: https://viem.sh/docs/utilities/toHex#bytestohex
	 *
	 * @param value Value to encode.
	 * @param opts Options.
	 * @returns Hex value.
	 *
	 * @example
	 * import { bytesToHex } from 'viem'
	 * const data = bytesToHex(Uint8Array.from([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
	 * // '0x48656c6c6f20576f726c6421'
	 *
	 * @example
	 * import { bytesToHex } from 'viem'
	 * const data = bytesToHex(Uint8Array.from([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]), { size: 32 })
	 * // '0x48656c6c6f20576f726c64210000000000000000000000000000000000000000'
	 */
	function bytesToHex$1(value, opts = {}) {
	    let string = '';
	    for (let i = 0; i < value.length; i++) {
	        string += hexes$1[value[i]];
	    }
	    const hex = `0x${string}`;
	    if (typeof opts.size === 'number') {
	        assertSize(hex, { size: opts.size });
	        return pad$1(hex, { dir: 'right', size: opts.size });
	    }
	    return hex;
	}
	/**
	 * Encodes a number or bigint into a hex string
	 *
	 * - Docs: https://viem.sh/docs/utilities/toHex#numbertohex
	 *
	 * @param value Value to encode.
	 * @param opts Options.
	 * @returns Hex value.
	 *
	 * @example
	 * import { numberToHex } from 'viem'
	 * const data = numberToHex(420)
	 * // '0x1a4'
	 *
	 * @example
	 * import { numberToHex } from 'viem'
	 * const data = numberToHex(420, { size: 32 })
	 * // '0x00000000000000000000000000000000000000000000000000000000000001a4'
	 */
	function numberToHex(value_, opts = {}) {
	    const { signed, size } = opts;
	    const value = BigInt(value_);
	    let maxValue;
	    if (size) {
	        if (signed)
	            maxValue = (1n << (BigInt(size) * 8n - 1n)) - 1n;
	        else
	            maxValue = 2n ** (BigInt(size) * 8n) - 1n;
	    }
	    else if (typeof value_ === 'number') {
	        maxValue = BigInt(Number.MAX_SAFE_INTEGER);
	    }
	    const minValue = typeof maxValue === 'bigint' && signed ? -maxValue - 1n : 0;
	    if ((maxValue && value > maxValue) || value < minValue) {
	        const suffix = typeof value_ === 'bigint' ? 'n' : '';
	        throw new IntegerOutOfRangeError$1({
	            max: maxValue ? `${maxValue}${suffix}` : undefined,
	            min: `${minValue}${suffix}`,
	            signed,
	            size,
	            value: `${value_}${suffix}`,
	        });
	    }
	    const hex = `0x${(signed && value < 0 ? (1n << BigInt(size * 8)) + BigInt(value) : value).toString(16)}`;
	    if (size)
	        return pad$1(hex, { size });
	    return hex;
	}
	const encoder$1 = /*#__PURE__*/ new TextEncoder();
	/**
	 * Encodes a UTF-8 string into a hex string
	 *
	 * - Docs: https://viem.sh/docs/utilities/toHex#stringtohex
	 *
	 * @param value Value to encode.
	 * @param opts Options.
	 * @returns Hex value.
	 *
	 * @example
	 * import { stringToHex } from 'viem'
	 * const data = stringToHex('Hello World!')
	 * // '0x48656c6c6f20576f726c6421'
	 *
	 * @example
	 * import { stringToHex } from 'viem'
	 * const data = stringToHex('Hello World!', { size: 32 })
	 * // '0x48656c6c6f20576f726c64210000000000000000000000000000000000000000'
	 */
	function stringToHex(value_, opts = {}) {
	    const value = encoder$1.encode(value_);
	    return bytesToHex$1(value, opts);
	}

	const encoder = /*#__PURE__*/ new TextEncoder();
	/**
	 * Encodes a UTF-8 string, hex value, bigint, number or boolean to a byte array.
	 *
	 * - Docs: https://viem.sh/docs/utilities/toBytes
	 * - Example: https://viem.sh/docs/utilities/toBytes#usage
	 *
	 * @param value Value to encode.
	 * @param opts Options.
	 * @returns Byte array value.
	 *
	 * @example
	 * import { toBytes } from 'viem'
	 * const data = toBytes('Hello world')
	 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
	 *
	 * @example
	 * import { toBytes } from 'viem'
	 * const data = toBytes(420)
	 * // Uint8Array([1, 164])
	 *
	 * @example
	 * import { toBytes } from 'viem'
	 * const data = toBytes(420, { size: 4 })
	 * // Uint8Array([0, 0, 1, 164])
	 */
	function toBytes$1(value, opts = {}) {
	    if (typeof value === 'number' || typeof value === 'bigint')
	        return numberToBytes(value, opts);
	    if (typeof value === 'boolean')
	        return boolToBytes(value, opts);
	    if (isHex(value))
	        return hexToBytes$1(value, opts);
	    return stringToBytes(value, opts);
	}
	/**
	 * Encodes a boolean into a byte array.
	 *
	 * - Docs: https://viem.sh/docs/utilities/toBytes#booltobytes
	 *
	 * @param value Boolean value to encode.
	 * @param opts Options.
	 * @returns Byte array value.
	 *
	 * @example
	 * import { boolToBytes } from 'viem'
	 * const data = boolToBytes(true)
	 * // Uint8Array([1])
	 *
	 * @example
	 * import { boolToBytes } from 'viem'
	 * const data = boolToBytes(true, { size: 32 })
	 * // Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
	 */
	function boolToBytes(value, opts = {}) {
	    const bytes = new Uint8Array(1);
	    bytes[0] = Number(value);
	    if (typeof opts.size === 'number') {
	        assertSize(bytes, { size: opts.size });
	        return pad$1(bytes, { size: opts.size });
	    }
	    return bytes;
	}
	// We use very optimized technique to convert hex string to byte array
	const charCodeMap = {
	    zero: 48,
	    nine: 57,
	    A: 65,
	    F: 70,
	    a: 97,
	    f: 102,
	};
	function charCodeToBase16(char) {
	    if (char >= charCodeMap.zero && char <= charCodeMap.nine)
	        return char - charCodeMap.zero;
	    if (char >= charCodeMap.A && char <= charCodeMap.F)
	        return char - (charCodeMap.A - 10);
	    if (char >= charCodeMap.a && char <= charCodeMap.f)
	        return char - (charCodeMap.a - 10);
	    return undefined;
	}
	/**
	 * Encodes a hex string into a byte array.
	 *
	 * - Docs: https://viem.sh/docs/utilities/toBytes#hextobytes
	 *
	 * @param hex Hex string to encode.
	 * @param opts Options.
	 * @returns Byte array value.
	 *
	 * @example
	 * import { hexToBytes } from 'viem'
	 * const data = hexToBytes('0x48656c6c6f20776f726c6421')
	 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
	 *
	 * @example
	 * import { hexToBytes } from 'viem'
	 * const data = hexToBytes('0x48656c6c6f20776f726c6421', { size: 32 })
	 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
	 */
	function hexToBytes$1(hex_, opts = {}) {
	    let hex = hex_;
	    if (opts.size) {
	        assertSize(hex, { size: opts.size });
	        hex = pad$1(hex, { dir: 'right', size: opts.size });
	    }
	    let hexString = hex.slice(2);
	    if (hexString.length % 2)
	        hexString = `0${hexString}`;
	    const length = hexString.length / 2;
	    const bytes = new Uint8Array(length);
	    for (let index = 0, j = 0; index < length; index++) {
	        const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
	        const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
	        if (nibbleLeft === undefined || nibbleRight === undefined) {
	            throw new BaseError$3(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
	        }
	        bytes[index] = nibbleLeft * 16 + nibbleRight;
	    }
	    return bytes;
	}
	/**
	 * Encodes a number into a byte array.
	 *
	 * - Docs: https://viem.sh/docs/utilities/toBytes#numbertobytes
	 *
	 * @param value Number to encode.
	 * @param opts Options.
	 * @returns Byte array value.
	 *
	 * @example
	 * import { numberToBytes } from 'viem'
	 * const data = numberToBytes(420)
	 * // Uint8Array([1, 164])
	 *
	 * @example
	 * import { numberToBytes } from 'viem'
	 * const data = numberToBytes(420, { size: 4 })
	 * // Uint8Array([0, 0, 1, 164])
	 */
	function numberToBytes(value, opts) {
	    const hex = numberToHex(value, opts);
	    return hexToBytes$1(hex);
	}
	/**
	 * Encodes a UTF-8 string into a byte array.
	 *
	 * - Docs: https://viem.sh/docs/utilities/toBytes#stringtobytes
	 *
	 * @param value String to encode.
	 * @param opts Options.
	 * @returns Byte array value.
	 *
	 * @example
	 * import { stringToBytes } from 'viem'
	 * const data = stringToBytes('Hello world!')
	 * // Uint8Array([72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 33])
	 *
	 * @example
	 * import { stringToBytes } from 'viem'
	 * const data = stringToBytes('Hello world!', { size: 32 })
	 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
	 */
	function stringToBytes(value, opts = {}) {
	    const bytes = encoder.encode(value);
	    if (typeof opts.size === 'number') {
	        assertSize(bytes, { size: opts.size });
	        return pad$1(bytes, { dir: 'right', size: opts.size });
	    }
	    return bytes;
	}

	/**
	 * Internal helpers for u64. BigUint64Array is too slow as per 2025, so we implement it using Uint32Array.
	 * @todo re-check https://issues.chromium.org/issues/42212588
	 * @module
	 */
	const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
	const _32n = /* @__PURE__ */ BigInt(32);
	function fromBig(n, le = false) {
	    if (le)
	        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
	    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
	}
	function split(lst, le = false) {
	    const len = lst.length;
	    let Ah = new Uint32Array(len);
	    let Al = new Uint32Array(len);
	    for (let i = 0; i < len; i++) {
	        const { h, l } = fromBig(lst[i], le);
	        [Ah[i], Al[i]] = [h, l];
	    }
	    return [Ah, Al];
	}
	// Left rotate for Shift in [1, 32)
	const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
	const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
	// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
	const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
	const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

	const crypto$1 = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;

	/**
	 * Utilities for hex, bytes, CSPRNG.
	 * @module
	 */
	/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
	// node.js versions earlier than v19 don't declare it in global scope.
	// For node.js, package.json#exports field mapping rewrites import
	// from `crypto` to `cryptoNode`, which imports native module.
	// Makes the utils un-importable in browsers without a bundler.
	// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
	/** Checks if something is Uint8Array. Be careful: nodejs Buffer will return true. */
	function isBytes$1(a) {
	    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
	}
	/** Asserts something is positive integer. */
	function anumber(n) {
	    if (!Number.isSafeInteger(n) || n < 0)
	        throw new Error('positive integer expected, got ' + n);
	}
	/** Asserts something is Uint8Array. */
	function abytes$1(b, ...lengths) {
	    if (!isBytes$1(b))
	        throw new Error('Uint8Array expected');
	    if (lengths.length > 0 && !lengths.includes(b.length))
	        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
	}
	/** Asserts something is hash */
	function ahash(h) {
	    if (typeof h !== 'function' || typeof h.create !== 'function')
	        throw new Error('Hash should be wrapped by utils.createHasher');
	    anumber(h.outputLen);
	    anumber(h.blockLen);
	}
	/** Asserts a hash instance has not been destroyed / finished */
	function aexists(instance, checkFinished = true) {
	    if (instance.destroyed)
	        throw new Error('Hash instance has been destroyed');
	    if (checkFinished && instance.finished)
	        throw new Error('Hash#digest() has already been called');
	}
	/** Asserts output is properly-sized byte array */
	function aoutput(out, instance) {
	    abytes$1(out);
	    const min = instance.outputLen;
	    if (out.length < min) {
	        throw new Error('digestInto() expects output buffer of length at least ' + min);
	    }
	}
	/** Cast u8 / u16 / u32 to u32. */
	function u32(arr) {
	    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
	}
	/** Zeroize a byte array. Warning: JS provides no guarantees. */
	function clean(...arrays) {
	    for (let i = 0; i < arrays.length; i++) {
	        arrays[i].fill(0);
	    }
	}
	/** Create DataView of an array for easy byte-level manipulation. */
	function createView(arr) {
	    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
	}
	/** The rotate right (circular right shift) operation for uint32 */
	function rotr(word, shift) {
	    return (word << (32 - shift)) | (word >>> shift);
	}
	/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
	const isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
	/** The byte swap operation for uint32 */
	function byteSwap(word) {
	    return (((word << 24) & 0xff000000) |
	        ((word << 8) & 0xff0000) |
	        ((word >>> 8) & 0xff00) |
	        ((word >>> 24) & 0xff));
	}
	/** In place byte swap for Uint32Array */
	function byteSwap32(arr) {
	    for (let i = 0; i < arr.length; i++) {
	        arr[i] = byteSwap(arr[i]);
	    }
	    return arr;
	}
	const swap32IfBE = isLE
	    ? (u) => u
	    : byteSwap32;
	/**
	 * Converts string to bytes using UTF8 encoding.
	 * @example utf8ToBytes('abc') // Uint8Array.from([97, 98, 99])
	 */
	function utf8ToBytes(str) {
	    if (typeof str !== 'string')
	        throw new Error('string expected');
	    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
	}
	/**
	 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
	 * Warning: when Uint8Array is passed, it would NOT get copied.
	 * Keep in mind for future mutable operations.
	 */
	function toBytes(data) {
	    if (typeof data === 'string')
	        data = utf8ToBytes(data);
	    abytes$1(data);
	    return data;
	}
	/** Copies several Uint8Arrays into one. */
	function concatBytes$2(...arrays) {
	    let sum = 0;
	    for (let i = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        abytes$1(a);
	        sum += a.length;
	    }
	    const res = new Uint8Array(sum);
	    for (let i = 0, pad = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        res.set(a, pad);
	        pad += a.length;
	    }
	    return res;
	}
	/** For runtime check if class implements interface */
	class Hash {
	}
	/** Wraps hash function, creating an interface on top of it */
	function createHasher(hashCons) {
	    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
	    const tmp = hashCons();
	    hashC.outputLen = tmp.outputLen;
	    hashC.blockLen = tmp.blockLen;
	    hashC.create = () => hashCons();
	    return hashC;
	}
	/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
	function randomBytes(bytesLength = 32) {
	    if (crypto$1 && typeof crypto$1.getRandomValues === 'function') {
	        return crypto$1.getRandomValues(new Uint8Array(bytesLength));
	    }
	    // Legacy Node.js compatibility
	    if (crypto$1 && typeof crypto$1.randomBytes === 'function') {
	        return Uint8Array.from(crypto$1.randomBytes(bytesLength));
	    }
	    throw new Error('crypto.getRandomValues must be defined');
	}

	/**
	 * SHA3 (keccak) hash function, based on a new "Sponge function" design.
	 * Different from older hashes, the internal state is bigger than output size.
	 *
	 * Check out [FIPS-202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf),
	 * [Website](https://keccak.team/keccak.html),
	 * [the differences between SHA-3 and Keccak](https://crypto.stackexchange.com/questions/15727/what-are-the-key-differences-between-the-draft-sha-3-standard-and-the-keccak-sub).
	 *
	 * Check out `sha3-addons` module for cSHAKE, k12, and others.
	 * @module
	 */
	// No __PURE__ annotations in sha3 header:
	// EVERYTHING is in fact used on every export.
	// Various per round constants calculations
	const _0n$5 = BigInt(0);
	const _1n$5 = BigInt(1);
	const _2n$2 = BigInt(2);
	const _7n = BigInt(7);
	const _256n = BigInt(256);
	const _0x71n = BigInt(0x71);
	const SHA3_PI = [];
	const SHA3_ROTL = [];
	const _SHA3_IOTA = [];
	for (let round = 0, R = _1n$5, x = 1, y = 0; round < 24; round++) {
	    // Pi
	    [x, y] = [y, (2 * x + 3 * y) % 5];
	    SHA3_PI.push(2 * (5 * y + x));
	    // Rotational
	    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
	    // Iota
	    let t = _0n$5;
	    for (let j = 0; j < 7; j++) {
	        R = ((R << _1n$5) ^ ((R >> _7n) * _0x71n)) % _256n;
	        if (R & _2n$2)
	            t ^= _1n$5 << ((_1n$5 << /* @__PURE__ */ BigInt(j)) - _1n$5);
	    }
	    _SHA3_IOTA.push(t);
	}
	const IOTAS = split(_SHA3_IOTA, true);
	const SHA3_IOTA_H = IOTAS[0];
	const SHA3_IOTA_L = IOTAS[1];
	// Left rotation (without 0, 32, 64)
	const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
	const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
	/** `keccakf1600` internal function, additionally allows to adjust round count. */
	function keccakP(s, rounds = 24) {
	    const B = new Uint32Array(5 * 2);
	    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
	    for (let round = 24 - rounds; round < 24; round++) {
	        // Theta θ
	        for (let x = 0; x < 10; x++)
	            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
	        for (let x = 0; x < 10; x += 2) {
	            const idx1 = (x + 8) % 10;
	            const idx0 = (x + 2) % 10;
	            const B0 = B[idx0];
	            const B1 = B[idx0 + 1];
	            const Th = rotlH(B0, B1, 1) ^ B[idx1];
	            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
	            for (let y = 0; y < 50; y += 10) {
	                s[x + y] ^= Th;
	                s[x + y + 1] ^= Tl;
	            }
	        }
	        // Rho (ρ) and Pi (π)
	        let curH = s[2];
	        let curL = s[3];
	        for (let t = 0; t < 24; t++) {
	            const shift = SHA3_ROTL[t];
	            const Th = rotlH(curH, curL, shift);
	            const Tl = rotlL(curH, curL, shift);
	            const PI = SHA3_PI[t];
	            curH = s[PI];
	            curL = s[PI + 1];
	            s[PI] = Th;
	            s[PI + 1] = Tl;
	        }
	        // Chi (χ)
	        for (let y = 0; y < 50; y += 10) {
	            for (let x = 0; x < 10; x++)
	                B[x] = s[y + x];
	            for (let x = 0; x < 10; x++)
	                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
	        }
	        // Iota (ι)
	        s[0] ^= SHA3_IOTA_H[round];
	        s[1] ^= SHA3_IOTA_L[round];
	    }
	    clean(B);
	}
	/** Keccak sponge function. */
	class Keccak extends Hash {
	    // NOTE: we accept arguments in bytes instead of bits here.
	    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
	        super();
	        this.pos = 0;
	        this.posOut = 0;
	        this.finished = false;
	        this.destroyed = false;
	        this.enableXOF = false;
	        this.blockLen = blockLen;
	        this.suffix = suffix;
	        this.outputLen = outputLen;
	        this.enableXOF = enableXOF;
	        this.rounds = rounds;
	        // Can be passed from user as dkLen
	        anumber(outputLen);
	        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
	        // 0 < blockLen < 200
	        if (!(0 < blockLen && blockLen < 200))
	            throw new Error('only keccak-f1600 function is supported');
	        this.state = new Uint8Array(200);
	        this.state32 = u32(this.state);
	    }
	    clone() {
	        return this._cloneInto();
	    }
	    keccak() {
	        swap32IfBE(this.state32);
	        keccakP(this.state32, this.rounds);
	        swap32IfBE(this.state32);
	        this.posOut = 0;
	        this.pos = 0;
	    }
	    update(data) {
	        aexists(this);
	        data = toBytes(data);
	        abytes$1(data);
	        const { blockLen, state } = this;
	        const len = data.length;
	        for (let pos = 0; pos < len;) {
	            const take = Math.min(blockLen - this.pos, len - pos);
	            for (let i = 0; i < take; i++)
	                state[this.pos++] ^= data[pos++];
	            if (this.pos === blockLen)
	                this.keccak();
	        }
	        return this;
	    }
	    finish() {
	        if (this.finished)
	            return;
	        this.finished = true;
	        const { state, suffix, pos, blockLen } = this;
	        // Do the padding
	        state[pos] ^= suffix;
	        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
	            this.keccak();
	        state[blockLen - 1] ^= 0x80;
	        this.keccak();
	    }
	    writeInto(out) {
	        aexists(this, false);
	        abytes$1(out);
	        this.finish();
	        const bufferOut = this.state;
	        const { blockLen } = this;
	        for (let pos = 0, len = out.length; pos < len;) {
	            if (this.posOut >= blockLen)
	                this.keccak();
	            const take = Math.min(blockLen - this.posOut, len - pos);
	            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
	            this.posOut += take;
	            pos += take;
	        }
	        return out;
	    }
	    xofInto(out) {
	        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
	        if (!this.enableXOF)
	            throw new Error('XOF is not possible for this instance');
	        return this.writeInto(out);
	    }
	    xof(bytes) {
	        anumber(bytes);
	        return this.xofInto(new Uint8Array(bytes));
	    }
	    digestInto(out) {
	        aoutput(out, this);
	        if (this.finished)
	            throw new Error('digest() was already called');
	        this.writeInto(out);
	        this.destroy();
	        return out;
	    }
	    digest() {
	        return this.digestInto(new Uint8Array(this.outputLen));
	    }
	    destroy() {
	        this.destroyed = true;
	        clean(this.state);
	    }
	    _cloneInto(to) {
	        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
	        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
	        to.state32.set(this.state32);
	        to.pos = this.pos;
	        to.posOut = this.posOut;
	        to.finished = this.finished;
	        to.rounds = rounds;
	        // Suffix can change in cSHAKE
	        to.suffix = suffix;
	        to.outputLen = outputLen;
	        to.enableXOF = enableXOF;
	        to.destroyed = this.destroyed;
	        return to;
	    }
	}
	const gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
	/** keccak-256 hash function. Different from SHA3-256. */
	const keccak_256 = /* @__PURE__ */ (() => gen(0x01, 136, 256 / 8))();

	function keccak256(value, to_) {
	    const to = to_ || 'hex';
	    const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes$1(value) : value);
	    if (to === 'bytes')
	        return bytes;
	    return toHex(bytes);
	}

	/**
	 * Map with a LRU (Least recently used) policy.
	 *
	 * @link https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU
	 */
	class LruMap extends Map {
	    constructor(size) {
	        super();
	        Object.defineProperty(this, "maxSize", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.maxSize = size;
	    }
	    get(key) {
	        const value = super.get(key);
	        if (super.has(key) && value !== undefined) {
	            this.delete(key);
	            super.set(key, value);
	        }
	        return value;
	    }
	    set(key, value) {
	        super.set(key, value);
	        if (this.maxSize && this.size > this.maxSize) {
	            const firstKey = this.keys().next().value;
	            if (firstKey)
	                this.delete(firstKey);
	        }
	        return this;
	    }
	}

	const addressRegex = /^0x[a-fA-F0-9]{40}$/;
	/** @internal */
	const isAddressCache = /*#__PURE__*/ new LruMap(8192);
	function isAddress(address, options) {
	    const { strict = true } = options ?? {};
	    const cacheKey = `${address}.${strict}`;
	    if (isAddressCache.has(cacheKey))
	        return isAddressCache.get(cacheKey);
	    const result = (() => {
	        if (!addressRegex.test(address))
	            return false;
	        if (address.toLowerCase() === address)
	            return true;
	        if (strict)
	            return checksumAddress(address) === address;
	        return true;
	    })();
	    isAddressCache.set(cacheKey, result);
	    return result;
	}

	const checksumAddressCache = /*#__PURE__*/ new LruMap(8192);
	function checksumAddress(address_, 
	/**
	 * Warning: EIP-1191 checksum addresses are generally not backwards compatible with the
	 * wider Ethereum ecosystem, meaning it will break when validated against an application/tool
	 * that relies on EIP-55 checksum encoding (checksum without chainId).
	 *
	 * It is highly recommended to not use this feature unless you
	 * know what you are doing.
	 *
	 * See more: https://github.com/ethereum/EIPs/issues/1121
	 */
	chainId) {
	    if (checksumAddressCache.has(`${address_}.${chainId}`))
	        return checksumAddressCache.get(`${address_}.${chainId}`);
	    const hexAddress = address_.substring(2).toLowerCase();
	    const hash = keccak256(stringToBytes(hexAddress), 'bytes');
	    const address = (hexAddress).split('');
	    for (let i = 0; i < 40; i += 2) {
	        if (hash[i >> 1] >> 4 >= 8 && address[i]) {
	            address[i] = address[i].toUpperCase();
	        }
	        if ((hash[i >> 1] & 0x0f) >= 8 && address[i + 1]) {
	            address[i + 1] = address[i + 1].toUpperCase();
	        }
	    }
	    const result = `0x${address.join('')}`;
	    checksumAddressCache.set(`${address_}.${chainId}`, result);
	    return result;
	}
	function getAddress(address, 
	/**
	 * Warning: EIP-1191 checksum addresses are generally not backwards compatible with the
	 * wider Ethereum ecosystem, meaning it will break when validated against an application/tool
	 * that relies on EIP-55 checksum encoding (checksum without chainId).
	 *
	 * It is highly recommended to not use this feature unless you
	 * know what you are doing.
	 *
	 * See more: https://github.com/ethereum/EIPs/issues/1121
	 */
	chainId) {
	    if (!isAddress(address, { strict: false }))
	        throw new InvalidAddressError({ address });
	    return checksumAddress(address, chainId);
	}

	class NegativeOffsetError extends BaseError$3 {
	    constructor({ offset }) {
	        super(`Offset \`${offset}\` cannot be negative.`, {
	            name: 'NegativeOffsetError',
	        });
	    }
	}
	class PositionOutOfBoundsError extends BaseError$3 {
	    constructor({ length, position }) {
	        super(`Position \`${position}\` is out of bounds (\`0 < position < ${length}\`).`, { name: 'PositionOutOfBoundsError' });
	    }
	}
	class RecursiveReadLimitExceededError extends BaseError$3 {
	    constructor({ count, limit }) {
	        super(`Recursive read limit of \`${limit}\` exceeded (recursive read count: \`${count}\`).`, { name: 'RecursiveReadLimitExceededError' });
	    }
	}

	const staticCursor = {
	    bytes: new Uint8Array(),
	    dataView: new DataView(new ArrayBuffer(0)),
	    position: 0,
	    positionReadCount: new Map(),
	    recursiveReadCount: 0,
	    recursiveReadLimit: Number.POSITIVE_INFINITY,
	    assertReadLimit() {
	        if (this.recursiveReadCount >= this.recursiveReadLimit)
	            throw new RecursiveReadLimitExceededError({
	                count: this.recursiveReadCount + 1,
	                limit: this.recursiveReadLimit,
	            });
	    },
	    assertPosition(position) {
	        if (position < 0 || position > this.bytes.length - 1)
	            throw new PositionOutOfBoundsError({
	                length: this.bytes.length,
	                position,
	            });
	    },
	    decrementPosition(offset) {
	        if (offset < 0)
	            throw new NegativeOffsetError({ offset });
	        const position = this.position - offset;
	        this.assertPosition(position);
	        this.position = position;
	    },
	    getReadCount(position) {
	        return this.positionReadCount.get(position || this.position) || 0;
	    },
	    incrementPosition(offset) {
	        if (offset < 0)
	            throw new NegativeOffsetError({ offset });
	        const position = this.position + offset;
	        this.assertPosition(position);
	        this.position = position;
	    },
	    inspectByte(position_) {
	        const position = position_ ?? this.position;
	        this.assertPosition(position);
	        return this.bytes[position];
	    },
	    inspectBytes(length, position_) {
	        const position = position_ ?? this.position;
	        this.assertPosition(position + length - 1);
	        return this.bytes.subarray(position, position + length);
	    },
	    inspectUint8(position_) {
	        const position = position_ ?? this.position;
	        this.assertPosition(position);
	        return this.bytes[position];
	    },
	    inspectUint16(position_) {
	        const position = position_ ?? this.position;
	        this.assertPosition(position + 1);
	        return this.dataView.getUint16(position);
	    },
	    inspectUint24(position_) {
	        const position = position_ ?? this.position;
	        this.assertPosition(position + 2);
	        return ((this.dataView.getUint16(position) << 8) +
	            this.dataView.getUint8(position + 2));
	    },
	    inspectUint32(position_) {
	        const position = position_ ?? this.position;
	        this.assertPosition(position + 3);
	        return this.dataView.getUint32(position);
	    },
	    pushByte(byte) {
	        this.assertPosition(this.position);
	        this.bytes[this.position] = byte;
	        this.position++;
	    },
	    pushBytes(bytes) {
	        this.assertPosition(this.position + bytes.length - 1);
	        this.bytes.set(bytes, this.position);
	        this.position += bytes.length;
	    },
	    pushUint8(value) {
	        this.assertPosition(this.position);
	        this.bytes[this.position] = value;
	        this.position++;
	    },
	    pushUint16(value) {
	        this.assertPosition(this.position + 1);
	        this.dataView.setUint16(this.position, value);
	        this.position += 2;
	    },
	    pushUint24(value) {
	        this.assertPosition(this.position + 2);
	        this.dataView.setUint16(this.position, value >> 8);
	        this.dataView.setUint8(this.position + 2, value & 255);
	        this.position += 3;
	    },
	    pushUint32(value) {
	        this.assertPosition(this.position + 3);
	        this.dataView.setUint32(this.position, value);
	        this.position += 4;
	    },
	    readByte() {
	        this.assertReadLimit();
	        this._touch();
	        const value = this.inspectByte();
	        this.position++;
	        return value;
	    },
	    readBytes(length, size) {
	        this.assertReadLimit();
	        this._touch();
	        const value = this.inspectBytes(length);
	        this.position += size ?? length;
	        return value;
	    },
	    readUint8() {
	        this.assertReadLimit();
	        this._touch();
	        const value = this.inspectUint8();
	        this.position += 1;
	        return value;
	    },
	    readUint16() {
	        this.assertReadLimit();
	        this._touch();
	        const value = this.inspectUint16();
	        this.position += 2;
	        return value;
	    },
	    readUint24() {
	        this.assertReadLimit();
	        this._touch();
	        const value = this.inspectUint24();
	        this.position += 3;
	        return value;
	    },
	    readUint32() {
	        this.assertReadLimit();
	        this._touch();
	        const value = this.inspectUint32();
	        this.position += 4;
	        return value;
	    },
	    get remaining() {
	        return this.bytes.length - this.position;
	    },
	    setPosition(position) {
	        const oldPosition = this.position;
	        this.assertPosition(position);
	        this.position = position;
	        return () => (this.position = oldPosition);
	    },
	    _touch() {
	        if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
	            return;
	        const count = this.getReadCount();
	        this.positionReadCount.set(this.position, count + 1);
	        if (count > 0)
	            this.recursiveReadCount++;
	    },
	};
	function createCursor(bytes, { recursiveReadLimit = 8_192 } = {}) {
	    const cursor = Object.create(staticCursor);
	    cursor.bytes = bytes;
	    cursor.dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	    cursor.positionReadCount = new Map();
	    cursor.recursiveReadLimit = recursiveReadLimit;
	    return cursor;
	}

	/**
	 * @description Returns a section of the hex or byte array given a start/end bytes offset.
	 *
	 * @param value The hex or byte array to slice.
	 * @param start The start offset (in bytes).
	 * @param end The end offset (in bytes).
	 */
	function slice(value, start, end, { strict } = {}) {
	    if (isHex(value, { strict: false }))
	        return sliceHex(value, start, end, {
	            strict,
	        });
	    return sliceBytes(value, start, end, {
	        strict,
	    });
	}
	function assertStartOffset(value, start) {
	    if (typeof start === 'number' && start > 0 && start > size$2(value) - 1)
	        throw new SliceOffsetOutOfBoundsError({
	            offset: start,
	            position: 'start',
	            size: size$2(value),
	        });
	}
	function assertEndOffset(value, start, end) {
	    if (typeof start === 'number' &&
	        typeof end === 'number' &&
	        size$2(value) !== end - start) {
	        throw new SliceOffsetOutOfBoundsError({
	            offset: end,
	            position: 'end',
	            size: size$2(value),
	        });
	    }
	}
	/**
	 * @description Returns a section of the byte array given a start/end bytes offset.
	 *
	 * @param value The byte array to slice.
	 * @param start The start offset (in bytes).
	 * @param end The end offset (in bytes).
	 */
	function sliceBytes(value_, start, end, { strict } = {}) {
	    assertStartOffset(value_, start);
	    const value = value_.slice(start, end);
	    if (strict)
	        assertEndOffset(value, start, end);
	    return value;
	}
	/**
	 * @description Returns a section of the hex value given a start/end bytes offset.
	 *
	 * @param value The hex value to slice.
	 * @param start The start offset (in bytes).
	 * @param end The end offset (in bytes).
	 */
	function sliceHex(value_, start, end, { strict } = {}) {
	    assertStartOffset(value_, start);
	    const value = `0x${value_
        .replace('0x', '')
        .slice((start ?? 0) * 2, (end ?? value_.length) * 2)}`;
	    if (strict)
	        assertEndOffset(value, start, end);
	    return value;
	}

	/**
	 * Decodes a byte array into a bigint.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromBytes#bytestobigint
	 *
	 * @param bytes Byte array to decode.
	 * @param opts Options.
	 * @returns BigInt value.
	 *
	 * @example
	 * import { bytesToBigInt } from 'viem'
	 * const data = bytesToBigInt(new Uint8Array([1, 164]))
	 * // 420n
	 */
	function bytesToBigInt(bytes, opts = {}) {
	    if (typeof opts.size !== 'undefined')
	        assertSize(bytes, { size: opts.size });
	    const hex = bytesToHex$1(bytes, opts);
	    return hexToBigInt(hex, opts);
	}
	/**
	 * Decodes a byte array into a boolean.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromBytes#bytestobool
	 *
	 * @param bytes Byte array to decode.
	 * @param opts Options.
	 * @returns Boolean value.
	 *
	 * @example
	 * import { bytesToBool } from 'viem'
	 * const data = bytesToBool(new Uint8Array([1]))
	 * // true
	 */
	function bytesToBool(bytes_, opts = {}) {
	    let bytes = bytes_;
	    if (typeof opts.size !== 'undefined') {
	        assertSize(bytes, { size: opts.size });
	        bytes = trim(bytes);
	    }
	    if (bytes.length > 1 || bytes[0] > 1)
	        throw new InvalidBytesBooleanError(bytes);
	    return Boolean(bytes[0]);
	}
	/**
	 * Decodes a byte array into a number.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromBytes#bytestonumber
	 *
	 * @param bytes Byte array to decode.
	 * @param opts Options.
	 * @returns Number value.
	 *
	 * @example
	 * import { bytesToNumber } from 'viem'
	 * const data = bytesToNumber(new Uint8Array([1, 164]))
	 * // 420
	 */
	function bytesToNumber(bytes, opts = {}) {
	    if (typeof opts.size !== 'undefined')
	        assertSize(bytes, { size: opts.size });
	    const hex = bytesToHex$1(bytes, opts);
	    return hexToNumber$1(hex, opts);
	}
	/**
	 * Decodes a byte array into a UTF-8 string.
	 *
	 * - Docs: https://viem.sh/docs/utilities/fromBytes#bytestostring
	 *
	 * @param bytes Byte array to decode.
	 * @param opts Options.
	 * @returns String value.
	 *
	 * @example
	 * import { bytesToString } from 'viem'
	 * const data = bytesToString(new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]))
	 * // 'Hello world'
	 */
	function bytesToString(bytes_, opts = {}) {
	    let bytes = bytes_;
	    if (typeof opts.size !== 'undefined') {
	        assertSize(bytes, { size: opts.size });
	        bytes = trim(bytes, { dir: 'right' });
	    }
	    return new TextDecoder().decode(bytes);
	}

	function concat(values) {
	    if (typeof values[0] === 'string')
	        return concatHex(values);
	    return concatBytes$1(values);
	}
	function concatBytes$1(values) {
	    let length = 0;
	    for (const arr of values) {
	        length += arr.length;
	    }
	    const result = new Uint8Array(length);
	    let offset = 0;
	    for (const arr of values) {
	        result.set(arr, offset);
	        offset += arr.length;
	    }
	    return result;
	}
	function concatHex(values) {
	    return `0x${values.reduce((acc, x) => acc + x.replace('0x', ''), '')}`;
	}

	// `(u)int<M>`: (un)signed integer type of `M` bits, `0 < M <= 256`, `M % 8 == 0`
	// https://regexr.com/6v8hp
	const integerRegex$1 = /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;

	/**
	 * @description Encodes a list of primitive values into an ABI-encoded hex value.
	 *
	 * - Docs: https://viem.sh/docs/abi/encodeAbiParameters#encodeabiparameters
	 *
	 *   Generates ABI encoded data using the [ABI specification](https://docs.soliditylang.org/en/latest/abi-spec), given a set of ABI parameters (inputs/outputs) and their corresponding values.
	 *
	 * @param params - a set of ABI Parameters (params), that can be in the shape of the inputs or outputs attribute of an ABI Item.
	 * @param values - a set of values (values) that correspond to the given params.
	 * @example
	 * ```typescript
	 * import { encodeAbiParameters } from 'viem'
	 *
	 * const encodedData = encodeAbiParameters(
	 *   [
	 *     { name: 'x', type: 'string' },
	 *     { name: 'y', type: 'uint' },
	 *     { name: 'z', type: 'bool' }
	 *   ],
	 *   ['wagmi', 420n, true]
	 * )
	 * ```
	 *
	 * You can also pass in Human Readable parameters with the parseAbiParameters utility.
	 *
	 * @example
	 * ```typescript
	 * import { encodeAbiParameters, parseAbiParameters } from 'viem'
	 *
	 * const encodedData = encodeAbiParameters(
	 *   parseAbiParameters('string x, uint y, bool z'),
	 *   ['wagmi', 420n, true]
	 * )
	 * ```
	 */
	function encodeAbiParameters(params, values) {
	    if (params.length !== values.length)
	        throw new AbiEncodingLengthMismatchError({
	            expectedLength: params.length,
	            givenLength: values.length,
	        });
	    // Prepare the parameters to determine dynamic types to encode.
	    const preparedParams = prepareParams({
	        params: params,
	        values: values,
	    });
	    const data = encodeParams(preparedParams);
	    if (data.length === 0)
	        return '0x';
	    return data;
	}
	function prepareParams({ params, values, }) {
	    const preparedParams = [];
	    for (let i = 0; i < params.length; i++) {
	        preparedParams.push(prepareParam({ param: params[i], value: values[i] }));
	    }
	    return preparedParams;
	}
	function prepareParam({ param, value, }) {
	    const arrayComponents = getArrayComponents(param.type);
	    if (arrayComponents) {
	        const [length, type] = arrayComponents;
	        return encodeArray(value, { length, param: { ...param, type } });
	    }
	    if (param.type === 'tuple') {
	        return encodeTuple(value, {
	            param: param,
	        });
	    }
	    if (param.type === 'address') {
	        return encodeAddress(value);
	    }
	    if (param.type === 'bool') {
	        return encodeBool(value);
	    }
	    if (param.type.startsWith('uint') || param.type.startsWith('int')) {
	        const signed = param.type.startsWith('int');
	        const [, , size = '256'] = integerRegex$1.exec(param.type) ?? [];
	        return encodeNumber(value, {
	            signed,
	            size: Number(size),
	        });
	    }
	    if (param.type.startsWith('bytes')) {
	        return encodeBytes(value, { param });
	    }
	    if (param.type === 'string') {
	        return encodeString(value);
	    }
	    throw new InvalidAbiEncodingTypeError(param.type, {
	        docsPath: '/docs/contract/encodeAbiParameters',
	    });
	}
	function encodeParams(preparedParams) {
	    // 1. Compute the size of the static part of the parameters.
	    let staticSize = 0;
	    for (let i = 0; i < preparedParams.length; i++) {
	        const { dynamic, encoded } = preparedParams[i];
	        if (dynamic)
	            staticSize += 32;
	        else
	            staticSize += size$2(encoded);
	    }
	    // 2. Split the parameters into static and dynamic parts.
	    const staticParams = [];
	    const dynamicParams = [];
	    let dynamicSize = 0;
	    for (let i = 0; i < preparedParams.length; i++) {
	        const { dynamic, encoded } = preparedParams[i];
	        if (dynamic) {
	            staticParams.push(numberToHex(staticSize + dynamicSize, { size: 32 }));
	            dynamicParams.push(encoded);
	            dynamicSize += size$2(encoded);
	        }
	        else {
	            staticParams.push(encoded);
	        }
	    }
	    // 3. Concatenate static and dynamic parts.
	    return concat([...staticParams, ...dynamicParams]);
	}
	function encodeAddress(value) {
	    if (!isAddress(value))
	        throw new InvalidAddressError({ address: value });
	    return { dynamic: false, encoded: padHex(value.toLowerCase()) };
	}
	function encodeArray(value, { length, param, }) {
	    const dynamic = length === null;
	    if (!Array.isArray(value))
	        throw new InvalidArrayError(value);
	    if (!dynamic && value.length !== length)
	        throw new AbiEncodingArrayLengthMismatchError({
	            expectedLength: length,
	            givenLength: value.length,
	            type: `${param.type}[${length}]`,
	        });
	    let dynamicChild = false;
	    const preparedParams = [];
	    for (let i = 0; i < value.length; i++) {
	        const preparedParam = prepareParam({ param, value: value[i] });
	        if (preparedParam.dynamic)
	            dynamicChild = true;
	        preparedParams.push(preparedParam);
	    }
	    if (dynamic || dynamicChild) {
	        const data = encodeParams(preparedParams);
	        if (dynamic) {
	            const length = numberToHex(preparedParams.length, { size: 32 });
	            return {
	                dynamic: true,
	                encoded: preparedParams.length > 0 ? concat([length, data]) : length,
	            };
	        }
	        if (dynamicChild)
	            return { dynamic: true, encoded: data };
	    }
	    return {
	        dynamic: false,
	        encoded: concat(preparedParams.map(({ encoded }) => encoded)),
	    };
	}
	function encodeBytes(value, { param }) {
	    const [, paramSize] = param.type.split('bytes');
	    const bytesSize = size$2(value);
	    if (!paramSize) {
	        let value_ = value;
	        // If the size is not divisible by 32 bytes, pad the end
	        // with empty bytes to the ceiling 32 bytes.
	        if (bytesSize % 32 !== 0)
	            value_ = padHex(value_, {
	                dir: 'right',
	                size: Math.ceil((value.length - 2) / 2 / 32) * 32,
	            });
	        return {
	            dynamic: true,
	            encoded: concat([padHex(numberToHex(bytesSize, { size: 32 })), value_]),
	        };
	    }
	    if (bytesSize !== Number.parseInt(paramSize, 10))
	        throw new AbiEncodingBytesSizeMismatchError({
	            expectedSize: Number.parseInt(paramSize, 10),
	            value,
	        });
	    return { dynamic: false, encoded: padHex(value, { dir: 'right' }) };
	}
	function encodeBool(value) {
	    if (typeof value !== 'boolean')
	        throw new BaseError$3(`Invalid boolean value: "${value}" (type: ${typeof value}). Expected: \`true\` or \`false\`.`);
	    return { dynamic: false, encoded: padHex(boolToHex(value)) };
	}
	function encodeNumber(value, { signed, size = 256 }) {
	    if (typeof size === 'number') {
	        const max = 2n ** (BigInt(size) - (signed ? 1n : 0n)) - 1n;
	        const min = signed ? -max - 1n : 0n;
	        if (value > max || value < min)
	            throw new IntegerOutOfRangeError$1({
	                max: max.toString(),
	                min: min.toString(),
	                signed,
	                size: size / 8,
	                value: value.toString(),
	            });
	    }
	    return {
	        dynamic: false,
	        encoded: numberToHex(value, {
	            size: 32,
	            signed,
	        }),
	    };
	}
	function encodeString(value) {
	    const hexValue = stringToHex(value);
	    const partsLength = Math.ceil(size$2(hexValue) / 32);
	    const parts = [];
	    for (let i = 0; i < partsLength; i++) {
	        parts.push(padHex(slice(hexValue, i * 32, (i + 1) * 32), {
	            dir: 'right',
	        }));
	    }
	    return {
	        dynamic: true,
	        encoded: concat([
	            padHex(numberToHex(size$2(hexValue), { size: 32 })),
	            ...parts,
	        ]),
	    };
	}
	function encodeTuple(value, { param }) {
	    let dynamic = false;
	    const preparedParams = [];
	    for (let i = 0; i < param.components.length; i++) {
	        const param_ = param.components[i];
	        const index = Array.isArray(value) ? i : param_.name;
	        const preparedParam = prepareParam({
	            param: param_,
	            value: value[index],
	        });
	        preparedParams.push(preparedParam);
	        if (preparedParam.dynamic)
	            dynamic = true;
	    }
	    return {
	        dynamic,
	        encoded: dynamic
	            ? encodeParams(preparedParams)
	            : concat(preparedParams.map(({ encoded }) => encoded)),
	    };
	}
	function getArrayComponents(type) {
	    const matches = type.match(/^(.*)\[(\d+)?\]$/);
	    return matches
	        ? // Return `null` if the array is dynamic.
	            [matches[2] ? Number(matches[2]) : null, matches[1]]
	        : undefined;
	}

	function decodeAbiParameters(params, data) {
	    const bytes = typeof data === 'string' ? hexToBytes$1(data) : data;
	    const cursor = createCursor(bytes);
	    if (size$2(bytes) === 0 && params.length > 0)
	        throw new AbiDecodingZeroDataError();
	    if (size$2(data) && size$2(data) < 32)
	        throw new AbiDecodingDataSizeTooSmallError({
	            data: typeof data === 'string' ? data : bytesToHex$1(data),
	            params: params,
	            size: size$2(data),
	        });
	    let consumed = 0;
	    const values = [];
	    for (let i = 0; i < params.length; ++i) {
	        const param = params[i];
	        cursor.setPosition(consumed);
	        const [data, consumed_] = decodeParameter(cursor, param, {
	            staticPosition: 0,
	        });
	        consumed += consumed_;
	        values.push(data);
	    }
	    return values;
	}
	function decodeParameter(cursor, param, { staticPosition }) {
	    const arrayComponents = getArrayComponents(param.type);
	    if (arrayComponents) {
	        const [length, type] = arrayComponents;
	        return decodeArray(cursor, { ...param, type }, { length, staticPosition });
	    }
	    if (param.type === 'tuple')
	        return decodeTuple(cursor, param, { staticPosition });
	    if (param.type === 'address')
	        return decodeAddress(cursor);
	    if (param.type === 'bool')
	        return decodeBool(cursor);
	    if (param.type.startsWith('bytes'))
	        return decodeBytes(cursor, param, { staticPosition });
	    if (param.type.startsWith('uint') || param.type.startsWith('int'))
	        return decodeNumber(cursor, param);
	    if (param.type === 'string')
	        return decodeString(cursor, { staticPosition });
	    throw new InvalidAbiDecodingTypeError(param.type, {
	        docsPath: '/docs/contract/decodeAbiParameters',
	    });
	}
	////////////////////////////////////////////////////////////////////
	// Type Decoders
	const sizeOfLength = 32;
	const sizeOfOffset = 32;
	function decodeAddress(cursor) {
	    const value = cursor.readBytes(32);
	    return [checksumAddress(bytesToHex$1(sliceBytes(value, -20))), 32];
	}
	function decodeArray(cursor, param, { length, staticPosition }) {
	    // If the length of the array is not known in advance (dynamic array),
	    // this means we will need to wonder off to the pointer and decode.
	    if (!length) {
	        // Dealing with a dynamic type, so get the offset of the array data.
	        const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
	        // Start is the static position of current slot + offset.
	        const start = staticPosition + offset;
	        const startOfData = start + sizeOfLength;
	        // Get the length of the array from the offset.
	        cursor.setPosition(start);
	        const length = bytesToNumber(cursor.readBytes(sizeOfLength));
	        // Check if the array has any dynamic children.
	        const dynamicChild = hasDynamicChild(param);
	        let consumed = 0;
	        const value = [];
	        for (let i = 0; i < length; ++i) {
	            // If any of the children is dynamic, then all elements will be offset pointer, thus size of one slot (32 bytes).
	            // Otherwise, elements will be the size of their encoding (consumed bytes).
	            cursor.setPosition(startOfData + (dynamicChild ? i * 32 : consumed));
	            const [data, consumed_] = decodeParameter(cursor, param, {
	                staticPosition: startOfData,
	            });
	            consumed += consumed_;
	            value.push(data);
	        }
	        // As we have gone wondering, restore to the original position + next slot.
	        cursor.setPosition(staticPosition + 32);
	        return [value, 32];
	    }
	    // If the length of the array is known in advance,
	    // and the length of an element deeply nested in the array is not known,
	    // we need to decode the offset of the array data.
	    if (hasDynamicChild(param)) {
	        // Dealing with dynamic types, so get the offset of the array data.
	        const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
	        // Start is the static position of current slot + offset.
	        const start = staticPosition + offset;
	        const value = [];
	        for (let i = 0; i < length; ++i) {
	            // Move cursor along to the next slot (next offset pointer).
	            cursor.setPosition(start + i * 32);
	            const [data] = decodeParameter(cursor, param, {
	                staticPosition: start,
	            });
	            value.push(data);
	        }
	        // As we have gone wondering, restore to the original position + next slot.
	        cursor.setPosition(staticPosition + 32);
	        return [value, 32];
	    }
	    // If the length of the array is known in advance and the array is deeply static,
	    // then we can just decode each element in sequence.
	    let consumed = 0;
	    const value = [];
	    for (let i = 0; i < length; ++i) {
	        const [data, consumed_] = decodeParameter(cursor, param, {
	            staticPosition: staticPosition + consumed,
	        });
	        consumed += consumed_;
	        value.push(data);
	    }
	    return [value, consumed];
	}
	function decodeBool(cursor) {
	    return [bytesToBool(cursor.readBytes(32), { size: 32 }), 32];
	}
	function decodeBytes(cursor, param, { staticPosition }) {
	    const [_, size] = param.type.split('bytes');
	    if (!size) {
	        // Dealing with dynamic types, so get the offset of the bytes data.
	        const offset = bytesToNumber(cursor.readBytes(32));
	        // Set position of the cursor to start of bytes data.
	        cursor.setPosition(staticPosition + offset);
	        const length = bytesToNumber(cursor.readBytes(32));
	        // If there is no length, we have zero data.
	        if (length === 0) {
	            // As we have gone wondering, restore to the original position + next slot.
	            cursor.setPosition(staticPosition + 32);
	            return ['0x', 32];
	        }
	        const data = cursor.readBytes(length);
	        // As we have gone wondering, restore to the original position + next slot.
	        cursor.setPosition(staticPosition + 32);
	        return [bytesToHex$1(data), 32];
	    }
	    const value = bytesToHex$1(cursor.readBytes(Number.parseInt(size, 10), 32));
	    return [value, 32];
	}
	function decodeNumber(cursor, param) {
	    const signed = param.type.startsWith('int');
	    const size = Number.parseInt(param.type.split('int')[1] || '256', 10);
	    const value = cursor.readBytes(32);
	    return [
	        size > 48
	            ? bytesToBigInt(value, { signed })
	            : bytesToNumber(value, { signed }),
	        32,
	    ];
	}
	function decodeTuple(cursor, param, { staticPosition }) {
	    // Tuples can have unnamed components (i.e. they are arrays), so we must
	    // determine whether the tuple is named or unnamed. In the case of a named
	    // tuple, the value will be an object where each property is the name of the
	    // component. In the case of an unnamed tuple, the value will be an array.
	    const hasUnnamedChild = param.components.length === 0 || param.components.some(({ name }) => !name);
	    // Initialize the value to an object or an array, depending on whether the
	    // tuple is named or unnamed.
	    const value = hasUnnamedChild ? [] : {};
	    let consumed = 0;
	    // If the tuple has a dynamic child, we must first decode the offset to the
	    // tuple data.
	    if (hasDynamicChild(param)) {
	        // Dealing with dynamic types, so get the offset of the tuple data.
	        const offset = bytesToNumber(cursor.readBytes(sizeOfOffset));
	        // Start is the static position of referencing slot + offset.
	        const start = staticPosition + offset;
	        for (let i = 0; i < param.components.length; ++i) {
	            const component = param.components[i];
	            cursor.setPosition(start + consumed);
	            const [data, consumed_] = decodeParameter(cursor, component, {
	                staticPosition: start,
	            });
	            consumed += consumed_;
	            value[hasUnnamedChild ? i : component?.name] = data;
	        }
	        // As we have gone wondering, restore to the original position + next slot.
	        cursor.setPosition(staticPosition + 32);
	        return [value, 32];
	    }
	    // If the tuple has static children, we can just decode each component
	    // in sequence.
	    for (let i = 0; i < param.components.length; ++i) {
	        const component = param.components[i];
	        const [data, consumed_] = decodeParameter(cursor, component, {
	            staticPosition,
	        });
	        value[hasUnnamedChild ? i : component?.name] = data;
	        consumed += consumed_;
	    }
	    return [value, consumed];
	}
	function decodeString(cursor, { staticPosition }) {
	    // Get offset to start of string data.
	    const offset = bytesToNumber(cursor.readBytes(32));
	    // Start is the static position of current slot + offset.
	    const start = staticPosition + offset;
	    cursor.setPosition(start);
	    const length = bytesToNumber(cursor.readBytes(32));
	    // If there is no length, we have zero data (empty string).
	    if (length === 0) {
	        cursor.setPosition(staticPosition + 32);
	        return ['', 32];
	    }
	    const data = cursor.readBytes(length, 32);
	    const value = bytesToString(trim(data));
	    // As we have gone wondering, restore to the original position + next slot.
	    cursor.setPosition(staticPosition + 32);
	    return [value, 32];
	}
	function hasDynamicChild(param) {
	    const { type } = param;
	    if (type === 'string')
	        return true;
	    if (type === 'bytes')
	        return true;
	    if (type.endsWith('[]'))
	        return true;
	    if (type === 'tuple')
	        return param.components?.some(hasDynamicChild);
	    const arrayComponents = getArrayComponents(param.type);
	    if (arrayComponents &&
	        hasDynamicChild({ ...param, type: arrayComponents[1] }))
	        return true;
	    return false;
	}

	const hash = (value) => keccak256(toBytes$1(value));
	function hashSignature(sig) {
	    return hash(sig);
	}

	const version$2 = '1.1.0';

	let BaseError$2 = class BaseError extends Error {
	    constructor(shortMessage, args = {}) {
	        const details = args.cause instanceof BaseError
	            ? args.cause.details
	            : args.cause?.message
	                ? args.cause.message
	                : args.details;
	        const docsPath = args.cause instanceof BaseError
	            ? args.cause.docsPath || args.docsPath
	            : args.docsPath;
	        const message = [
	            shortMessage || 'An error occurred.',
	            '',
	            ...(args.metaMessages ? [...args.metaMessages, ''] : []),
	            ...(docsPath ? [`Docs: https://abitype.dev${docsPath}`] : []),
	            ...(details ? [`Details: ${details}`] : []),
	            `Version: abitype@${version$2}`,
	        ].join('\n');
	        super(message);
	        Object.defineProperty(this, "details", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "docsPath", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "metaMessages", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "shortMessage", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'AbiTypeError'
	        });
	        if (args.cause)
	            this.cause = args.cause;
	        this.details = details;
	        this.docsPath = docsPath;
	        this.metaMessages = args.metaMessages;
	        this.shortMessage = shortMessage;
	    }
	};

	// TODO: This looks cool. Need to check the performance of `new RegExp` versus defined inline though.
	// https://twitter.com/GabrielVergnaud/status/1622906834343366657
	function execTyped(regex, string) {
	    const match = regex.exec(string);
	    return match?.groups;
	}
	// `bytes<M>`: binary type of `M` bytes, `0 < M <= 32`
	// https://regexr.com/6va55
	const bytesRegex = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/;
	// `(u)int<M>`: (un)signed integer type of `M` bits, `0 < M <= 256`, `M % 8 == 0`
	// https://regexr.com/6v8hp
	const integerRegex = /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
	const isTupleRegex = /^\(.+?\).*?$/;

	// https://regexr.com/7f7rv
	const tupleRegex = /^tuple(?<array>(\[(\d*)\])*)$/;
	/**
	 * Formats {@link AbiParameter} to human-readable ABI parameter.
	 *
	 * @param abiParameter - ABI parameter
	 * @returns Human-readable ABI parameter
	 *
	 * @example
	 * const result = formatAbiParameter({ type: 'address', name: 'from' })
	 * //    ^? const result: 'address from'
	 */
	function formatAbiParameter(abiParameter) {
	    let type = abiParameter.type;
	    if (tupleRegex.test(abiParameter.type) && 'components' in abiParameter) {
	        type = '(';
	        const length = abiParameter.components.length;
	        for (let i = 0; i < length; i++) {
	            const component = abiParameter.components[i];
	            type += formatAbiParameter(component);
	            if (i < length - 1)
	                type += ', ';
	        }
	        const result = execTyped(tupleRegex, abiParameter.type);
	        type += `)${result?.array ?? ''}`;
	        return formatAbiParameter({
	            ...abiParameter,
	            type,
	        });
	    }
	    // Add `indexed` to type if in `abiParameter`
	    if ('indexed' in abiParameter && abiParameter.indexed)
	        type = `${type} indexed`;
	    // Return human-readable ABI parameter
	    if (abiParameter.name)
	        return `${type} ${abiParameter.name}`;
	    return type;
	}

	/**
	 * Formats {@link AbiParameter}s to human-readable ABI parameters.
	 *
	 * @param abiParameters - ABI parameters
	 * @returns Human-readable ABI parameters
	 *
	 * @example
	 * const result = formatAbiParameters([
	 *   //  ^? const result: 'address from, uint256 tokenId'
	 *   { type: 'address', name: 'from' },
	 *   { type: 'uint256', name: 'tokenId' },
	 * ])
	 */
	function formatAbiParameters(abiParameters) {
	    let params = '';
	    const length = abiParameters.length;
	    for (let i = 0; i < length; i++) {
	        const abiParameter = abiParameters[i];
	        params += formatAbiParameter(abiParameter);
	        if (i !== length - 1)
	            params += ', ';
	    }
	    return params;
	}

	/**
	 * Formats ABI item (e.g. error, event, function) into human-readable ABI item
	 *
	 * @param abiItem - ABI item
	 * @returns Human-readable ABI item
	 */
	function formatAbiItem(abiItem) {
	    if (abiItem.type === 'function')
	        return `function ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})${abiItem.stateMutability && abiItem.stateMutability !== 'nonpayable'
            ? ` ${abiItem.stateMutability}`
            : ''}${abiItem.outputs?.length
            ? ` returns (${formatAbiParameters(abiItem.outputs)})`
            : ''}`;
	    if (abiItem.type === 'event')
	        return `event ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})`;
	    if (abiItem.type === 'error')
	        return `error ${abiItem.name}(${formatAbiParameters(abiItem.inputs)})`;
	    if (abiItem.type === 'constructor')
	        return `constructor(${formatAbiParameters(abiItem.inputs)})${abiItem.stateMutability === 'payable' ? ' payable' : ''}`;
	    if (abiItem.type === 'fallback')
	        return `fallback() external${abiItem.stateMutability === 'payable' ? ' payable' : ''}`;
	    return 'receive() external payable';
	}

	// https://regexr.com/7gmok
	const errorSignatureRegex = /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
	function isErrorSignature(signature) {
	    return errorSignatureRegex.test(signature);
	}
	function execErrorSignature(signature) {
	    return execTyped(errorSignatureRegex, signature);
	}
	// https://regexr.com/7gmoq
	const eventSignatureRegex = /^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
	function isEventSignature(signature) {
	    return eventSignatureRegex.test(signature);
	}
	function execEventSignature(signature) {
	    return execTyped(eventSignatureRegex, signature);
	}
	// https://regexr.com/7gmot
	const functionSignatureRegex = /^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;
	function isFunctionSignature(signature) {
	    return functionSignatureRegex.test(signature);
	}
	function execFunctionSignature(signature) {
	    return execTyped(functionSignatureRegex, signature);
	}
	// https://regexr.com/7gmp3
	const structSignatureRegex = /^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;
	function isStructSignature(signature) {
	    return structSignatureRegex.test(signature);
	}
	function execStructSignature(signature) {
	    return execTyped(structSignatureRegex, signature);
	}
	// https://regexr.com/78u01
	const constructorSignatureRegex = /^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;
	function isConstructorSignature(signature) {
	    return constructorSignatureRegex.test(signature);
	}
	function execConstructorSignature(signature) {
	    return execTyped(constructorSignatureRegex, signature);
	}
	// https://regexr.com/7srtn
	const fallbackSignatureRegex = /^fallback\(\) external(?:\s(?<stateMutability>payable{1}))?$/;
	function isFallbackSignature(signature) {
	    return fallbackSignatureRegex.test(signature);
	}
	function execFallbackSignature(signature) {
	    return execTyped(fallbackSignatureRegex, signature);
	}
	// https://regexr.com/78u1k
	const receiveSignatureRegex = /^receive\(\) external payable$/;
	function isReceiveSignature(signature) {
	    return receiveSignatureRegex.test(signature);
	}
	const eventModifiers = new Set(['indexed']);
	const functionModifiers = new Set([
	    'calldata',
	    'memory',
	    'storage',
	]);

	class UnknownTypeError extends BaseError$2 {
	    constructor({ type }) {
	        super('Unknown type.', {
	            metaMessages: [
	                `Type "${type}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`,
	            ],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'UnknownTypeError'
	        });
	    }
	}
	class UnknownSolidityTypeError extends BaseError$2 {
	    constructor({ type }) {
	        super('Unknown type.', {
	            metaMessages: [`Type "${type}" is not a valid ABI type.`],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'UnknownSolidityTypeError'
	        });
	    }
	}

	class InvalidParameterError extends BaseError$2 {
	    constructor({ param }) {
	        super('Invalid ABI parameter.', {
	            details: param,
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidParameterError'
	        });
	    }
	}
	class SolidityProtectedKeywordError extends BaseError$2 {
	    constructor({ param, name }) {
	        super('Invalid ABI parameter.', {
	            details: param,
	            metaMessages: [
	                `"${name}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`,
	            ],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'SolidityProtectedKeywordError'
	        });
	    }
	}
	class InvalidModifierError extends BaseError$2 {
	    constructor({ param, type, modifier, }) {
	        super('Invalid ABI parameter.', {
	            details: param,
	            metaMessages: [
	                `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ''}.`,
	            ],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidModifierError'
	        });
	    }
	}
	class InvalidFunctionModifierError extends BaseError$2 {
	    constructor({ param, type, modifier, }) {
	        super('Invalid ABI parameter.', {
	            details: param,
	            metaMessages: [
	                `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ''}.`,
	                `Data location can only be specified for array, struct, or mapping types, but "${modifier}" was given.`,
	            ],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidFunctionModifierError'
	        });
	    }
	}
	class InvalidAbiTypeParameterError extends BaseError$2 {
	    constructor({ abiParameter, }) {
	        super('Invalid ABI parameter.', {
	            details: JSON.stringify(abiParameter, null, 2),
	            metaMessages: ['ABI parameter type is invalid.'],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidAbiTypeParameterError'
	        });
	    }
	}

	class InvalidSignatureError extends BaseError$2 {
	    constructor({ signature, type, }) {
	        super(`Invalid ${type} signature.`, {
	            details: signature,
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidSignatureError'
	        });
	    }
	}
	class UnknownSignatureError extends BaseError$2 {
	    constructor({ signature }) {
	        super('Unknown signature.', {
	            details: signature,
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'UnknownSignatureError'
	        });
	    }
	}
	class InvalidStructSignatureError extends BaseError$2 {
	    constructor({ signature }) {
	        super('Invalid struct signature.', {
	            details: signature,
	            metaMessages: ['No properties exist.'],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidStructSignatureError'
	        });
	    }
	}

	class CircularReferenceError extends BaseError$2 {
	    constructor({ type }) {
	        super('Circular reference detected.', {
	            metaMessages: [`Struct "${type}" is a circular reference.`],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'CircularReferenceError'
	        });
	    }
	}

	class InvalidParenthesisError extends BaseError$2 {
	    constructor({ current, depth }) {
	        super('Unbalanced parentheses.', {
	            metaMessages: [
	                `"${current.trim()}" has too many ${depth > 0 ? 'opening' : 'closing'} parentheses.`,
	            ],
	            details: `Depth "${depth}"`,
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'InvalidParenthesisError'
	        });
	    }
	}

	/**
	 * Gets {@link parameterCache} cache key namespaced by {@link type}. This prevents parameters from being accessible to types that don't allow them (e.g. `string indexed foo` not allowed outside of `type: 'event'`).
	 * @param param ABI parameter string
	 * @param type ABI parameter type
	 * @returns Cache key for {@link parameterCache}
	 */
	function getParameterCacheKey(param, type, structs) {
	    let structKey = '';
	    if (structs)
	        for (const struct of Object.entries(structs)) {
	            if (!struct)
	                continue;
	            let propertyKey = '';
	            for (const property of struct[1]) {
	                propertyKey += `[${property.type}${property.name ? `:${property.name}` : ''}]`;
	            }
	            structKey += `(${struct[0]}{${propertyKey}})`;
	        }
	    if (type)
	        return `${type}:${param}${structKey}`;
	    return param;
	}
	/**
	 * Basic cache seeded with common ABI parameter strings.
	 *
	 * **Note: When seeding more parameters, make sure you benchmark performance. The current number is the ideal balance between performance and having an already existing cache.**
	 */
	const parameterCache = new Map([
	    // Unnamed
	    ['address', { type: 'address' }],
	    ['bool', { type: 'bool' }],
	    ['bytes', { type: 'bytes' }],
	    ['bytes32', { type: 'bytes32' }],
	    ['int', { type: 'int256' }],
	    ['int256', { type: 'int256' }],
	    ['string', { type: 'string' }],
	    ['uint', { type: 'uint256' }],
	    ['uint8', { type: 'uint8' }],
	    ['uint16', { type: 'uint16' }],
	    ['uint24', { type: 'uint24' }],
	    ['uint32', { type: 'uint32' }],
	    ['uint64', { type: 'uint64' }],
	    ['uint96', { type: 'uint96' }],
	    ['uint112', { type: 'uint112' }],
	    ['uint160', { type: 'uint160' }],
	    ['uint192', { type: 'uint192' }],
	    ['uint256', { type: 'uint256' }],
	    // Named
	    ['address owner', { type: 'address', name: 'owner' }],
	    ['address to', { type: 'address', name: 'to' }],
	    ['bool approved', { type: 'bool', name: 'approved' }],
	    ['bytes _data', { type: 'bytes', name: '_data' }],
	    ['bytes data', { type: 'bytes', name: 'data' }],
	    ['bytes signature', { type: 'bytes', name: 'signature' }],
	    ['bytes32 hash', { type: 'bytes32', name: 'hash' }],
	    ['bytes32 r', { type: 'bytes32', name: 'r' }],
	    ['bytes32 root', { type: 'bytes32', name: 'root' }],
	    ['bytes32 s', { type: 'bytes32', name: 's' }],
	    ['string name', { type: 'string', name: 'name' }],
	    ['string symbol', { type: 'string', name: 'symbol' }],
	    ['string tokenURI', { type: 'string', name: 'tokenURI' }],
	    ['uint tokenId', { type: 'uint256', name: 'tokenId' }],
	    ['uint8 v', { type: 'uint8', name: 'v' }],
	    ['uint256 balance', { type: 'uint256', name: 'balance' }],
	    ['uint256 tokenId', { type: 'uint256', name: 'tokenId' }],
	    ['uint256 value', { type: 'uint256', name: 'value' }],
	    // Indexed
	    [
	        'event:address indexed from',
	        { type: 'address', name: 'from', indexed: true },
	    ],
	    ['event:address indexed to', { type: 'address', name: 'to', indexed: true }],
	    [
	        'event:uint indexed tokenId',
	        { type: 'uint256', name: 'tokenId', indexed: true },
	    ],
	    [
	        'event:uint256 indexed tokenId',
	        { type: 'uint256', name: 'tokenId', indexed: true },
	    ],
	]);

	function parseSignature(signature, structs = {}) {
	    if (isFunctionSignature(signature))
	        return parseFunctionSignature(signature, structs);
	    if (isEventSignature(signature))
	        return parseEventSignature(signature, structs);
	    if (isErrorSignature(signature))
	        return parseErrorSignature(signature, structs);
	    if (isConstructorSignature(signature))
	        return parseConstructorSignature(signature, structs);
	    if (isFallbackSignature(signature))
	        return parseFallbackSignature(signature);
	    if (isReceiveSignature(signature))
	        return {
	            type: 'receive',
	            stateMutability: 'payable',
	        };
	    throw new UnknownSignatureError({ signature });
	}
	function parseFunctionSignature(signature, structs = {}) {
	    const match = execFunctionSignature(signature);
	    if (!match)
	        throw new InvalidSignatureError({ signature, type: 'function' });
	    const inputParams = splitParameters(match.parameters);
	    const inputs = [];
	    const inputLength = inputParams.length;
	    for (let i = 0; i < inputLength; i++) {
	        inputs.push(parseAbiParameter(inputParams[i], {
	            modifiers: functionModifiers,
	            structs,
	            type: 'function',
	        }));
	    }
	    const outputs = [];
	    if (match.returns) {
	        const outputParams = splitParameters(match.returns);
	        const outputLength = outputParams.length;
	        for (let i = 0; i < outputLength; i++) {
	            outputs.push(parseAbiParameter(outputParams[i], {
	                modifiers: functionModifiers,
	                structs,
	                type: 'function',
	            }));
	        }
	    }
	    return {
	        name: match.name,
	        type: 'function',
	        stateMutability: match.stateMutability ?? 'nonpayable',
	        inputs,
	        outputs,
	    };
	}
	function parseEventSignature(signature, structs = {}) {
	    const match = execEventSignature(signature);
	    if (!match)
	        throw new InvalidSignatureError({ signature, type: 'event' });
	    const params = splitParameters(match.parameters);
	    const abiParameters = [];
	    const length = params.length;
	    for (let i = 0; i < length; i++)
	        abiParameters.push(parseAbiParameter(params[i], {
	            modifiers: eventModifiers,
	            structs,
	            type: 'event',
	        }));
	    return { name: match.name, type: 'event', inputs: abiParameters };
	}
	function parseErrorSignature(signature, structs = {}) {
	    const match = execErrorSignature(signature);
	    if (!match)
	        throw new InvalidSignatureError({ signature, type: 'error' });
	    const params = splitParameters(match.parameters);
	    const abiParameters = [];
	    const length = params.length;
	    for (let i = 0; i < length; i++)
	        abiParameters.push(parseAbiParameter(params[i], { structs, type: 'error' }));
	    return { name: match.name, type: 'error', inputs: abiParameters };
	}
	function parseConstructorSignature(signature, structs = {}) {
	    const match = execConstructorSignature(signature);
	    if (!match)
	        throw new InvalidSignatureError({ signature, type: 'constructor' });
	    const params = splitParameters(match.parameters);
	    const abiParameters = [];
	    const length = params.length;
	    for (let i = 0; i < length; i++)
	        abiParameters.push(parseAbiParameter(params[i], { structs, type: 'constructor' }));
	    return {
	        type: 'constructor',
	        stateMutability: match.stateMutability ?? 'nonpayable',
	        inputs: abiParameters,
	    };
	}
	function parseFallbackSignature(signature) {
	    const match = execFallbackSignature(signature);
	    if (!match)
	        throw new InvalidSignatureError({ signature, type: 'fallback' });
	    return {
	        type: 'fallback',
	        stateMutability: match.stateMutability ?? 'nonpayable',
	    };
	}
	const abiParameterWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*(?:\spayable)?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
	const abiParameterWithTupleRegex = /^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
	const dynamicIntegerRegex = /^u?int$/;
	function parseAbiParameter(param, options) {
	    // optional namespace cache by `type`
	    const parameterCacheKey = getParameterCacheKey(param, options?.type, options?.structs);
	    if (parameterCache.has(parameterCacheKey))
	        return parameterCache.get(parameterCacheKey);
	    const isTuple = isTupleRegex.test(param);
	    const match = execTyped(isTuple ? abiParameterWithTupleRegex : abiParameterWithoutTupleRegex, param);
	    if (!match)
	        throw new InvalidParameterError({ param });
	    if (match.name && isSolidityKeyword(match.name))
	        throw new SolidityProtectedKeywordError({ param, name: match.name });
	    const name = match.name ? { name: match.name } : {};
	    const indexed = match.modifier === 'indexed' ? { indexed: true } : {};
	    const structs = options?.structs ?? {};
	    let type;
	    let components = {};
	    if (isTuple) {
	        type = 'tuple';
	        const params = splitParameters(match.type);
	        const components_ = [];
	        const length = params.length;
	        for (let i = 0; i < length; i++) {
	            // remove `modifiers` from `options` to prevent from being added to tuple components
	            components_.push(parseAbiParameter(params[i], { structs }));
	        }
	        components = { components: components_ };
	    }
	    else if (match.type in structs) {
	        type = 'tuple';
	        components = { components: structs[match.type] };
	    }
	    else if (dynamicIntegerRegex.test(match.type)) {
	        type = `${match.type}256`;
	    }
	    else if (match.type === 'address payable') {
	        type = 'address';
	    }
	    else {
	        type = match.type;
	        if (!(options?.type === 'struct') && !isSolidityType(type))
	            throw new UnknownSolidityTypeError({ type });
	    }
	    if (match.modifier) {
	        // Check if modifier exists, but is not allowed (e.g. `indexed` in `functionModifiers`)
	        if (!options?.modifiers?.has?.(match.modifier))
	            throw new InvalidModifierError({
	                param,
	                type: options?.type,
	                modifier: match.modifier,
	            });
	        // Check if resolved `type` is valid if there is a function modifier
	        if (functionModifiers.has(match.modifier) &&
	            !isValidDataLocation(type, !!match.array))
	            throw new InvalidFunctionModifierError({
	                param,
	                type: options?.type,
	                modifier: match.modifier,
	            });
	    }
	    const abiParameter = {
	        type: `${type}${match.array ?? ''}`,
	        ...name,
	        ...indexed,
	        ...components,
	    };
	    parameterCache.set(parameterCacheKey, abiParameter);
	    return abiParameter;
	}
	// s/o latika for this
	function splitParameters(params, result = [], current = '', depth = 0) {
	    const length = params.trim().length;
	    // biome-ignore lint/correctness/noUnreachable: recursive
	    for (let i = 0; i < length; i++) {
	        const char = params[i];
	        const tail = params.slice(i + 1);
	        switch (char) {
	            case ',':
	                return depth === 0
	                    ? splitParameters(tail, [...result, current.trim()])
	                    : splitParameters(tail, result, `${current}${char}`, depth);
	            case '(':
	                return splitParameters(tail, result, `${current}${char}`, depth + 1);
	            case ')':
	                return splitParameters(tail, result, `${current}${char}`, depth - 1);
	            default:
	                return splitParameters(tail, result, `${current}${char}`, depth);
	        }
	    }
	    if (current === '')
	        return result;
	    if (depth !== 0)
	        throw new InvalidParenthesisError({ current, depth });
	    result.push(current.trim());
	    return result;
	}
	function isSolidityType(type) {
	    return (type === 'address' ||
	        type === 'bool' ||
	        type === 'function' ||
	        type === 'string' ||
	        bytesRegex.test(type) ||
	        integerRegex.test(type));
	}
	const protectedKeywordsRegex = /^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;
	/** @internal */
	function isSolidityKeyword(name) {
	    return (name === 'address' ||
	        name === 'bool' ||
	        name === 'function' ||
	        name === 'string' ||
	        name === 'tuple' ||
	        bytesRegex.test(name) ||
	        integerRegex.test(name) ||
	        protectedKeywordsRegex.test(name));
	}
	/** @internal */
	function isValidDataLocation(type, isArray) {
	    return isArray || type === 'bytes' || type === 'string' || type === 'tuple';
	}

	function parseStructs(signatures) {
	    // Create "shallow" version of each struct (and filter out non-structs or invalid structs)
	    const shallowStructs = {};
	    const signaturesLength = signatures.length;
	    for (let i = 0; i < signaturesLength; i++) {
	        const signature = signatures[i];
	        if (!isStructSignature(signature))
	            continue;
	        const match = execStructSignature(signature);
	        if (!match)
	            throw new InvalidSignatureError({ signature, type: 'struct' });
	        const properties = match.properties.split(';');
	        const components = [];
	        const propertiesLength = properties.length;
	        for (let k = 0; k < propertiesLength; k++) {
	            const property = properties[k];
	            const trimmed = property.trim();
	            if (!trimmed)
	                continue;
	            const abiParameter = parseAbiParameter(trimmed, {
	                type: 'struct',
	            });
	            components.push(abiParameter);
	        }
	        if (!components.length)
	            throw new InvalidStructSignatureError({ signature });
	        shallowStructs[match.name] = components;
	    }
	    // Resolve nested structs inside each parameter
	    const resolvedStructs = {};
	    const entries = Object.entries(shallowStructs);
	    const entriesLength = entries.length;
	    for (let i = 0; i < entriesLength; i++) {
	        const [name, parameters] = entries[i];
	        resolvedStructs[name] = resolveStructs(parameters, shallowStructs);
	    }
	    return resolvedStructs;
	}
	const typeWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*)(?<array>(?:\[\d*?\])+?)?$/;
	function resolveStructs(abiParameters, structs, ancestors = new Set()) {
	    const components = [];
	    const length = abiParameters.length;
	    for (let i = 0; i < length; i++) {
	        const abiParameter = abiParameters[i];
	        const isTuple = isTupleRegex.test(abiParameter.type);
	        if (isTuple)
	            components.push(abiParameter);
	        else {
	            const match = execTyped(typeWithoutTupleRegex, abiParameter.type);
	            if (!match?.type)
	                throw new InvalidAbiTypeParameterError({ abiParameter });
	            const { array, type } = match;
	            if (type in structs) {
	                if (ancestors.has(type))
	                    throw new CircularReferenceError({ type });
	                components.push({
	                    ...abiParameter,
	                    type: `tuple${array ?? ''}`,
	                    components: resolveStructs(structs[type] ?? [], structs, new Set([...ancestors, type])),
	                });
	            }
	            else {
	                if (isSolidityType(type))
	                    components.push(abiParameter);
	                else
	                    throw new UnknownTypeError({ type });
	            }
	        }
	    }
	    return components;
	}

	/**
	 * Parses human-readable ABI into JSON {@link Abi}
	 *
	 * @param signatures - Human-Readable ABI
	 * @returns Parsed {@link Abi}
	 *
	 * @example
	 * const abi = parseAbi([
	 *   //  ^? const abi: readonly [{ name: "balanceOf"; type: "function"; stateMutability:...
	 *   'function balanceOf(address owner) view returns (uint256)',
	 *   'event Transfer(address indexed from, address indexed to, uint256 amount)',
	 * ])
	 */
	function parseAbi(signatures) {
	    const structs = parseStructs(signatures);
	    const abi = [];
	    const length = signatures.length;
	    for (let i = 0; i < length; i++) {
	        const signature = signatures[i];
	        if (isStructSignature(signature))
	            continue;
	        abi.push(parseSignature(signature, structs));
	    }
	    return abi;
	}

	function normalizeSignature(signature) {
	    let active = true;
	    let current = '';
	    let level = 0;
	    let result = '';
	    let valid = false;
	    for (let i = 0; i < signature.length; i++) {
	        const char = signature[i];
	        // If the character is a separator, we want to reactivate.
	        if (['(', ')', ','].includes(char))
	            active = true;
	        // If the character is a "level" token, we want to increment/decrement.
	        if (char === '(')
	            level++;
	        if (char === ')')
	            level--;
	        // If we aren't active, we don't want to mutate the result.
	        if (!active)
	            continue;
	        // If level === 0, we are at the definition level.
	        if (level === 0) {
	            if (char === ' ' && ['event', 'function', ''].includes(result))
	                result = '';
	            else {
	                result += char;
	                // If we are at the end of the definition, we must be finished.
	                if (char === ')') {
	                    valid = true;
	                    break;
	                }
	            }
	            continue;
	        }
	        // Ignore spaces
	        if (char === ' ') {
	            // If the previous character is a separator, and the current section isn't empty, we want to deactivate.
	            if (signature[i - 1] !== ',' && current !== ',' && current !== ',(') {
	                current = '';
	                active = false;
	            }
	            continue;
	        }
	        result += char;
	        current += char;
	    }
	    if (!valid)
	        throw new BaseError$3('Unable to normalize signature.');
	    return result;
	}

	/**
	 * Returns the signature for a given function or event definition.
	 *
	 * @example
	 * const signature = toSignature('function ownerOf(uint256 tokenId)')
	 * // 'ownerOf(uint256)'
	 *
	 * @example
	 * const signature_3 = toSignature({
	 *   name: 'ownerOf',
	 *   type: 'function',
	 *   inputs: [{ name: 'tokenId', type: 'uint256' }],
	 *   outputs: [],
	 *   stateMutability: 'view',
	 * })
	 * // 'ownerOf(uint256)'
	 */
	const toSignature = (def) => {
	    const def_ = (() => {
	        if (typeof def === 'string')
	            return def;
	        return formatAbiItem(def);
	    })();
	    return normalizeSignature(def_);
	};

	/**
	 * Returns the hash (of the function/event signature) for a given event or function definition.
	 */
	function toSignatureHash(fn) {
	    return hashSignature(toSignature(fn));
	}

	/**
	 * Returns the event selector for a given event definition.
	 *
	 * @example
	 * const selector = toEventSelector('Transfer(address indexed from, address indexed to, uint256 amount)')
	 * // 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
	 */
	const toEventSelector = toSignatureHash;

	/**
	 * Returns the function selector for a given function definition.
	 *
	 * @example
	 * const selector = toFunctionSelector('function ownerOf(uint256 tokenId)')
	 * // 0x6352211e
	 */
	const toFunctionSelector = (fn) => slice(toSignatureHash(fn), 0, 4);

	function getAbiItem(parameters) {
	    const { abi, args = [], name } = parameters;
	    const isSelector = isHex(name, { strict: false });
	    const abiItems = abi.filter((abiItem) => {
	        if (isSelector) {
	            if (abiItem.type === 'function')
	                return toFunctionSelector(abiItem) === name;
	            if (abiItem.type === 'event')
	                return toEventSelector(abiItem) === name;
	            return false;
	        }
	        return 'name' in abiItem && abiItem.name === name;
	    });
	    if (abiItems.length === 0)
	        return undefined;
	    if (abiItems.length === 1)
	        return abiItems[0];
	    let matchedAbiItem;
	    for (const abiItem of abiItems) {
	        if (!('inputs' in abiItem))
	            continue;
	        if (!args || args.length === 0) {
	            if (!abiItem.inputs || abiItem.inputs.length === 0)
	                return abiItem;
	            continue;
	        }
	        if (!abiItem.inputs)
	            continue;
	        if (abiItem.inputs.length === 0)
	            continue;
	        if (abiItem.inputs.length !== args.length)
	            continue;
	        const matched = args.every((arg, index) => {
	            const abiParameter = 'inputs' in abiItem && abiItem.inputs[index];
	            if (!abiParameter)
	                return false;
	            return isArgOfType(arg, abiParameter);
	        });
	        if (matched) {
	            // Check for ambiguity against already matched parameters (e.g. `address` vs `bytes20`).
	            if (matchedAbiItem &&
	                'inputs' in matchedAbiItem &&
	                matchedAbiItem.inputs) {
	                const ambiguousTypes = getAmbiguousTypes(abiItem.inputs, matchedAbiItem.inputs, args);
	                if (ambiguousTypes)
	                    throw new AbiItemAmbiguityError({
	                        abiItem,
	                        type: ambiguousTypes[0],
	                    }, {
	                        abiItem: matchedAbiItem,
	                        type: ambiguousTypes[1],
	                    });
	            }
	            matchedAbiItem = abiItem;
	        }
	    }
	    if (matchedAbiItem)
	        return matchedAbiItem;
	    return abiItems[0];
	}
	/** @internal */
	function isArgOfType(arg, abiParameter) {
	    const argType = typeof arg;
	    const abiParameterType = abiParameter.type;
	    switch (abiParameterType) {
	        case 'address':
	            return isAddress(arg, { strict: false });
	        case 'bool':
	            return argType === 'boolean';
	        case 'function':
	            return argType === 'string';
	        case 'string':
	            return argType === 'string';
	        default: {
	            if (abiParameterType === 'tuple' && 'components' in abiParameter)
	                return Object.values(abiParameter.components).every((component, index) => {
	                    return isArgOfType(Object.values(arg)[index], component);
	                });
	            // `(u)int<M>`: (un)signed integer type of `M` bits, `0 < M <= 256`, `M % 8 == 0`
	            // https://regexr.com/6v8hp
	            if (/^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(abiParameterType))
	                return argType === 'number' || argType === 'bigint';
	            // `bytes<M>`: binary type of `M` bytes, `0 < M <= 32`
	            // https://regexr.com/6va55
	            if (/^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/.test(abiParameterType))
	                return argType === 'string' || arg instanceof Uint8Array;
	            // fixed-length (`<type>[M]`) and dynamic (`<type>[]`) arrays
	            // https://regexr.com/6va6i
	            if (/[a-z]+[1-9]{0,3}(\[[0-9]{0,}\])+$/.test(abiParameterType)) {
	                return (Array.isArray(arg) &&
	                    arg.every((x) => isArgOfType(x, {
	                        ...abiParameter,
	                        // Pop off `[]` or `[M]` from end of type
	                        type: abiParameterType.replace(/(\[[0-9]{0,}\])$/, ''),
	                    })));
	            }
	            return false;
	        }
	    }
	}
	/** @internal */
	function getAmbiguousTypes(sourceParameters, targetParameters, args) {
	    for (const parameterIndex in sourceParameters) {
	        const sourceParameter = sourceParameters[parameterIndex];
	        const targetParameter = targetParameters[parameterIndex];
	        if (sourceParameter.type === 'tuple' &&
	            targetParameter.type === 'tuple' &&
	            'components' in sourceParameter &&
	            'components' in targetParameter)
	            return getAmbiguousTypes(sourceParameter.components, targetParameter.components, args[parameterIndex]);
	        const types = [sourceParameter.type, targetParameter.type];
	        const ambiguous = (() => {
	            if (types.includes('address') && types.includes('bytes20'))
	                return true;
	            if (types.includes('address') && types.includes('string'))
	                return isAddress(args[parameterIndex], { strict: false });
	            if (types.includes('address') && types.includes('bytes'))
	                return isAddress(args[parameterIndex], { strict: false });
	            return false;
	        })();
	        if (ambiguous)
	            return types;
	    }
	    return;
	}

	const docsPath$4 = '/docs/contract/decodeFunctionResult';
	function decodeFunctionResult(parameters) {
	    const { abi, args, functionName, data } = parameters;
	    let abiItem = abi[0];
	    if (functionName) {
	        const item = getAbiItem({ abi, args, name: functionName });
	        if (!item)
	            throw new AbiFunctionNotFoundError(functionName, { docsPath: docsPath$4 });
	        abiItem = item;
	    }
	    if (abiItem.type !== 'function')
	        throw new AbiFunctionNotFoundError(undefined, { docsPath: docsPath$4 });
	    if (!abiItem.outputs)
	        throw new AbiFunctionOutputsNotFoundError(abiItem.name, { docsPath: docsPath$4 });
	    const values = decodeAbiParameters(abiItem.outputs, data);
	    if (values && values.length > 1)
	        return values;
	    if (values && values.length === 1)
	        return values[0];
	    return undefined;
	}

	const docsPath$3 = '/docs/contract/encodeFunctionData';
	function prepareEncodeFunctionData(parameters) {
	    const { abi, args, functionName } = parameters;
	    let abiItem = abi[0];
	    if (functionName) {
	        const item = getAbiItem({
	            abi,
	            args,
	            name: functionName,
	        });
	        if (!item)
	            throw new AbiFunctionNotFoundError(functionName, { docsPath: docsPath$3 });
	        abiItem = item;
	    }
	    if (abiItem.type !== 'function')
	        throw new AbiFunctionNotFoundError(undefined, { docsPath: docsPath$3 });
	    return {
	        abi: [abiItem],
	        functionName: toFunctionSelector(formatAbiItem$1(abiItem)),
	    };
	}

	function encodeFunctionData(parameters) {
	    const { args } = parameters;
	    const { abi, functionName } = (() => {
	        if (parameters.abi.length === 1 &&
	            parameters.functionName?.startsWith('0x'))
	            return parameters;
	        return prepareEncodeFunctionData(parameters);
	    })();
	    const abiItem = abi[0];
	    const signature = functionName;
	    const data = 'inputs' in abiItem && abiItem.inputs
	        ? encodeAbiParameters(abiItem.inputs, args ?? [])
	        : undefined;
	    return concatHex([signature, data ?? '0x']);
	}

	class ChainDoesNotSupportContract extends BaseError$3 {
	    constructor({ blockNumber, chain, contract, }) {
	        super(`Chain "${chain.name}" does not support contract "${contract.name}".`, {
	            metaMessages: [
	                'This could be due to any of the following:',
	                ...(blockNumber &&
	                    contract.blockCreated &&
	                    contract.blockCreated > blockNumber
	                    ? [
	                        `- The contract "${contract.name}" was not deployed until block ${contract.blockCreated} (current block ${blockNumber}).`,
	                    ]
	                    : [
	                        `- The chain does not have the contract "${contract.name}" configured.`,
	                    ]),
	            ],
	            name: 'ChainDoesNotSupportContract',
	        });
	    }
	}
	class ChainMismatchError extends BaseError$3 {
	    constructor({ chain, currentChainId, }) {
	        super(`The current chain of the wallet (id: ${currentChainId}) does not match the target chain for the transaction (id: ${chain.id} – ${chain.name}).`, {
	            metaMessages: [
	                `Current Chain ID:  ${currentChainId}`,
	                `Expected Chain ID: ${chain.id} – ${chain.name}`,
	            ],
	            name: 'ChainMismatchError',
	        });
	    }
	}
	class ChainNotFoundError extends BaseError$3 {
	    constructor() {
	        super([
	            'No chain was provided to the request.',
	            'Please provide a chain with the `chain` argument on the Action, or by supplying a `chain` to WalletClient.',
	        ].join('\n'), {
	            name: 'ChainNotFoundError',
	        });
	    }
	}
	class ClientChainNotConfiguredError extends BaseError$3 {
	    constructor() {
	        super('No chain was provided to the Client.', {
	            name: 'ClientChainNotConfiguredError',
	        });
	    }
	}
	class InvalidChainIdError extends BaseError$3 {
	    constructor({ chainId }) {
	        super(typeof chainId === 'number'
	            ? `Chain ID "${chainId}" is invalid.`
	            : 'Chain ID is invalid.', { name: 'InvalidChainIdError' });
	    }
	}

	function getChainContractAddress({ blockNumber, chain, contract: name, }) {
	    const contract = chain?.contracts?.[name];
	    if (!contract)
	        throw new ChainDoesNotSupportContract({
	            chain,
	            contract: { name },
	        });
	    if (blockNumber &&
	        contract.blockCreated &&
	        contract.blockCreated > blockNumber)
	        throw new ChainDoesNotSupportContract({
	            blockNumber,
	            chain,
	            contract: {
	                name,
	                blockCreated: contract.blockCreated,
	            },
	        });
	    return contract.address;
	}

	function parseAccount(account) {
	    if (typeof account === 'string')
	        return { address: account, type: 'json-rpc' };
	    return account;
	}

	// https://docs.soliditylang.org/en/v0.8.16/control-structures.html#panic-via-assert-and-error-via-require
	const panicReasons = {
	    1: 'An `assert` condition failed.',
	    17: 'Arithmetic operation resulted in underflow or overflow.',
	    18: 'Division or modulo by zero (e.g. `5 / 0` or `23 % 0`).',
	    33: 'Attempted to convert to an invalid type.',
	    34: 'Attempted to access a storage byte array that is incorrectly encoded.',
	    49: 'Performed `.pop()` on an empty array',
	    50: 'Array index is out of bounds.',
	    65: 'Allocated too much memory or created an array which is too large.',
	    81: 'Attempted to call a zero-initialized variable of internal function type.',
	};
	const solidityError = {
	    inputs: [
	        {
	            name: 'message',
	            type: 'string',
	        },
	    ],
	    name: 'Error',
	    type: 'error',
	};
	const solidityPanic = {
	    inputs: [
	        {
	            name: 'reason',
	            type: 'uint256',
	        },
	    ],
	    name: 'Panic',
	    type: 'error',
	};

	function decodeErrorResult(parameters) {
	    const { abi, data } = parameters;
	    const signature = slice(data, 0, 4);
	    if (signature === '0x')
	        throw new AbiDecodingZeroDataError();
	    const abi_ = [...(abi || []), solidityError, solidityPanic];
	    const abiItem = abi_.find((x) => x.type === 'error' && signature === toFunctionSelector(formatAbiItem$1(x)));
	    if (!abiItem)
	        throw new AbiErrorSignatureNotFoundError(signature, {
	            docsPath: '/docs/contract/decodeErrorResult',
	        });
	    return {
	        abiItem,
	        args: 'inputs' in abiItem && abiItem.inputs && abiItem.inputs.length > 0
	            ? decodeAbiParameters(abiItem.inputs, slice(data, 4))
	            : undefined,
	        errorName: abiItem.name,
	    };
	}

	const stringify = (value, replacer, space) => JSON.stringify(value, (key, value_) => {
	    const value = typeof value_ === 'bigint' ? value_.toString() : value_;
	    return value;
	}, space);

	function formatAbiItemWithArgs({ abiItem, args, includeFunctionName = true, includeName = false, }) {
	    if (!('name' in abiItem))
	        return;
	    if (!('inputs' in abiItem))
	        return;
	    if (!abiItem.inputs)
	        return;
	    return `${includeFunctionName ? abiItem.name : ''}(${abiItem.inputs
        .map((input, i) => `${includeName && input.name ? `${input.name}: ` : ''}${typeof args[i] === 'object' ? stringify(args[i]) : args[i]}`)
        .join(', ')})`;
	}

	const etherUnits = {
	    gwei: 9,
	    wei: 18,
	};
	const gweiUnits = {
	    ether: -9,
	    wei: 9,
	};
	const weiUnits = {
	    ether: -18,
	    gwei: -9,
	};

	/**
	 *  Divides a number by a given exponent of base 10 (10exponent), and formats it into a string representation of the number..
	 *
	 * - Docs: https://viem.sh/docs/utilities/formatUnits
	 *
	 * @example
	 * import { formatUnits } from 'viem'
	 *
	 * formatUnits(420000000000n, 9)
	 * // '420'
	 */
	function formatUnits(value, decimals) {
	    let display = value.toString();
	    const negative = display.startsWith('-');
	    if (negative)
	        display = display.slice(1);
	    display = display.padStart(decimals, '0');
	    let [integer, fraction] = [
	        display.slice(0, display.length - decimals),
	        display.slice(display.length - decimals),
	    ];
	    fraction = fraction.replace(/(0+)$/, '');
	    return `${negative ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`;
	}

	/**
	 * Converts numerical wei to a string representation of ether.
	 *
	 * - Docs: https://viem.sh/docs/utilities/formatEther
	 *
	 * @example
	 * import { formatEther } from 'viem'
	 *
	 * formatEther(1000000000000000000n)
	 * // '1'
	 */
	function formatEther(wei, unit = 'wei') {
	    return formatUnits(wei, etherUnits[unit]);
	}

	/**
	 * Converts numerical wei to a string representation of gwei.
	 *
	 * - Docs: https://viem.sh/docs/utilities/formatGwei
	 *
	 * @example
	 * import { formatGwei } from 'viem'
	 *
	 * formatGwei(1000000000n)
	 * // '1'
	 */
	function formatGwei(wei, unit = 'wei') {
	    return formatUnits(wei, gweiUnits[unit]);
	}

	class AccountStateConflictError extends BaseError$3 {
	    constructor({ address }) {
	        super(`State for account "${address}" is set multiple times.`, {
	            name: 'AccountStateConflictError',
	        });
	    }
	}
	class StateAssignmentConflictError extends BaseError$3 {
	    constructor() {
	        super('state and stateDiff are set on the same account.', {
	            name: 'StateAssignmentConflictError',
	        });
	    }
	}
	/** @internal */
	function prettyStateMapping(stateMapping) {
	    return stateMapping.reduce((pretty, { slot, value }) => {
	        return `${pretty}        ${slot}: ${value}\n`;
	    }, '');
	}
	function prettyStateOverride(stateOverride) {
	    return stateOverride
	        .reduce((pretty, { address, ...state }) => {
	        let val = `${pretty}    ${address}:\n`;
	        if (state.nonce)
	            val += `      nonce: ${state.nonce}\n`;
	        if (state.balance)
	            val += `      balance: ${state.balance}\n`;
	        if (state.code)
	            val += `      code: ${state.code}\n`;
	        if (state.state) {
	            val += '      state:\n';
	            val += prettyStateMapping(state.state);
	        }
	        if (state.stateDiff) {
	            val += '      stateDiff:\n';
	            val += prettyStateMapping(state.stateDiff);
	        }
	        return val;
	    }, '  State Override:\n')
	        .slice(0, -1);
	}

	function prettyPrint(args) {
	    const entries = Object.entries(args)
	        .map(([key, value]) => {
	        if (value === undefined || value === false)
	            return null;
	        return [key, value];
	    })
	        .filter(Boolean);
	    const maxLength = entries.reduce((acc, [key]) => Math.max(acc, key.length), 0);
	    return entries
	        .map(([key, value]) => `  ${`${key}:`.padEnd(maxLength + 1)}  ${value}`)
	        .join('\n');
	}
	class FeeConflictError extends BaseError$3 {
	    constructor() {
	        super([
	            'Cannot specify both a `gasPrice` and a `maxFeePerGas`/`maxPriorityFeePerGas`.',
	            'Use `maxFeePerGas`/`maxPriorityFeePerGas` for EIP-1559 compatible networks, and `gasPrice` for others.',
	        ].join('\n'), { name: 'FeeConflictError' });
	    }
	}
	class InvalidLegacyVError extends BaseError$3 {
	    constructor({ v }) {
	        super(`Invalid \`v\` value "${v}". Expected 27 or 28.`, {
	            name: 'InvalidLegacyVError',
	        });
	    }
	}
	class InvalidSerializableTransactionError extends BaseError$3 {
	    constructor({ transaction }) {
	        super('Cannot infer a transaction type from provided transaction.', {
	            metaMessages: [
	                'Provided Transaction:',
	                '{',
	                prettyPrint(transaction),
	                '}',
	                '',
	                'To infer the type, either provide:',
	                '- a `type` to the Transaction, or',
	                '- an EIP-1559 Transaction with `maxFeePerGas`, or',
	                '- an EIP-2930 Transaction with `gasPrice` & `accessList`, or',
	                '- an EIP-4844 Transaction with `blobs`, `blobVersionedHashes`, `sidecars`, or',
	                '- an EIP-7702 Transaction with `authorizationList`, or',
	                '- a Legacy Transaction with `gasPrice`',
	            ],
	            name: 'InvalidSerializableTransactionError',
	        });
	    }
	}
	class InvalidStorageKeySizeError extends BaseError$3 {
	    constructor({ storageKey }) {
	        super(`Size for storage key "${storageKey}" is invalid. Expected 32 bytes. Got ${Math.floor((storageKey.length - 2) / 2)} bytes.`, { name: 'InvalidStorageKeySizeError' });
	    }
	}
	class TransactionExecutionError extends BaseError$3 {
	    constructor(cause, { account, docsPath, chain, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value, }) {
	        const prettyArgs = prettyPrint({
	            chain: chain && `${chain?.name} (id: ${chain?.id})`,
	            from: account?.address,
	            to,
	            value: typeof value !== 'undefined' &&
	                `${formatEther(value)} ${chain?.nativeCurrency?.symbol || 'ETH'}`,
	            data,
	            gas,
	            gasPrice: typeof gasPrice !== 'undefined' && `${formatGwei(gasPrice)} gwei`,
	            maxFeePerGas: typeof maxFeePerGas !== 'undefined' &&
	                `${formatGwei(maxFeePerGas)} gwei`,
	            maxPriorityFeePerGas: typeof maxPriorityFeePerGas !== 'undefined' &&
	                `${formatGwei(maxPriorityFeePerGas)} gwei`,
	            nonce,
	        });
	        super(cause.shortMessage, {
	            cause,
	            docsPath,
	            metaMessages: [
	                ...(cause.metaMessages ? [...cause.metaMessages, ' '] : []),
	                'Request Arguments:',
	                prettyArgs,
	            ].filter(Boolean),
	            name: 'TransactionExecutionError',
	        });
	        Object.defineProperty(this, "cause", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.cause = cause;
	    }
	}

	const getContractAddress = (address) => address;
	const getUrl = (url) => url;

	class CallExecutionError extends BaseError$3 {
	    constructor(cause, { account: account_, docsPath, chain, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value, stateOverride, }) {
	        const account = account_ ? parseAccount(account_) : undefined;
	        let prettyArgs = prettyPrint({
	            from: account?.address,
	            to,
	            value: typeof value !== 'undefined' &&
	                `${formatEther(value)} ${chain?.nativeCurrency?.symbol || 'ETH'}`,
	            data,
	            gas,
	            gasPrice: typeof gasPrice !== 'undefined' && `${formatGwei(gasPrice)} gwei`,
	            maxFeePerGas: typeof maxFeePerGas !== 'undefined' &&
	                `${formatGwei(maxFeePerGas)} gwei`,
	            maxPriorityFeePerGas: typeof maxPriorityFeePerGas !== 'undefined' &&
	                `${formatGwei(maxPriorityFeePerGas)} gwei`,
	            nonce,
	        });
	        if (stateOverride) {
	            prettyArgs += `\n${prettyStateOverride(stateOverride)}`;
	        }
	        super(cause.shortMessage, {
	            cause,
	            docsPath,
	            metaMessages: [
	                ...(cause.metaMessages ? [...cause.metaMessages, ' '] : []),
	                'Raw Call Arguments:',
	                prettyArgs,
	            ].filter(Boolean),
	            name: 'CallExecutionError',
	        });
	        Object.defineProperty(this, "cause", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.cause = cause;
	    }
	}
	class ContractFunctionExecutionError extends BaseError$3 {
	    constructor(cause, { abi, args, contractAddress, docsPath, functionName, sender, }) {
	        const abiItem = getAbiItem({ abi, args, name: functionName });
	        const formattedArgs = abiItem
	            ? formatAbiItemWithArgs({
	                abiItem,
	                args,
	                includeFunctionName: false,
	                includeName: false,
	            })
	            : undefined;
	        const functionWithParams = abiItem
	            ? formatAbiItem$1(abiItem, { includeName: true })
	            : undefined;
	        const prettyArgs = prettyPrint({
	            address: contractAddress && getContractAddress(contractAddress),
	            function: functionWithParams,
	            args: formattedArgs &&
	                formattedArgs !== '()' &&
	                `${[...Array(functionName?.length ?? 0).keys()]
                    .map(() => ' ')
                    .join('')}${formattedArgs}`,
	            sender,
	        });
	        super(cause.shortMessage ||
	            `An unknown error occurred while executing the contract function "${functionName}".`, {
	            cause,
	            docsPath,
	            metaMessages: [
	                ...(cause.metaMessages ? [...cause.metaMessages, ' '] : []),
	                prettyArgs && 'Contract Call:',
	                prettyArgs,
	            ].filter(Boolean),
	            name: 'ContractFunctionExecutionError',
	        });
	        Object.defineProperty(this, "abi", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "args", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "cause", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "contractAddress", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "formattedArgs", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "functionName", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "sender", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.abi = abi;
	        this.args = args;
	        this.cause = cause;
	        this.contractAddress = contractAddress;
	        this.functionName = functionName;
	        this.sender = sender;
	    }
	}
	class ContractFunctionRevertedError extends BaseError$3 {
	    constructor({ abi, data, functionName, message, }) {
	        let cause;
	        let decodedData;
	        let metaMessages;
	        let reason;
	        if (data && data !== '0x') {
	            try {
	                decodedData = decodeErrorResult({ abi, data });
	                const { abiItem, errorName, args: errorArgs } = decodedData;
	                if (errorName === 'Error') {
	                    reason = errorArgs[0];
	                }
	                else if (errorName === 'Panic') {
	                    const [firstArg] = errorArgs;
	                    reason = panicReasons[firstArg];
	                }
	                else {
	                    const errorWithParams = abiItem
	                        ? formatAbiItem$1(abiItem, { includeName: true })
	                        : undefined;
	                    const formattedArgs = abiItem && errorArgs
	                        ? formatAbiItemWithArgs({
	                            abiItem,
	                            args: errorArgs,
	                            includeFunctionName: false,
	                            includeName: false,
	                        })
	                        : undefined;
	                    metaMessages = [
	                        errorWithParams ? `Error: ${errorWithParams}` : '',
	                        formattedArgs && formattedArgs !== '()'
	                            ? `       ${[...Array(errorName?.length ?? 0).keys()]
                                .map(() => ' ')
                                .join('')}${formattedArgs}`
	                            : '',
	                    ];
	                }
	            }
	            catch (err) {
	                cause = err;
	            }
	        }
	        else if (message)
	            reason = message;
	        let signature;
	        if (cause instanceof AbiErrorSignatureNotFoundError) {
	            signature = cause.signature;
	            metaMessages = [
	                `Unable to decode signature "${signature}" as it was not found on the provided ABI.`,
	                'Make sure you are using the correct ABI and that the error exists on it.',
	                `You can look up the decoded signature here: https://openchain.xyz/signatures?query=${signature}.`,
	            ];
	        }
	        super((reason && reason !== 'execution reverted') || signature
	            ? [
	                `The contract function "${functionName}" reverted with the following ${signature ? 'signature' : 'reason'}:`,
	                reason || signature,
	            ].join('\n')
	            : `The contract function "${functionName}" reverted.`, {
	            cause,
	            metaMessages,
	            name: 'ContractFunctionRevertedError',
	        });
	        Object.defineProperty(this, "data", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "raw", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "reason", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "signature", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.data = decodedData;
	        this.raw = data;
	        this.reason = reason;
	        this.signature = signature;
	    }
	}
	class ContractFunctionZeroDataError extends BaseError$3 {
	    constructor({ functionName }) {
	        super(`The contract function "${functionName}" returned no data ("0x").`, {
	            metaMessages: [
	                'This could be due to any of the following:',
	                `  - The contract does not have the function "${functionName}",`,
	                '  - The parameters passed to the contract function may be invalid, or',
	                '  - The address is not a contract.',
	            ],
	            name: 'ContractFunctionZeroDataError',
	        });
	    }
	}
	class CounterfactualDeploymentFailedError extends BaseError$3 {
	    constructor({ factory }) {
	        super(`Deployment for counterfactual contract call failed${factory ? ` for factory "${factory}".` : ''}`, {
	            metaMessages: [
	                'Please ensure:',
	                '- The `factory` is a valid contract deployment factory (ie. Create2 Factory, ERC-4337 Factory, etc).',
	                '- The `factoryData` is a valid encoded function call for contract deployment function on the factory.',
	            ],
	            name: 'CounterfactualDeploymentFailedError',
	        });
	    }
	}
	class RawContractError extends BaseError$3 {
	    constructor({ data, message, }) {
	        super(message || '', { name: 'RawContractError' });
	        Object.defineProperty(this, "code", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 3
	        });
	        Object.defineProperty(this, "data", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.data = data;
	    }
	}

	function decodeFunctionData(parameters) {
	    const { abi, data } = parameters;
	    const signature = slice(data, 0, 4);
	    const description = abi.find((x) => x.type === 'function' &&
	        signature === toFunctionSelector(formatAbiItem$1(x)));
	    if (!description)
	        throw new AbiFunctionSignatureNotFoundError(signature, {
	            docsPath: '/docs/contract/decodeFunctionData',
	        });
	    return {
	        functionName: description.name,
	        args: ('inputs' in description &&
	            description.inputs &&
	            description.inputs.length > 0
	            ? decodeAbiParameters(description.inputs, slice(data, 4))
	            : undefined),
	    };
	}

	const docsPath$2 = '/docs/contract/encodeErrorResult';
	function encodeErrorResult(parameters) {
	    const { abi, errorName, args } = parameters;
	    let abiItem = abi[0];
	    if (errorName) {
	        const item = getAbiItem({ abi, args, name: errorName });
	        if (!item)
	            throw new AbiErrorNotFoundError(errorName, { docsPath: docsPath$2 });
	        abiItem = item;
	    }
	    if (abiItem.type !== 'error')
	        throw new AbiErrorNotFoundError(undefined, { docsPath: docsPath$2 });
	    const definition = formatAbiItem$1(abiItem);
	    const signature = toFunctionSelector(definition);
	    let data = '0x';
	    if (args && args.length > 0) {
	        if (!abiItem.inputs)
	            throw new AbiErrorInputsNotFoundError(abiItem.name, { docsPath: docsPath$2 });
	        data = encodeAbiParameters(abiItem.inputs, args);
	    }
	    return concatHex([signature, data]);
	}

	const docsPath$1 = '/docs/contract/encodeFunctionResult';
	function encodeFunctionResult(parameters) {
	    const { abi, functionName, result } = parameters;
	    let abiItem = abi[0];
	    if (functionName) {
	        const item = getAbiItem({ abi, name: functionName });
	        if (!item)
	            throw new AbiFunctionNotFoundError(functionName, { docsPath: docsPath$1 });
	        abiItem = item;
	    }
	    if (abiItem.type !== 'function')
	        throw new AbiFunctionNotFoundError(undefined, { docsPath: docsPath$1 });
	    if (!abiItem.outputs)
	        throw new AbiFunctionOutputsNotFoundError(abiItem.name, { docsPath: docsPath$1 });
	    const values = (() => {
	        if (abiItem.outputs.length === 0)
	            return [];
	        if (abiItem.outputs.length === 1)
	            return [result];
	        if (Array.isArray(result))
	            return result;
	        throw new InvalidArrayError(result);
	    })();
	    return encodeAbiParameters(abiItem.outputs, values);
	}

	const localBatchGatewayUrl = 'x-batch-gateway:true';
	async function localBatchGatewayRequest(parameters) {
	    const { data, ccipRequest } = parameters;
	    const { args: [queries], } = decodeFunctionData({ abi: batchGatewayAbi, data });
	    const failures = [];
	    const responses = [];
	    await Promise.all(queries.map(async (query, i) => {
	        try {
	            responses[i] = query.urls.includes(localBatchGatewayUrl)
	                ? await localBatchGatewayRequest({ data: query.data, ccipRequest })
	                : await ccipRequest(query);
	            failures[i] = false;
	        }
	        catch (err) {
	            failures[i] = true;
	            responses[i] = encodeError(err);
	        }
	    }));
	    return encodeFunctionResult({
	        abi: batchGatewayAbi,
	        functionName: 'query',
	        result: [failures, responses],
	    });
	}
	function encodeError(error) {
	    if (error.name === 'HttpRequestError' && error.status)
	        return encodeErrorResult({
	            abi: batchGatewayAbi,
	            errorName: 'HttpError',
	            args: [error.status, error.shortMessage],
	        });
	    return encodeErrorResult({
	        abi: [solidityError],
	        errorName: 'Error',
	        args: ['shortMessage' in error ? error.shortMessage : error.message],
	    });
	}

	/**
	 * Retrieves and returns an action from the client (if exists), and falls
	 * back to the tree-shakable action.
	 *
	 * Useful for extracting overridden actions from a client (ie. if a consumer
	 * wants to override the `sendTransaction` implementation).
	 */
	function getAction$1(client, actionFn, 
	// Some minifiers drop `Function.prototype.name`, or replace it with short letters,
	// meaning that `actionFn.name` will not always work. For that case, the consumer
	// needs to pass the name explicitly.
	name) {
	    const action_implicit = client[actionFn.name];
	    if (typeof action_implicit === 'function')
	        return action_implicit;
	    const action_explicit = client[name];
	    if (typeof action_explicit === 'function')
	        return action_explicit;
	    return (params) => actionFn(client, params);
	}

	class HttpRequestError extends BaseError$3 {
	    constructor({ body, cause, details, headers, status, url, }) {
	        super('HTTP request failed.', {
	            cause,
	            details,
	            metaMessages: [
	                status && `Status: ${status}`,
	                `URL: ${getUrl(url)}`,
	                body && `Request body: ${stringify(body)}`,
	            ].filter(Boolean),
	            name: 'HttpRequestError',
	        });
	        Object.defineProperty(this, "body", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "headers", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "status", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "url", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.body = body;
	        this.headers = headers;
	        this.status = status;
	        this.url = url;
	    }
	}
	class RpcRequestError extends BaseError$3 {
	    constructor({ body, error, url, }) {
	        super('RPC Request failed.', {
	            cause: error,
	            details: error.message,
	            metaMessages: [`URL: ${getUrl(url)}`, `Request body: ${stringify(body)}`],
	            name: 'RpcRequestError',
	        });
	        Object.defineProperty(this, "code", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "data", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.code = error.code;
	        this.data = error.data;
	    }
	}
	class TimeoutError extends BaseError$3 {
	    constructor({ body, url, }) {
	        super('The request took too long to respond.', {
	            details: 'The request timed out.',
	            metaMessages: [`URL: ${getUrl(url)}`, `Request body: ${stringify(body)}`],
	            name: 'TimeoutError',
	        });
	    }
	}

	const unknownErrorCode = -1;
	class RpcError extends BaseError$3 {
	    constructor(cause, { code, docsPath, metaMessages, name, shortMessage, }) {
	        super(shortMessage, {
	            cause,
	            docsPath,
	            metaMessages: metaMessages || cause?.metaMessages,
	            name: name || 'RpcError',
	        });
	        Object.defineProperty(this, "code", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.name = name || cause.name;
	        this.code = (cause instanceof RpcRequestError ? cause.code : (code ?? unknownErrorCode));
	    }
	}
	class ProviderRpcError extends RpcError {
	    constructor(cause, options) {
	        super(cause, options);
	        Object.defineProperty(this, "data", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.data = options.data;
	    }
	}
	class ParseRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: ParseRpcError.code,
	            name: 'ParseRpcError',
	            shortMessage: 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
	        });
	    }
	}
	Object.defineProperty(ParseRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32700
	});
	class InvalidRequestRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: InvalidRequestRpcError.code,
	            name: 'InvalidRequestRpcError',
	            shortMessage: 'JSON is not a valid request object.',
	        });
	    }
	}
	Object.defineProperty(InvalidRequestRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32600
	});
	class MethodNotFoundRpcError extends RpcError {
	    constructor(cause, { method } = {}) {
	        super(cause, {
	            code: MethodNotFoundRpcError.code,
	            name: 'MethodNotFoundRpcError',
	            shortMessage: `The method${method ? ` "${method}"` : ''} does not exist / is not available.`,
	        });
	    }
	}
	Object.defineProperty(MethodNotFoundRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32601
	});
	class InvalidParamsRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: InvalidParamsRpcError.code,
	            name: 'InvalidParamsRpcError',
	            shortMessage: [
	                'Invalid parameters were provided to the RPC method.',
	                'Double check you have provided the correct parameters.',
	            ].join('\n'),
	        });
	    }
	}
	Object.defineProperty(InvalidParamsRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32602
	});
	class InternalRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: InternalRpcError.code,
	            name: 'InternalRpcError',
	            shortMessage: 'An internal error was received.',
	        });
	    }
	}
	Object.defineProperty(InternalRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32603
	});
	class InvalidInputRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: InvalidInputRpcError.code,
	            name: 'InvalidInputRpcError',
	            shortMessage: [
	                'Missing or invalid parameters.',
	                'Double check you have provided the correct parameters.',
	            ].join('\n'),
	        });
	    }
	}
	Object.defineProperty(InvalidInputRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32e3
	});
	class ResourceNotFoundRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: ResourceNotFoundRpcError.code,
	            name: 'ResourceNotFoundRpcError',
	            shortMessage: 'Requested resource not found.',
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ResourceNotFoundRpcError'
	        });
	    }
	}
	Object.defineProperty(ResourceNotFoundRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32001
	});
	class ResourceUnavailableRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: ResourceUnavailableRpcError.code,
	            name: 'ResourceUnavailableRpcError',
	            shortMessage: 'Requested resource not available.',
	        });
	    }
	}
	Object.defineProperty(ResourceUnavailableRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32002
	});
	class TransactionRejectedRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: TransactionRejectedRpcError.code,
	            name: 'TransactionRejectedRpcError',
	            shortMessage: 'Transaction creation failed.',
	        });
	    }
	}
	Object.defineProperty(TransactionRejectedRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32003
	});
	class MethodNotSupportedRpcError extends RpcError {
	    constructor(cause, { method } = {}) {
	        super(cause, {
	            code: MethodNotSupportedRpcError.code,
	            name: 'MethodNotSupportedRpcError',
	            shortMessage: `Method${method ? ` "${method}"` : ''} is not supported.`,
	        });
	    }
	}
	Object.defineProperty(MethodNotSupportedRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32004
	});
	class LimitExceededRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: LimitExceededRpcError.code,
	            name: 'LimitExceededRpcError',
	            shortMessage: 'Request exceeds defined limit.',
	        });
	    }
	}
	Object.defineProperty(LimitExceededRpcError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32005
	});
	class JsonRpcVersionUnsupportedError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            code: JsonRpcVersionUnsupportedError.code,
	            name: 'JsonRpcVersionUnsupportedError',
	            shortMessage: 'Version of JSON-RPC protocol is not supported.',
	        });
	    }
	}
	Object.defineProperty(JsonRpcVersionUnsupportedError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: -32006
	});
	class UserRejectedRequestError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: UserRejectedRequestError.code,
	            name: 'UserRejectedRequestError',
	            shortMessage: 'User rejected the request.',
	        });
	    }
	}
	Object.defineProperty(UserRejectedRequestError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 4001
	});
	class UnauthorizedProviderError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: UnauthorizedProviderError.code,
	            name: 'UnauthorizedProviderError',
	            shortMessage: 'The requested method and/or account has not been authorized by the user.',
	        });
	    }
	}
	Object.defineProperty(UnauthorizedProviderError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 4100
	});
	class UnsupportedProviderMethodError extends ProviderRpcError {
	    constructor(cause, { method } = {}) {
	        super(cause, {
	            code: UnsupportedProviderMethodError.code,
	            name: 'UnsupportedProviderMethodError',
	            shortMessage: `The Provider does not support the requested method${method ? ` " ${method}"` : ''}.`,
	        });
	    }
	}
	Object.defineProperty(UnsupportedProviderMethodError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 4200
	});
	class ProviderDisconnectedError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: ProviderDisconnectedError.code,
	            name: 'ProviderDisconnectedError',
	            shortMessage: 'The Provider is disconnected from all chains.',
	        });
	    }
	}
	Object.defineProperty(ProviderDisconnectedError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 4900
	});
	class ChainDisconnectedError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: ChainDisconnectedError.code,
	            name: 'ChainDisconnectedError',
	            shortMessage: 'The Provider is not connected to the requested chain.',
	        });
	    }
	}
	Object.defineProperty(ChainDisconnectedError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 4901
	});
	class SwitchChainError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: SwitchChainError.code,
	            name: 'SwitchChainError',
	            shortMessage: 'An error occurred when attempting to switch chain.',
	        });
	    }
	}
	Object.defineProperty(SwitchChainError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 4902
	});
	class UnsupportedNonOptionalCapabilityError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: UnsupportedNonOptionalCapabilityError.code,
	            name: 'UnsupportedNonOptionalCapabilityError',
	            shortMessage: 'This Wallet does not support a capability that was not marked as optional.',
	        });
	    }
	}
	Object.defineProperty(UnsupportedNonOptionalCapabilityError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5700
	});
	class UnsupportedChainIdError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: UnsupportedChainIdError.code,
	            name: 'UnsupportedChainIdError',
	            shortMessage: 'This Wallet does not support the requested chain ID.',
	        });
	    }
	}
	Object.defineProperty(UnsupportedChainIdError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5710
	});
	class DuplicateIdError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: DuplicateIdError.code,
	            name: 'DuplicateIdError',
	            shortMessage: 'There is already a bundle submitted with this ID.',
	        });
	    }
	}
	Object.defineProperty(DuplicateIdError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5720
	});
	class UnknownBundleIdError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: UnknownBundleIdError.code,
	            name: 'UnknownBundleIdError',
	            shortMessage: 'This bundle id is unknown / has not been submitted',
	        });
	    }
	}
	Object.defineProperty(UnknownBundleIdError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5730
	});
	class BundleTooLargeError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: BundleTooLargeError.code,
	            name: 'BundleTooLargeError',
	            shortMessage: 'The call bundle is too large for the Wallet to process.',
	        });
	    }
	}
	Object.defineProperty(BundleTooLargeError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5740
	});
	class AtomicReadyWalletRejectedUpgradeError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: AtomicReadyWalletRejectedUpgradeError.code,
	            name: 'AtomicReadyWalletRejectedUpgradeError',
	            shortMessage: 'The Wallet can support atomicity after an upgrade, but the user rejected the upgrade.',
	        });
	    }
	}
	Object.defineProperty(AtomicReadyWalletRejectedUpgradeError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5750
	});
	class AtomicityNotSupportedError extends ProviderRpcError {
	    constructor(cause) {
	        super(cause, {
	            code: AtomicityNotSupportedError.code,
	            name: 'AtomicityNotSupportedError',
	            shortMessage: 'The wallet does not support atomic execution but the request requires it.',
	        });
	    }
	}
	Object.defineProperty(AtomicityNotSupportedError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 5760
	});
	class UnknownRpcError extends RpcError {
	    constructor(cause) {
	        super(cause, {
	            name: 'UnknownRpcError',
	            shortMessage: 'An unknown RPC error occurred.',
	        });
	    }
	}

	const EXECUTION_REVERTED_ERROR_CODE = 3;
	function getContractError(err, { abi, address, args, docsPath, functionName, sender, }) {
	    const error = (err instanceof RawContractError
	        ? err
	        : err instanceof BaseError$3
	            ? err.walk((err) => 'data' in err) || err.walk()
	            : {});
	    const { code, data, details, message, shortMessage } = error;
	    const cause = (() => {
	        if (err instanceof AbiDecodingZeroDataError)
	            return new ContractFunctionZeroDataError({ functionName });
	        if ([EXECUTION_REVERTED_ERROR_CODE, InternalRpcError.code].includes(code) &&
	            (data || details || message || shortMessage)) {
	            return new ContractFunctionRevertedError({
	                abi,
	                data: typeof data === 'object' ? data.data : data,
	                functionName,
	                message: error instanceof RpcRequestError
	                    ? details
	                    : (shortMessage ?? message),
	            });
	        }
	        return err;
	    })();
	    return new ContractFunctionExecutionError(cause, {
	        abi,
	        args,
	        contractAddress: address,
	        docsPath,
	        functionName,
	        sender,
	    });
	}

	/**
	 * Hex, bytes and number utilities.
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// 100 lines of code in the file are duplicated from noble-hashes (utils).
	// This is OK: `abstract` directory does not use noble-hashes.
	// User may opt-in into using different hashing library. This way, noble-hashes
	// won't be included into their bundle.
	const _0n$4 = /* @__PURE__ */ BigInt(0);
	const _1n$4 = /* @__PURE__ */ BigInt(1);
	function isBytes(a) {
	    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
	}
	function abytes(item) {
	    if (!isBytes(item))
	        throw new Error('Uint8Array expected');
	}
	function abool(title, value) {
	    if (typeof value !== 'boolean')
	        throw new Error(title + ' boolean expected, got ' + value);
	}
	// Used in weierstrass, der
	function numberToHexUnpadded(num) {
	    const hex = num.toString(16);
	    return hex.length & 1 ? '0' + hex : hex;
	}
	function hexToNumber(hex) {
	    if (typeof hex !== 'string')
	        throw new Error('hex string expected, got ' + typeof hex);
	    return hex === '' ? _0n$4 : BigInt('0x' + hex); // Big Endian
	}
	// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
	const hasHexBuiltin = 
	// @ts-ignore
	typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function';
	// Array where index 0xf0 (240) is mapped to string 'f0'
	const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
	/**
	 * Convert byte array to hex string. Uses built-in function, when available.
	 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
	 */
	function bytesToHex(bytes) {
	    abytes(bytes);
	    // @ts-ignore
	    if (hasHexBuiltin)
	        return bytes.toHex();
	    // pre-caching improves the speed 6x
	    let hex = '';
	    for (let i = 0; i < bytes.length; i++) {
	        hex += hexes[bytes[i]];
	    }
	    return hex;
	}
	// We use optimized technique to convert hex string to byte array
	const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
	function asciiToBase16(ch) {
	    if (ch >= asciis._0 && ch <= asciis._9)
	        return ch - asciis._0; // '2' => 50-48
	    if (ch >= asciis.A && ch <= asciis.F)
	        return ch - (asciis.A - 10); // 'B' => 66-(65-10)
	    if (ch >= asciis.a && ch <= asciis.f)
	        return ch - (asciis.a - 10); // 'b' => 98-(97-10)
	    return;
	}
	/**
	 * Convert hex string to byte array. Uses built-in function, when available.
	 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
	 */
	function hexToBytes(hex) {
	    if (typeof hex !== 'string')
	        throw new Error('hex string expected, got ' + typeof hex);
	    // @ts-ignore
	    if (hasHexBuiltin)
	        return Uint8Array.fromHex(hex);
	    const hl = hex.length;
	    const al = hl / 2;
	    if (hl % 2)
	        throw new Error('hex string expected, got unpadded hex of length ' + hl);
	    const array = new Uint8Array(al);
	    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
	        const n1 = asciiToBase16(hex.charCodeAt(hi));
	        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
	        if (n1 === undefined || n2 === undefined) {
	            const char = hex[hi] + hex[hi + 1];
	            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
	        }
	        array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
	    }
	    return array;
	}
	// BE: Big Endian, LE: Little Endian
	function bytesToNumberBE(bytes) {
	    return hexToNumber(bytesToHex(bytes));
	}
	function bytesToNumberLE(bytes) {
	    abytes(bytes);
	    return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
	}
	function numberToBytesBE(n, len) {
	    return hexToBytes(n.toString(16).padStart(len * 2, '0'));
	}
	function numberToBytesLE(n, len) {
	    return numberToBytesBE(n, len).reverse();
	}
	/**
	 * Takes hex string or Uint8Array, converts to Uint8Array.
	 * Validates output length.
	 * Will throw error for other types.
	 * @param title descriptive title for an error e.g. 'private key'
	 * @param hex hex string or Uint8Array
	 * @param expectedLength optional, will compare to result array's length
	 * @returns
	 */
	function ensureBytes(title, hex, expectedLength) {
	    let res;
	    if (typeof hex === 'string') {
	        try {
	            res = hexToBytes(hex);
	        }
	        catch (e) {
	            throw new Error(title + ' must be hex string or Uint8Array, cause: ' + e);
	        }
	    }
	    else if (isBytes(hex)) {
	        // Uint8Array.from() instead of hash.slice() because node.js Buffer
	        // is instance of Uint8Array, and its slice() creates **mutable** copy
	        res = Uint8Array.from(hex);
	    }
	    else {
	        throw new Error(title + ' must be hex string or Uint8Array');
	    }
	    const len = res.length;
	    if (typeof expectedLength === 'number' && len !== expectedLength)
	        throw new Error(title + ' of length ' + expectedLength + ' expected, got ' + len);
	    return res;
	}
	/**
	 * Copies several Uint8Arrays into one.
	 */
	function concatBytes(...arrays) {
	    let sum = 0;
	    for (let i = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        abytes(a);
	        sum += a.length;
	    }
	    const res = new Uint8Array(sum);
	    for (let i = 0, pad = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        res.set(a, pad);
	        pad += a.length;
	    }
	    return res;
	}
	// Is positive bigint
	const isPosBig = (n) => typeof n === 'bigint' && _0n$4 <= n;
	function inRange(n, min, max) {
	    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
	}
	/**
	 * Asserts min <= n < max. NOTE: It's < max and not <= max.
	 * @example
	 * aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
	 */
	function aInRange(title, n, min, max) {
	    // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
	    // consider P=256n, min=0n, max=P
	    // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
	    // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
	    // - our way is the cleanest:               `inRange('x', x, 0n, P)
	    if (!inRange(n, min, max))
	        throw new Error('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
	}
	// Bit operations
	/**
	 * Calculates amount of bits in a bigint.
	 * Same as `n.toString(2).length`
	 * TODO: merge with nLength in modular
	 */
	function bitLen(n) {
	    let len;
	    for (len = 0; n > _0n$4; n >>= _1n$4, len += 1)
	        ;
	    return len;
	}
	/**
	 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
	 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
	 */
	const bitMask = (n) => (_1n$4 << BigInt(n)) - _1n$4;
	// DRBG
	const u8n = (len) => new Uint8Array(len); // creates Uint8Array
	const u8fr = (arr) => Uint8Array.from(arr); // another shortcut
	/**
	 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
	 * @returns function that will call DRBG until 2nd arg returns something meaningful
	 * @example
	 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
	 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
	 */
	function createHmacDrbg(hashLen, qByteLen, hmacFn) {
	    if (typeof hashLen !== 'number' || hashLen < 2)
	        throw new Error('hashLen must be a number');
	    if (typeof qByteLen !== 'number' || qByteLen < 2)
	        throw new Error('qByteLen must be a number');
	    if (typeof hmacFn !== 'function')
	        throw new Error('hmacFn must be a function');
	    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
	    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
	    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
	    let i = 0; // Iterations counter, will throw when over 1000
	    const reset = () => {
	        v.fill(1);
	        k.fill(0);
	        i = 0;
	    };
	    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
	    const reseed = (seed = u8n(0)) => {
	        // HMAC-DRBG reseed() function. Steps D-G
	        k = h(u8fr([0x00]), seed); // k = hmac(k || v || 0x00 || seed)
	        v = h(); // v = hmac(k || v)
	        if (seed.length === 0)
	            return;
	        k = h(u8fr([0x01]), seed); // k = hmac(k || v || 0x01 || seed)
	        v = h(); // v = hmac(k || v)
	    };
	    const gen = () => {
	        // HMAC-DRBG generate() function
	        if (i++ >= 1000)
	            throw new Error('drbg: tried 1000 values');
	        let len = 0;
	        const out = [];
	        while (len < qByteLen) {
	            v = h();
	            const sl = v.slice();
	            out.push(sl);
	            len += v.length;
	        }
	        return concatBytes(...out);
	    };
	    const genUntil = (seed, pred) => {
	        reset();
	        reseed(seed); // Steps D-G
	        let res = undefined; // Step H: grind until k is in [1..n-1]
	        while (!(res = pred(gen())))
	            reseed();
	        reset();
	        return res;
	    };
	    return genUntil;
	}
	// Validating curves and fields
	const validatorFns = {
	    bigint: (val) => typeof val === 'bigint',
	    function: (val) => typeof val === 'function',
	    boolean: (val) => typeof val === 'boolean',
	    string: (val) => typeof val === 'string',
	    stringOrUint8Array: (val) => typeof val === 'string' || isBytes(val),
	    isSafeInteger: (val) => Number.isSafeInteger(val),
	    array: (val) => Array.isArray(val),
	    field: (val, object) => object.Fp.isValid(val),
	    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
	};
	// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
	function validateObject(object, validators, optValidators = {}) {
	    const checkField = (fieldName, type, isOptional) => {
	        const checkVal = validatorFns[type];
	        if (typeof checkVal !== 'function')
	            throw new Error('invalid validator function');
	        const val = object[fieldName];
	        if (isOptional && val === undefined)
	            return;
	        if (!checkVal(val, object)) {
	            throw new Error('param ' + String(fieldName) + ' is invalid. Expected ' + type + ', got ' + val);
	        }
	    };
	    for (const [fieldName, type] of Object.entries(validators))
	        checkField(fieldName, type, false);
	    for (const [fieldName, type] of Object.entries(optValidators))
	        checkField(fieldName, type, true);
	    return object;
	}
	/**
	 * Memoizes (caches) computation result.
	 * Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
	 */
	function memoized(fn) {
	    const map = new WeakMap();
	    return (arg, ...args) => {
	        const val = map.get(arg);
	        if (val !== undefined)
	            return val;
	        const computed = fn(arg, ...args);
	        map.set(arg, computed);
	        return computed;
	    };
	}

	/** @internal */
	const version$1 = '0.1.1';

	/** @internal */
	function getVersion$1() {
	    return version$1;
	}

	/**
	 * Base error class inherited by all errors thrown by ox.
	 *
	 * @example
	 * ```ts
	 * import { Errors } from 'ox'
	 * throw new Errors.BaseError('An error occurred')
	 * ```
	 */
	let BaseError$1 = class BaseError extends Error {
	    constructor(shortMessage, options = {}) {
	        const details = (() => {
	            if (options.cause instanceof BaseError) {
	                if (options.cause.details)
	                    return options.cause.details;
	                if (options.cause.shortMessage)
	                    return options.cause.shortMessage;
	            }
	            if (options.cause &&
	                'details' in options.cause &&
	                typeof options.cause.details === 'string')
	                return options.cause.details;
	            if (options.cause?.message)
	                return options.cause.message;
	            return options.details;
	        })();
	        const docsPath = (() => {
	            if (options.cause instanceof BaseError)
	                return options.cause.docsPath || options.docsPath;
	            return options.docsPath;
	        })();
	        const docsBaseUrl = 'https://oxlib.sh';
	        const docs = `${docsBaseUrl}${docsPath ?? ''}`;
	        const message = [
	            shortMessage || 'An error occurred.',
	            ...(options.metaMessages ? ['', ...options.metaMessages] : []),
	            ...(details || docsPath
	                ? [
	                    '',
	                    details ? `Details: ${details}` : undefined,
	                    docsPath ? `See: ${docs}` : undefined,
	                ]
	                : []),
	        ]
	            .filter((x) => typeof x === 'string')
	            .join('\n');
	        super(message, options.cause ? { cause: options.cause } : undefined);
	        Object.defineProperty(this, "details", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "docs", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "docsPath", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "shortMessage", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "cause", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'BaseError'
	        });
	        Object.defineProperty(this, "version", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: `ox@${getVersion$1()}`
	        });
	        this.cause = options.cause;
	        this.details = details;
	        this.docs = docs;
	        this.docsPath = docsPath;
	        this.shortMessage = shortMessage;
	    }
	    walk(fn) {
	        return walk(this, fn);
	    }
	};
	/** @internal */
	function walk(err, fn) {
	    if (fn?.(err))
	        return err;
	    if (err && typeof err === 'object' && 'cause' in err && err.cause)
	        return walk(err.cause, fn);
	    return fn ? null : err;
	}

	/** @internal */
	function pad(hex_, options = {}) {
	    const { dir, size = 32 } = options;
	    if (size === 0)
	        return hex_;
	    const hex = hex_.replace('0x', '');
	    if (hex.length > size * 2)
	        throw new SizeExceedsPaddingSizeError({
	            size: Math.ceil(hex.length / 2),
	            targetSize: size,
	            type: 'Hex',
	        });
	    return `0x${hex[dir === 'right' ? 'padEnd' : 'padStart'](size * 2, '0')}`;
	}

	/**
	 * Encodes a number or bigint into a {@link ox#Hex.Hex} value.
	 *
	 * @example
	 * ```ts twoslash
	 * import { Hex } from 'ox'
	 *
	 * Hex.fromNumber(420)
	 * // @log: '0x1a4'
	 *
	 * Hex.fromNumber(420, { size: 32 })
	 * // @log: '0x00000000000000000000000000000000000000000000000000000000000001a4'
	 * ```
	 *
	 * @param value - The number or bigint value to encode.
	 * @param options - Options.
	 * @returns The encoded {@link ox#Hex.Hex} value.
	 */
	function fromNumber(value, options = {}) {
	    const { signed, size } = options;
	    const value_ = BigInt(value);
	    let maxValue;
	    if (size) {
	        if (signed)
	            maxValue = (1n << (BigInt(size) * 8n - 1n)) - 1n;
	        else
	            maxValue = 2n ** (BigInt(size) * 8n) - 1n;
	    }
	    else if (typeof value === 'number') {
	        maxValue = BigInt(Number.MAX_SAFE_INTEGER);
	    }
	    const minValue = typeof maxValue === 'bigint' && signed ? -maxValue - 1n : 0;
	    if ((maxValue && value_ > maxValue) || value_ < minValue) {
	        const suffix = typeof value === 'bigint' ? 'n' : '';
	        throw new IntegerOutOfRangeError({
	            max: maxValue ? `${maxValue}${suffix}` : undefined,
	            min: `${minValue}${suffix}`,
	            signed,
	            size,
	            value: `${value}${suffix}`,
	        });
	    }
	    const stringValue = (signed && value_ < 0 ? (1n << BigInt(size * 8)) + BigInt(value_) : value_).toString(16);
	    const hex = `0x${stringValue}`;
	    if (size)
	        return padLeft(hex, size);
	    return hex;
	}
	/**
	 * Pads a {@link ox#Hex.Hex} value to the left with zero bytes until it reaches the given `size` (default: 32 bytes).
	 *
	 * @example
	 * ```ts twoslash
	 * import { Hex } from 'ox'
	 *
	 * Hex.padLeft('0x1234', 4)
	 * // @log: '0x00001234'
	 * ```
	 *
	 * @param value - The {@link ox#Hex.Hex} value to pad.
	 * @param size - The size (in bytes) of the output hex value.
	 * @returns The padded {@link ox#Hex.Hex} value.
	 */
	function padLeft(value, size) {
	    return pad(value, { dir: 'left', size });
	}
	/**
	 * Thrown when the provided integer is out of range, and cannot be represented as a hex value.
	 *
	 * @example
	 * ```ts twoslash
	 * import { Hex } from 'ox'
	 *
	 * Hex.fromNumber(420182738912731283712937129)
	 * // @error: Hex.IntegerOutOfRangeError: Number \`4.2018273891273126e+26\` is not in safe unsigned integer range (`0` to `9007199254740991`)
	 * ```
	 */
	class IntegerOutOfRangeError extends BaseError$1 {
	    constructor({ max, min, signed, size, value, }) {
	        super(`Number \`${value}\` is not in safe${size ? ` ${size * 8}-bit` : ''}${signed ? ' signed' : ' unsigned'} integer range ${max ? `(\`${min}\` to \`${max}\`)` : `(above \`${min}\`)`}`);
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'Hex.IntegerOutOfRangeError'
	        });
	    }
	}
	/**
	 * Thrown when the size of the value exceeds the pad size.
	 *
	 * @example
	 * ```ts twoslash
	 * import { Hex } from 'ox'
	 *
	 * Hex.padLeft('0x1a4e12a45a21323123aaa87a897a897a898a6567a578a867a98778a667a85a875a87a6a787a65a675a6a9', 32)
	 * // @error: Hex.SizeExceedsPaddingSizeError: Hex size (`43`) exceeds padding size (`32`).
	 * ```
	 */
	class SizeExceedsPaddingSizeError extends BaseError$1 {
	    constructor({ size, targetSize, type, }) {
	        super(`${type.charAt(0).toUpperCase()}${type
            .slice(1)
            .toLowerCase()} size (\`${size}\`) exceeds padding size (\`${targetSize}\`).`);
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'Hex.SizeExceedsPaddingSizeError'
	        });
	    }
	}

	/**
	 * Converts a {@link ox#Withdrawal.Withdrawal} to an {@link ox#Withdrawal.Rpc}.
	 *
	 * @example
	 * ```ts twoslash
	 * import { Withdrawal } from 'ox'
	 *
	 * const withdrawal = Withdrawal.toRpc({
	 *   address: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
	 *   amount: 6423331n,
	 *   index: 0,
	 *   validatorIndex: 1,
	 * })
	 * // @log: {
	 * // @log:   address: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
	 * // @log:   amount: '0x620323',
	 * // @log:   index: '0x0',
	 * // @log:   validatorIndex: '0x1',
	 * // @log: }
	 * ```
	 *
	 * @param withdrawal - The Withdrawal to convert.
	 * @returns An RPC Withdrawal.
	 */
	function toRpc$1(withdrawal) {
	    return {
	        address: withdrawal.address,
	        amount: fromNumber(withdrawal.amount),
	        index: fromNumber(withdrawal.index),
	        validatorIndex: fromNumber(withdrawal.validatorIndex),
	    };
	}

	/**
	 * Converts an {@link ox#BlockOverrides.BlockOverrides} to an {@link ox#BlockOverrides.Rpc}.
	 *
	 * @example
	 * ```ts twoslash
	 * import { BlockOverrides } from 'ox'
	 *
	 * const blockOverrides = BlockOverrides.toRpc({
	 *   baseFeePerGas: 1n,
	 *   blobBaseFee: 2n,
	 *   feeRecipient: '0x0000000000000000000000000000000000000000',
	 *   gasLimit: 4n,
	 *   number: 5n,
	 *   prevRandao: 6n,
	 *   time: 78187493520n,
	 *   withdrawals: [
	 *     {
	 *       address: '0x0000000000000000000000000000000000000000',
	 *       amount: 1n,
	 *       index: 0,
	 *       validatorIndex: 1,
	 *     },
	 *   ],
	 * })
	 * ```
	 *
	 * @param blockOverrides - The block overrides to convert.
	 * @returns An instantiated {@link ox#BlockOverrides.Rpc}.
	 */
	function toRpc(blockOverrides) {
	    return {
	        ...(typeof blockOverrides.baseFeePerGas === 'bigint' && {
	            baseFeePerGas: fromNumber(blockOverrides.baseFeePerGas),
	        }),
	        ...(typeof blockOverrides.blobBaseFee === 'bigint' && {
	            blobBaseFee: fromNumber(blockOverrides.blobBaseFee),
	        }),
	        ...(typeof blockOverrides.feeRecipient === 'string' && {
	            feeRecipient: blockOverrides.feeRecipient,
	        }),
	        ...(typeof blockOverrides.gasLimit === 'bigint' && {
	            gasLimit: fromNumber(blockOverrides.gasLimit),
	        }),
	        ...(typeof blockOverrides.number === 'bigint' && {
	            number: fromNumber(blockOverrides.number),
	        }),
	        ...(typeof blockOverrides.prevRandao === 'bigint' && {
	            prevRandao: fromNumber(blockOverrides.prevRandao),
	        }),
	        ...(typeof blockOverrides.time === 'bigint' && {
	            time: fromNumber(blockOverrides.time),
	        }),
	        ...(blockOverrides.withdrawals && {
	            withdrawals: blockOverrides.withdrawals.map(toRpc$1),
	        }),
	    };
	}

	const aggregate3Signature = '0x82ad56cb';

	const deploylessCallViaBytecodeBytecode = '0x608060405234801561001057600080fd5b5060405161018e38038061018e83398101604081905261002f91610124565b6000808351602085016000f59050803b61004857600080fd5b6000808351602085016000855af16040513d6000823e81610067573d81fd5b3d81f35b634e487b7160e01b600052604160045260246000fd5b600082601f83011261009257600080fd5b81516001600160401b038111156100ab576100ab61006b565b604051601f8201601f19908116603f011681016001600160401b03811182821017156100d9576100d961006b565b6040528181528382016020018510156100f157600080fd5b60005b82811015610110576020818601810151838301820152016100f4565b506000918101602001919091529392505050565b6000806040838503121561013757600080fd5b82516001600160401b0381111561014d57600080fd5b61015985828601610081565b602085015190935090506001600160401b0381111561017757600080fd5b61018385828601610081565b915050925092905056fe';
	const deploylessCallViaFactoryBytecode = '0x608060405234801561001057600080fd5b506040516102c03803806102c083398101604081905261002f916101e6565b836001600160a01b03163b6000036100e457600080836001600160a01b03168360405161005c9190610270565b6000604051808303816000865af19150503d8060008114610099576040519150601f19603f3d011682016040523d82523d6000602084013e61009e565b606091505b50915091508115806100b857506001600160a01b0386163b155b156100e1578060405163101bb98d60e01b81526004016100d8919061028c565b60405180910390fd5b50505b6000808451602086016000885af16040513d6000823e81610103573d81fd5b3d81f35b80516001600160a01b038116811461011e57600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561015457818101518382015260200161013c565b50506000910152565b600082601f83011261016e57600080fd5b81516001600160401b0381111561018757610187610123565b604051601f8201601f19908116603f011681016001600160401b03811182821017156101b5576101b5610123565b6040528181528382016020018510156101cd57600080fd5b6101de826020830160208701610139565b949350505050565b600080600080608085870312156101fc57600080fd5b61020585610107565b60208601519094506001600160401b0381111561022157600080fd5b61022d8782880161015d565b93505061023c60408601610107565b60608601519092506001600160401b0381111561025857600080fd5b6102648782880161015d565b91505092959194509250565b60008251610282818460208701610139565b9190910192915050565b60208152600082518060208401526102ab816040850160208701610139565b601f01601f1916919091016040019291505056fe';
	const multicall3Bytecode = '0x608060405234801561001057600080fd5b506115b9806100206000396000f3fe6080604052600436106100f35760003560e01c80634d2301cc1161008a578063a8b0574e11610059578063a8b0574e14610325578063bce38bd714610350578063c3077fa914610380578063ee82ac5e146103b2576100f3565b80634d2301cc1461026257806372425d9d1461029f57806382ad56cb146102ca57806386d516e8146102fa576100f3565b80633408e470116100c65780633408e470146101af578063399542e9146101da5780633e64a6961461020c57806342cbb15c14610237576100f3565b80630f28c97d146100f8578063174dea7114610123578063252dba421461015357806327e86d6e14610184575b600080fd5b34801561010457600080fd5b5061010d6103ef565b60405161011a9190610c0a565b60405180910390f35b61013d60048036038101906101389190610c94565b6103f7565b60405161014a9190610e94565b60405180910390f35b61016d60048036038101906101689190610f0c565b610615565b60405161017b92919061101b565b60405180910390f35b34801561019057600080fd5b506101996107ab565b6040516101a69190611064565b60405180910390f35b3480156101bb57600080fd5b506101c46107b7565b6040516101d19190610c0a565b60405180910390f35b6101f460048036038101906101ef91906110ab565b6107bf565b6040516102039392919061110b565b60405180910390f35b34801561021857600080fd5b506102216107e1565b60405161022e9190610c0a565b60405180910390f35b34801561024357600080fd5b5061024c6107e9565b6040516102599190610c0a565b60405180910390f35b34801561026e57600080fd5b50610289600480360381019061028491906111a7565b6107f1565b6040516102969190610c0a565b60405180910390f35b3480156102ab57600080fd5b506102b4610812565b6040516102c19190610c0a565b60405180910390f35b6102e460048036038101906102df919061122a565b61081a565b6040516102f19190610e94565b60405180910390f35b34801561030657600080fd5b5061030f6109e4565b60405161031c9190610c0a565b60405180910390f35b34801561033157600080fd5b5061033a6109ec565b6040516103479190611286565b60405180910390f35b61036a600480360381019061036591906110ab565b6109f4565b6040516103779190610e94565b60405180910390f35b61039a60048036038101906103959190610f0c565b610ba6565b6040516103a99392919061110b565b60405180910390f35b3480156103be57600080fd5b506103d960048036038101906103d491906112cd565b610bca565b6040516103e69190611064565b60405180910390f35b600042905090565b60606000808484905090508067ffffffffffffffff81111561041c5761041b6112fa565b5b60405190808252806020026020018201604052801561045557816020015b610442610bd5565b81526020019060019003908161043a5790505b5092503660005b828110156105c957600085828151811061047957610478611329565b5b6020026020010151905087878381811061049657610495611329565b5b90506020028101906104a89190611367565b925060008360400135905080860195508360000160208101906104cb91906111a7565b73ffffffffffffffffffffffffffffffffffffffff16818580606001906104f2919061138f565b604051610500929190611431565b60006040518083038185875af1925050503d806000811461053d576040519150601f19603f3d011682016040523d82523d6000602084013e610542565b606091505b5083600001846020018290528215151515815250505081516020850135176105bc577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260846000fd5b826001019250505061045c565b5082341461060c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610603906114a7565b60405180910390fd5b50505092915050565b6000606043915060008484905090508067ffffffffffffffff81111561063e5761063d6112fa565b5b60405190808252806020026020018201604052801561067157816020015b606081526020019060019003908161065c5790505b5091503660005b828110156107a157600087878381811061069557610694611329565b5b90506020028101906106a791906114c7565b92508260000160208101906106bc91906111a7565b73ffffffffffffffffffffffffffffffffffffffff168380602001906106e2919061138f565b6040516106f0929190611431565b6000604051808303816000865af19150503d806000811461072d576040519150601f19603f3d011682016040523d82523d6000602084013e610732565b606091505b5086848151811061074657610745611329565b5b60200260200101819052819250505080610795576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161078c9061153b565b60405180910390fd5b81600101915050610678565b5050509250929050565b60006001430340905090565b600046905090565b6000806060439250434091506107d68686866109f4565b905093509350939050565b600048905090565b600043905090565b60008173ffffffffffffffffffffffffffffffffffffffff16319050919050565b600044905090565b606060008383905090508067ffffffffffffffff81111561083e5761083d6112fa565b5b60405190808252806020026020018201604052801561087757816020015b610864610bd5565b81526020019060019003908161085c5790505b5091503660005b828110156109db57600084828151811061089b5761089a611329565b5b602002602001015190508686838181106108b8576108b7611329565b5b90506020028101906108ca919061155b565b92508260000160208101906108df91906111a7565b73ffffffffffffffffffffffffffffffffffffffff16838060400190610905919061138f565b604051610913929190611431565b6000604051808303816000865af19150503d8060008114610950576040519150601f19603f3d011682016040523d82523d6000602084013e610955565b606091505b5082600001836020018290528215151515815250505080516020840135176109cf577f08c379a000000000000000000000000000000000000000000000000000000000600052602060045260176024527f4d756c746963616c6c333a2063616c6c206661696c656400000000000000000060445260646000fd5b8160010191505061087e565b50505092915050565b600045905090565b600041905090565b606060008383905090508067ffffffffffffffff811115610a1857610a176112fa565b5b604051908082528060200260200182016040528015610a5157816020015b610a3e610bd5565b815260200190600190039081610a365790505b5091503660005b82811015610b9c576000848281518110610a7557610a74611329565b5b60200260200101519050868683818110610a9257610a91611329565b5b9050602002810190610aa491906114c7565b9250826000016020810190610ab991906111a7565b73ffffffffffffffffffffffffffffffffffffffff16838060200190610adf919061138f565b604051610aed929190611431565b6000604051808303816000865af19150503d8060008114610b2a576040519150601f19603f3d011682016040523d82523d6000602084013e610b2f565b606091505b508260000183602001829052821515151581525050508715610b90578060000151610b8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b869061153b565b60405180910390fd5b5b81600101915050610a58565b5050509392505050565b6000806060610bb7600186866107bf565b8093508194508295505050509250925092565b600081409050919050565b6040518060400160405280600015158152602001606081525090565b6000819050919050565b610c0481610bf1565b82525050565b6000602082019050610c1f6000830184610bfb565b92915050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f840112610c5457610c53610c2f565b5b8235905067ffffffffffffffff811115610c7157610c70610c34565b5b602083019150836020820283011115610c8d57610c8c610c39565b5b9250929050565b60008060208385031215610cab57610caa610c25565b5b600083013567ffffffffffffffff811115610cc957610cc8610c2a565b5b610cd585828601610c3e565b92509250509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b60008115159050919050565b610d2281610d0d565b82525050565b600081519050919050565b600082825260208201905092915050565b60005b83811015610d62578082015181840152602081019050610d47565b83811115610d71576000848401525b50505050565b6000601f19601f8301169050919050565b6000610d9382610d28565b610d9d8185610d33565b9350610dad818560208601610d44565b610db681610d77565b840191505092915050565b6000604083016000830151610dd96000860182610d19565b5060208301518482036020860152610df18282610d88565b9150508091505092915050565b6000610e0a8383610dc1565b905092915050565b6000602082019050919050565b6000610e2a82610ce1565b610e348185610cec565b935083602082028501610e4685610cfd565b8060005b85811015610e825784840389528151610e638582610dfe565b9450610e6e83610e12565b925060208a01995050600181019050610e4a565b50829750879550505050505092915050565b60006020820190508181036000830152610eae8184610e1f565b905092915050565b60008083601f840112610ecc57610ecb610c2f565b5b8235905067ffffffffffffffff811115610ee957610ee8610c34565b5b602083019150836020820283011115610f0557610f04610c39565b5b9250929050565b60008060208385031215610f2357610f22610c25565b5b600083013567ffffffffffffffff811115610f4157610f40610c2a565b5b610f4d85828601610eb6565b92509250509250929050565b600081519050919050565b600082825260208201905092915050565b6000819050602082019050919050565b6000610f918383610d88565b905092915050565b6000602082019050919050565b6000610fb182610f59565b610fbb8185610f64565b935083602082028501610fcd85610f75565b8060005b858110156110095784840389528151610fea8582610f85565b9450610ff583610f99565b925060208a01995050600181019050610fd1565b50829750879550505050505092915050565b60006040820190506110306000830185610bfb565b81810360208301526110428184610fa6565b90509392505050565b6000819050919050565b61105e8161104b565b82525050565b60006020820190506110796000830184611055565b92915050565b61108881610d0d565b811461109357600080fd5b50565b6000813590506110a58161107f565b92915050565b6000806000604084860312156110c4576110c3610c25565b5b60006110d286828701611096565b935050602084013567ffffffffffffffff8111156110f3576110f2610c2a565b5b6110ff86828701610eb6565b92509250509250925092565b60006060820190506111206000830186610bfb565b61112d6020830185611055565b818103604083015261113f8184610e1f565b9050949350505050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061117482611149565b9050919050565b61118481611169565b811461118f57600080fd5b50565b6000813590506111a18161117b565b92915050565b6000602082840312156111bd576111bc610c25565b5b60006111cb84828501611192565b91505092915050565b60008083601f8401126111ea576111e9610c2f565b5b8235905067ffffffffffffffff81111561120757611206610c34565b5b60208301915083602082028301111561122357611222610c39565b5b9250929050565b6000806020838503121561124157611240610c25565b5b600083013567ffffffffffffffff81111561125f5761125e610c2a565b5b61126b858286016111d4565b92509250509250929050565b61128081611169565b82525050565b600060208201905061129b6000830184611277565b92915050565b6112aa81610bf1565b81146112b557600080fd5b50565b6000813590506112c7816112a1565b92915050565b6000602082840312156112e3576112e2610c25565b5b60006112f1848285016112b8565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b60008235600160800383360303811261138357611382611358565b5b80830191505092915050565b600080833560016020038436030381126113ac576113ab611358565b5b80840192508235915067ffffffffffffffff8211156113ce576113cd61135d565b5b6020830192506001820236038313156113ea576113e9611362565b5b509250929050565b600081905092915050565b82818337600083830152505050565b600061141883856113f2565b93506114258385846113fd565b82840190509392505050565b600061143e82848661140c565b91508190509392505050565b600082825260208201905092915050565b7f4d756c746963616c6c333a2076616c7565206d69736d61746368000000000000600082015250565b6000611491601a8361144a565b915061149c8261145b565b602082019050919050565b600060208201905081810360008301526114c081611484565b9050919050565b6000823560016040038336030381126114e3576114e2611358565b5b80830191505092915050565b7f4d756c746963616c6c333a2063616c6c206661696c6564000000000000000000600082015250565b600061152560178361144a565b9150611530826114ef565b602082019050919050565b6000602082019050818103600083015261155481611518565b9050919050565b60008235600160600383360303811261157757611576611358565b5b8083019150509291505056fea264697066735822122020c1bc9aacf8e4a6507193432a895a8e77094f45a1395583f07b24e860ef06cd64736f6c634300080c0033';

	const docsPath = '/docs/contract/encodeDeployData';
	function encodeDeployData(parameters) {
	    const { abi, args, bytecode } = parameters;
	    if (!args || args.length === 0)
	        return bytecode;
	    const description = abi.find((x) => 'type' in x && x.type === 'constructor');
	    if (!description)
	        throw new AbiConstructorNotFoundError({ docsPath });
	    if (!('inputs' in description))
	        throw new AbiConstructorParamsNotFoundError({ docsPath });
	    if (!description.inputs || description.inputs.length === 0)
	        throw new AbiConstructorParamsNotFoundError({ docsPath });
	    const data = encodeAbiParameters(description.inputs, args);
	    return concatHex([bytecode, data]);
	}

	class ExecutionRevertedError extends BaseError$3 {
	    constructor({ cause, message, } = {}) {
	        const reason = message
	            ?.replace('execution reverted: ', '')
	            ?.replace('execution reverted', '');
	        super(`Execution reverted ${reason ? `with reason: ${reason}` : 'for an unknown reason'}.`, {
	            cause,
	            name: 'ExecutionRevertedError',
	        });
	    }
	}
	Object.defineProperty(ExecutionRevertedError, "code", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: 3
	});
	Object.defineProperty(ExecutionRevertedError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /execution reverted/
	});
	class FeeCapTooHighError extends BaseError$3 {
	    constructor({ cause, maxFeePerGas, } = {}) {
	        super(`The fee cap (\`maxFeePerGas\`${maxFeePerGas ? ` = ${formatGwei(maxFeePerGas)} gwei` : ''}) cannot be higher than the maximum allowed value (2^256-1).`, {
	            cause,
	            name: 'FeeCapTooHighError',
	        });
	    }
	}
	Object.defineProperty(FeeCapTooHighError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /max fee per gas higher than 2\^256-1|fee cap higher than 2\^256-1/
	});
	class FeeCapTooLowError extends BaseError$3 {
	    constructor({ cause, maxFeePerGas, } = {}) {
	        super(`The fee cap (\`maxFeePerGas\`${maxFeePerGas ? ` = ${formatGwei(maxFeePerGas)}` : ''} gwei) cannot be lower than the block base fee.`, {
	            cause,
	            name: 'FeeCapTooLowError',
	        });
	    }
	}
	Object.defineProperty(FeeCapTooLowError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /max fee per gas less than block base fee|fee cap less than block base fee|transaction is outdated/
	});
	class NonceTooHighError extends BaseError$3 {
	    constructor({ cause, nonce, } = {}) {
	        super(`Nonce provided for the transaction ${nonce ? `(${nonce}) ` : ''}is higher than the next one expected.`, { cause, name: 'NonceTooHighError' });
	    }
	}
	Object.defineProperty(NonceTooHighError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /nonce too high/
	});
	class NonceTooLowError extends BaseError$3 {
	    constructor({ cause, nonce, } = {}) {
	        super([
	            `Nonce provided for the transaction ${nonce ? `(${nonce}) ` : ''}is lower than the current nonce of the account.`,
	            'Try increasing the nonce or find the latest nonce with `getTransactionCount`.',
	        ].join('\n'), { cause, name: 'NonceTooLowError' });
	    }
	}
	Object.defineProperty(NonceTooLowError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /nonce too low|transaction already imported|already known/
	});
	class NonceMaxValueError extends BaseError$3 {
	    constructor({ cause, nonce, } = {}) {
	        super(`Nonce provided for the transaction ${nonce ? `(${nonce}) ` : ''}exceeds the maximum allowed nonce.`, { cause, name: 'NonceMaxValueError' });
	    }
	}
	Object.defineProperty(NonceMaxValueError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /nonce has max value/
	});
	class InsufficientFundsError extends BaseError$3 {
	    constructor({ cause } = {}) {
	        super([
	            'The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account.',
	        ].join('\n'), {
	            cause,
	            metaMessages: [
	                'This error could arise when the account does not have enough funds to:',
	                ' - pay for the total gas fee,',
	                ' - pay for the value to send.',
	                ' ',
	                'The cost of the transaction is calculated as `gas * gas fee + value`, where:',
	                ' - `gas` is the amount of gas needed for transaction to execute,',
	                ' - `gas fee` is the gas fee,',
	                ' - `value` is the amount of ether to send to the recipient.',
	            ],
	            name: 'InsufficientFundsError',
	        });
	    }
	}
	Object.defineProperty(InsufficientFundsError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /insufficient funds|exceeds transaction sender account balance/
	});
	class IntrinsicGasTooHighError extends BaseError$3 {
	    constructor({ cause, gas, } = {}) {
	        super(`The amount of gas ${gas ? `(${gas}) ` : ''}provided for the transaction exceeds the limit allowed for the block.`, {
	            cause,
	            name: 'IntrinsicGasTooHighError',
	        });
	    }
	}
	Object.defineProperty(IntrinsicGasTooHighError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /intrinsic gas too high|gas limit reached/
	});
	class IntrinsicGasTooLowError extends BaseError$3 {
	    constructor({ cause, gas, } = {}) {
	        super(`The amount of gas ${gas ? `(${gas}) ` : ''}provided for the transaction is too low.`, {
	            cause,
	            name: 'IntrinsicGasTooLowError',
	        });
	    }
	}
	Object.defineProperty(IntrinsicGasTooLowError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /intrinsic gas too low/
	});
	class TransactionTypeNotSupportedError extends BaseError$3 {
	    constructor({ cause }) {
	        super('The transaction type is not supported for this chain.', {
	            cause,
	            name: 'TransactionTypeNotSupportedError',
	        });
	    }
	}
	Object.defineProperty(TransactionTypeNotSupportedError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /transaction type not valid/
	});
	class TipAboveFeeCapError extends BaseError$3 {
	    constructor({ cause, maxPriorityFeePerGas, maxFeePerGas, } = {}) {
	        super([
	            `The provided tip (\`maxPriorityFeePerGas\`${maxPriorityFeePerGas
                ? ` = ${formatGwei(maxPriorityFeePerGas)} gwei`
                : ''}) cannot be higher than the fee cap (\`maxFeePerGas\`${maxFeePerGas ? ` = ${formatGwei(maxFeePerGas)} gwei` : ''}).`,
	        ].join('\n'), {
	            cause,
	            name: 'TipAboveFeeCapError',
	        });
	    }
	}
	Object.defineProperty(TipAboveFeeCapError, "nodeMessage", {
	    enumerable: true,
	    configurable: true,
	    writable: true,
	    value: /max priority fee per gas higher than max fee per gas|tip higher than fee cap/
	});
	class UnknownNodeError extends BaseError$3 {
	    constructor({ cause }) {
	        super(`An error occurred while executing: ${cause?.shortMessage}`, {
	            cause,
	            name: 'UnknownNodeError',
	        });
	    }
	}

	function getNodeError(err, args) {
	    const message = (err.details || '').toLowerCase();
	    const executionRevertedError = err instanceof BaseError$3
	        ? err.walk((e) => e?.code ===
	            ExecutionRevertedError.code)
	        : err;
	    if (executionRevertedError instanceof BaseError$3)
	        return new ExecutionRevertedError({
	            cause: err,
	            message: executionRevertedError.details,
	        });
	    if (ExecutionRevertedError.nodeMessage.test(message))
	        return new ExecutionRevertedError({
	            cause: err,
	            message: err.details,
	        });
	    if (FeeCapTooHighError.nodeMessage.test(message))
	        return new FeeCapTooHighError({
	            cause: err,
	            maxFeePerGas: args?.maxFeePerGas,
	        });
	    if (FeeCapTooLowError.nodeMessage.test(message))
	        return new FeeCapTooLowError({
	            cause: err,
	            maxFeePerGas: args?.maxFeePerGas,
	        });
	    if (NonceTooHighError.nodeMessage.test(message))
	        return new NonceTooHighError({ cause: err, nonce: args?.nonce });
	    if (NonceTooLowError.nodeMessage.test(message))
	        return new NonceTooLowError({ cause: err, nonce: args?.nonce });
	    if (NonceMaxValueError.nodeMessage.test(message))
	        return new NonceMaxValueError({ cause: err, nonce: args?.nonce });
	    if (InsufficientFundsError.nodeMessage.test(message))
	        return new InsufficientFundsError({ cause: err });
	    if (IntrinsicGasTooHighError.nodeMessage.test(message))
	        return new IntrinsicGasTooHighError({ cause: err, gas: args?.gas });
	    if (IntrinsicGasTooLowError.nodeMessage.test(message))
	        return new IntrinsicGasTooLowError({ cause: err, gas: args?.gas });
	    if (TransactionTypeNotSupportedError.nodeMessage.test(message))
	        return new TransactionTypeNotSupportedError({ cause: err });
	    if (TipAboveFeeCapError.nodeMessage.test(message))
	        return new TipAboveFeeCapError({
	            cause: err,
	            maxFeePerGas: args?.maxFeePerGas,
	            maxPriorityFeePerGas: args?.maxPriorityFeePerGas,
	        });
	    return new UnknownNodeError({
	        cause: err,
	    });
	}

	function getCallError(err, { docsPath, ...args }) {
	    const cause = (() => {
	        const cause = getNodeError(err, args);
	        if (cause instanceof UnknownNodeError)
	            return err;
	        return cause;
	    })();
	    return new CallExecutionError(cause, {
	        docsPath,
	        ...args,
	    });
	}

	/**
	 * @description Picks out the keys from `value` that exist in the formatter..
	 */
	function extract(value_, { format }) {
	    if (!format)
	        return {};
	    const value = {};
	    function extract_(formatted) {
	        const keys = Object.keys(formatted);
	        for (const key of keys) {
	            if (key in value_)
	                value[key] = value_[key];
	            if (formatted[key] &&
	                typeof formatted[key] === 'object' &&
	                !Array.isArray(formatted[key]))
	                extract_(formatted[key]);
	        }
	    }
	    const formatted = format(value_ || {});
	    extract_(formatted);
	    return value;
	}

	function defineFormatter(type, format) {
	    return ({ exclude, format: overrides, }) => {
	        return {
	            exclude,
	            format: (args, action) => {
	                const formatted = format(args, action);
	                if (exclude) {
	                    for (const key of exclude) {
	                        delete formatted[key];
	                    }
	                }
	                return {
	                    ...formatted,
	                    ...overrides(args, action),
	                };
	            },
	            type,
	        };
	    };
	}

	const rpcTransactionType = {
	    legacy: '0x0',
	    eip2930: '0x1',
	    eip1559: '0x2',
	    eip4844: '0x3',
	    eip7702: '0x4',
	};
	function formatTransactionRequest(request, _) {
	    const rpcRequest = {};
	    if (typeof request.authorizationList !== 'undefined')
	        rpcRequest.authorizationList = formatAuthorizationList$1(request.authorizationList);
	    if (typeof request.accessList !== 'undefined')
	        rpcRequest.accessList = request.accessList;
	    if (typeof request.blobVersionedHashes !== 'undefined')
	        rpcRequest.blobVersionedHashes = request.blobVersionedHashes;
	    if (typeof request.blobs !== 'undefined') {
	        if (typeof request.blobs[0] !== 'string')
	            rpcRequest.blobs = request.blobs.map((x) => bytesToHex$1(x));
	        else
	            rpcRequest.blobs = request.blobs;
	    }
	    if (typeof request.data !== 'undefined')
	        rpcRequest.data = request.data;
	    if (request.account)
	        rpcRequest.from = request.account.address;
	    if (typeof request.from !== 'undefined')
	        rpcRequest.from = request.from;
	    if (typeof request.gas !== 'undefined')
	        rpcRequest.gas = numberToHex(request.gas);
	    if (typeof request.gasPrice !== 'undefined')
	        rpcRequest.gasPrice = numberToHex(request.gasPrice);
	    if (typeof request.maxFeePerBlobGas !== 'undefined')
	        rpcRequest.maxFeePerBlobGas = numberToHex(request.maxFeePerBlobGas);
	    if (typeof request.maxFeePerGas !== 'undefined')
	        rpcRequest.maxFeePerGas = numberToHex(request.maxFeePerGas);
	    if (typeof request.maxPriorityFeePerGas !== 'undefined')
	        rpcRequest.maxPriorityFeePerGas = numberToHex(request.maxPriorityFeePerGas);
	    if (typeof request.nonce !== 'undefined')
	        rpcRequest.nonce = numberToHex(request.nonce);
	    if (typeof request.to !== 'undefined')
	        rpcRequest.to = request.to;
	    if (typeof request.type !== 'undefined')
	        rpcRequest.type = rpcTransactionType[request.type];
	    if (typeof request.value !== 'undefined')
	        rpcRequest.value = numberToHex(request.value);
	    return rpcRequest;
	}
	//////////////////////////////////////////////////////////////////////////////
	function formatAuthorizationList$1(authorizationList) {
	    return authorizationList.map((authorization) => ({
	        address: authorization.address,
	        r: authorization.r
	            ? numberToHex(BigInt(authorization.r))
	            : authorization.r,
	        s: authorization.s
	            ? numberToHex(BigInt(authorization.s))
	            : authorization.s,
	        chainId: numberToHex(authorization.chainId),
	        nonce: numberToHex(authorization.nonce),
	        ...(typeof authorization.yParity !== 'undefined'
	            ? { yParity: numberToHex(authorization.yParity) }
	            : {}),
	        ...(typeof authorization.v !== 'undefined' &&
	            typeof authorization.yParity === 'undefined'
	            ? { v: numberToHex(authorization.v) }
	            : {}),
	    }));
	}

	/** @internal */
	function withResolvers() {
	    let resolve = () => undefined;
	    let reject = () => undefined;
	    const promise = new Promise((resolve_, reject_) => {
	        resolve = resolve_;
	        reject = reject_;
	    });
	    return { promise, resolve, reject };
	}

	const schedulerCache = /*#__PURE__*/ new Map();
	/** @internal */
	function createBatchScheduler({ fn, id, shouldSplitBatch, wait = 0, sort, }) {
	    const exec = async () => {
	        const scheduler = getScheduler();
	        flush();
	        const args = scheduler.map(({ args }) => args);
	        if (args.length === 0)
	            return;
	        fn(args)
	            .then((data) => {
	            if (sort && Array.isArray(data))
	                data.sort(sort);
	            for (let i = 0; i < scheduler.length; i++) {
	                const { resolve } = scheduler[i];
	                resolve?.([data[i], data]);
	            }
	        })
	            .catch((err) => {
	            for (let i = 0; i < scheduler.length; i++) {
	                const { reject } = scheduler[i];
	                reject?.(err);
	            }
	        });
	    };
	    const flush = () => schedulerCache.delete(id);
	    const getBatchedArgs = () => getScheduler().map(({ args }) => args);
	    const getScheduler = () => schedulerCache.get(id) || [];
	    const setScheduler = (item) => schedulerCache.set(id, [...getScheduler(), item]);
	    return {
	        flush,
	        async schedule(args) {
	            const { promise, resolve, reject } = withResolvers();
	            const split = shouldSplitBatch?.([...getBatchedArgs(), args]);
	            if (split)
	                exec();
	            const hasActiveScheduler = getScheduler().length > 0;
	            if (hasActiveScheduler) {
	                setScheduler({ args, resolve, reject });
	                return promise;
	            }
	            setScheduler({ args, resolve, reject });
	            setTimeout(exec, wait);
	            return promise;
	        },
	    };
	}

	/** @internal */
	function serializeStateMapping(stateMapping) {
	    if (!stateMapping || stateMapping.length === 0)
	        return undefined;
	    return stateMapping.reduce((acc, { slot, value }) => {
	        if (slot.length !== 66)
	            throw new InvalidBytesLengthError({
	                size: slot.length,
	                targetSize: 66,
	                type: 'hex',
	            });
	        if (value.length !== 66)
	            throw new InvalidBytesLengthError({
	                size: value.length,
	                targetSize: 66,
	                type: 'hex',
	            });
	        acc[slot] = value;
	        return acc;
	    }, {});
	}
	/** @internal */
	function serializeAccountStateOverride(parameters) {
	    const { balance, nonce, state, stateDiff, code } = parameters;
	    const rpcAccountStateOverride = {};
	    if (code !== undefined)
	        rpcAccountStateOverride.code = code;
	    if (balance !== undefined)
	        rpcAccountStateOverride.balance = numberToHex(balance);
	    if (nonce !== undefined)
	        rpcAccountStateOverride.nonce = numberToHex(nonce);
	    if (state !== undefined)
	        rpcAccountStateOverride.state = serializeStateMapping(state);
	    if (stateDiff !== undefined) {
	        if (rpcAccountStateOverride.state)
	            throw new StateAssignmentConflictError();
	        rpcAccountStateOverride.stateDiff = serializeStateMapping(stateDiff);
	    }
	    return rpcAccountStateOverride;
	}
	/** @internal */
	function serializeStateOverride(parameters) {
	    if (!parameters)
	        return undefined;
	    const rpcStateOverride = {};
	    for (const { address, ...accountState } of parameters) {
	        if (!isAddress(address, { strict: false }))
	            throw new InvalidAddressError({ address });
	        if (rpcStateOverride[address])
	            throw new AccountStateConflictError({ address: address });
	        rpcStateOverride[address] = serializeAccountStateOverride(accountState);
	    }
	    return rpcStateOverride;
	}

	const maxUint256 = 2n ** 256n - 1n;

	function assertRequest(args) {
	    const { account: account_, gasPrice, maxFeePerGas, maxPriorityFeePerGas, to, } = args;
	    const account = account_ ? parseAccount(account_) : undefined;
	    if (account && !isAddress(account.address))
	        throw new InvalidAddressError({ address: account.address });
	    if (to && !isAddress(to))
	        throw new InvalidAddressError({ address: to });
	    if (typeof gasPrice !== 'undefined' &&
	        (typeof maxFeePerGas !== 'undefined' ||
	            typeof maxPriorityFeePerGas !== 'undefined'))
	        throw new FeeConflictError();
	    if (maxFeePerGas && maxFeePerGas > maxUint256)
	        throw new FeeCapTooHighError({ maxFeePerGas });
	    if (maxPriorityFeePerGas &&
	        maxFeePerGas &&
	        maxPriorityFeePerGas > maxFeePerGas)
	        throw new TipAboveFeeCapError({ maxFeePerGas, maxPriorityFeePerGas });
	}

	/**
	 * Executes a new message call immediately without submitting a transaction to the network.
	 *
	 * - Docs: https://viem.sh/docs/actions/public/call
	 * - JSON-RPC Methods: [`eth_call`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_call)
	 *
	 * @param client - Client to use
	 * @param parameters - {@link CallParameters}
	 * @returns The call data. {@link CallReturnType}
	 *
	 * @example
	 * import { createPublicClient, http } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { call } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const data = await call(client, {
	 *   account: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
	 *   data: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
	 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
	 * })
	 */
	async function call(client, args) {
	    const { account: account_ = client.account, authorizationList, batch = Boolean(client.batch?.multicall), blockNumber, blockTag = client.experimental_blockTag ?? 'latest', accessList, blobs, blockOverrides, code, data: data_, factory, factoryData, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value, stateOverride, ...rest } = args;
	    const account = account_ ? parseAccount(account_) : undefined;
	    if (code && (factory || factoryData))
	        throw new BaseError$3('Cannot provide both `code` & `factory`/`factoryData` as parameters.');
	    if (code && to)
	        throw new BaseError$3('Cannot provide both `code` & `to` as parameters.');
	    // Check if the call is deployless via bytecode.
	    const deploylessCallViaBytecode = code && data_;
	    // Check if the call is deployless via a factory.
	    const deploylessCallViaFactory = factory && factoryData && to && data_;
	    const deploylessCall = deploylessCallViaBytecode || deploylessCallViaFactory;
	    const data = (() => {
	        if (deploylessCallViaBytecode)
	            return toDeploylessCallViaBytecodeData({
	                code,
	                data: data_,
	            });
	        if (deploylessCallViaFactory)
	            return toDeploylessCallViaFactoryData({
	                data: data_,
	                factory,
	                factoryData,
	                to,
	            });
	        return data_;
	    })();
	    try {
	        assertRequest(args);
	        const blockNumberHex = typeof blockNumber === 'bigint' ? numberToHex(blockNumber) : undefined;
	        const block = blockNumberHex || blockTag;
	        const rpcBlockOverrides = blockOverrides
	            ? toRpc(blockOverrides)
	            : undefined;
	        const rpcStateOverride = serializeStateOverride(stateOverride);
	        const chainFormat = client.chain?.formatters?.transactionRequest?.format;
	        const format = chainFormat || formatTransactionRequest;
	        const request = format({
	            // Pick out extra data that might exist on the chain's transaction request type.
	            ...extract(rest, { format: chainFormat }),
	            accessList,
	            account,
	            authorizationList,
	            blobs,
	            data,
	            gas,
	            gasPrice,
	            maxFeePerBlobGas,
	            maxFeePerGas,
	            maxPriorityFeePerGas,
	            nonce,
	            to: deploylessCall ? undefined : to,
	            value,
	        }, 'call');
	        if (batch &&
	            shouldPerformMulticall({ request }) &&
	            !rpcStateOverride &&
	            !rpcBlockOverrides) {
	            try {
	                return await scheduleMulticall(client, {
	                    ...request,
	                    blockNumber,
	                    blockTag,
	                });
	            }
	            catch (err) {
	                if (!(err instanceof ClientChainNotConfiguredError) &&
	                    !(err instanceof ChainDoesNotSupportContract))
	                    throw err;
	            }
	        }
	        const params = (() => {
	            const base = [
	                request,
	                block,
	            ];
	            if (rpcStateOverride && rpcBlockOverrides)
	                return [...base, rpcStateOverride, rpcBlockOverrides];
	            if (rpcStateOverride)
	                return [...base, rpcStateOverride];
	            if (rpcBlockOverrides)
	                return [...base, {}, rpcBlockOverrides];
	            return base;
	        })();
	        const response = await client.request({
	            method: 'eth_call',
	            params,
	        });
	        if (response === '0x')
	            return { data: undefined };
	        return { data: response };
	    }
	    catch (err) {
	        const data = getRevertErrorData(err);
	        // Check for CCIP-Read offchain lookup signature.
	        const { offchainLookup, offchainLookupSignature } = await Promise.resolve().then(function () { return ccip; });
	        if (client.ccipRead !== false &&
	            data?.slice(0, 10) === offchainLookupSignature &&
	            to)
	            return { data: await offchainLookup(client, { data, to }) };
	        // Check for counterfactual deployment error.
	        if (deploylessCall && data?.slice(0, 10) === '0x101bb98d')
	            throw new CounterfactualDeploymentFailedError({ factory });
	        throw getCallError(err, {
	            ...args,
	            account,
	            chain: client.chain,
	        });
	    }
	}
	// We only want to perform a scheduled multicall if:
	// - The request has calldata,
	// - The request has a target address,
	// - The target address is not already the aggregate3 signature,
	// - The request has no other properties (`nonce`, `gas`, etc cannot be sent with a multicall).
	function shouldPerformMulticall({ request }) {
	    const { data, to, ...request_ } = request;
	    if (!data)
	        return false;
	    if (data.startsWith(aggregate3Signature))
	        return false;
	    if (!to)
	        return false;
	    if (Object.values(request_).filter((x) => typeof x !== 'undefined').length > 0)
	        return false;
	    return true;
	}
	async function scheduleMulticall(client, args) {
	    const { batchSize = 1024, deployless = false, wait = 0, } = typeof client.batch?.multicall === 'object' ? client.batch.multicall : {};
	    const { blockNumber, blockTag = client.experimental_blockTag ?? 'latest', data, to, } = args;
	    const multicallAddress = (() => {
	        if (deployless)
	            return null;
	        if (args.multicallAddress)
	            return args.multicallAddress;
	        if (client.chain) {
	            return getChainContractAddress({
	                blockNumber,
	                chain: client.chain,
	                contract: 'multicall3',
	            });
	        }
	        throw new ClientChainNotConfiguredError();
	    })();
	    const blockNumberHex = typeof blockNumber === 'bigint' ? numberToHex(blockNumber) : undefined;
	    const block = blockNumberHex || blockTag;
	    const { schedule } = createBatchScheduler({
	        id: `${client.uid}.${block}`,
	        wait,
	        shouldSplitBatch(args) {
	            const size = args.reduce((size, { data }) => size + (data.length - 2), 0);
	            return size > batchSize * 2;
	        },
	        fn: async (requests) => {
	            const calls = requests.map((request) => ({
	                allowFailure: true,
	                callData: request.data,
	                target: request.to,
	            }));
	            const calldata = encodeFunctionData({
	                abi: multicall3Abi,
	                args: [calls],
	                functionName: 'aggregate3',
	            });
	            const data = await client.request({
	                method: 'eth_call',
	                params: [
	                    {
	                        ...(multicallAddress === null
	                            ? {
	                                data: toDeploylessCallViaBytecodeData({
	                                    code: multicall3Bytecode,
	                                    data: calldata,
	                                }),
	                            }
	                            : { to: multicallAddress, data: calldata }),
	                    },
	                    block,
	                ],
	            });
	            return decodeFunctionResult({
	                abi: multicall3Abi,
	                args: [calls],
	                functionName: 'aggregate3',
	                data: data || '0x',
	            });
	        },
	    });
	    const [{ returnData, success }] = await schedule({ data, to });
	    if (!success)
	        throw new RawContractError({ data: returnData });
	    if (returnData === '0x')
	        return { data: undefined };
	    return { data: returnData };
	}
	function toDeploylessCallViaBytecodeData(parameters) {
	    const { code, data } = parameters;
	    return encodeDeployData({
	        abi: parseAbi(['constructor(bytes, bytes)']),
	        bytecode: deploylessCallViaBytecodeBytecode,
	        args: [code, data],
	    });
	}
	function toDeploylessCallViaFactoryData(parameters) {
	    const { data, factory, factoryData, to } = parameters;
	    return encodeDeployData({
	        abi: parseAbi(['constructor(address, bytes, address, bytes)']),
	        bytecode: deploylessCallViaFactoryBytecode,
	        args: [to, data, factory, factoryData],
	    });
	}
	/** @internal */
	function getRevertErrorData(err) {
	    if (!(err instanceof BaseError$3))
	        return undefined;
	    const error = err.walk();
	    return typeof error?.data === 'object' ? error.data?.data : error.data;
	}

	/**
	 * Calls a read-only function on a contract, and returns the response.
	 *
	 * - Docs: https://viem.sh/docs/contract/readContract
	 * - Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/contracts_reading-contracts
	 *
	 * A "read-only" function (constant function) on a Solidity contract is denoted by a `view` or `pure` keyword. They can only read the state of the contract, and cannot make any changes to it. Since read-only methods do not change the state of the contract, they do not require any gas to be executed, and can be called by any user without the need to pay for gas.
	 *
	 * Internally, uses a [Public Client](https://viem.sh/docs/clients/public) to call the [`call` action](https://viem.sh/docs/actions/public/call) with [ABI-encoded `data`](https://viem.sh/docs/contract/encodeFunctionData).
	 *
	 * @param client - Client to use
	 * @param parameters - {@link ReadContractParameters}
	 * @returns The response from the contract. Type is inferred. {@link ReadContractReturnType}
	 *
	 * @example
	 * import { createPublicClient, http, parseAbi } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { readContract } from 'viem/contract'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const result = await readContract(client, {
	 *   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
	 *   abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
	 *   functionName: 'balanceOf',
	 *   args: ['0xA0Cf798816D4b9b9866b5330EEa46a18382f251e'],
	 * })
	 * // 424122n
	 */
	async function readContract$1(client, parameters) {
	    const { abi, address, args, functionName, ...rest } = parameters;
	    const calldata = encodeFunctionData({
	        abi,
	        args,
	        functionName,
	    });
	    try {
	        const { data } = await getAction$1(client, call, 'call')({
	            ...rest,
	            data: calldata,
	            to: address,
	        });
	        return decodeFunctionResult({
	            abi,
	            args,
	            functionName,
	            data: data || '0x',
	        });
	    }
	    catch (error) {
	        throw getContractError(error, {
	            abi,
	            address,
	            args,
	            docsPath: '/docs/contract/readContract',
	            functionName,
	        });
	    }
	}

	/**
	 * @description Converts an ECDSA public key to an address.
	 *
	 * @param publicKey The public key to convert.
	 *
	 * @returns The address.
	 */
	function publicKeyToAddress(publicKey) {
	    const address = keccak256(`0x${publicKey.substring(4)}`).substring(26);
	    return checksumAddress(`0x${address}`);
	}

	async function recoverPublicKey({ hash, signature, }) {
	    const hashHex = isHex(hash) ? hash : toHex(hash);
	    const { secp256k1 } = await Promise.resolve().then(function () { return secp256k1$1; });
	    const signature_ = (() => {
	        // typeof signature: `Signature`
	        if (typeof signature === 'object' && 'r' in signature && 's' in signature) {
	            const { r, s, v, yParity } = signature;
	            const yParityOrV = Number(yParity ?? v);
	            const recoveryBit = toRecoveryBit(yParityOrV);
	            return new secp256k1.Signature(hexToBigInt(r), hexToBigInt(s)).addRecoveryBit(recoveryBit);
	        }
	        // typeof signature: `Hex | ByteArray`
	        const signatureHex = isHex(signature) ? signature : toHex(signature);
	        if (size$2(signatureHex) !== 65)
	            throw new Error('invalid signature length');
	        const yParityOrV = hexToNumber$1(`0x${signatureHex.slice(130)}`);
	        const recoveryBit = toRecoveryBit(yParityOrV);
	        return secp256k1.Signature.fromCompact(signatureHex.substring(2, 130)).addRecoveryBit(recoveryBit);
	    })();
	    const publicKey = signature_
	        .recoverPublicKey(hashHex.substring(2))
	        .toHex(false);
	    return `0x${publicKey}`;
	}
	function toRecoveryBit(yParityOrV) {
	    if (yParityOrV === 0 || yParityOrV === 1)
	        return yParityOrV;
	    if (yParityOrV === 27)
	        return 0;
	    if (yParityOrV === 28)
	        return 1;
	    throw new Error('Invalid yParityOrV value');
	}

	async function recoverAddress({ hash, signature, }) {
	    return publicKeyToAddress(await recoverPublicKey({ hash, signature }));
	}

	function toRlp(bytes, to = 'hex') {
	    const encodable = getEncodable(bytes);
	    const cursor = createCursor(new Uint8Array(encodable.length));
	    encodable.encode(cursor);
	    if (to === 'hex')
	        return bytesToHex$1(cursor.bytes);
	    return cursor.bytes;
	}
	function getEncodable(bytes) {
	    if (Array.isArray(bytes))
	        return getEncodableList(bytes.map((x) => getEncodable(x)));
	    return getEncodableBytes(bytes);
	}
	function getEncodableList(list) {
	    const bodyLength = list.reduce((acc, x) => acc + x.length, 0);
	    const sizeOfBodyLength = getSizeOfLength(bodyLength);
	    const length = (() => {
	        if (bodyLength <= 55)
	            return 1 + bodyLength;
	        return 1 + sizeOfBodyLength + bodyLength;
	    })();
	    return {
	        length,
	        encode(cursor) {
	            if (bodyLength <= 55) {
	                cursor.pushByte(0xc0 + bodyLength);
	            }
	            else {
	                cursor.pushByte(0xc0 + 55 + sizeOfBodyLength);
	                if (sizeOfBodyLength === 1)
	                    cursor.pushUint8(bodyLength);
	                else if (sizeOfBodyLength === 2)
	                    cursor.pushUint16(bodyLength);
	                else if (sizeOfBodyLength === 3)
	                    cursor.pushUint24(bodyLength);
	                else
	                    cursor.pushUint32(bodyLength);
	            }
	            for (const { encode } of list) {
	                encode(cursor);
	            }
	        },
	    };
	}
	function getEncodableBytes(bytesOrHex) {
	    const bytes = typeof bytesOrHex === 'string' ? hexToBytes$1(bytesOrHex) : bytesOrHex;
	    const sizeOfBytesLength = getSizeOfLength(bytes.length);
	    const length = (() => {
	        if (bytes.length === 1 && bytes[0] < 0x80)
	            return 1;
	        if (bytes.length <= 55)
	            return 1 + bytes.length;
	        return 1 + sizeOfBytesLength + bytes.length;
	    })();
	    return {
	        length,
	        encode(cursor) {
	            if (bytes.length === 1 && bytes[0] < 0x80) {
	                cursor.pushBytes(bytes);
	            }
	            else if (bytes.length <= 55) {
	                cursor.pushByte(0x80 + bytes.length);
	                cursor.pushBytes(bytes);
	            }
	            else {
	                cursor.pushByte(0x80 + 55 + sizeOfBytesLength);
	                if (sizeOfBytesLength === 1)
	                    cursor.pushUint8(bytes.length);
	                else if (sizeOfBytesLength === 2)
	                    cursor.pushUint16(bytes.length);
	                else if (sizeOfBytesLength === 3)
	                    cursor.pushUint24(bytes.length);
	                else
	                    cursor.pushUint32(bytes.length);
	                cursor.pushBytes(bytes);
	            }
	        },
	    };
	}
	function getSizeOfLength(length) {
	    if (length < 2 ** 8)
	        return 1;
	    if (length < 2 ** 16)
	        return 2;
	    if (length < 2 ** 24)
	        return 3;
	    if (length < 2 ** 32)
	        return 4;
	    throw new BaseError$3('Length is too large.');
	}

	/**
	 * Computes an Authorization hash in [EIP-7702 format](https://eips.ethereum.org/EIPS/eip-7702): `keccak256('0x05' || rlp([chain_id, address, nonce]))`.
	 */
	function hashAuthorization(parameters) {
	    const { chainId, nonce, to } = parameters;
	    const address = parameters.contractAddress ?? parameters.address;
	    const hash = keccak256(concatHex([
	        '0x05',
	        toRlp([
	            chainId ? numberToHex(chainId) : '0x',
	            address,
	            nonce ? numberToHex(nonce) : '0x',
	        ]),
	    ]));
	    if (to === 'bytes')
	        return hexToBytes$1(hash);
	    return hash;
	}

	async function recoverAuthorizationAddress(parameters) {
	    const { authorization, signature } = parameters;
	    return recoverAddress({
	        hash: hashAuthorization(authorization),
	        signature: (signature ?? authorization),
	    });
	}

	class EstimateGasExecutionError extends BaseError$3 {
	    constructor(cause, { account, docsPath, chain, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value, }) {
	        const prettyArgs = prettyPrint({
	            from: account?.address,
	            to,
	            value: typeof value !== 'undefined' &&
	                `${formatEther(value)} ${chain?.nativeCurrency?.symbol || 'ETH'}`,
	            data,
	            gas,
	            gasPrice: typeof gasPrice !== 'undefined' && `${formatGwei(gasPrice)} gwei`,
	            maxFeePerGas: typeof maxFeePerGas !== 'undefined' &&
	                `${formatGwei(maxFeePerGas)} gwei`,
	            maxPriorityFeePerGas: typeof maxPriorityFeePerGas !== 'undefined' &&
	                `${formatGwei(maxPriorityFeePerGas)} gwei`,
	            nonce,
	        });
	        super(cause.shortMessage, {
	            cause,
	            docsPath,
	            metaMessages: [
	                ...(cause.metaMessages ? [...cause.metaMessages, ' '] : []),
	                'Estimate Gas Arguments:',
	                prettyArgs,
	            ].filter(Boolean),
	            name: 'EstimateGasExecutionError',
	        });
	        Object.defineProperty(this, "cause", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        this.cause = cause;
	    }
	}

	function getEstimateGasError(err, { docsPath, ...args }) {
	    const cause = (() => {
	        const cause = getNodeError(err, args);
	        if (cause instanceof UnknownNodeError)
	            return err;
	        return cause;
	    })();
	    return new EstimateGasExecutionError(cause, {
	        docsPath,
	        ...args,
	    });
	}

	class BaseFeeScalarError extends BaseError$3 {
	    constructor() {
	        super('`baseFeeMultiplier` must be greater than 1.', {
	            name: 'BaseFeeScalarError',
	        });
	    }
	}
	class Eip1559FeesNotSupportedError extends BaseError$3 {
	    constructor() {
	        super('Chain does not support EIP-1559 fees.', {
	            name: 'Eip1559FeesNotSupportedError',
	        });
	    }
	}
	class MaxFeePerGasTooLowError extends BaseError$3 {
	    constructor({ maxPriorityFeePerGas }) {
	        super(`\`maxFeePerGas\` cannot be less than the \`maxPriorityFeePerGas\` (${formatGwei(maxPriorityFeePerGas)} gwei).`, { name: 'MaxFeePerGasTooLowError' });
	    }
	}

	class BlockNotFoundError extends BaseError$3 {
	    constructor({ blockHash, blockNumber, }) {
	        let identifier = 'Block';
	        if (blockHash)
	            identifier = `Block at hash "${blockHash}"`;
	        if (blockNumber)
	            identifier = `Block at number "${blockNumber}"`;
	        super(`${identifier} could not be found.`, { name: 'BlockNotFoundError' });
	    }
	}

	const transactionType = {
	    '0x0': 'legacy',
	    '0x1': 'eip2930',
	    '0x2': 'eip1559',
	    '0x3': 'eip4844',
	    '0x4': 'eip7702',
	};
	function formatTransaction(transaction, _) {
	    const transaction_ = {
	        ...transaction,
	        blockHash: transaction.blockHash ? transaction.blockHash : null,
	        blockNumber: transaction.blockNumber
	            ? BigInt(transaction.blockNumber)
	            : null,
	        chainId: transaction.chainId ? hexToNumber$1(transaction.chainId) : undefined,
	        gas: transaction.gas ? BigInt(transaction.gas) : undefined,
	        gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : undefined,
	        maxFeePerBlobGas: transaction.maxFeePerBlobGas
	            ? BigInt(transaction.maxFeePerBlobGas)
	            : undefined,
	        maxFeePerGas: transaction.maxFeePerGas
	            ? BigInt(transaction.maxFeePerGas)
	            : undefined,
	        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
	            ? BigInt(transaction.maxPriorityFeePerGas)
	            : undefined,
	        nonce: transaction.nonce ? hexToNumber$1(transaction.nonce) : undefined,
	        to: transaction.to ? transaction.to : null,
	        transactionIndex: transaction.transactionIndex
	            ? Number(transaction.transactionIndex)
	            : null,
	        type: transaction.type
	            ? transactionType[transaction.type]
	            : undefined,
	        typeHex: transaction.type ? transaction.type : undefined,
	        value: transaction.value ? BigInt(transaction.value) : undefined,
	        v: transaction.v ? BigInt(transaction.v) : undefined,
	    };
	    if (transaction.authorizationList)
	        transaction_.authorizationList = formatAuthorizationList(transaction.authorizationList);
	    transaction_.yParity = (() => {
	        // If `yParity` is provided, we will use it.
	        if (transaction.yParity)
	            return Number(transaction.yParity);
	        // If no `yParity` provided, try derive from `v`.
	        if (typeof transaction_.v === 'bigint') {
	            if (transaction_.v === 0n || transaction_.v === 27n)
	                return 0;
	            if (transaction_.v === 1n || transaction_.v === 28n)
	                return 1;
	            if (transaction_.v >= 35n)
	                return transaction_.v % 2n === 0n ? 1 : 0;
	        }
	        return undefined;
	    })();
	    if (transaction_.type === 'legacy') {
	        delete transaction_.accessList;
	        delete transaction_.maxFeePerBlobGas;
	        delete transaction_.maxFeePerGas;
	        delete transaction_.maxPriorityFeePerGas;
	        delete transaction_.yParity;
	    }
	    if (transaction_.type === 'eip2930') {
	        delete transaction_.maxFeePerBlobGas;
	        delete transaction_.maxFeePerGas;
	        delete transaction_.maxPriorityFeePerGas;
	    }
	    if (transaction_.type === 'eip1559') {
	        delete transaction_.maxFeePerBlobGas;
	    }
	    return transaction_;
	}
	const defineTransaction = /*#__PURE__*/ defineFormatter('transaction', formatTransaction);
	//////////////////////////////////////////////////////////////////////////////
	function formatAuthorizationList(authorizationList) {
	    return authorizationList.map((authorization) => ({
	        address: authorization.address,
	        chainId: Number(authorization.chainId),
	        nonce: Number(authorization.nonce),
	        r: authorization.r,
	        s: authorization.s,
	        yParity: Number(authorization.yParity),
	    }));
	}

	function formatBlock(block, _) {
	    const transactions = (block.transactions ?? []).map((transaction) => {
	        if (typeof transaction === 'string')
	            return transaction;
	        return formatTransaction(transaction);
	    });
	    return {
	        ...block,
	        baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas) : null,
	        blobGasUsed: block.blobGasUsed ? BigInt(block.blobGasUsed) : undefined,
	        difficulty: block.difficulty ? BigInt(block.difficulty) : undefined,
	        excessBlobGas: block.excessBlobGas
	            ? BigInt(block.excessBlobGas)
	            : undefined,
	        gasLimit: block.gasLimit ? BigInt(block.gasLimit) : undefined,
	        gasUsed: block.gasUsed ? BigInt(block.gasUsed) : undefined,
	        hash: block.hash ? block.hash : null,
	        logsBloom: block.logsBloom ? block.logsBloom : null,
	        nonce: block.nonce ? block.nonce : null,
	        number: block.number ? BigInt(block.number) : null,
	        size: block.size ? BigInt(block.size) : undefined,
	        timestamp: block.timestamp ? BigInt(block.timestamp) : undefined,
	        transactions,
	        totalDifficulty: block.totalDifficulty
	            ? BigInt(block.totalDifficulty)
	            : null,
	    };
	}
	const defineBlock = /*#__PURE__*/ defineFormatter('block', formatBlock);

	/**
	 * Returns information about a block at a block number, hash, or tag.
	 *
	 * - Docs: https://viem.sh/docs/actions/public/getBlock
	 * - Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/blocks_fetching-blocks
	 * - JSON-RPC Methods:
	 *   - Calls [`eth_getBlockByNumber`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblockbynumber) for `blockNumber` & `blockTag`.
	 *   - Calls [`eth_getBlockByHash`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getblockbyhash) for `blockHash`.
	 *
	 * @param client - Client to use
	 * @param parameters - {@link GetBlockParameters}
	 * @returns Information about the block. {@link GetBlockReturnType}
	 *
	 * @example
	 * import { createPublicClient, http } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { getBlock } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const block = await getBlock(client)
	 */
	async function getBlock(client, { blockHash, blockNumber, blockTag = client.experimental_blockTag ?? 'latest', includeTransactions: includeTransactions_, } = {}) {
	    const includeTransactions = includeTransactions_ ?? false;
	    const blockNumberHex = blockNumber !== undefined ? numberToHex(blockNumber) : undefined;
	    let block = null;
	    if (blockHash) {
	        block = await client.request({
	            method: 'eth_getBlockByHash',
	            params: [blockHash, includeTransactions],
	        }, { dedupe: true });
	    }
	    else {
	        block = await client.request({
	            method: 'eth_getBlockByNumber',
	            params: [blockNumberHex || blockTag, includeTransactions],
	        }, { dedupe: Boolean(blockNumberHex) });
	    }
	    if (!block)
	        throw new BlockNotFoundError({ blockHash, blockNumber });
	    const format = client.chain?.formatters?.block?.format || formatBlock;
	    return format(block, 'getBlock');
	}

	/**
	 * Returns the current price of gas (in wei).
	 *
	 * - Docs: https://viem.sh/docs/actions/public/getGasPrice
	 * - JSON-RPC Methods: [`eth_gasPrice`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_gasprice)
	 *
	 * @param client - Client to use
	 * @returns The gas price (in wei). {@link GetGasPriceReturnType}
	 *
	 * @example
	 * import { createPublicClient, http } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { getGasPrice } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const gasPrice = await getGasPrice(client)
	 */
	async function getGasPrice(client) {
	    const gasPrice = await client.request({
	        method: 'eth_gasPrice',
	    });
	    return BigInt(gasPrice);
	}

	async function internal_estimateMaxPriorityFeePerGas(client, args) {
	    const { block: block_, chain = client.chain, request } = args || {};
	    try {
	        const maxPriorityFeePerGas = chain?.fees?.maxPriorityFeePerGas ?? chain?.fees?.defaultPriorityFee;
	        if (typeof maxPriorityFeePerGas === 'function') {
	            const block = block_ || (await getAction$1(client, getBlock, 'getBlock')({}));
	            const maxPriorityFeePerGas_ = await maxPriorityFeePerGas({
	                block,
	                client,
	                request,
	            });
	            if (maxPriorityFeePerGas_ === null)
	                throw new Error();
	            return maxPriorityFeePerGas_;
	        }
	        if (typeof maxPriorityFeePerGas !== 'undefined')
	            return maxPriorityFeePerGas;
	        const maxPriorityFeePerGasHex = await client.request({
	            method: 'eth_maxPriorityFeePerGas',
	        });
	        return hexToBigInt(maxPriorityFeePerGasHex);
	    }
	    catch {
	        // If the RPC Provider does not support `eth_maxPriorityFeePerGas`
	        // fall back to calculating it manually via `gasPrice - baseFeePerGas`.
	        // See: https://github.com/ethereum/pm/issues/328#:~:text=eth_maxPriorityFeePerGas%20after%20London%20will%20effectively%20return%20eth_gasPrice%20%2D%20baseFee
	        const [block, gasPrice] = await Promise.all([
	            block_
	                ? Promise.resolve(block_)
	                : getAction$1(client, getBlock, 'getBlock')({}),
	            getAction$1(client, getGasPrice, 'getGasPrice')({}),
	        ]);
	        if (typeof block.baseFeePerGas !== 'bigint')
	            throw new Eip1559FeesNotSupportedError();
	        const maxPriorityFeePerGas = gasPrice - block.baseFeePerGas;
	        if (maxPriorityFeePerGas < 0n)
	            return 0n;
	        return maxPriorityFeePerGas;
	    }
	}

	async function internal_estimateFeesPerGas(client, args) {
	    const { block: block_, chain = client.chain, request, type = 'eip1559', } = args || {};
	    const baseFeeMultiplier = await (async () => {
	        if (typeof chain?.fees?.baseFeeMultiplier === 'function')
	            return chain.fees.baseFeeMultiplier({
	                block: block_,
	                client,
	                request,
	            });
	        return chain?.fees?.baseFeeMultiplier ?? 1.2;
	    })();
	    if (baseFeeMultiplier < 1)
	        throw new BaseFeeScalarError();
	    const decimals = baseFeeMultiplier.toString().split('.')[1]?.length ?? 0;
	    const denominator = 10 ** decimals;
	    const multiply = (base) => (base * BigInt(Math.ceil(baseFeeMultiplier * denominator))) /
	        BigInt(denominator);
	    const block = block_
	        ? block_
	        : await getAction$1(client, getBlock, 'getBlock')({});
	    if (typeof chain?.fees?.estimateFeesPerGas === 'function') {
	        const fees = (await chain.fees.estimateFeesPerGas({
	            block: block_,
	            client,
	            multiply,
	            request,
	            type,
	        }));
	        if (fees !== null)
	            return fees;
	    }
	    if (type === 'eip1559') {
	        if (typeof block.baseFeePerGas !== 'bigint')
	            throw new Eip1559FeesNotSupportedError();
	        const maxPriorityFeePerGas = typeof request?.maxPriorityFeePerGas === 'bigint'
	            ? request.maxPriorityFeePerGas
	            : await internal_estimateMaxPriorityFeePerGas(client, {
	                block: block,
	                chain,
	                request,
	            });
	        const baseFeePerGas = multiply(block.baseFeePerGas);
	        const maxFeePerGas = request?.maxFeePerGas ?? baseFeePerGas + maxPriorityFeePerGas;
	        return {
	            maxFeePerGas,
	            maxPriorityFeePerGas,
	        };
	    }
	    const gasPrice = request?.gasPrice ??
	        multiply(await getAction$1(client, getGasPrice, 'getGasPrice')({}));
	    return {
	        gasPrice,
	    };
	}

	/**
	 * Returns the number of [Transactions](https://viem.sh/docs/glossary/terms#transaction) an Account has sent.
	 *
	 * - Docs: https://viem.sh/docs/actions/public/getTransactionCount
	 * - JSON-RPC Methods: [`eth_getTransactionCount`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_gettransactioncount)
	 *
	 * @param client - Client to use
	 * @param parameters - {@link GetTransactionCountParameters}
	 * @returns The number of transactions an account has sent. {@link GetTransactionCountReturnType}
	 *
	 * @example
	 * import { createPublicClient, http } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { getTransactionCount } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const transactionCount = await getTransactionCount(client, {
	 *   address: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 * })
	 */
	async function getTransactionCount(client, { address, blockTag = 'latest', blockNumber }) {
	    const count = await client.request({
	        method: 'eth_getTransactionCount',
	        params: [
	            address,
	            typeof blockNumber === 'bigint' ? numberToHex(blockNumber) : blockTag,
	        ],
	    }, {
	        dedupe: Boolean(blockNumber),
	    });
	    return hexToNumber$1(count);
	}

	/**
	 * Compute commitments from a list of blobs.
	 *
	 * @example
	 * ```ts
	 * import { blobsToCommitments, toBlobs } from 'viem'
	 * import { kzg } from './kzg'
	 *
	 * const blobs = toBlobs({ data: '0x1234' })
	 * const commitments = blobsToCommitments({ blobs, kzg })
	 * ```
	 */
	function blobsToCommitments(parameters) {
	    const { kzg } = parameters;
	    const to = parameters.to ?? (typeof parameters.blobs[0] === 'string' ? 'hex' : 'bytes');
	    const blobs = (typeof parameters.blobs[0] === 'string'
	        ? parameters.blobs.map((x) => hexToBytes$1(x))
	        : parameters.blobs);
	    const commitments = [];
	    for (const blob of blobs)
	        commitments.push(Uint8Array.from(kzg.blobToKzgCommitment(blob)));
	    return (to === 'bytes'
	        ? commitments
	        : commitments.map((x) => bytesToHex$1(x)));
	}

	/**
	 * Compute the proofs for a list of blobs and their commitments.
	 *
	 * @example
	 * ```ts
	 * import {
	 *   blobsToCommitments,
	 *   toBlobs
	 * } from 'viem'
	 * import { kzg } from './kzg'
	 *
	 * const blobs = toBlobs({ data: '0x1234' })
	 * const commitments = blobsToCommitments({ blobs, kzg })
	 * const proofs = blobsToProofs({ blobs, commitments, kzg })
	 * ```
	 */
	function blobsToProofs(parameters) {
	    const { kzg } = parameters;
	    const to = parameters.to ?? (typeof parameters.blobs[0] === 'string' ? 'hex' : 'bytes');
	    const blobs = (typeof parameters.blobs[0] === 'string'
	        ? parameters.blobs.map((x) => hexToBytes$1(x))
	        : parameters.blobs);
	    const commitments = (typeof parameters.commitments[0] === 'string'
	        ? parameters.commitments.map((x) => hexToBytes$1(x))
	        : parameters.commitments);
	    const proofs = [];
	    for (let i = 0; i < blobs.length; i++) {
	        const blob = blobs[i];
	        const commitment = commitments[i];
	        proofs.push(Uint8Array.from(kzg.computeBlobKzgProof(blob, commitment)));
	    }
	    return (to === 'bytes'
	        ? proofs
	        : proofs.map((x) => bytesToHex$1(x)));
	}

	/**
	 * Internal Merkle-Damgard hash utils.
	 * @module
	 */
	/** Polyfill for Safari 14. https://caniuse.com/mdn-javascript_builtins_dataview_setbiguint64 */
	function setBigUint64(view, byteOffset, value, isLE) {
	    if (typeof view.setBigUint64 === 'function')
	        return view.setBigUint64(byteOffset, value, isLE);
	    const _32n = BigInt(32);
	    const _u32_max = BigInt(0xffffffff);
	    const wh = Number((value >> _32n) & _u32_max);
	    const wl = Number(value & _u32_max);
	    const h = isLE ? 4 : 0;
	    const l = isLE ? 0 : 4;
	    view.setUint32(byteOffset + h, wh, isLE);
	    view.setUint32(byteOffset + l, wl, isLE);
	}
	/** Choice: a ? b : c */
	function Chi(a, b, c) {
	    return (a & b) ^ (~a & c);
	}
	/** Majority function, true if any two inputs is true. */
	function Maj(a, b, c) {
	    return (a & b) ^ (a & c) ^ (b & c);
	}
	/**
	 * Merkle-Damgard hash construction base class.
	 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
	 */
	class HashMD extends Hash {
	    constructor(blockLen, outputLen, padOffset, isLE) {
	        super();
	        this.finished = false;
	        this.length = 0;
	        this.pos = 0;
	        this.destroyed = false;
	        this.blockLen = blockLen;
	        this.outputLen = outputLen;
	        this.padOffset = padOffset;
	        this.isLE = isLE;
	        this.buffer = new Uint8Array(blockLen);
	        this.view = createView(this.buffer);
	    }
	    update(data) {
	        aexists(this);
	        data = toBytes(data);
	        abytes$1(data);
	        const { view, buffer, blockLen } = this;
	        const len = data.length;
	        for (let pos = 0; pos < len;) {
	            const take = Math.min(blockLen - this.pos, len - pos);
	            // Fast path: we have at least one block in input, cast it to view and process
	            if (take === blockLen) {
	                const dataView = createView(data);
	                for (; blockLen <= len - pos; pos += blockLen)
	                    this.process(dataView, pos);
	                continue;
	            }
	            buffer.set(data.subarray(pos, pos + take), this.pos);
	            this.pos += take;
	            pos += take;
	            if (this.pos === blockLen) {
	                this.process(view, 0);
	                this.pos = 0;
	            }
	        }
	        this.length += data.length;
	        this.roundClean();
	        return this;
	    }
	    digestInto(out) {
	        aexists(this);
	        aoutput(out, this);
	        this.finished = true;
	        // Padding
	        // We can avoid allocation of buffer for padding completely if it
	        // was previously not allocated here. But it won't change performance.
	        const { buffer, view, blockLen, isLE } = this;
	        let { pos } = this;
	        // append the bit '1' to the message
	        buffer[pos++] = 0b10000000;
	        clean(this.buffer.subarray(pos));
	        // we have less than padOffset left in buffer, so we cannot put length in
	        // current block, need process it and pad again
	        if (this.padOffset > blockLen - pos) {
	            this.process(view, 0);
	            pos = 0;
	        }
	        // Pad until full block byte with zeros
	        for (let i = pos; i < blockLen; i++)
	            buffer[i] = 0;
	        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
	        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
	        // So we just write lowest 64 bits of that value.
	        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
	        this.process(view, 0);
	        const oview = createView(out);
	        const len = this.outputLen;
	        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
	        if (len % 4)
	            throw new Error('_sha2: outputLen should be aligned to 32bit');
	        const outLen = len / 4;
	        const state = this.get();
	        if (outLen > state.length)
	            throw new Error('_sha2: outputLen bigger than state');
	        for (let i = 0; i < outLen; i++)
	            oview.setUint32(4 * i, state[i], isLE);
	    }
	    digest() {
	        const { buffer, outputLen } = this;
	        this.digestInto(buffer);
	        const res = buffer.slice(0, outputLen);
	        this.destroy();
	        return res;
	    }
	    _cloneInto(to) {
	        to || (to = new this.constructor());
	        to.set(...this.get());
	        const { blockLen, buffer, length, finished, destroyed, pos } = this;
	        to.destroyed = destroyed;
	        to.finished = finished;
	        to.length = length;
	        to.pos = pos;
	        if (length % blockLen)
	            to.buffer.set(buffer);
	        return to;
	    }
	    clone() {
	        return this._cloneInto();
	    }
	}
	/**
	 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
	 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
	 */
	/** Initial SHA256 state. Bits 0..32 of frac part of sqrt of primes 2..19 */
	const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
	    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	/**
	 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
	 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
	 * Check out [RFC 4634](https://datatracker.ietf.org/doc/html/rfc4634) and
	 * [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
	 * @module
	 */
	/**
	 * Round constants:
	 * First 32 bits of fractional parts of the cube roots of the first 64 primes 2..311)
	 */
	// prettier-ignore
	const SHA256_K = /* @__PURE__ */ Uint32Array.from([
	    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	]);
	/** Reusable temporary buffer. "W" comes straight from spec. */
	const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
	class SHA256 extends HashMD {
	    constructor(outputLen = 32) {
	        super(64, outputLen, 8, false);
	        // We cannot use array here since array allows indexing by variable
	        // which means optimizer/compiler cannot use registers.
	        this.A = SHA256_IV[0] | 0;
	        this.B = SHA256_IV[1] | 0;
	        this.C = SHA256_IV[2] | 0;
	        this.D = SHA256_IV[3] | 0;
	        this.E = SHA256_IV[4] | 0;
	        this.F = SHA256_IV[5] | 0;
	        this.G = SHA256_IV[6] | 0;
	        this.H = SHA256_IV[7] | 0;
	    }
	    get() {
	        const { A, B, C, D, E, F, G, H } = this;
	        return [A, B, C, D, E, F, G, H];
	    }
	    // prettier-ignore
	    set(A, B, C, D, E, F, G, H) {
	        this.A = A | 0;
	        this.B = B | 0;
	        this.C = C | 0;
	        this.D = D | 0;
	        this.E = E | 0;
	        this.F = F | 0;
	        this.G = G | 0;
	        this.H = H | 0;
	    }
	    process(view, offset) {
	        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
	        for (let i = 0; i < 16; i++, offset += 4)
	            SHA256_W[i] = view.getUint32(offset, false);
	        for (let i = 16; i < 64; i++) {
	            const W15 = SHA256_W[i - 15];
	            const W2 = SHA256_W[i - 2];
	            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
	            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
	            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
	        }
	        // Compression function main loop, 64 rounds
	        let { A, B, C, D, E, F, G, H } = this;
	        for (let i = 0; i < 64; i++) {
	            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
	            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
	            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
	            const T2 = (sigma0 + Maj(A, B, C)) | 0;
	            H = G;
	            G = F;
	            F = E;
	            E = (D + T1) | 0;
	            D = C;
	            C = B;
	            B = A;
	            A = (T1 + T2) | 0;
	        }
	        // Add the compressed chunk to the current hash value
	        A = (A + this.A) | 0;
	        B = (B + this.B) | 0;
	        C = (C + this.C) | 0;
	        D = (D + this.D) | 0;
	        E = (E + this.E) | 0;
	        F = (F + this.F) | 0;
	        G = (G + this.G) | 0;
	        H = (H + this.H) | 0;
	        this.set(A, B, C, D, E, F, G, H);
	    }
	    roundClean() {
	        clean(SHA256_W);
	    }
	    destroy() {
	        this.set(0, 0, 0, 0, 0, 0, 0, 0);
	        clean(this.buffer);
	    }
	}
	/**
	 * SHA2-256 hash function from RFC 4634.
	 *
	 * It is the fastest JS hash, even faster than Blake3.
	 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
	 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
	 */
	const sha256$2 = /* @__PURE__ */ createHasher(() => new SHA256());

	/**
	 * SHA2-256 a.k.a. sha256. In JS, it is the fastest hash, even faster than Blake3.
	 *
	 * To break sha256 using birthday attack, attackers need to try 2^128 hashes.
	 * BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
	 *
	 * Check out [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf).
	 * @module
	 * @deprecated
	 */
	/** @deprecated Use import from `noble/hashes/sha2` module */
	const sha256$1 = sha256$2;

	function sha256(value, to_) {
	    const bytes = sha256$1(isHex(value, { strict: false }) ? toBytes$1(value) : value);
	    return bytes;
	}

	/**
	 * Transform a commitment to it's versioned hash.
	 *
	 * @example
	 * ```ts
	 * import {
	 *   blobsToCommitments,
	 *   commitmentToVersionedHash,
	 *   toBlobs
	 * } from 'viem'
	 * import { kzg } from './kzg'
	 *
	 * const blobs = toBlobs({ data: '0x1234' })
	 * const [commitment] = blobsToCommitments({ blobs, kzg })
	 * const versionedHash = commitmentToVersionedHash({ commitment })
	 * ```
	 */
	function commitmentToVersionedHash(parameters) {
	    const { commitment, version = 1 } = parameters;
	    const to = parameters.to ?? (typeof commitment === 'string' ? 'hex' : 'bytes');
	    const versionedHash = sha256(commitment);
	    versionedHash.set([version], 0);
	    return (to === 'bytes' ? versionedHash : bytesToHex$1(versionedHash));
	}

	/**
	 * Transform a list of commitments to their versioned hashes.
	 *
	 * @example
	 * ```ts
	 * import {
	 *   blobsToCommitments,
	 *   commitmentsToVersionedHashes,
	 *   toBlobs
	 * } from 'viem'
	 * import { kzg } from './kzg'
	 *
	 * const blobs = toBlobs({ data: '0x1234' })
	 * const commitments = blobsToCommitments({ blobs, kzg })
	 * const versionedHashes = commitmentsToVersionedHashes({ commitments })
	 * ```
	 */
	function commitmentsToVersionedHashes(parameters) {
	    const { commitments, version } = parameters;
	    const to = parameters.to ?? (typeof commitments[0] === 'string' ? 'hex' : 'bytes');
	    const hashes = [];
	    for (const commitment of commitments) {
	        hashes.push(commitmentToVersionedHash({
	            commitment,
	            to,
	            version,
	        }));
	    }
	    return hashes;
	}

	// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-4844.md#parameters
	/** Blob limit per transaction. */
	const blobsPerTransaction = 6;
	/** The number of bytes in a BLS scalar field element. */
	const bytesPerFieldElement = 32;
	/** The number of field elements in a blob. */
	const fieldElementsPerBlob = 4096;
	/** The number of bytes in a blob. */
	const bytesPerBlob = bytesPerFieldElement * fieldElementsPerBlob;
	/** Blob bytes limit per transaction. */
	const maxBytesPerTransaction = bytesPerBlob * blobsPerTransaction -
	    // terminator byte (0x80).
	    1 -
	    // zero byte (0x00) appended to each field element.
	    1 * fieldElementsPerBlob * blobsPerTransaction;

	// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-4844.md#parameters
	const versionedHashVersionKzg = 1;

	class BlobSizeTooLargeError extends BaseError$3 {
	    constructor({ maxSize, size }) {
	        super('Blob size is too large.', {
	            metaMessages: [`Max: ${maxSize} bytes`, `Given: ${size} bytes`],
	            name: 'BlobSizeTooLargeError',
	        });
	    }
	}
	class EmptyBlobError extends BaseError$3 {
	    constructor() {
	        super('Blob data must not be empty.', { name: 'EmptyBlobError' });
	    }
	}
	class InvalidVersionedHashSizeError extends BaseError$3 {
	    constructor({ hash, size, }) {
	        super(`Versioned hash "${hash}" size is invalid.`, {
	            metaMessages: ['Expected: 32', `Received: ${size}`],
	            name: 'InvalidVersionedHashSizeError',
	        });
	    }
	}
	class InvalidVersionedHashVersionError extends BaseError$3 {
	    constructor({ hash, version, }) {
	        super(`Versioned hash "${hash}" version is invalid.`, {
	            metaMessages: [
	                `Expected: ${versionedHashVersionKzg}`,
	                `Received: ${version}`,
	            ],
	            name: 'InvalidVersionedHashVersionError',
	        });
	    }
	}

	/**
	 * Transforms arbitrary data to blobs.
	 *
	 * @example
	 * ```ts
	 * import { toBlobs, stringToHex } from 'viem'
	 *
	 * const blobs = toBlobs({ data: stringToHex('hello world') })
	 * ```
	 */
	function toBlobs(parameters) {
	    const to = parameters.to ?? (typeof parameters.data === 'string' ? 'hex' : 'bytes');
	    const data = (typeof parameters.data === 'string'
	        ? hexToBytes$1(parameters.data)
	        : parameters.data);
	    const size_ = size$2(data);
	    if (!size_)
	        throw new EmptyBlobError();
	    if (size_ > maxBytesPerTransaction)
	        throw new BlobSizeTooLargeError({
	            maxSize: maxBytesPerTransaction,
	            size: size_,
	        });
	    const blobs = [];
	    let active = true;
	    let position = 0;
	    while (active) {
	        const blob = createCursor(new Uint8Array(bytesPerBlob));
	        let size = 0;
	        while (size < fieldElementsPerBlob) {
	            const bytes = data.slice(position, position + (bytesPerFieldElement - 1));
	            // Push a zero byte so the field element doesn't overflow the BLS modulus.
	            blob.pushByte(0x00);
	            // Push the current segment of data bytes.
	            blob.pushBytes(bytes);
	            // If we detect that the current segment of data bytes is less than 31 bytes,
	            // we can stop processing and push a terminator byte to indicate the end of the blob.
	            if (bytes.length < 31) {
	                blob.pushByte(0x80);
	                active = false;
	                break;
	            }
	            size++;
	            position += 31;
	        }
	        blobs.push(blob);
	    }
	    return (to === 'bytes'
	        ? blobs.map((x) => x.bytes)
	        : blobs.map((x) => bytesToHex$1(x.bytes)));
	}

	/**
	 * Transforms arbitrary data (or blobs, commitments, & proofs) into a sidecar array.
	 *
	 * @example
	 * ```ts
	 * import { toBlobSidecars, stringToHex } from 'viem'
	 *
	 * const sidecars = toBlobSidecars({ data: stringToHex('hello world') })
	 * ```
	 *
	 * @example
	 * ```ts
	 * import {
	 *   blobsToCommitments,
	 *   toBlobs,
	 *   blobsToProofs,
	 *   toBlobSidecars,
	 *   stringToHex
	 * } from 'viem'
	 *
	 * const blobs = toBlobs({ data: stringToHex('hello world') })
	 * const commitments = blobsToCommitments({ blobs, kzg })
	 * const proofs = blobsToProofs({ blobs, commitments, kzg })
	 *
	 * const sidecars = toBlobSidecars({ blobs, commitments, proofs })
	 * ```
	 */
	function toBlobSidecars(parameters) {
	    const { data, kzg, to } = parameters;
	    const blobs = parameters.blobs ?? toBlobs({ data: data, to });
	    const commitments = parameters.commitments ?? blobsToCommitments({ blobs, kzg: kzg, to });
	    const proofs = parameters.proofs ?? blobsToProofs({ blobs, commitments, kzg: kzg, to });
	    const sidecars = [];
	    for (let i = 0; i < blobs.length; i++)
	        sidecars.push({
	            blob: blobs[i],
	            commitment: commitments[i],
	            proof: proofs[i],
	        });
	    return sidecars;
	}

	function getTransactionType(transaction) {
	    if (transaction.type)
	        return transaction.type;
	    if (typeof transaction.authorizationList !== 'undefined')
	        return 'eip7702';
	    if (typeof transaction.blobs !== 'undefined' ||
	        typeof transaction.blobVersionedHashes !== 'undefined' ||
	        typeof transaction.maxFeePerBlobGas !== 'undefined' ||
	        typeof transaction.sidecars !== 'undefined')
	        return 'eip4844';
	    if (typeof transaction.maxFeePerGas !== 'undefined' ||
	        typeof transaction.maxPriorityFeePerGas !== 'undefined') {
	        return 'eip1559';
	    }
	    if (typeof transaction.gasPrice !== 'undefined') {
	        if (typeof transaction.accessList !== 'undefined')
	            return 'eip2930';
	        return 'legacy';
	    }
	    throw new InvalidSerializableTransactionError({ transaction });
	}

	/**
	 * Returns the chain ID associated with the current network.
	 *
	 * - Docs: https://viem.sh/docs/actions/public/getChainId
	 * - JSON-RPC Methods: [`eth_chainId`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_chainid)
	 *
	 * @param client - Client to use
	 * @returns The current chain ID. {@link GetChainIdReturnType}
	 *
	 * @example
	 * import { createPublicClient, http } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { getChainId } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const chainId = await getChainId(client)
	 * // 1
	 */
	async function getChainId(client) {
	    const chainIdHex = await client.request({
	        method: 'eth_chainId',
	    }, { dedupe: true });
	    return hexToNumber$1(chainIdHex);
	}

	const defaultParameters = [
	    'blobVersionedHashes',
	    'chainId',
	    'fees',
	    'gas',
	    'nonce',
	    'type',
	];
	/** @internal */
	const eip1559NetworkCache = /*#__PURE__*/ new Map();
	/**
	 * Prepares a transaction request for signing.
	 *
	 * - Docs: https://viem.sh/docs/actions/wallet/prepareTransactionRequest
	 *
	 * @param args - {@link PrepareTransactionRequestParameters}
	 * @returns The transaction request. {@link PrepareTransactionRequestReturnType}
	 *
	 * @example
	 * import { createWalletClient, custom } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { prepareTransactionRequest } from 'viem/actions'
	 *
	 * const client = createWalletClient({
	 *   chain: mainnet,
	 *   transport: custom(window.ethereum),
	 * })
	 * const request = await prepareTransactionRequest(client, {
	 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 *   to: '0x0000000000000000000000000000000000000000',
	 *   value: 1n,
	 * })
	 *
	 * @example
	 * // Account Hoisting
	 * import { createWalletClient, http } from 'viem'
	 * import { privateKeyToAccount } from 'viem/accounts'
	 * import { mainnet } from 'viem/chains'
	 * import { prepareTransactionRequest } from 'viem/actions'
	 *
	 * const client = createWalletClient({
	 *   account: privateKeyToAccount('0x…'),
	 *   chain: mainnet,
	 *   transport: custom(window.ethereum),
	 * })
	 * const request = await prepareTransactionRequest(client, {
	 *   to: '0x0000000000000000000000000000000000000000',
	 *   value: 1n,
	 * })
	 */
	async function prepareTransactionRequest(client, args) {
	    const { account: account_ = client.account, blobs, chain, gas, kzg, nonce, nonceManager, parameters = defaultParameters, type, } = args;
	    const account = account_ ? parseAccount(account_) : account_;
	    const request = { ...args, ...(account ? { from: account?.address } : {}) };
	    let block;
	    async function getBlock$1() {
	        if (block)
	            return block;
	        block = await getAction$1(client, getBlock, 'getBlock')({ blockTag: 'latest' });
	        return block;
	    }
	    let chainId;
	    async function getChainId$1() {
	        if (chainId)
	            return chainId;
	        if (chain)
	            return chain.id;
	        if (typeof args.chainId !== 'undefined')
	            return args.chainId;
	        const chainId_ = await getAction$1(client, getChainId, 'getChainId')({});
	        chainId = chainId_;
	        return chainId;
	    }
	    if (parameters.includes('nonce') && typeof nonce === 'undefined' && account) {
	        if (nonceManager) {
	            const chainId = await getChainId$1();
	            request.nonce = await nonceManager.consume({
	                address: account.address,
	                chainId,
	                client,
	            });
	        }
	        else {
	            request.nonce = await getAction$1(client, getTransactionCount, 'getTransactionCount')({
	                address: account.address,
	                blockTag: 'pending',
	            });
	        }
	    }
	    if ((parameters.includes('blobVersionedHashes') ||
	        parameters.includes('sidecars')) &&
	        blobs &&
	        kzg) {
	        const commitments = blobsToCommitments({ blobs, kzg });
	        if (parameters.includes('blobVersionedHashes')) {
	            const versionedHashes = commitmentsToVersionedHashes({
	                commitments,
	                to: 'hex',
	            });
	            request.blobVersionedHashes = versionedHashes;
	        }
	        if (parameters.includes('sidecars')) {
	            const proofs = blobsToProofs({ blobs, commitments, kzg });
	            const sidecars = toBlobSidecars({
	                blobs,
	                commitments,
	                proofs,
	                to: 'hex',
	            });
	            request.sidecars = sidecars;
	        }
	    }
	    if (parameters.includes('chainId'))
	        request.chainId = await getChainId$1();
	    if ((parameters.includes('fees') || parameters.includes('type')) &&
	        typeof type === 'undefined') {
	        try {
	            request.type = getTransactionType(request);
	        }
	        catch {
	            let isEip1559Network = eip1559NetworkCache.get(client.uid);
	            if (typeof isEip1559Network === 'undefined') {
	                const block = await getBlock$1();
	                isEip1559Network = typeof block?.baseFeePerGas === 'bigint';
	                eip1559NetworkCache.set(client.uid, isEip1559Network);
	            }
	            request.type = isEip1559Network ? 'eip1559' : 'legacy';
	        }
	    }
	    if (parameters.includes('fees')) {
	        // TODO(4844): derive blob base fees once https://github.com/ethereum/execution-apis/pull/486 is merged.
	        if (request.type !== 'legacy' && request.type !== 'eip2930') {
	            // EIP-1559 fees
	            if (typeof request.maxFeePerGas === 'undefined' ||
	                typeof request.maxPriorityFeePerGas === 'undefined') {
	                const block = await getBlock$1();
	                const { maxFeePerGas, maxPriorityFeePerGas } = await internal_estimateFeesPerGas(client, {
	                    block: block,
	                    chain,
	                    request: request,
	                });
	                if (typeof args.maxPriorityFeePerGas === 'undefined' &&
	                    args.maxFeePerGas &&
	                    args.maxFeePerGas < maxPriorityFeePerGas)
	                    throw new MaxFeePerGasTooLowError({
	                        maxPriorityFeePerGas,
	                    });
	                request.maxPriorityFeePerGas = maxPriorityFeePerGas;
	                request.maxFeePerGas = maxFeePerGas;
	            }
	        }
	        else {
	            // Legacy fees
	            if (typeof args.maxFeePerGas !== 'undefined' ||
	                typeof args.maxPriorityFeePerGas !== 'undefined')
	                throw new Eip1559FeesNotSupportedError();
	            if (typeof args.gasPrice === 'undefined') {
	                const block = await getBlock$1();
	                const { gasPrice: gasPrice_ } = await internal_estimateFeesPerGas(client, {
	                    block: block,
	                    chain,
	                    request: request,
	                    type: 'legacy',
	                });
	                request.gasPrice = gasPrice_;
	            }
	        }
	    }
	    if (parameters.includes('gas') && typeof gas === 'undefined')
	        request.gas = await getAction$1(client, estimateGas$1, 'estimateGas')({
	            ...request,
	            account,
	            prepare: account?.type === 'local' ? [] : ['blobVersionedHashes'],
	        });
	    assertRequest(request);
	    delete request.parameters;
	    return request;
	}

	/**
	 * Estimates the gas necessary to complete a transaction without submitting it to the network.
	 *
	 * - Docs: https://viem.sh/docs/actions/public/estimateGas
	 * - JSON-RPC Methods: [`eth_estimateGas`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_estimategas)
	 *
	 * @param client - Client to use
	 * @param parameters - {@link EstimateGasParameters}
	 * @returns The gas estimate (in gas units). {@link EstimateGasReturnType}
	 *
	 * @example
	 * import { createPublicClient, http, parseEther } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { estimateGas } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const gasEstimate = await estimateGas(client, {
	 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
	 *   value: parseEther('1'),
	 * })
	 */
	async function estimateGas$1(client, args) {
	    const { account: account_ = client.account, prepare = true } = args;
	    const account = account_ ? parseAccount(account_) : undefined;
	    const parameters = (() => {
	        if (Array.isArray(prepare))
	            return prepare;
	        // Some RPC Providers do not compute versioned hashes from blobs. We will need
	        // to compute them.
	        if (account?.type !== 'local')
	            return ['blobVersionedHashes'];
	        return undefined;
	    })();
	    try {
	        const { accessList, authorizationList, blobs, blobVersionedHashes, blockNumber, blockTag, data, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, nonce, value, stateOverride, ...rest } = prepare
	            ? (await prepareTransactionRequest(client, {
	                ...args,
	                parameters,
	            }))
	            : args;
	        const blockNumberHex = typeof blockNumber === 'bigint' ? numberToHex(blockNumber) : undefined;
	        const block = blockNumberHex || blockTag;
	        const rpcStateOverride = serializeStateOverride(stateOverride);
	        const to = await (async () => {
	            // If `to` exists on the parameters, use that.
	            if (rest.to)
	                return rest.to;
	            // If no `to` exists, and we are sending a EIP-7702 transaction, use the
	            // address of the first authorization in the list.
	            if (authorizationList && authorizationList.length > 0)
	                return await recoverAuthorizationAddress({
	                    authorization: authorizationList[0],
	                }).catch(() => {
	                    throw new BaseError$3('`to` is required. Could not infer from `authorizationList`');
	                });
	            // Otherwise, we are sending a deployment transaction.
	            return undefined;
	        })();
	        assertRequest(args);
	        const chainFormat = client.chain?.formatters?.transactionRequest?.format;
	        const format = chainFormat || formatTransactionRequest;
	        const request = format({
	            // Pick out extra data that might exist on the chain's transaction request type.
	            ...extract(rest, { format: chainFormat }),
	            account,
	            accessList,
	            authorizationList,
	            blobs,
	            blobVersionedHashes,
	            data,
	            gas,
	            gasPrice,
	            maxFeePerBlobGas,
	            maxFeePerGas,
	            maxPriorityFeePerGas,
	            nonce,
	            to,
	            value,
	        }, 'estimateGas');
	        return BigInt(await client.request({
	            method: 'eth_estimateGas',
	            params: rpcStateOverride
	                ? [
	                    request,
	                    block ?? client.experimental_blockTag ?? 'latest',
	                    rpcStateOverride,
	                ]
	                : block
	                    ? [request, block]
	                    : [request],
	        }));
	    }
	    catch (err) {
	        throw getEstimateGasError(err, {
	            ...args,
	            account,
	            chain: client.chain,
	        });
	    }
	}

	/**
	 * Returns the balance of an address in wei.
	 *
	 * - Docs: https://viem.sh/docs/actions/public/getBalance
	 * - JSON-RPC Methods: [`eth_getBalance`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getbalance)
	 *
	 * You can convert the balance to ether units with [`formatEther`](https://viem.sh/docs/utilities/formatEther).
	 *
	 * ```ts
	 * const balance = await getBalance(client, {
	 *   address: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 *   blockTag: 'safe'
	 * })
	 * const balanceAsEther = formatEther(balance)
	 * // "6.942"
	 * ```
	 *
	 * @param client - Client to use
	 * @param parameters - {@link GetBalanceParameters}
	 * @returns The balance of the address in wei. {@link GetBalanceReturnType}
	 *
	 * @example
	 * import { createPublicClient, http } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { getBalance } from 'viem/public'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const balance = await getBalance(client, {
	 *   address: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 * })
	 * // 10000000000000000000000n (wei)
	 */
	async function getBalance$1(client, { address, blockNumber, blockTag = client.experimental_blockTag ?? 'latest', }) {
	    const blockNumberHex = typeof blockNumber === 'bigint' ? numberToHex(blockNumber) : undefined;
	    const balance = await client.request({
	        method: 'eth_getBalance',
	        params: [address, blockNumberHex || blockTag],
	    });
	    return BigInt(balance);
	}

	function isAddressEqual(a, b) {
	    if (!isAddress(a, { strict: false }))
	        throw new InvalidAddressError({ address: a });
	    if (!isAddress(b, { strict: false }))
	        throw new InvalidAddressError({ address: b });
	    return a.toLowerCase() === b.toLowerCase();
	}

	function formatLog(log, { args, eventName, } = {}) {
	    return {
	        ...log,
	        blockHash: log.blockHash ? log.blockHash : null,
	        blockNumber: log.blockNumber ? BigInt(log.blockNumber) : null,
	        logIndex: log.logIndex ? Number(log.logIndex) : null,
	        transactionHash: log.transactionHash ? log.transactionHash : null,
	        transactionIndex: log.transactionIndex
	            ? Number(log.transactionIndex)
	            : null,
	        ...(eventName ? { args, eventName } : {}),
	    };
	}

	function assertTransactionEIP7702(transaction) {
	    const { authorizationList } = transaction;
	    if (authorizationList) {
	        for (const authorization of authorizationList) {
	            const { chainId } = authorization;
	            const address = authorization.address;
	            if (!isAddress(address))
	                throw new InvalidAddressError({ address });
	            if (chainId < 0)
	                throw new InvalidChainIdError({ chainId });
	        }
	    }
	    assertTransactionEIP1559(transaction);
	}
	function assertTransactionEIP4844(transaction) {
	    const { blobVersionedHashes } = transaction;
	    if (blobVersionedHashes) {
	        if (blobVersionedHashes.length === 0)
	            throw new EmptyBlobError();
	        for (const hash of blobVersionedHashes) {
	            const size_ = size$2(hash);
	            const version = hexToNumber$1(slice(hash, 0, 1));
	            if (size_ !== 32)
	                throw new InvalidVersionedHashSizeError({ hash, size: size_ });
	            if (version !== versionedHashVersionKzg)
	                throw new InvalidVersionedHashVersionError({
	                    hash,
	                    version,
	                });
	        }
	    }
	    assertTransactionEIP1559(transaction);
	}
	function assertTransactionEIP1559(transaction) {
	    const { chainId, maxPriorityFeePerGas, maxFeePerGas, to } = transaction;
	    if (chainId <= 0)
	        throw new InvalidChainIdError({ chainId });
	    if (to && !isAddress(to))
	        throw new InvalidAddressError({ address: to });
	    if (maxFeePerGas && maxFeePerGas > maxUint256)
	        throw new FeeCapTooHighError({ maxFeePerGas });
	    if (maxPriorityFeePerGas &&
	        maxFeePerGas &&
	        maxPriorityFeePerGas > maxFeePerGas)
	        throw new TipAboveFeeCapError({ maxFeePerGas, maxPriorityFeePerGas });
	}
	function assertTransactionEIP2930(transaction) {
	    const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
	    if (chainId <= 0)
	        throw new InvalidChainIdError({ chainId });
	    if (to && !isAddress(to))
	        throw new InvalidAddressError({ address: to });
	    if (maxPriorityFeePerGas || maxFeePerGas)
	        throw new BaseError$3('`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid EIP-2930 Transaction attribute.');
	    if (gasPrice && gasPrice > maxUint256)
	        throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
	}
	function assertTransactionLegacy(transaction) {
	    const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
	    if (to && !isAddress(to))
	        throw new InvalidAddressError({ address: to });
	    if (typeof chainId !== 'undefined' && chainId <= 0)
	        throw new InvalidChainIdError({ chainId });
	    if (maxPriorityFeePerGas || maxFeePerGas)
	        throw new BaseError$3('`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction attribute.');
	    if (gasPrice && gasPrice > maxUint256)
	        throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
	}

	/*
	 * Serialize an  EIP-2930 access list
	 * @remarks
	 * Use to create a transaction serializer with support for EIP-2930 access lists
	 *
	 * @param accessList - Array of objects of address and arrays of Storage Keys
	 * @throws InvalidAddressError, InvalidStorageKeySizeError
	 * @returns Array of hex strings
	 */
	function serializeAccessList(accessList) {
	    if (!accessList || accessList.length === 0)
	        return [];
	    const serializedAccessList = [];
	    for (let i = 0; i < accessList.length; i++) {
	        const { address, storageKeys } = accessList[i];
	        for (let j = 0; j < storageKeys.length; j++) {
	            if (storageKeys[j].length - 2 !== 64) {
	                throw new InvalidStorageKeySizeError({ storageKey: storageKeys[j] });
	            }
	        }
	        if (!isAddress(address, { strict: false })) {
	            throw new InvalidAddressError({ address });
	        }
	        serializedAccessList.push([address, storageKeys]);
	    }
	    return serializedAccessList;
	}

	function serializeTransaction$1(transaction, signature) {
	    const type = getTransactionType(transaction);
	    if (type === 'eip1559')
	        return serializeTransactionEIP1559(transaction, signature);
	    if (type === 'eip2930')
	        return serializeTransactionEIP2930(transaction, signature);
	    if (type === 'eip4844')
	        return serializeTransactionEIP4844(transaction, signature);
	    if (type === 'eip7702')
	        return serializeTransactionEIP7702(transaction, signature);
	    return serializeTransactionLegacy(transaction, signature);
	}
	function serializeTransactionEIP7702(transaction, signature) {
	    const { authorizationList, chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data, } = transaction;
	    assertTransactionEIP7702(transaction);
	    const serializedAccessList = serializeAccessList(accessList);
	    const serializedAuthorizationList = serializeAuthorizationList(authorizationList);
	    return concatHex([
	        '0x04',
	        toRlp([
	            numberToHex(chainId),
	            nonce ? numberToHex(nonce) : '0x',
	            maxPriorityFeePerGas ? numberToHex(maxPriorityFeePerGas) : '0x',
	            maxFeePerGas ? numberToHex(maxFeePerGas) : '0x',
	            gas ? numberToHex(gas) : '0x',
	            to ?? '0x',
	            value ? numberToHex(value) : '0x',
	            data ?? '0x',
	            serializedAccessList,
	            serializedAuthorizationList,
	            ...toYParitySignatureArray(transaction, signature),
	        ]),
	    ]);
	}
	function serializeTransactionEIP4844(transaction, signature) {
	    const { chainId, gas, nonce, to, value, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, accessList, data, } = transaction;
	    assertTransactionEIP4844(transaction);
	    let blobVersionedHashes = transaction.blobVersionedHashes;
	    let sidecars = transaction.sidecars;
	    // If `blobs` are passed, we will need to compute the KZG commitments & proofs.
	    if (transaction.blobs &&
	        (typeof blobVersionedHashes === 'undefined' ||
	            typeof sidecars === 'undefined')) {
	        const blobs = (typeof transaction.blobs[0] === 'string'
	            ? transaction.blobs
	            : transaction.blobs.map((x) => bytesToHex$1(x)));
	        const kzg = transaction.kzg;
	        const commitments = blobsToCommitments({
	            blobs,
	            kzg,
	        });
	        if (typeof blobVersionedHashes === 'undefined')
	            blobVersionedHashes = commitmentsToVersionedHashes({
	                commitments,
	            });
	        if (typeof sidecars === 'undefined') {
	            const proofs = blobsToProofs({ blobs, commitments, kzg });
	            sidecars = toBlobSidecars({ blobs, commitments, proofs });
	        }
	    }
	    const serializedAccessList = serializeAccessList(accessList);
	    const serializedTransaction = [
	        numberToHex(chainId),
	        nonce ? numberToHex(nonce) : '0x',
	        maxPriorityFeePerGas ? numberToHex(maxPriorityFeePerGas) : '0x',
	        maxFeePerGas ? numberToHex(maxFeePerGas) : '0x',
	        gas ? numberToHex(gas) : '0x',
	        to ?? '0x',
	        value ? numberToHex(value) : '0x',
	        data ?? '0x',
	        serializedAccessList,
	        maxFeePerBlobGas ? numberToHex(maxFeePerBlobGas) : '0x',
	        blobVersionedHashes ?? [],
	        ...toYParitySignatureArray(transaction, signature),
	    ];
	    const blobs = [];
	    const commitments = [];
	    const proofs = [];
	    if (sidecars)
	        for (let i = 0; i < sidecars.length; i++) {
	            const { blob, commitment, proof } = sidecars[i];
	            blobs.push(blob);
	            commitments.push(commitment);
	            proofs.push(proof);
	        }
	    return concatHex([
	        '0x03',
	        sidecars
	            ? // If sidecars are enabled, envelope turns into a "wrapper":
	                toRlp([serializedTransaction, blobs, commitments, proofs])
	            : // If sidecars are disabled, standard envelope is used:
	                toRlp(serializedTransaction),
	    ]);
	}
	function serializeTransactionEIP1559(transaction, signature) {
	    const { chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data, } = transaction;
	    assertTransactionEIP1559(transaction);
	    const serializedAccessList = serializeAccessList(accessList);
	    const serializedTransaction = [
	        numberToHex(chainId),
	        nonce ? numberToHex(nonce) : '0x',
	        maxPriorityFeePerGas ? numberToHex(maxPriorityFeePerGas) : '0x',
	        maxFeePerGas ? numberToHex(maxFeePerGas) : '0x',
	        gas ? numberToHex(gas) : '0x',
	        to ?? '0x',
	        value ? numberToHex(value) : '0x',
	        data ?? '0x',
	        serializedAccessList,
	        ...toYParitySignatureArray(transaction, signature),
	    ];
	    return concatHex([
	        '0x02',
	        toRlp(serializedTransaction),
	    ]);
	}
	function serializeTransactionEIP2930(transaction, signature) {
	    const { chainId, gas, data, nonce, to, value, accessList, gasPrice } = transaction;
	    assertTransactionEIP2930(transaction);
	    const serializedAccessList = serializeAccessList(accessList);
	    const serializedTransaction = [
	        numberToHex(chainId),
	        nonce ? numberToHex(nonce) : '0x',
	        gasPrice ? numberToHex(gasPrice) : '0x',
	        gas ? numberToHex(gas) : '0x',
	        to ?? '0x',
	        value ? numberToHex(value) : '0x',
	        data ?? '0x',
	        serializedAccessList,
	        ...toYParitySignatureArray(transaction, signature),
	    ];
	    return concatHex([
	        '0x01',
	        toRlp(serializedTransaction),
	    ]);
	}
	function serializeTransactionLegacy(transaction, signature) {
	    const { chainId = 0, gas, data, nonce, to, value, gasPrice } = transaction;
	    assertTransactionLegacy(transaction);
	    let serializedTransaction = [
	        nonce ? numberToHex(nonce) : '0x',
	        gasPrice ? numberToHex(gasPrice) : '0x',
	        gas ? numberToHex(gas) : '0x',
	        to ?? '0x',
	        value ? numberToHex(value) : '0x',
	        data ?? '0x',
	    ];
	    if (signature) {
	        const v = (() => {
	            // EIP-155 (inferred chainId)
	            if (signature.v >= 35n) {
	                const inferredChainId = (signature.v - 35n) / 2n;
	                if (inferredChainId > 0)
	                    return signature.v;
	                return 27n + (signature.v === 35n ? 0n : 1n);
	            }
	            // EIP-155 (explicit chainId)
	            if (chainId > 0)
	                return BigInt(chainId * 2) + BigInt(35n + signature.v - 27n);
	            // Pre-EIP-155 (no chainId)
	            const v = 27n + (signature.v === 27n ? 0n : 1n);
	            if (signature.v !== v)
	                throw new InvalidLegacyVError({ v: signature.v });
	            return v;
	        })();
	        const r = trim(signature.r);
	        const s = trim(signature.s);
	        serializedTransaction = [
	            ...serializedTransaction,
	            numberToHex(v),
	            r === '0x00' ? '0x' : r,
	            s === '0x00' ? '0x' : s,
	        ];
	    }
	    else if (chainId > 0) {
	        serializedTransaction = [
	            ...serializedTransaction,
	            numberToHex(chainId),
	            '0x',
	            '0x',
	        ];
	    }
	    return toRlp(serializedTransaction);
	}
	function toYParitySignatureArray(transaction, signature_) {
	    const signature = signature_ ?? transaction;
	    const { v, yParity } = signature;
	    if (typeof signature.r === 'undefined')
	        return [];
	    if (typeof signature.s === 'undefined')
	        return [];
	    if (typeof v === 'undefined' && typeof yParity === 'undefined')
	        return [];
	    const r = trim(signature.r);
	    const s = trim(signature.s);
	    const yParity_ = (() => {
	        if (typeof yParity === 'number')
	            return yParity ? numberToHex(1) : '0x';
	        if (v === 0n)
	            return '0x';
	        if (v === 1n)
	            return numberToHex(1);
	        return v === 27n ? '0x' : numberToHex(1);
	    })();
	    return [yParity_, r === '0x00' ? '0x' : r, s === '0x00' ? '0x' : s];
	}

	/*
	 * Serializes an EIP-7702 authorization list.
	 */
	function serializeAuthorizationList(authorizationList) {
	    if (!authorizationList || authorizationList.length === 0)
	        return [];
	    const serializedAuthorizationList = [];
	    for (const authorization of authorizationList) {
	        const { chainId, nonce, ...signature } = authorization;
	        const contractAddress = authorization.address;
	        serializedAuthorizationList.push([
	            chainId ? toHex(chainId) : '0x',
	            contractAddress,
	            nonce ? toHex(nonce) : '0x',
	            ...toYParitySignatureArray({}, signature),
	        ]);
	    }
	    return serializedAuthorizationList;
	}

	/** @internal */
	const promiseCache = /*#__PURE__*/ new LruMap(8192);
	/** Deduplicates in-flight promises. */
	function withDedupe(fn, { enabled = true, id }) {
	    if (!enabled || !id)
	        return fn();
	    if (promiseCache.get(id))
	        return promiseCache.get(id);
	    const promise = fn().finally(() => promiseCache.delete(id));
	    promiseCache.set(id, promise);
	    return promise;
	}

	async function wait(time) {
	    return new Promise((res) => setTimeout(res, time));
	}

	function withRetry(fn, { delay: delay_ = 100, retryCount = 2, shouldRetry = () => true, } = {}) {
	    return new Promise((resolve, reject) => {
	        const attemptRetry = async ({ count = 0 } = {}) => {
	            const retry = async ({ error }) => {
	                const delay = typeof delay_ === 'function' ? delay_({ count, error }) : delay_;
	                if (delay)
	                    await wait(delay);
	                attemptRetry({ count: count + 1 });
	            };
	            try {
	                const data = await fn();
	                resolve(data);
	            }
	            catch (err) {
	                if (count < retryCount &&
	                    (await shouldRetry({ count, error: err })))
	                    return retry({ error: err });
	                reject(err);
	            }
	        };
	        attemptRetry();
	    });
	}

	function buildRequest(request, options = {}) {
	    return async (args, overrideOptions = {}) => {
	        const { dedupe = false, methods, retryDelay = 150, retryCount = 3, uid, } = {
	            ...options,
	            ...overrideOptions,
	        };
	        const { method } = args;
	        if (methods?.exclude?.includes(method))
	            throw new MethodNotSupportedRpcError(new Error('method not supported'), {
	                method,
	            });
	        if (methods?.include && !methods.include.includes(method))
	            throw new MethodNotSupportedRpcError(new Error('method not supported'), {
	                method,
	            });
	        const requestId = dedupe
	            ? stringToHex(`${uid}.${stringify(args)}`)
	            : undefined;
	        return withDedupe(() => withRetry(async () => {
	            try {
	                return await request(args);
	            }
	            catch (err_) {
	                const err = err_;
	                switch (err.code) {
	                    // -32700
	                    case ParseRpcError.code:
	                        throw new ParseRpcError(err);
	                    // -32600
	                    case InvalidRequestRpcError.code:
	                        throw new InvalidRequestRpcError(err);
	                    // -32601
	                    case MethodNotFoundRpcError.code:
	                        throw new MethodNotFoundRpcError(err, { method: args.method });
	                    // -32602
	                    case InvalidParamsRpcError.code:
	                        throw new InvalidParamsRpcError(err);
	                    // -32603
	                    case InternalRpcError.code:
	                        throw new InternalRpcError(err);
	                    // -32000
	                    case InvalidInputRpcError.code:
	                        throw new InvalidInputRpcError(err);
	                    // -32001
	                    case ResourceNotFoundRpcError.code:
	                        throw new ResourceNotFoundRpcError(err);
	                    // -32002
	                    case ResourceUnavailableRpcError.code:
	                        throw new ResourceUnavailableRpcError(err);
	                    // -32003
	                    case TransactionRejectedRpcError.code:
	                        throw new TransactionRejectedRpcError(err);
	                    // -32004
	                    case MethodNotSupportedRpcError.code:
	                        throw new MethodNotSupportedRpcError(err, {
	                            method: args.method,
	                        });
	                    // -32005
	                    case LimitExceededRpcError.code:
	                        throw new LimitExceededRpcError(err);
	                    // -32006
	                    case JsonRpcVersionUnsupportedError.code:
	                        throw new JsonRpcVersionUnsupportedError(err);
	                    // 4001
	                    case UserRejectedRequestError.code:
	                        throw new UserRejectedRequestError(err);
	                    // 4100
	                    case UnauthorizedProviderError.code:
	                        throw new UnauthorizedProviderError(err);
	                    // 4200
	                    case UnsupportedProviderMethodError.code:
	                        throw new UnsupportedProviderMethodError(err);
	                    // 4900
	                    case ProviderDisconnectedError.code:
	                        throw new ProviderDisconnectedError(err);
	                    // 4901
	                    case ChainDisconnectedError.code:
	                        throw new ChainDisconnectedError(err);
	                    // 4902
	                    case SwitchChainError.code:
	                        throw new SwitchChainError(err);
	                    // 5700
	                    case UnsupportedNonOptionalCapabilityError.code:
	                        throw new UnsupportedNonOptionalCapabilityError(err);
	                    // 5710
	                    case UnsupportedChainIdError.code:
	                        throw new UnsupportedChainIdError(err);
	                    // 5720
	                    case DuplicateIdError.code:
	                        throw new DuplicateIdError(err);
	                    // 5730
	                    case UnknownBundleIdError.code:
	                        throw new UnknownBundleIdError(err);
	                    // 5740
	                    case BundleTooLargeError.code:
	                        throw new BundleTooLargeError(err);
	                    // 5750
	                    case AtomicReadyWalletRejectedUpgradeError.code:
	                        throw new AtomicReadyWalletRejectedUpgradeError(err);
	                    // 5760
	                    case AtomicityNotSupportedError.code:
	                        throw new AtomicityNotSupportedError(err);
	                    // CAIP-25: User Rejected Error
	                    // https://docs.walletconnect.com/2.0/specs/clients/sign/error-codes#rejected-caip-25
	                    case 5000:
	                        throw new UserRejectedRequestError(err);
	                    default:
	                        if (err_ instanceof BaseError$3)
	                            throw err_;
	                        throw new UnknownRpcError(err);
	                }
	            }
	        }, {
	            delay: ({ count, error }) => {
	                // If we find a Retry-After header, let's retry after the given time.
	                if (error && error instanceof HttpRequestError) {
	                    const retryAfter = error?.headers?.get('Retry-After');
	                    if (retryAfter?.match(/\d/))
	                        return Number.parseInt(retryAfter, 10) * 1000;
	                }
	                // Otherwise, let's retry with an exponential backoff.
	                return ~~(1 << count) * retryDelay;
	            },
	            retryCount,
	            shouldRetry: ({ error }) => shouldRetry(error),
	        }), { enabled: dedupe, id: requestId });
	    };
	}
	/** @internal */
	function shouldRetry(error) {
	    if ('code' in error && typeof error.code === 'number') {
	        if (error.code === -1)
	            return true; // Unknown error
	        if (error.code === LimitExceededRpcError.code)
	            return true;
	        if (error.code === InternalRpcError.code)
	            return true;
	        return false;
	    }
	    if (error instanceof HttpRequestError && error.status) {
	        // Forbidden
	        if (error.status === 403)
	            return true;
	        // Request Timeout
	        if (error.status === 408)
	            return true;
	        // Request Entity Too Large
	        if (error.status === 413)
	            return true;
	        // Too Many Requests
	        if (error.status === 429)
	            return true;
	        // Internal Server Error
	        if (error.status === 500)
	            return true;
	        // Bad Gateway
	        if (error.status === 502)
	            return true;
	        // Service Unavailable
	        if (error.status === 503)
	            return true;
	        // Gateway Timeout
	        if (error.status === 504)
	            return true;
	        return false;
	    }
	    return true;
	}

	class OffchainLookupError extends BaseError$3 {
	    constructor({ callbackSelector, cause, data, extraData, sender, urls, }) {
	        super(cause.shortMessage ||
	            'An error occurred while fetching for an offchain result.', {
	            cause,
	            metaMessages: [
	                ...(cause.metaMessages || []),
	                cause.metaMessages?.length ? '' : [],
	                'Offchain Gateway Call:',
	                urls && [
	                    '  Gateway URL(s):',
	                    ...urls.map((url) => `    ${getUrl(url)}`),
	                ],
	                `  Sender: ${sender}`,
	                `  Data: ${data}`,
	                `  Callback selector: ${callbackSelector}`,
	                `  Extra data: ${extraData}`,
	            ].flat(),
	            name: 'OffchainLookupError',
	        });
	    }
	}
	class OffchainLookupResponseMalformedError extends BaseError$3 {
	    constructor({ result, url }) {
	        super('Offchain gateway response is malformed. Response data must be a hex value.', {
	            metaMessages: [
	                `Gateway URL: ${getUrl(url)}`,
	                `Response: ${stringify(result)}`,
	            ],
	            name: 'OffchainLookupResponseMalformedError',
	        });
	    }
	}
	class OffchainLookupSenderMismatchError extends BaseError$3 {
	    constructor({ sender, to }) {
	        super('Reverted sender address does not match target contract address (`to`).', {
	            metaMessages: [
	                `Contract address: ${to}`,
	                `OffchainLookup sender address: ${sender}`,
	            ],
	            name: 'OffchainLookupSenderMismatchError',
	        });
	    }
	}

	const offchainLookupSignature = '0x556f1830';
	const offchainLookupAbiItem = {
	    name: 'OffchainLookup',
	    type: 'error',
	    inputs: [
	        {
	            name: 'sender',
	            type: 'address',
	        },
	        {
	            name: 'urls',
	            type: 'string[]',
	        },
	        {
	            name: 'callData',
	            type: 'bytes',
	        },
	        {
	            name: 'callbackFunction',
	            type: 'bytes4',
	        },
	        {
	            name: 'extraData',
	            type: 'bytes',
	        },
	    ],
	};
	async function offchainLookup(client, { blockNumber, blockTag, data, to, }) {
	    const { args } = decodeErrorResult({
	        data,
	        abi: [offchainLookupAbiItem],
	    });
	    const [sender, urls, callData, callbackSelector, extraData] = args;
	    const { ccipRead } = client;
	    const ccipRequest_ = ccipRead && typeof ccipRead?.request === 'function'
	        ? ccipRead.request
	        : ccipRequest;
	    try {
	        if (!isAddressEqual(to, sender))
	            throw new OffchainLookupSenderMismatchError({ sender, to });
	        const result = urls.includes(localBatchGatewayUrl)
	            ? await localBatchGatewayRequest({
	                data: callData,
	                ccipRequest: ccipRequest_,
	            })
	            : await ccipRequest_({ data: callData, sender, urls });
	        const { data: data_ } = await call(client, {
	            blockNumber,
	            blockTag,
	            data: concat([
	                callbackSelector,
	                encodeAbiParameters([{ type: 'bytes' }, { type: 'bytes' }], [result, extraData]),
	            ]),
	            to,
	        });
	        return data_;
	    }
	    catch (err) {
	        throw new OffchainLookupError({
	            callbackSelector,
	            cause: err,
	            data,
	            extraData,
	            sender,
	            urls,
	        });
	    }
	}
	async function ccipRequest({ data, sender, urls, }) {
	    let error = new Error('An unknown error occurred.');
	    for (let i = 0; i < urls.length; i++) {
	        const url = urls[i];
	        const method = url.includes('{data}') ? 'GET' : 'POST';
	        const body = method === 'POST' ? { data, sender } : undefined;
	        const headers = method === 'POST' ? { 'Content-Type': 'application/json' } : {};
	        try {
	            const response = await fetch(url.replace('{sender}', sender.toLowerCase()).replace('{data}', data), {
	                body: JSON.stringify(body),
	                headers,
	                method,
	            });
	            let result;
	            if (response.headers.get('Content-Type')?.startsWith('application/json')) {
	                result = (await response.json()).data;
	            }
	            else {
	                result = (await response.text());
	            }
	            if (!response.ok) {
	                error = new HttpRequestError({
	                    body,
	                    details: result?.error
	                        ? stringify(result.error)
	                        : response.statusText,
	                    headers: response.headers,
	                    status: response.status,
	                    url,
	                });
	                continue;
	            }
	            if (!isHex(result)) {
	                error = new OffchainLookupResponseMalformedError({
	                    result,
	                    url,
	                });
	                continue;
	            }
	            return result;
	        }
	        catch (err) {
	            error = new HttpRequestError({
	                body,
	                details: err.message,
	                url,
	            });
	        }
	    }
	    throw error;
	}

	var ccip = /*#__PURE__*/Object.freeze({
		__proto__: null,
		ccipRequest: ccipRequest,
		offchainLookup: offchainLookup,
		offchainLookupAbiItem: offchainLookupAbiItem,
		offchainLookupSignature: offchainLookupSignature
	});

	function assertCurrentChain({ chain, currentChainId, }) {
	    if (!chain)
	        throw new ChainNotFoundError();
	    if (currentChainId !== chain.id)
	        throw new ChainMismatchError({ chain, currentChainId });
	}

	function defineChain(chain) {
	    return {
	        formatters: undefined,
	        fees: undefined,
	        serializers: undefined,
	        ...chain,
	    };
	}

	function getTransactionError(err, { docsPath, ...args }) {
	    const cause = (() => {
	        const cause = getNodeError(err, args);
	        if (cause instanceof UnknownNodeError)
	            return err;
	        return cause;
	    })();
	    return new TransactionExecutionError(cause, {
	        docsPath,
	        ...args,
	    });
	}

	const receiptStatuses = {
	    '0x0': 'reverted',
	    '0x1': 'success',
	};
	function formatTransactionReceipt(transactionReceipt, _) {
	    const receipt = {
	        ...transactionReceipt,
	        blockNumber: transactionReceipt.blockNumber
	            ? BigInt(transactionReceipt.blockNumber)
	            : null,
	        contractAddress: transactionReceipt.contractAddress
	            ? transactionReceipt.contractAddress
	            : null,
	        cumulativeGasUsed: transactionReceipt.cumulativeGasUsed
	            ? BigInt(transactionReceipt.cumulativeGasUsed)
	            : null,
	        effectiveGasPrice: transactionReceipt.effectiveGasPrice
	            ? BigInt(transactionReceipt.effectiveGasPrice)
	            : null,
	        gasUsed: transactionReceipt.gasUsed
	            ? BigInt(transactionReceipt.gasUsed)
	            : null,
	        logs: transactionReceipt.logs
	            ? transactionReceipt.logs.map((log) => formatLog(log))
	            : null,
	        to: transactionReceipt.to ? transactionReceipt.to : null,
	        transactionIndex: transactionReceipt.transactionIndex
	            ? hexToNumber$1(transactionReceipt.transactionIndex)
	            : null,
	        status: transactionReceipt.status
	            ? receiptStatuses[transactionReceipt.status]
	            : null,
	        type: transactionReceipt.type
	            ? transactionType[transactionReceipt.type] || transactionReceipt.type
	            : null,
	    };
	    if (transactionReceipt.blobGasPrice)
	        receipt.blobGasPrice = BigInt(transactionReceipt.blobGasPrice);
	    if (transactionReceipt.blobGasUsed)
	        receipt.blobGasUsed = BigInt(transactionReceipt.blobGasUsed);
	    return receipt;
	}
	const defineTransactionReceipt = /*#__PURE__*/ defineFormatter('transactionReceipt', formatTransactionReceipt);

	function withTimeout(fn, { errorInstance = new Error('timed out'), timeout, signal, }) {
	    return new Promise((resolve, reject) => {
	        (async () => {
	            let timeoutId;
	            try {
	                const controller = new AbortController();
	                if (timeout > 0) {
	                    timeoutId = setTimeout(() => {
	                        if (signal) {
	                            controller.abort();
	                        }
	                        else {
	                            reject(errorInstance);
	                        }
	                    }, timeout); // need to cast because bun globals.d.ts overrides @types/node
	                }
	                resolve(await fn({ signal: controller?.signal || null }));
	            }
	            catch (err) {
	                if (err?.name === 'AbortError')
	                    reject(errorInstance);
	                reject(err);
	            }
	            finally {
	                clearTimeout(timeoutId);
	            }
	        })();
	    });
	}

	function createIdStore() {
	    return {
	        current: 0,
	        take() {
	            return this.current++;
	        },
	        reset() {
	            this.current = 0;
	        },
	    };
	}
	const idCache = /*#__PURE__*/ createIdStore();

	function getHttpRpcClient(url, options = {}) {
	    return {
	        async request(params) {
	            const { body, fetchFn = options.fetchFn ?? fetch, onRequest = options.onRequest, onResponse = options.onResponse, timeout = options.timeout ?? 10_000, } = params;
	            const fetchOptions = {
	                ...(options.fetchOptions ?? {}),
	                ...(params.fetchOptions ?? {}),
	            };
	            const { headers, method, signal: signal_ } = fetchOptions;
	            try {
	                const response = await withTimeout(async ({ signal }) => {
	                    const init = {
	                        ...fetchOptions,
	                        body: Array.isArray(body)
	                            ? stringify(body.map((body) => ({
	                                jsonrpc: '2.0',
	                                id: body.id ?? idCache.take(),
	                                ...body,
	                            })))
	                            : stringify({
	                                jsonrpc: '2.0',
	                                id: body.id ?? idCache.take(),
	                                ...body,
	                            }),
	                        headers: {
	                            'Content-Type': 'application/json',
	                            ...headers,
	                        },
	                        method: method || 'POST',
	                        signal: signal_ || (timeout > 0 ? signal : null),
	                    };
	                    const request = new Request(url, init);
	                    const args = (await onRequest?.(request, init)) ?? { ...init, url };
	                    const response = await fetchFn(args.url ?? url, args);
	                    return response;
	                }, {
	                    errorInstance: new TimeoutError({ body, url }),
	                    timeout,
	                    signal: true,
	                });
	                if (onResponse)
	                    await onResponse(response);
	                let data;
	                if (response.headers.get('Content-Type')?.startsWith('application/json'))
	                    data = await response.json();
	                else {
	                    data = await response.text();
	                    try {
	                        data = JSON.parse(data || '{}');
	                    }
	                    catch (err) {
	                        if (response.ok)
	                            throw err;
	                        data = { error: data };
	                    }
	                }
	                if (!response.ok) {
	                    throw new HttpRequestError({
	                        body,
	                        details: stringify(data.error) || response.statusText,
	                        headers: response.headers,
	                        status: response.status,
	                        url,
	                    });
	                }
	                return data;
	            }
	            catch (err) {
	                if (err instanceof HttpRequestError)
	                    throw err;
	                if (err instanceof TimeoutError)
	                    throw err;
	                throw new HttpRequestError({
	                    body,
	                    cause: err,
	                    url,
	                });
	            }
	        },
	    };
	}

	/**
	 * HMAC: RFC2104 message authentication code.
	 * @module
	 */
	class HMAC extends Hash {
	    constructor(hash, _key) {
	        super();
	        this.finished = false;
	        this.destroyed = false;
	        ahash(hash);
	        const key = toBytes(_key);
	        this.iHash = hash.create();
	        if (typeof this.iHash.update !== 'function')
	            throw new Error('Expected instance of class which extends utils.Hash');
	        this.blockLen = this.iHash.blockLen;
	        this.outputLen = this.iHash.outputLen;
	        const blockLen = this.blockLen;
	        const pad = new Uint8Array(blockLen);
	        // blockLen can be bigger than outputLen
	        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
	        for (let i = 0; i < pad.length; i++)
	            pad[i] ^= 0x36;
	        this.iHash.update(pad);
	        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
	        this.oHash = hash.create();
	        // Undo internal XOR && apply outer XOR
	        for (let i = 0; i < pad.length; i++)
	            pad[i] ^= 0x36 ^ 0x5c;
	        this.oHash.update(pad);
	        clean(pad);
	    }
	    update(buf) {
	        aexists(this);
	        this.iHash.update(buf);
	        return this;
	    }
	    digestInto(out) {
	        aexists(this);
	        abytes$1(out, this.outputLen);
	        this.finished = true;
	        this.iHash.digestInto(out);
	        this.oHash.update(out);
	        this.oHash.digestInto(out);
	        this.destroy();
	    }
	    digest() {
	        const out = new Uint8Array(this.oHash.outputLen);
	        this.digestInto(out);
	        return out;
	    }
	    _cloneInto(to) {
	        // Create new instance without calling constructor since key already in state and we don't know it.
	        to || (to = Object.create(Object.getPrototypeOf(this), {}));
	        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
	        to = to;
	        to.finished = finished;
	        to.destroyed = destroyed;
	        to.blockLen = blockLen;
	        to.outputLen = outputLen;
	        to.oHash = oHash._cloneInto(to.oHash);
	        to.iHash = iHash._cloneInto(to.iHash);
	        return to;
	    }
	    clone() {
	        return this._cloneInto();
	    }
	    destroy() {
	        this.destroyed = true;
	        this.oHash.destroy();
	        this.iHash.destroy();
	    }
	}
	/**
	 * HMAC: RFC2104 message authentication code.
	 * @param hash - function that would be used e.g. sha256
	 * @param key - message key
	 * @param message - message data
	 * @example
	 * import { hmac } from '@noble/hashes/hmac';
	 * import { sha256 } from '@noble/hashes/sha2';
	 * const mac1 = hmac(sha256, 'key', 'message');
	 */
	const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
	hmac.create = (hash, key) => new HMAC(hash, key);

	/**
	 * Utils for modular division and finite fields.
	 * A finite field over 11 is integer number operations `mod 11`.
	 * There is no division: it is replaced by modular multiplicative inverse.
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// prettier-ignore
	const _0n$3 = BigInt(0), _1n$3 = BigInt(1), _2n$1 = /* @__PURE__ */ BigInt(2), _3n$1 = /* @__PURE__ */ BigInt(3);
	// prettier-ignore
	const _4n$1 = /* @__PURE__ */ BigInt(4), _5n = /* @__PURE__ */ BigInt(5), _8n = /* @__PURE__ */ BigInt(8);
	// Calculates a modulo b
	function mod(a, b) {
	    const result = a % b;
	    return result >= _0n$3 ? result : b + result;
	}
	/** Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)` */
	function pow2(x, power, modulo) {
	    let res = x;
	    while (power-- > _0n$3) {
	        res *= res;
	        res %= modulo;
	    }
	    return res;
	}
	/**
	 * Inverses number over modulo.
	 * Implemented using [Euclidean GCD](https://brilliant.org/wiki/extended-euclidean-algorithm/).
	 */
	function invert(number, modulo) {
	    if (number === _0n$3)
	        throw new Error('invert: expected non-zero number');
	    if (modulo <= _0n$3)
	        throw new Error('invert: expected positive modulus, got ' + modulo);
	    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
	    let a = mod(number, modulo);
	    let b = modulo;
	    // prettier-ignore
	    let x = _0n$3, u = _1n$3;
	    while (a !== _0n$3) {
	        // JIT applies optimization if those two lines follow each other
	        const q = b / a;
	        const r = b % a;
	        const m = x - u * q;
	        // prettier-ignore
	        b = a, a = r, x = u, u = m;
	    }
	    const gcd = b;
	    if (gcd !== _1n$3)
	        throw new Error('invert: does not exist');
	    return mod(x, modulo);
	}
	// Not all roots are possible! Example which will throw:
	// const NUM =
	// n = 72057594037927816n;
	// Fp = Field(BigInt('0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab'));
	function sqrt3mod4(Fp, n) {
	    const p1div4 = (Fp.ORDER + _1n$3) / _4n$1;
	    const root = Fp.pow(n, p1div4);
	    // Throw if root^2 != n
	    if (!Fp.eql(Fp.sqr(root), n))
	        throw new Error('Cannot find square root');
	    return root;
	}
	function sqrt5mod8(Fp, n) {
	    const p5div8 = (Fp.ORDER - _5n) / _8n;
	    const n2 = Fp.mul(n, _2n$1);
	    const v = Fp.pow(n2, p5div8);
	    const nv = Fp.mul(n, v);
	    const i = Fp.mul(Fp.mul(nv, _2n$1), v);
	    const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
	    if (!Fp.eql(Fp.sqr(root), n))
	        throw new Error('Cannot find square root');
	    return root;
	}
	// TODO: Commented-out for now. Provide test vectors.
	// Tonelli is too slow for extension fields Fp2.
	// That means we can't use sqrt (c1, c2...) even for initialization constants.
	// if (P % _16n === _9n) return sqrt9mod16;
	// // prettier-ignore
	// function sqrt9mod16<T>(Fp: IField<T>, n: T, p7div16?: bigint) {
	//   if (p7div16 === undefined) p7div16 = (Fp.ORDER + BigInt(7)) / _16n;
	//   const c1 = Fp.sqrt(Fp.neg(Fp.ONE)); //  1. c1 = sqrt(-1) in F, i.e., (c1^2) == -1 in F
	//   const c2 = Fp.sqrt(c1);             //  2. c2 = sqrt(c1) in F, i.e., (c2^2) == c1 in F
	//   const c3 = Fp.sqrt(Fp.neg(c1));     //  3. c3 = sqrt(-c1) in F, i.e., (c3^2) == -c1 in F
	//   const c4 = p7div16;                 //  4. c4 = (q + 7) / 16        # Integer arithmetic
	//   let tv1 = Fp.pow(n, c4);            //  1. tv1 = x^c4
	//   let tv2 = Fp.mul(c1, tv1);          //  2. tv2 = c1 * tv1
	//   const tv3 = Fp.mul(c2, tv1);        //  3. tv3 = c2 * tv1
	//   let tv4 = Fp.mul(c3, tv1);          //  4. tv4 = c3 * tv1
	//   const e1 = Fp.eql(Fp.sqr(tv2), n);  //  5.  e1 = (tv2^2) == x
	//   const e2 = Fp.eql(Fp.sqr(tv3), n);  //  6.  e2 = (tv3^2) == x
	//   tv1 = Fp.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
	//   tv2 = Fp.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
	//   const e3 = Fp.eql(Fp.sqr(tv2), n);  //  9.  e3 = (tv2^2) == x
	//   return Fp.cmov(tv1, tv2, e3); // 10.  z = CMOV(tv1, tv2, e3) # Select the sqrt from tv1 and tv2
	// }
	/**
	 * Tonelli-Shanks square root search algorithm.
	 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
	 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
	 * @param P field order
	 * @returns function that takes field Fp (created from P) and number n
	 */
	function tonelliShanks(P) {
	    // Initialization (precomputation).
	    if (P < BigInt(3))
	        throw new Error('sqrt is not defined for small field');
	    // Factor P - 1 = Q * 2^S, where Q is odd
	    let Q = P - _1n$3;
	    let S = 0;
	    while (Q % _2n$1 === _0n$3) {
	        Q /= _2n$1;
	        S++;
	    }
	    // Find the first quadratic non-residue Z >= 2
	    let Z = _2n$1;
	    const _Fp = Field(P);
	    while (FpLegendre(_Fp, Z) === 1) {
	        // Basic primality test for P. After x iterations, chance of
	        // not finding quadratic non-residue is 2^x, so 2^1000.
	        if (Z++ > 1000)
	            throw new Error('Cannot find square root: probably non-prime P');
	    }
	    // Fast-path; usually done before Z, but we do "primality test".
	    if (S === 1)
	        return sqrt3mod4;
	    // Slow-path
	    // TODO: test on Fp2 and others
	    let cc = _Fp.pow(Z, Q); // c = z^Q
	    const Q1div2 = (Q + _1n$3) / _2n$1;
	    return function tonelliSlow(Fp, n) {
	        if (Fp.is0(n))
	            return n;
	        // Check if n is a quadratic residue using Legendre symbol
	        if (FpLegendre(Fp, n) !== 1)
	            throw new Error('Cannot find square root');
	        // Initialize variables for the main loop
	        let M = S;
	        let c = Fp.mul(Fp.ONE, cc); // c = z^Q, move cc from field _Fp into field Fp
	        let t = Fp.pow(n, Q); // t = n^Q, first guess at the fudge factor
	        let R = Fp.pow(n, Q1div2); // R = n^((Q+1)/2), first guess at the square root
	        // Main loop
	        // while t != 1
	        while (!Fp.eql(t, Fp.ONE)) {
	            if (Fp.is0(t))
	                return Fp.ZERO; // if t=0 return R=0
	            let i = 1;
	            // Find the smallest i >= 1 such that t^(2^i) ≡ 1 (mod P)
	            let t_tmp = Fp.sqr(t); // t^(2^1)
	            while (!Fp.eql(t_tmp, Fp.ONE)) {
	                i++;
	                t_tmp = Fp.sqr(t_tmp); // t^(2^2)...
	                if (i === M)
	                    throw new Error('Cannot find square root');
	            }
	            // Calculate the exponent for b: 2^(M - i - 1)
	            const exponent = _1n$3 << BigInt(M - i - 1); // bigint is important
	            const b = Fp.pow(c, exponent); // b = 2^(M - i - 1)
	            // Update variables
	            M = i;
	            c = Fp.sqr(b); // c = b^2
	            t = Fp.mul(t, c); // t = (t * b^2)
	            R = Fp.mul(R, b); // R = R*b
	        }
	        return R;
	    };
	}
	/**
	 * Square root for a finite field. Will try optimized versions first:
	 *
	 * 1. P ≡ 3 (mod 4)
	 * 2. P ≡ 5 (mod 8)
	 * 3. Tonelli-Shanks algorithm
	 *
	 * Different algorithms can give different roots, it is up to user to decide which one they want.
	 * For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
	 */
	function FpSqrt(P) {
	    // P ≡ 3 (mod 4) => √n = n^((P+1)/4)
	    if (P % _4n$1 === _3n$1)
	        return sqrt3mod4;
	    // P ≡ 5 (mod 8) => Atkin algorithm, page 10 of https://eprint.iacr.org/2012/685.pdf
	    if (P % _8n === _5n)
	        return sqrt5mod8;
	    // P ≡ 9 (mod 16) not implemented, see above
	    // Tonelli-Shanks algorithm
	    return tonelliShanks(P);
	}
	// prettier-ignore
	const FIELD_FIELDS = [
	    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
	    'eql', 'add', 'sub', 'mul', 'pow', 'div',
	    'addN', 'subN', 'mulN', 'sqrN'
	];
	function validateField(field) {
	    const initial = {
	        ORDER: 'bigint',
	        MASK: 'bigint',
	        BYTES: 'isSafeInteger',
	        BITS: 'isSafeInteger',
	    };
	    const opts = FIELD_FIELDS.reduce((map, val) => {
	        map[val] = 'function';
	        return map;
	    }, initial);
	    return validateObject(field, opts);
	}
	// Generic field functions
	/**
	 * Same as `pow` but for Fp: non-constant-time.
	 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
	 */
	function FpPow(Fp, num, power) {
	    if (power < _0n$3)
	        throw new Error('invalid exponent, negatives unsupported');
	    if (power === _0n$3)
	        return Fp.ONE;
	    if (power === _1n$3)
	        return num;
	    let p = Fp.ONE;
	    let d = num;
	    while (power > _0n$3) {
	        if (power & _1n$3)
	            p = Fp.mul(p, d);
	        d = Fp.sqr(d);
	        power >>= _1n$3;
	    }
	    return p;
	}
	/**
	 * Efficiently invert an array of Field elements.
	 * Exception-free. Will return `undefined` for 0 elements.
	 * @param passZero map 0 to 0 (instead of undefined)
	 */
	function FpInvertBatch(Fp, nums, passZero = false) {
	    const inverted = new Array(nums.length).fill(passZero ? Fp.ZERO : undefined);
	    // Walk from first to last, multiply them by each other MOD p
	    const multipliedAcc = nums.reduce((acc, num, i) => {
	        if (Fp.is0(num))
	            return acc;
	        inverted[i] = acc;
	        return Fp.mul(acc, num);
	    }, Fp.ONE);
	    // Invert last element
	    const invertedAcc = Fp.inv(multipliedAcc);
	    // Walk from last to first, multiply them by inverted each other MOD p
	    nums.reduceRight((acc, num, i) => {
	        if (Fp.is0(num))
	            return acc;
	        inverted[i] = Fp.mul(acc, inverted[i]);
	        return Fp.mul(acc, num);
	    }, invertedAcc);
	    return inverted;
	}
	/**
	 * Legendre symbol.
	 * Legendre constant is used to calculate Legendre symbol (a | p)
	 * which denotes the value of a^((p-1)/2) (mod p).
	 *
	 * * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
	 * * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
	 * * (a | p) ≡ 0    if a ≡ 0 (mod p)
	 */
	function FpLegendre(Fp, n) {
	    // We can use 3rd argument as optional cache of this value
	    // but seems unneeded for now. The operation is very fast.
	    const p1mod2 = (Fp.ORDER - _1n$3) / _2n$1;
	    const powered = Fp.pow(n, p1mod2);
	    const yes = Fp.eql(powered, Fp.ONE);
	    const zero = Fp.eql(powered, Fp.ZERO);
	    const no = Fp.eql(powered, Fp.neg(Fp.ONE));
	    if (!yes && !zero && !no)
	        throw new Error('invalid Legendre symbol result');
	    return yes ? 1 : zero ? 0 : -1;
	}
	// CURVE.n lengths
	function nLength(n, nBitLength) {
	    // Bit size, byte size of CURVE.n
	    if (nBitLength !== undefined)
	        anumber(nBitLength);
	    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
	    const nByteLength = Math.ceil(_nBitLength / 8);
	    return { nBitLength: _nBitLength, nByteLength };
	}
	/**
	 * Initializes a finite field over prime.
	 * Major performance optimizations:
	 * * a) denormalized operations like mulN instead of mul
	 * * b) same object shape: never add or remove keys
	 * * c) Object.freeze
	 * Fragile: always run a benchmark on a change.
	 * Security note: operations don't check 'isValid' for all elements for performance reasons,
	 * it is caller responsibility to check this.
	 * This is low-level code, please make sure you know what you're doing.
	 * @param ORDER prime positive bigint
	 * @param bitLen how many bits the field consumes
	 * @param isLE (def: false) if encoding / decoding should be in little-endian
	 * @param redef optional faster redefinitions of sqrt and other methods
	 */
	function Field(ORDER, bitLen, isLE = false, redef = {}) {
	    if (ORDER <= _0n$3)
	        throw new Error('invalid field: expected ORDER > 0, got ' + ORDER);
	    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
	    if (BYTES > 2048)
	        throw new Error('invalid field: expected ORDER of <= 2048 bytes');
	    let sqrtP; // cached sqrtP
	    const f = Object.freeze({
	        ORDER,
	        isLE,
	        BITS,
	        BYTES,
	        MASK: bitMask(BITS),
	        ZERO: _0n$3,
	        ONE: _1n$3,
	        create: (num) => mod(num, ORDER),
	        isValid: (num) => {
	            if (typeof num !== 'bigint')
	                throw new Error('invalid field element: expected bigint, got ' + typeof num);
	            return _0n$3 <= num && num < ORDER; // 0 is valid element, but it's not invertible
	        },
	        is0: (num) => num === _0n$3,
	        isOdd: (num) => (num & _1n$3) === _1n$3,
	        neg: (num) => mod(-num, ORDER),
	        eql: (lhs, rhs) => lhs === rhs,
	        sqr: (num) => mod(num * num, ORDER),
	        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
	        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
	        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
	        pow: (num, power) => FpPow(f, num, power),
	        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
	        // Same as above, but doesn't normalize
	        sqrN: (num) => num * num,
	        addN: (lhs, rhs) => lhs + rhs,
	        subN: (lhs, rhs) => lhs - rhs,
	        mulN: (lhs, rhs) => lhs * rhs,
	        inv: (num) => invert(num, ORDER),
	        sqrt: redef.sqrt ||
	            ((n) => {
	                if (!sqrtP)
	                    sqrtP = FpSqrt(ORDER);
	                return sqrtP(f, n);
	            }),
	        toBytes: (num) => (isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
	        fromBytes: (bytes) => {
	            if (bytes.length !== BYTES)
	                throw new Error('Field.fromBytes: expected ' + BYTES + ' bytes, got ' + bytes.length);
	            return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
	        },
	        // TODO: we don't need it here, move out to separate fn
	        invertBatch: (lst) => FpInvertBatch(f, lst),
	        // We can't move this out because Fp6, Fp12 implement it
	        // and it's unclear what to return in there.
	        cmov: (a, b, c) => (c ? b : a),
	    });
	    return Object.freeze(f);
	}
	/**
	 * Returns total number of bytes consumed by the field element.
	 * For example, 32 bytes for usual 256-bit weierstrass curve.
	 * @param fieldOrder number of field elements, usually CURVE.n
	 * @returns byte length of field
	 */
	function getFieldBytesLength(fieldOrder) {
	    if (typeof fieldOrder !== 'bigint')
	        throw new Error('field order must be bigint');
	    const bitLength = fieldOrder.toString(2).length;
	    return Math.ceil(bitLength / 8);
	}
	/**
	 * Returns minimal amount of bytes that can be safely reduced
	 * by field order.
	 * Should be 2^-128 for 128-bit curve such as P256.
	 * @param fieldOrder number of field elements, usually CURVE.n
	 * @returns byte length of target hash
	 */
	function getMinHashLength(fieldOrder) {
	    const length = getFieldBytesLength(fieldOrder);
	    return length + Math.ceil(length / 2);
	}
	/**
	 * "Constant-time" private key generation utility.
	 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
	 * and convert them into private scalar, with the modulo bias being negligible.
	 * Needs at least 48 bytes of input for 32-byte private key.
	 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
	 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
	 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
	 * @param hash hash output from SHA3 or a similar function
	 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
	 * @param isLE interpret hash bytes as LE num
	 * @returns valid private scalar
	 */
	function mapHashToField(key, fieldOrder, isLE = false) {
	    const len = key.length;
	    const fieldLen = getFieldBytesLength(fieldOrder);
	    const minLen = getMinHashLength(fieldOrder);
	    // No small numbers: need to understand bias story. No huge numbers: easier to detect JS timings.
	    if (len < 16 || len < minLen || len > 1024)
	        throw new Error('expected ' + minLen + '-1024 bytes of input, got ' + len);
	    const num = isLE ? bytesToNumberLE(key) : bytesToNumberBE(key);
	    // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
	    const reduced = mod(num, fieldOrder - _1n$3) + _1n$3;
	    return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
	}

	/**
	 * Methods for elliptic curve multiplication by scalars.
	 * Contains wNAF, pippenger
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	const _0n$2 = BigInt(0);
	const _1n$2 = BigInt(1);
	function constTimeNegate(condition, item) {
	    const neg = item.negate();
	    return condition ? neg : item;
	}
	function validateW(W, bits) {
	    if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
	        throw new Error('invalid window size, expected [1..' + bits + '], got W=' + W);
	}
	function calcWOpts(W, scalarBits) {
	    validateW(W, scalarBits);
	    const windows = Math.ceil(scalarBits / W) + 1; // W=8 33. Not 32, because we skip zero
	    const windowSize = 2 ** (W - 1); // W=8 128. Not 256, because we skip zero
	    const maxNumber = 2 ** W; // W=8 256
	    const mask = bitMask(W); // W=8 255 == mask 0b11111111
	    const shiftBy = BigInt(W); // W=8 8
	    return { windows, windowSize, mask, maxNumber, shiftBy };
	}
	function calcOffsets(n, window, wOpts) {
	    const { windowSize, mask, maxNumber, shiftBy } = wOpts;
	    let wbits = Number(n & mask); // extract W bits.
	    let nextN = n >> shiftBy; // shift number by W bits.
	    // What actually happens here:
	    // const highestBit = Number(mask ^ (mask >> 1n));
	    // let wbits2 = wbits - 1; // skip zero
	    // if (wbits2 & highestBit) { wbits2 ^= Number(mask); // (~);
	    // split if bits > max: +224 => 256-32
	    if (wbits > windowSize) {
	        // we skip zero, which means instead of `>= size-1`, we do `> size`
	        wbits -= maxNumber; // -32, can be maxNumber - wbits, but then we need to set isNeg here.
	        nextN += _1n$2; // +256 (carry)
	    }
	    const offsetStart = window * windowSize;
	    const offset = offsetStart + Math.abs(wbits) - 1; // -1 because we skip zero
	    const isZero = wbits === 0; // is current window slice a 0?
	    const isNeg = wbits < 0; // is current window slice negative?
	    const isNegF = window % 2 !== 0; // fake random statement for noise
	    const offsetF = offsetStart; // fake offset for noise
	    return { nextN, offset, isZero, isNeg, isNegF, offsetF };
	}
	function validateMSMPoints(points, c) {
	    if (!Array.isArray(points))
	        throw new Error('array expected');
	    points.forEach((p, i) => {
	        if (!(p instanceof c))
	            throw new Error('invalid point at index ' + i);
	    });
	}
	function validateMSMScalars(scalars, field) {
	    if (!Array.isArray(scalars))
	        throw new Error('array of scalars expected');
	    scalars.forEach((s, i) => {
	        if (!field.isValid(s))
	            throw new Error('invalid scalar at index ' + i);
	    });
	}
	// Since points in different groups cannot be equal (different object constructor),
	// we can have single place to store precomputes.
	// Allows to make points frozen / immutable.
	const pointPrecomputes = new WeakMap();
	const pointWindowSizes = new WeakMap();
	function getW(P) {
	    return pointWindowSizes.get(P) || 1;
	}
	/**
	 * Elliptic curve multiplication of Point by scalar. Fragile.
	 * Scalars should always be less than curve order: this should be checked inside of a curve itself.
	 * Creates precomputation tables for fast multiplication:
	 * - private scalar is split by fixed size windows of W bits
	 * - every window point is collected from window's table & added to accumulator
	 * - since windows are different, same point inside tables won't be accessed more than once per calc
	 * - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
	 * - +1 window is neccessary for wNAF
	 * - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
	 *
	 * @todo Research returning 2d JS array of windows, instead of a single window.
	 * This would allow windows to be in different memory locations
	 */
	function wNAF(c, bits) {
	    return {
	        constTimeNegate,
	        hasPrecomputes(elm) {
	            return getW(elm) !== 1;
	        },
	        // non-const time multiplication ladder
	        unsafeLadder(elm, n, p = c.ZERO) {
	            let d = elm;
	            while (n > _0n$2) {
	                if (n & _1n$2)
	                    p = p.add(d);
	                d = d.double();
	                n >>= _1n$2;
	            }
	            return p;
	        },
	        /**
	         * Creates a wNAF precomputation window. Used for caching.
	         * Default window size is set by `utils.precompute()` and is equal to 8.
	         * Number of precomputed points depends on the curve size:
	         * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
	         * - 𝑊 is the window size
	         * - 𝑛 is the bitlength of the curve order.
	         * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
	         * @param elm Point instance
	         * @param W window size
	         * @returns precomputed point tables flattened to a single array
	         */
	        precomputeWindow(elm, W) {
	            const { windows, windowSize } = calcWOpts(W, bits);
	            const points = [];
	            let p = elm;
	            let base = p;
	            for (let window = 0; window < windows; window++) {
	                base = p;
	                points.push(base);
	                // i=1, bc we skip 0
	                for (let i = 1; i < windowSize; i++) {
	                    base = base.add(p);
	                    points.push(base);
	                }
	                p = base.double();
	            }
	            return points;
	        },
	        /**
	         * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
	         * @param W window size
	         * @param precomputes precomputed tables
	         * @param n scalar (we don't check here, but should be less than curve order)
	         * @returns real and fake (for const-time) points
	         */
	        wNAF(W, precomputes, n) {
	            // Smaller version:
	            // https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
	            // TODO: check the scalar is less than group order?
	            // wNAF behavior is undefined otherwise. But have to carefully remove
	            // other checks before wNAF. ORDER == bits here.
	            // Accumulators
	            let p = c.ZERO;
	            let f = c.BASE;
	            // This code was first written with assumption that 'f' and 'p' will never be infinity point:
	            // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
	            // there is negate now: it is possible that negated element from low value
	            // would be the same as high element, which will create carry into next window.
	            // It's not obvious how this can fail, but still worth investigating later.
	            const wo = calcWOpts(W, bits);
	            for (let window = 0; window < wo.windows; window++) {
	                // (n === _0n) is handled and not early-exited. isEven and offsetF are used for noise
	                const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
	                n = nextN;
	                if (isZero) {
	                    // bits are 0: add garbage to fake point
	                    // Important part for const-time getPublicKey: add random "noise" point to f.
	                    f = f.add(constTimeNegate(isNegF, precomputes[offsetF]));
	                }
	                else {
	                    // bits are 1: add to result point
	                    p = p.add(constTimeNegate(isNeg, precomputes[offset]));
	                }
	            }
	            // Return both real and fake points: JIT won't eliminate f.
	            // At this point there is a way to F be infinity-point even if p is not,
	            // which makes it less const-time: around 1 bigint multiply.
	            return { p, f };
	        },
	        /**
	         * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
	         * @param W window size
	         * @param precomputes precomputed tables
	         * @param n scalar (we don't check here, but should be less than curve order)
	         * @param acc accumulator point to add result of multiplication
	         * @returns point
	         */
	        wNAFUnsafe(W, precomputes, n, acc = c.ZERO) {
	            const wo = calcWOpts(W, bits);
	            for (let window = 0; window < wo.windows; window++) {
	                if (n === _0n$2)
	                    break; // Early-exit, skip 0 value
	                const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
	                n = nextN;
	                if (isZero) {
	                    // Window bits are 0: skip processing.
	                    // Move to next window.
	                    continue;
	                }
	                else {
	                    const item = precomputes[offset];
	                    acc = acc.add(isNeg ? item.negate() : item); // Re-using acc allows to save adds in MSM
	                }
	            }
	            return acc;
	        },
	        getPrecomputes(W, P, transform) {
	            // Calculate precomputes on a first run, reuse them after
	            let comp = pointPrecomputes.get(P);
	            if (!comp) {
	                comp = this.precomputeWindow(P, W);
	                if (W !== 1)
	                    pointPrecomputes.set(P, transform(comp));
	            }
	            return comp;
	        },
	        wNAFCached(P, n, transform) {
	            const W = getW(P);
	            return this.wNAF(W, this.getPrecomputes(W, P, transform), n);
	        },
	        wNAFCachedUnsafe(P, n, transform, prev) {
	            const W = getW(P);
	            if (W === 1)
	                return this.unsafeLadder(P, n, prev); // For W=1 ladder is ~x2 faster
	            return this.wNAFUnsafe(W, this.getPrecomputes(W, P, transform), n, prev);
	        },
	        // We calculate precomputes for elliptic curve point multiplication
	        // using windowed method. This specifies window size and
	        // stores precomputed values. Usually only base point would be precomputed.
	        setWindowSize(P, W) {
	            validateW(W, bits);
	            pointWindowSizes.set(P, W);
	            pointPrecomputes.delete(P);
	        },
	    };
	}
	/**
	 * Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
	 * 30x faster vs naive addition on L=4096, 10x faster than precomputes.
	 * For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
	 * Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
	 * @param c Curve Point constructor
	 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
	 * @param points array of L curve points
	 * @param scalars array of L scalars (aka private keys / bigints)
	 */
	function pippenger(c, fieldN, points, scalars) {
	    // If we split scalars by some window (let's say 8 bits), every chunk will only
	    // take 256 buckets even if there are 4096 scalars, also re-uses double.
	    // TODO:
	    // - https://eprint.iacr.org/2024/750.pdf
	    // - https://tches.iacr.org/index.php/TCHES/article/view/10287
	    // 0 is accepted in scalars
	    validateMSMPoints(points, c);
	    validateMSMScalars(scalars, fieldN);
	    const plength = points.length;
	    const slength = scalars.length;
	    if (plength !== slength)
	        throw new Error('arrays of points and scalars must have equal length');
	    // if (plength === 0) throw new Error('array must be of length >= 2');
	    const zero = c.ZERO;
	    const wbits = bitLen(BigInt(plength));
	    let windowSize = 1; // bits
	    if (wbits > 12)
	        windowSize = wbits - 3;
	    else if (wbits > 4)
	        windowSize = wbits - 2;
	    else if (wbits > 0)
	        windowSize = 2;
	    const MASK = bitMask(windowSize);
	    const buckets = new Array(Number(MASK) + 1).fill(zero); // +1 for zero array
	    const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
	    let sum = zero;
	    for (let i = lastBits; i >= 0; i -= windowSize) {
	        buckets.fill(zero);
	        for (let j = 0; j < slength; j++) {
	            const scalar = scalars[j];
	            const wbits = Number((scalar >> BigInt(i)) & MASK);
	            buckets[wbits] = buckets[wbits].add(points[j]);
	        }
	        let resI = zero; // not using this will do small speed-up, but will lose ct
	        // Skip first bucket, because it is zero
	        for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
	            sumI = sumI.add(buckets[j]);
	            resI = resI.add(sumI);
	        }
	        sum = sum.add(resI);
	        if (i !== 0)
	            for (let j = 0; j < windowSize; j++)
	                sum = sum.double();
	    }
	    return sum;
	}
	function validateBasic(curve) {
	    validateField(curve.Fp);
	    validateObject(curve, {
	        n: 'bigint',
	        h: 'bigint',
	        Gx: 'field',
	        Gy: 'field',
	    }, {
	        nBitLength: 'isSafeInteger',
	        nByteLength: 'isSafeInteger',
	    });
	    // Set defaults
	    return Object.freeze({
	        ...nLength(curve.n, curve.nBitLength),
	        ...curve,
	        ...{ p: curve.Fp.ORDER },
	    });
	}

	/**
	 * Short Weierstrass curve methods. The formula is: y² = x³ + ax + b.
	 *
	 * ### Parameters
	 *
	 * To initialize a weierstrass curve, one needs to pass following params:
	 *
	 * * a: formula param
	 * * b: formula param
	 * * Fp: finite field of prime characteristic P; may be complex (Fp2). Arithmetics is done in field
	 * * n: order of prime subgroup a.k.a total amount of valid curve points
	 * * Gx: Base point (x, y) aka generator point. Gx = x coordinate
	 * * Gy: ...y coordinate
	 * * h: cofactor, usually 1. h*n = curve group order (n is only subgroup order)
	 * * lowS: whether to enable (default) or disable "low-s" non-malleable signatures
	 *
	 * ### Design rationale for types
	 *
	 * * Interaction between classes from different curves should fail:
	 *   `k256.Point.BASE.add(p256.Point.BASE)`
	 * * For this purpose we want to use `instanceof` operator, which is fast and works during runtime
	 * * Different calls of `curve()` would return different classes -
	 *   `curve(params) !== curve(params)`: if somebody decided to monkey-patch their curve,
	 *   it won't affect others
	 *
	 * TypeScript can't infer types for classes created inside a function. Classes is one instance
	 * of nominative types in TypeScript and interfaces only check for shape, so it's hard to create
	 * unique type for every function call.
	 *
	 * We can use generic types via some param, like curve opts, but that would:
	 *     1. Enable interaction between `curve(params)` and `curve(params)` (curves of same params)
	 *     which is hard to debug.
	 *     2. Params can be generic and we can't enforce them to be constant value:
	 *     if somebody creates curve from non-constant params,
	 *     it would be allowed to interact with other curves with non-constant params
	 *
	 * @todo https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// prettier-ignore
	function validateSigVerOpts(opts) {
	    if (opts.lowS !== undefined)
	        abool('lowS', opts.lowS);
	    if (opts.prehash !== undefined)
	        abool('prehash', opts.prehash);
	}
	function validatePointOpts(curve) {
	    const opts = validateBasic(curve);
	    validateObject(opts, {
	        a: 'field',
	        b: 'field',
	    }, {
	        allowInfinityPoint: 'boolean',
	        allowedPrivateKeyLengths: 'array',
	        clearCofactor: 'function',
	        fromBytes: 'function',
	        isTorsionFree: 'function',
	        toBytes: 'function',
	        wrapPrivateKey: 'boolean',
	    });
	    const { endo, Fp, a } = opts;
	    if (endo) {
	        if (!Fp.eql(a, Fp.ZERO)) {
	            throw new Error('invalid endo: CURVE.a must be 0');
	        }
	        if (typeof endo !== 'object' ||
	            typeof endo.beta !== 'bigint' ||
	            typeof endo.splitScalar !== 'function') {
	            throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
	        }
	    }
	    return Object.freeze({ ...opts });
	}
	class DERErr extends Error {
	    constructor(m = '') {
	        super(m);
	    }
	}
	/**
	 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
	 *
	 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
	 *
	 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
	 */
	const DER = {
	    // asn.1 DER encoding utils
	    Err: DERErr,
	    // Basic building block is TLV (Tag-Length-Value)
	    _tlv: {
	        encode: (tag, data) => {
	            const { Err: E } = DER;
	            if (tag < 0 || tag > 256)
	                throw new E('tlv.encode: wrong tag');
	            if (data.length & 1)
	                throw new E('tlv.encode: unpadded data');
	            const dataLen = data.length / 2;
	            const len = numberToHexUnpadded(dataLen);
	            if ((len.length / 2) & 128)
	                throw new E('tlv.encode: long form length too big');
	            // length of length with long form flag
	            const lenLen = dataLen > 127 ? numberToHexUnpadded((len.length / 2) | 128) : '';
	            const t = numberToHexUnpadded(tag);
	            return t + lenLen + len + data;
	        },
	        // v - value, l - left bytes (unparsed)
	        decode(tag, data) {
	            const { Err: E } = DER;
	            let pos = 0;
	            if (tag < 0 || tag > 256)
	                throw new E('tlv.encode: wrong tag');
	            if (data.length < 2 || data[pos++] !== tag)
	                throw new E('tlv.decode: wrong tlv');
	            const first = data[pos++];
	            const isLong = !!(first & 128); // First bit of first length byte is flag for short/long form
	            let length = 0;
	            if (!isLong)
	                length = first;
	            else {
	                // Long form: [longFlag(1bit), lengthLength(7bit), length (BE)]
	                const lenLen = first & 127;
	                if (!lenLen)
	                    throw new E('tlv.decode(long): indefinite length not supported');
	                if (lenLen > 4)
	                    throw new E('tlv.decode(long): byte length is too big'); // this will overflow u32 in js
	                const lengthBytes = data.subarray(pos, pos + lenLen);
	                if (lengthBytes.length !== lenLen)
	                    throw new E('tlv.decode: length bytes not complete');
	                if (lengthBytes[0] === 0)
	                    throw new E('tlv.decode(long): zero leftmost byte');
	                for (const b of lengthBytes)
	                    length = (length << 8) | b;
	                pos += lenLen;
	                if (length < 128)
	                    throw new E('tlv.decode(long): not minimal encoding');
	            }
	            const v = data.subarray(pos, pos + length);
	            if (v.length !== length)
	                throw new E('tlv.decode: wrong value length');
	            return { v, l: data.subarray(pos + length) };
	        },
	    },
	    // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
	    // since we always use positive integers here. It must always be empty:
	    // - add zero byte if exists
	    // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
	    _int: {
	        encode(num) {
	            const { Err: E } = DER;
	            if (num < _0n$1)
	                throw new E('integer: negative integers are not allowed');
	            let hex = numberToHexUnpadded(num);
	            // Pad with zero byte if negative flag is present
	            if (Number.parseInt(hex[0], 16) & 0b1000)
	                hex = '00' + hex;
	            if (hex.length & 1)
	                throw new E('unexpected DER parsing assertion: unpadded hex');
	            return hex;
	        },
	        decode(data) {
	            const { Err: E } = DER;
	            if (data[0] & 128)
	                throw new E('invalid signature integer: negative');
	            if (data[0] === 0x00 && !(data[1] & 128))
	                throw new E('invalid signature integer: unnecessary leading zero');
	            return bytesToNumberBE(data);
	        },
	    },
	    toSig(hex) {
	        // parse DER signature
	        const { Err: E, _int: int, _tlv: tlv } = DER;
	        const data = ensureBytes('signature', hex);
	        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(0x30, data);
	        if (seqLeftBytes.length)
	            throw new E('invalid signature: left bytes after parsing');
	        const { v: rBytes, l: rLeftBytes } = tlv.decode(0x02, seqBytes);
	        const { v: sBytes, l: sLeftBytes } = tlv.decode(0x02, rLeftBytes);
	        if (sLeftBytes.length)
	            throw new E('invalid signature: left bytes after parsing');
	        return { r: int.decode(rBytes), s: int.decode(sBytes) };
	    },
	    hexFromSig(sig) {
	        const { _tlv: tlv, _int: int } = DER;
	        const rs = tlv.encode(0x02, int.encode(sig.r));
	        const ss = tlv.encode(0x02, int.encode(sig.s));
	        const seq = rs + ss;
	        return tlv.encode(0x30, seq);
	    },
	};
	function numToSizedHex(num, size) {
	    return bytesToHex(numberToBytesBE(num, size));
	}
	// Be friendly to bad ECMAScript parsers by not using bigint literals
	// prettier-ignore
	const _0n$1 = BigInt(0), _1n$1 = BigInt(1); BigInt(2); const _3n = BigInt(3), _4n = BigInt(4);
	function weierstrassPoints(opts) {
	    const CURVE = validatePointOpts(opts);
	    const { Fp } = CURVE; // All curves has same field / group length as for now, but they can differ
	    const Fn = Field(CURVE.n, CURVE.nBitLength);
	    const toBytes = CURVE.toBytes ||
	        ((_c, point, _isCompressed) => {
	            const a = point.toAffine();
	            return concatBytes(Uint8Array.from([0x04]), Fp.toBytes(a.x), Fp.toBytes(a.y));
	        });
	    const fromBytes = CURVE.fromBytes ||
	        ((bytes) => {
	            // const head = bytes[0];
	            const tail = bytes.subarray(1);
	            // if (head !== 0x04) throw new Error('Only non-compressed encoding is supported');
	            const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
	            const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
	            return { x, y };
	        });
	    /**
	     * y² = x³ + ax + b: Short weierstrass curve formula. Takes x, returns y².
	     * @returns y²
	     */
	    function weierstrassEquation(x) {
	        const { a, b } = CURVE;
	        const x2 = Fp.sqr(x); // x * x
	        const x3 = Fp.mul(x2, x); // x² * x
	        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x³ + a * x + b
	    }
	    function isValidXY(x, y) {
	        const left = Fp.sqr(y); // y²
	        const right = weierstrassEquation(x); // x³ + ax + b
	        return Fp.eql(left, right);
	    }
	    // Validate whether the passed curve params are valid.
	    // Test 1: equation y² = x³ + ax + b should work for generator point.
	    if (!isValidXY(CURVE.Gx, CURVE.Gy))
	        throw new Error('bad curve params: generator point');
	    // Test 2: discriminant Δ part should be non-zero: 4a³ + 27b² != 0.
	    // Guarantees curve is genus-1, smooth (non-singular).
	    const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n), _4n);
	    const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
	    if (Fp.is0(Fp.add(_4a3, _27b2)))
	        throw new Error('bad curve params: a or b');
	    // Valid group elements reside in range 1..n-1
	    function isWithinCurveOrder(num) {
	        return inRange(num, _1n$1, CURVE.n);
	    }
	    // Validates if priv key is valid and converts it to bigint.
	    // Supports options allowedPrivateKeyLengths and wrapPrivateKey.
	    function normPrivateKeyToScalar(key) {
	        const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n: N } = CURVE;
	        if (lengths && typeof key !== 'bigint') {
	            if (isBytes(key))
	                key = bytesToHex(key);
	            // Normalize to hex string, pad. E.g. P521 would norm 130-132 char hex to 132-char bytes
	            if (typeof key !== 'string' || !lengths.includes(key.length))
	                throw new Error('invalid private key');
	            key = key.padStart(nByteLength * 2, '0');
	        }
	        let num;
	        try {
	            num =
	                typeof key === 'bigint'
	                    ? key
	                    : bytesToNumberBE(ensureBytes('private key', key, nByteLength));
	        }
	        catch (error) {
	            throw new Error('invalid private key, expected hex or ' + nByteLength + ' bytes, got ' + typeof key);
	        }
	        if (wrapPrivateKey)
	            num = mod(num, N); // disabled by default, enabled for BLS
	        aInRange('private key', num, _1n$1, N); // num in range [1..N-1]
	        return num;
	    }
	    function aprjpoint(other) {
	        if (!(other instanceof Point))
	            throw new Error('ProjectivePoint expected');
	    }
	    // Memoized toAffine / validity check. They are heavy. Points are immutable.
	    // Converts Projective point to affine (x, y) coordinates.
	    // Can accept precomputed Z^-1 - for example, from invertBatch.
	    // (X, Y, Z) ∋ (x=X/Z, y=Y/Z)
	    const toAffineMemo = memoized((p, iz) => {
	        const { px: x, py: y, pz: z } = p;
	        // Fast-path for normalized points
	        if (Fp.eql(z, Fp.ONE))
	            return { x, y };
	        const is0 = p.is0();
	        // If invZ was 0, we return zero point. However we still want to execute
	        // all operations, so we replace invZ with a random number, 1.
	        if (iz == null)
	            iz = is0 ? Fp.ONE : Fp.inv(z);
	        const ax = Fp.mul(x, iz);
	        const ay = Fp.mul(y, iz);
	        const zz = Fp.mul(z, iz);
	        if (is0)
	            return { x: Fp.ZERO, y: Fp.ZERO };
	        if (!Fp.eql(zz, Fp.ONE))
	            throw new Error('invZ was invalid');
	        return { x: ax, y: ay };
	    });
	    // NOTE: on exception this will crash 'cached' and no value will be set.
	    // Otherwise true will be return
	    const assertValidMemo = memoized((p) => {
	        if (p.is0()) {
	            // (0, 1, 0) aka ZERO is invalid in most contexts.
	            // In BLS, ZERO can be serialized, so we allow it.
	            // (0, 0, 0) is invalid representation of ZERO.
	            if (CURVE.allowInfinityPoint && !Fp.is0(p.py))
	                return;
	            throw new Error('bad point: ZERO');
	        }
	        // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
	        const { x, y } = p.toAffine();
	        // Check if x, y are valid field elements
	        if (!Fp.isValid(x) || !Fp.isValid(y))
	            throw new Error('bad point: x or y not FE');
	        if (!isValidXY(x, y))
	            throw new Error('bad point: equation left != right');
	        if (!p.isTorsionFree())
	            throw new Error('bad point: not in prime-order subgroup');
	        return true;
	    });
	    /**
	     * Projective Point works in 3d / projective (homogeneous) coordinates: (X, Y, Z) ∋ (x=X/Z, y=Y/Z)
	     * Default Point works in 2d / affine coordinates: (x, y)
	     * We're doing calculations in projective, because its operations don't require costly inversion.
	     */
	    class Point {
	        constructor(px, py, pz) {
	            if (px == null || !Fp.isValid(px))
	                throw new Error('x required');
	            if (py == null || !Fp.isValid(py) || Fp.is0(py))
	                throw new Error('y required');
	            if (pz == null || !Fp.isValid(pz))
	                throw new Error('z required');
	            this.px = px;
	            this.py = py;
	            this.pz = pz;
	            Object.freeze(this);
	        }
	        // Does not validate if the point is on-curve.
	        // Use fromHex instead, or call assertValidity() later.
	        static fromAffine(p) {
	            const { x, y } = p || {};
	            if (!p || !Fp.isValid(x) || !Fp.isValid(y))
	                throw new Error('invalid affine point');
	            if (p instanceof Point)
	                throw new Error('projective point not allowed');
	            const is0 = (i) => Fp.eql(i, Fp.ZERO);
	            // fromAffine(x:0, y:0) would produce (x:0, y:0, z:1), but we need (x:0, y:1, z:0)
	            if (is0(x) && is0(y))
	                return Point.ZERO;
	            return new Point(x, y, Fp.ONE);
	        }
	        get x() {
	            return this.toAffine().x;
	        }
	        get y() {
	            return this.toAffine().y;
	        }
	        /**
	         * Takes a bunch of Projective Points but executes only one
	         * inversion on all of them. Inversion is very slow operation,
	         * so this improves performance massively.
	         * Optimization: converts a list of projective points to a list of identical points with Z=1.
	         */
	        static normalizeZ(points) {
	            const toInv = FpInvertBatch(Fp, points.map((p) => p.pz));
	            return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
	        }
	        /**
	         * Converts hash string or Uint8Array to Point.
	         * @param hex short/long ECDSA hex
	         */
	        static fromHex(hex) {
	            const P = Point.fromAffine(fromBytes(ensureBytes('pointHex', hex)));
	            P.assertValidity();
	            return P;
	        }
	        // Multiplies generator point by privateKey.
	        static fromPrivateKey(privateKey) {
	            return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
	        }
	        // Multiscalar Multiplication
	        static msm(points, scalars) {
	            return pippenger(Point, Fn, points, scalars);
	        }
	        // "Private method", don't use it directly
	        _setWindowSize(windowSize) {
	            wnaf.setWindowSize(this, windowSize);
	        }
	        // A point on curve is valid if it conforms to equation.
	        assertValidity() {
	            assertValidMemo(this);
	        }
	        hasEvenY() {
	            const { y } = this.toAffine();
	            if (Fp.isOdd)
	                return !Fp.isOdd(y);
	            throw new Error("Field doesn't support isOdd");
	        }
	        /**
	         * Compare one point to another.
	         */
	        equals(other) {
	            aprjpoint(other);
	            const { px: X1, py: Y1, pz: Z1 } = this;
	            const { px: X2, py: Y2, pz: Z2 } = other;
	            const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
	            const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
	            return U1 && U2;
	        }
	        /**
	         * Flips point to one corresponding to (x, -y) in Affine coordinates.
	         */
	        negate() {
	            return new Point(this.px, Fp.neg(this.py), this.pz);
	        }
	        // Renes-Costello-Batina exception-free doubling formula.
	        // There is 30% faster Jacobian formula, but it is not complete.
	        // https://eprint.iacr.org/2015/1060, algorithm 3
	        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
	        double() {
	            const { a, b } = CURVE;
	            const b3 = Fp.mul(b, _3n);
	            const { px: X1, py: Y1, pz: Z1 } = this;
	            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
	            let t0 = Fp.mul(X1, X1); // step 1
	            let t1 = Fp.mul(Y1, Y1);
	            let t2 = Fp.mul(Z1, Z1);
	            let t3 = Fp.mul(X1, Y1);
	            t3 = Fp.add(t3, t3); // step 5
	            Z3 = Fp.mul(X1, Z1);
	            Z3 = Fp.add(Z3, Z3);
	            X3 = Fp.mul(a, Z3);
	            Y3 = Fp.mul(b3, t2);
	            Y3 = Fp.add(X3, Y3); // step 10
	            X3 = Fp.sub(t1, Y3);
	            Y3 = Fp.add(t1, Y3);
	            Y3 = Fp.mul(X3, Y3);
	            X3 = Fp.mul(t3, X3);
	            Z3 = Fp.mul(b3, Z3); // step 15
	            t2 = Fp.mul(a, t2);
	            t3 = Fp.sub(t0, t2);
	            t3 = Fp.mul(a, t3);
	            t3 = Fp.add(t3, Z3);
	            Z3 = Fp.add(t0, t0); // step 20
	            t0 = Fp.add(Z3, t0);
	            t0 = Fp.add(t0, t2);
	            t0 = Fp.mul(t0, t3);
	            Y3 = Fp.add(Y3, t0);
	            t2 = Fp.mul(Y1, Z1); // step 25
	            t2 = Fp.add(t2, t2);
	            t0 = Fp.mul(t2, t3);
	            X3 = Fp.sub(X3, t0);
	            Z3 = Fp.mul(t2, t1);
	            Z3 = Fp.add(Z3, Z3); // step 30
	            Z3 = Fp.add(Z3, Z3);
	            return new Point(X3, Y3, Z3);
	        }
	        // Renes-Costello-Batina exception-free addition formula.
	        // There is 30% faster Jacobian formula, but it is not complete.
	        // https://eprint.iacr.org/2015/1060, algorithm 1
	        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
	        add(other) {
	            aprjpoint(other);
	            const { px: X1, py: Y1, pz: Z1 } = this;
	            const { px: X2, py: Y2, pz: Z2 } = other;
	            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
	            const a = CURVE.a;
	            const b3 = Fp.mul(CURVE.b, _3n);
	            let t0 = Fp.mul(X1, X2); // step 1
	            let t1 = Fp.mul(Y1, Y2);
	            let t2 = Fp.mul(Z1, Z2);
	            let t3 = Fp.add(X1, Y1);
	            let t4 = Fp.add(X2, Y2); // step 5
	            t3 = Fp.mul(t3, t4);
	            t4 = Fp.add(t0, t1);
	            t3 = Fp.sub(t3, t4);
	            t4 = Fp.add(X1, Z1);
	            let t5 = Fp.add(X2, Z2); // step 10
	            t4 = Fp.mul(t4, t5);
	            t5 = Fp.add(t0, t2);
	            t4 = Fp.sub(t4, t5);
	            t5 = Fp.add(Y1, Z1);
	            X3 = Fp.add(Y2, Z2); // step 15
	            t5 = Fp.mul(t5, X3);
	            X3 = Fp.add(t1, t2);
	            t5 = Fp.sub(t5, X3);
	            Z3 = Fp.mul(a, t4);
	            X3 = Fp.mul(b3, t2); // step 20
	            Z3 = Fp.add(X3, Z3);
	            X3 = Fp.sub(t1, Z3);
	            Z3 = Fp.add(t1, Z3);
	            Y3 = Fp.mul(X3, Z3);
	            t1 = Fp.add(t0, t0); // step 25
	            t1 = Fp.add(t1, t0);
	            t2 = Fp.mul(a, t2);
	            t4 = Fp.mul(b3, t4);
	            t1 = Fp.add(t1, t2);
	            t2 = Fp.sub(t0, t2); // step 30
	            t2 = Fp.mul(a, t2);
	            t4 = Fp.add(t4, t2);
	            t0 = Fp.mul(t1, t4);
	            Y3 = Fp.add(Y3, t0);
	            t0 = Fp.mul(t5, t4); // step 35
	            X3 = Fp.mul(t3, X3);
	            X3 = Fp.sub(X3, t0);
	            t0 = Fp.mul(t3, t1);
	            Z3 = Fp.mul(t5, Z3);
	            Z3 = Fp.add(Z3, t0); // step 40
	            return new Point(X3, Y3, Z3);
	        }
	        subtract(other) {
	            return this.add(other.negate());
	        }
	        is0() {
	            return this.equals(Point.ZERO);
	        }
	        wNAF(n) {
	            return wnaf.wNAFCached(this, n, Point.normalizeZ);
	        }
	        /**
	         * Non-constant-time multiplication. Uses double-and-add algorithm.
	         * It's faster, but should only be used when you don't care about
	         * an exposed private key e.g. sig verification, which works over *public* keys.
	         */
	        multiplyUnsafe(sc) {
	            const { endo, n: N } = CURVE;
	            aInRange('scalar', sc, _0n$1, N);
	            const I = Point.ZERO;
	            if (sc === _0n$1)
	                return I;
	            if (this.is0() || sc === _1n$1)
	                return this;
	            // Case a: no endomorphism. Case b: has precomputes.
	            if (!endo || wnaf.hasPrecomputes(this))
	                return wnaf.wNAFCachedUnsafe(this, sc, Point.normalizeZ);
	            // Case c: endomorphism
	            /** See docs for {@link EndomorphismOpts} */
	            let { k1neg, k1, k2neg, k2 } = endo.splitScalar(sc);
	            let k1p = I;
	            let k2p = I;
	            let d = this;
	            while (k1 > _0n$1 || k2 > _0n$1) {
	                if (k1 & _1n$1)
	                    k1p = k1p.add(d);
	                if (k2 & _1n$1)
	                    k2p = k2p.add(d);
	                d = d.double();
	                k1 >>= _1n$1;
	                k2 >>= _1n$1;
	            }
	            if (k1neg)
	                k1p = k1p.negate();
	            if (k2neg)
	                k2p = k2p.negate();
	            k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
	            return k1p.add(k2p);
	        }
	        /**
	         * Constant time multiplication.
	         * Uses wNAF method. Windowed method may be 10% faster,
	         * but takes 2x longer to generate and consumes 2x memory.
	         * Uses precomputes when available.
	         * Uses endomorphism for Koblitz curves.
	         * @param scalar by which the point would be multiplied
	         * @returns New point
	         */
	        multiply(scalar) {
	            const { endo, n: N } = CURVE;
	            aInRange('scalar', scalar, _1n$1, N);
	            let point, fake; // Fake point is used to const-time mult
	            /** See docs for {@link EndomorphismOpts} */
	            if (endo) {
	                const { k1neg, k1, k2neg, k2 } = endo.splitScalar(scalar);
	                let { p: k1p, f: f1p } = this.wNAF(k1);
	                let { p: k2p, f: f2p } = this.wNAF(k2);
	                k1p = wnaf.constTimeNegate(k1neg, k1p);
	                k2p = wnaf.constTimeNegate(k2neg, k2p);
	                k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
	                point = k1p.add(k2p);
	                fake = f1p.add(f2p);
	            }
	            else {
	                const { p, f } = this.wNAF(scalar);
	                point = p;
	                fake = f;
	            }
	            // Normalize `z` for both points, but return only real one
	            return Point.normalizeZ([point, fake])[0];
	        }
	        /**
	         * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
	         * Not using Strauss-Shamir trick: precomputation tables are faster.
	         * The trick could be useful if both P and Q are not G (not in our case).
	         * @returns non-zero affine point
	         */
	        multiplyAndAddUnsafe(Q, a, b) {
	            const G = Point.BASE; // No Strauss-Shamir trick: we have 10% faster G precomputes
	            const mul = (P, a // Select faster multiply() method
	            ) => (a === _0n$1 || a === _1n$1 || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a));
	            const sum = mul(this, a).add(mul(Q, b));
	            return sum.is0() ? undefined : sum;
	        }
	        // Converts Projective point to affine (x, y) coordinates.
	        // Can accept precomputed Z^-1 - for example, from invertBatch.
	        // (x, y, z) ∋ (x=x/z, y=y/z)
	        toAffine(iz) {
	            return toAffineMemo(this, iz);
	        }
	        isTorsionFree() {
	            const { h: cofactor, isTorsionFree } = CURVE;
	            if (cofactor === _1n$1)
	                return true; // No subgroups, always torsion-free
	            if (isTorsionFree)
	                return isTorsionFree(Point, this);
	            throw new Error('isTorsionFree() has not been declared for the elliptic curve');
	        }
	        clearCofactor() {
	            const { h: cofactor, clearCofactor } = CURVE;
	            if (cofactor === _1n$1)
	                return this; // Fast-path
	            if (clearCofactor)
	                return clearCofactor(Point, this);
	            return this.multiplyUnsafe(CURVE.h);
	        }
	        toRawBytes(isCompressed = true) {
	            abool('isCompressed', isCompressed);
	            this.assertValidity();
	            return toBytes(Point, this, isCompressed);
	        }
	        toHex(isCompressed = true) {
	            abool('isCompressed', isCompressed);
	            return bytesToHex(this.toRawBytes(isCompressed));
	        }
	    }
	    // base / generator point
	    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
	    // zero / infinity / identity point
	    Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO); // 0, 1, 0
	    const { endo, nBitLength } = CURVE;
	    const wnaf = wNAF(Point, endo ? Math.ceil(nBitLength / 2) : nBitLength);
	    return {
	        CURVE,
	        ProjectivePoint: Point,
	        normPrivateKeyToScalar,
	        weierstrassEquation,
	        isWithinCurveOrder,
	    };
	}
	function validateOpts(curve) {
	    const opts = validateBasic(curve);
	    validateObject(opts, {
	        hash: 'hash',
	        hmac: 'function',
	        randomBytes: 'function',
	    }, {
	        bits2int: 'function',
	        bits2int_modN: 'function',
	        lowS: 'boolean',
	    });
	    return Object.freeze({ lowS: true, ...opts });
	}
	/**
	 * Creates short weierstrass curve and ECDSA signature methods for it.
	 * @example
	 * import { Field } from '@noble/curves/abstract/modular';
	 * // Before that, define BigInt-s: a, b, p, n, Gx, Gy
	 * const curve = weierstrass({ a, b, Fp: Field(p), n, Gx, Gy, h: 1n })
	 */
	function weierstrass(curveDef) {
	    const CURVE = validateOpts(curveDef);
	    const { Fp, n: CURVE_ORDER, nByteLength, nBitLength } = CURVE;
	    const compressedLen = Fp.BYTES + 1; // e.g. 33 for 32
	    const uncompressedLen = 2 * Fp.BYTES + 1; // e.g. 65 for 32
	    function modN(a) {
	        return mod(a, CURVE_ORDER);
	    }
	    function invN(a) {
	        return invert(a, CURVE_ORDER);
	    }
	    const { ProjectivePoint: Point, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder, } = weierstrassPoints({
	        ...CURVE,
	        toBytes(_c, point, isCompressed) {
	            const a = point.toAffine();
	            const x = Fp.toBytes(a.x);
	            const cat = concatBytes;
	            abool('isCompressed', isCompressed);
	            if (isCompressed) {
	                return cat(Uint8Array.from([point.hasEvenY() ? 0x02 : 0x03]), x);
	            }
	            else {
	                return cat(Uint8Array.from([0x04]), x, Fp.toBytes(a.y));
	            }
	        },
	        fromBytes(bytes) {
	            const len = bytes.length;
	            const head = bytes[0];
	            const tail = bytes.subarray(1);
	            // this.assertValidity() is done inside of fromHex
	            if (len === compressedLen && (head === 0x02 || head === 0x03)) {
	                const x = bytesToNumberBE(tail);
	                if (!inRange(x, _1n$1, Fp.ORDER))
	                    throw new Error('Point is not on curve');
	                const y2 = weierstrassEquation(x); // y² = x³ + ax + b
	                let y;
	                try {
	                    y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
	                }
	                catch (sqrtError) {
	                    const suffix = sqrtError instanceof Error ? ': ' + sqrtError.message : '';
	                    throw new Error('Point is not on curve' + suffix);
	                }
	                const isYOdd = (y & _1n$1) === _1n$1;
	                // ECDSA
	                const isHeadOdd = (head & 1) === 1;
	                if (isHeadOdd !== isYOdd)
	                    y = Fp.neg(y);
	                return { x, y };
	            }
	            else if (len === uncompressedLen && head === 0x04) {
	                const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
	                const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
	                return { x, y };
	            }
	            else {
	                const cl = compressedLen;
	                const ul = uncompressedLen;
	                throw new Error('invalid Point, expected length of ' + cl + ', or uncompressed ' + ul + ', got ' + len);
	            }
	        },
	    });
	    function isBiggerThanHalfOrder(number) {
	        const HALF = CURVE_ORDER >> _1n$1;
	        return number > HALF;
	    }
	    function normalizeS(s) {
	        return isBiggerThanHalfOrder(s) ? modN(-s) : s;
	    }
	    // slice bytes num
	    const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
	    /**
	     * ECDSA signature with its (r, s) properties. Supports DER & compact representations.
	     */
	    class Signature {
	        constructor(r, s, recovery) {
	            aInRange('r', r, _1n$1, CURVE_ORDER); // r in [1..N]
	            aInRange('s', s, _1n$1, CURVE_ORDER); // s in [1..N]
	            this.r = r;
	            this.s = s;
	            if (recovery != null)
	                this.recovery = recovery;
	            Object.freeze(this);
	        }
	        // pair (bytes of r, bytes of s)
	        static fromCompact(hex) {
	            const l = nByteLength;
	            hex = ensureBytes('compactSignature', hex, l * 2);
	            return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
	        }
	        // DER encoded ECDSA signature
	        // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
	        static fromDER(hex) {
	            const { r, s } = DER.toSig(ensureBytes('DER', hex));
	            return new Signature(r, s);
	        }
	        /**
	         * @todo remove
	         * @deprecated
	         */
	        assertValidity() { }
	        addRecoveryBit(recovery) {
	            return new Signature(this.r, this.s, recovery);
	        }
	        recoverPublicKey(msgHash) {
	            const { r, s, recovery: rec } = this;
	            const h = bits2int_modN(ensureBytes('msgHash', msgHash)); // Truncate hash
	            if (rec == null || ![0, 1, 2, 3].includes(rec))
	                throw new Error('recovery id invalid');
	            const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
	            if (radj >= Fp.ORDER)
	                throw new Error('recovery id 2 or 3 invalid');
	            const prefix = (rec & 1) === 0 ? '02' : '03';
	            const R = Point.fromHex(prefix + numToSizedHex(radj, Fp.BYTES));
	            const ir = invN(radj); // r^-1
	            const u1 = modN(-h * ir); // -hr^-1
	            const u2 = modN(s * ir); // sr^-1
	            const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2); // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1)
	            if (!Q)
	                throw new Error('point at infinify'); // unsafe is fine: no priv data leaked
	            Q.assertValidity();
	            return Q;
	        }
	        // Signatures should be low-s, to prevent malleability.
	        hasHighS() {
	            return isBiggerThanHalfOrder(this.s);
	        }
	        normalizeS() {
	            return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
	        }
	        // DER-encoded
	        toDERRawBytes() {
	            return hexToBytes(this.toDERHex());
	        }
	        toDERHex() {
	            return DER.hexFromSig(this);
	        }
	        // padded bytes of r, then padded bytes of s
	        toCompactRawBytes() {
	            return hexToBytes(this.toCompactHex());
	        }
	        toCompactHex() {
	            const l = nByteLength;
	            return numToSizedHex(this.r, l) + numToSizedHex(this.s, l);
	        }
	    }
	    const utils = {
	        isValidPrivateKey(privateKey) {
	            try {
	                normPrivateKeyToScalar(privateKey);
	                return true;
	            }
	            catch (error) {
	                return false;
	            }
	        },
	        normPrivateKeyToScalar: normPrivateKeyToScalar,
	        /**
	         * Produces cryptographically secure private key from random of size
	         * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
	         */
	        randomPrivateKey: () => {
	            const length = getMinHashLength(CURVE.n);
	            return mapHashToField(CURVE.randomBytes(length), CURVE.n);
	        },
	        /**
	         * Creates precompute table for an arbitrary EC point. Makes point "cached".
	         * Allows to massively speed-up `point.multiply(scalar)`.
	         * @returns cached point
	         * @example
	         * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
	         * fast.multiply(privKey); // much faster ECDH now
	         */
	        precompute(windowSize = 8, point = Point.BASE) {
	            point._setWindowSize(windowSize);
	            point.multiply(BigInt(3)); // 3 is arbitrary, just need any number here
	            return point;
	        },
	    };
	    /**
	     * Computes public key for a private key. Checks for validity of the private key.
	     * @param privateKey private key
	     * @param isCompressed whether to return compact (default), or full key
	     * @returns Public key, full when isCompressed=false; short when isCompressed=true
	     */
	    function getPublicKey(privateKey, isCompressed = true) {
	        return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
	    }
	    /**
	     * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
	     */
	    function isProbPub(item) {
	        if (typeof item === 'bigint')
	            return false;
	        if (item instanceof Point)
	            return true;
	        const arr = ensureBytes('key', item);
	        const len = arr.length;
	        const fpl = Fp.BYTES;
	        const compLen = fpl + 1; // e.g. 33 for 32
	        const uncompLen = 2 * fpl + 1; // e.g. 65 for 32
	        if (CURVE.allowedPrivateKeyLengths || nByteLength === compLen) {
	            return undefined;
	        }
	        else {
	            return len === compLen || len === uncompLen;
	        }
	    }
	    /**
	     * ECDH (Elliptic Curve Diffie Hellman).
	     * Computes shared public key from private key and public key.
	     * Checks: 1) private key validity 2) shared key is on-curve.
	     * Does NOT hash the result.
	     * @param privateA private key
	     * @param publicB different public key
	     * @param isCompressed whether to return compact (default), or full key
	     * @returns shared public key
	     */
	    function getSharedSecret(privateA, publicB, isCompressed = true) {
	        if (isProbPub(privateA) === true)
	            throw new Error('first arg must be private key');
	        if (isProbPub(publicB) === false)
	            throw new Error('second arg must be public key');
	        const b = Point.fromHex(publicB); // check for being on-curve
	        return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
	    }
	    // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
	    // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
	    // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
	    // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
	    const bits2int = CURVE.bits2int ||
	        function (bytes) {
	            // Our custom check "just in case", for protection against DoS
	            if (bytes.length > 8192)
	                throw new Error('input is too large');
	            // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
	            // for some cases, since bytes.length * 8 is not actual bitLength.
	            const num = bytesToNumberBE(bytes); // check for == u8 done here
	            const delta = bytes.length * 8 - nBitLength; // truncate to nBitLength leftmost bits
	            return delta > 0 ? num >> BigInt(delta) : num;
	        };
	    const bits2int_modN = CURVE.bits2int_modN ||
	        function (bytes) {
	            return modN(bits2int(bytes)); // can't use bytesToNumberBE here
	        };
	    // NOTE: pads output with zero as per spec
	    const ORDER_MASK = bitMask(nBitLength);
	    /**
	     * Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
	     */
	    function int2octets(num) {
	        aInRange('num < 2^' + nBitLength, num, _0n$1, ORDER_MASK);
	        // works with order, can have different size than numToField!
	        return numberToBytesBE(num, nByteLength);
	    }
	    // Steps A, D of RFC6979 3.2
	    // Creates RFC6979 seed; converts msg/privKey to numbers.
	    // Used only in sign, not in verify.
	    // NOTE: we cannot assume here that msgHash has same amount of bytes as curve order,
	    // this will be invalid at least for P521. Also it can be bigger for P224 + SHA256
	    function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
	        if (['recovered', 'canonical'].some((k) => k in opts))
	            throw new Error('sign() legacy options not supported');
	        const { hash, randomBytes } = CURVE;
	        let { lowS, prehash, extraEntropy: ent } = opts; // generates low-s sigs by default
	        if (lowS == null)
	            lowS = true; // RFC6979 3.2: we skip step A, because we already provide hash
	        msgHash = ensureBytes('msgHash', msgHash);
	        validateSigVerOpts(opts);
	        if (prehash)
	            msgHash = ensureBytes('prehashed msgHash', hash(msgHash));
	        // We can't later call bits2octets, since nested bits2int is broken for curves
	        // with nBitLength % 8 !== 0. Because of that, we unwrap it here as int2octets call.
	        // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
	        const h1int = bits2int_modN(msgHash);
	        const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
	        const seedArgs = [int2octets(d), int2octets(h1int)];
	        // extraEntropy. RFC6979 3.6: additional k' (optional).
	        if (ent != null && ent !== false) {
	            // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
	            const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
	            seedArgs.push(ensureBytes('extraEntropy', e)); // check for being bytes
	        }
	        const seed = concatBytes(...seedArgs); // Step D of RFC6979 3.2
	        const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
	        // Converts signature params into point w r/s, checks result for validity.
	        function k2sig(kBytes) {
	            // RFC 6979 Section 3.2, step 3: k = bits2int(T)
	            const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
	            if (!isWithinCurveOrder(k))
	                return; // Important: all mod() calls here must be done over N
	            const ik = invN(k); // k^-1 mod n
	            const q = Point.BASE.multiply(k).toAffine(); // q = Gk
	            const r = modN(q.x); // r = q.x mod n
	            if (r === _0n$1)
	                return;
	            // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
	            // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
	            // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
	            const s = modN(ik * modN(m + r * d)); // Not using blinding here
	            if (s === _0n$1)
	                return;
	            let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n$1); // recovery bit (2 or 3, when q.x > n)
	            let normS = s;
	            if (lowS && isBiggerThanHalfOrder(s)) {
	                normS = normalizeS(s); // if lowS was passed, ensure s is always
	                recovery ^= 1; // // in the bottom half of N
	            }
	            return new Signature(r, normS, recovery); // use normS, not s
	        }
	        return { seed, k2sig };
	    }
	    const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
	    const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
	    /**
	     * Signs message hash with a private key.
	     * ```
	     * sign(m, d, k) where
	     *   (x, y) = G × k
	     *   r = x mod n
	     *   s = (m + dr)/k mod n
	     * ```
	     * @param msgHash NOT message. msg needs to be hashed to `msgHash`, or use `prehash`.
	     * @param privKey private key
	     * @param opts lowS for non-malleable sigs. extraEntropy for mixing randomness into k. prehash will hash first arg.
	     * @returns signature with recovery param
	     */
	    function sign(msgHash, privKey, opts = defaultSigOpts) {
	        const { seed, k2sig } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
	        const C = CURVE;
	        const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
	        return drbg(seed, k2sig); // Steps B, C, D, E, F, G
	    }
	    // Enable precomputes. Slows down first publicKey computation by 20ms.
	    Point.BASE._setWindowSize(8);
	    // utils.precompute(8, ProjectivePoint.BASE)
	    /**
	     * Verifies a signature against message hash and public key.
	     * Rejects lowS signatures by default: to override,
	     * specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
	     *
	     * ```
	     * verify(r, s, h, P) where
	     *   U1 = hs^-1 mod n
	     *   U2 = rs^-1 mod n
	     *   R = U1⋅G - U2⋅P
	     *   mod(R.x, n) == r
	     * ```
	     */
	    function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
	        const sg = signature;
	        msgHash = ensureBytes('msgHash', msgHash);
	        publicKey = ensureBytes('publicKey', publicKey);
	        const { lowS, prehash, format } = opts;
	        // Verify opts, deduce signature format
	        validateSigVerOpts(opts);
	        if ('strict' in opts)
	            throw new Error('options.strict was renamed to lowS');
	        if (format !== undefined && format !== 'compact' && format !== 'der')
	            throw new Error('format must be compact or der');
	        const isHex = typeof sg === 'string' || isBytes(sg);
	        const isObj = !isHex &&
	            !format &&
	            typeof sg === 'object' &&
	            sg !== null &&
	            typeof sg.r === 'bigint' &&
	            typeof sg.s === 'bigint';
	        if (!isHex && !isObj)
	            throw new Error('invalid signature, expected Uint8Array, hex string or Signature instance');
	        let _sig = undefined;
	        let P;
	        try {
	            if (isObj)
	                _sig = new Signature(sg.r, sg.s);
	            if (isHex) {
	                // Signature can be represented in 2 ways: compact (2*nByteLength) & DER (variable-length).
	                // Since DER can also be 2*nByteLength bytes, we check for it first.
	                try {
	                    if (format !== 'compact')
	                        _sig = Signature.fromDER(sg);
	                }
	                catch (derError) {
	                    if (!(derError instanceof DER.Err))
	                        throw derError;
	                }
	                if (!_sig && format !== 'der')
	                    _sig = Signature.fromCompact(sg);
	            }
	            P = Point.fromHex(publicKey);
	        }
	        catch (error) {
	            return false;
	        }
	        if (!_sig)
	            return false;
	        if (lowS && _sig.hasHighS())
	            return false;
	        if (prehash)
	            msgHash = CURVE.hash(msgHash);
	        const { r, s } = _sig;
	        const h = bits2int_modN(msgHash); // Cannot use fields methods, since it is group element
	        const is = invN(s); // s^-1
	        const u1 = modN(h * is); // u1 = hs^-1 mod n
	        const u2 = modN(r * is); // u2 = rs^-1 mod n
	        const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine(); // R = u1⋅G + u2⋅P
	        if (!R)
	            return false;
	        const v = modN(R.x);
	        return v === r;
	    }
	    return {
	        CURVE,
	        getPublicKey,
	        getSharedSecret,
	        sign,
	        verify,
	        ProjectivePoint: Point,
	        Signature,
	        utils,
	    };
	}

	/**
	 * Utilities for short weierstrass curves, combined with noble-hashes.
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	/** connects noble-curves to noble-hashes */
	function getHash(hash) {
	    return {
	        hash,
	        hmac: (key, ...msgs) => hmac(hash, key, concatBytes$2(...msgs)),
	        randomBytes,
	    };
	}
	function createCurve(curveDef, defHash) {
	    const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
	    return { ...create(defHash), create };
	}

	/**
	 * NIST secp256k1. See [pdf](https://www.secg.org/sec2-v2.pdf).
	 *
	 * Seems to be rigid (not backdoored)
	 * [as per discussion](https://bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975).
	 *
	 * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
	 * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
	 * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
	 * [See explanation](https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066).
	 * @module
	 */
	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	const secp256k1P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
	const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
	const _0n = BigInt(0);
	const _1n = BigInt(1);
	const _2n = BigInt(2);
	const divNearest = (a, b) => (a + b / _2n) / b;
	/**
	 * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
	 * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
	 */
	function sqrtMod(y) {
	    const P = secp256k1P;
	    // prettier-ignore
	    const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
	    // prettier-ignore
	    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
	    const b2 = (y * y * y) % P; // x^3, 11
	    const b3 = (b2 * b2 * y) % P; // x^7
	    const b6 = (pow2(b3, _3n, P) * b3) % P;
	    const b9 = (pow2(b6, _3n, P) * b3) % P;
	    const b11 = (pow2(b9, _2n, P) * b2) % P;
	    const b22 = (pow2(b11, _11n, P) * b11) % P;
	    const b44 = (pow2(b22, _22n, P) * b22) % P;
	    const b88 = (pow2(b44, _44n, P) * b44) % P;
	    const b176 = (pow2(b88, _88n, P) * b88) % P;
	    const b220 = (pow2(b176, _44n, P) * b44) % P;
	    const b223 = (pow2(b220, _3n, P) * b3) % P;
	    const t1 = (pow2(b223, _23n, P) * b22) % P;
	    const t2 = (pow2(t1, _6n, P) * b2) % P;
	    const root = pow2(t2, _2n, P);
	    if (!Fpk1.eql(Fpk1.sqr(root), y))
	        throw new Error('Cannot find square root');
	    return root;
	}
	const Fpk1 = Field(secp256k1P, undefined, undefined, { sqrt: sqrtMod });
	/**
	 * secp256k1 curve, ECDSA and ECDH methods.
	 *
	 * Field: `2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n`
	 *
	 * @example
	 * ```js
	 * import { secp256k1 } from '@noble/curves/secp256k1';
	 * const priv = secp256k1.utils.randomPrivateKey();
	 * const pub = secp256k1.getPublicKey(priv);
	 * const msg = new Uint8Array(32).fill(1); // message hash (not message) in ecdsa
	 * const sig = secp256k1.sign(msg, priv); // `{prehash: true}` option is available
	 * const isValid = secp256k1.verify(sig, msg, pub) === true;
	 * ```
	 */
	const secp256k1 = createCurve({
	    a: _0n,
	    b: BigInt(7),
	    Fp: Fpk1,
	    n: secp256k1N,
	    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
	    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
	    h: BigInt(1),
	    lowS: true, // Allow only low-S signatures by default in sign() and verify()
	    endo: {
	        // Endomorphism, see above
	        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
	        splitScalar: (k) => {
	            const n = secp256k1N;
	            const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
	            const b1 = -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
	            const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
	            const b2 = a1;
	            const POW_2_128 = BigInt('0x100000000000000000000000000000000'); // (2n**128n).toString(16)
	            const c1 = divNearest(b2 * k, n);
	            const c2 = divNearest(-b1 * k, n);
	            let k1 = mod(k - c1 * a1 - c2 * a2, n);
	            let k2 = mod(-c1 * b1 - c2 * b2, n);
	            const k1neg = k1 > POW_2_128;
	            const k2neg = k2 > POW_2_128;
	            if (k1neg)
	                k1 = n - k1;
	            if (k2neg)
	                k2 = n - k2;
	            if (k1 > POW_2_128 || k2 > POW_2_128) {
	                throw new Error('splitScalar: Endomorphism failed, k=' + k);
	            }
	            return { k1neg, k1, k2neg, k2 };
	        },
	    },
	}, sha256$2);

	var secp256k1$1 = /*#__PURE__*/Object.freeze({
		__proto__: null,
		secp256k1: secp256k1
	});

	/**
	 * Similar to [`readContract`](https://viem.sh/docs/contract/readContract), but batches up multiple functions on a contract in a single RPC call via the [`multicall3` contract](https://github.com/mds1/multicall).
	 *
	 * - Docs: https://viem.sh/docs/contract/multicall
	 *
	 * @param client - Client to use
	 * @param parameters - {@link MulticallParameters}
	 * @returns An array of results with accompanying status. {@link MulticallReturnType}
	 *
	 * @example
	 * import { createPublicClient, http, parseAbi } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { multicall } from 'viem/contract'
	 *
	 * const client = createPublicClient({
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const abi = parseAbi([
	 *   'function balanceOf(address) view returns (uint256)',
	 *   'function totalSupply() view returns (uint256)',
	 * ])
	 * const results = await multicall(client, {
	 *   contracts: [
	 *     {
	 *       address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
	 *       abi,
	 *       functionName: 'balanceOf',
	 *       args: ['0xA0Cf798816D4b9b9866b5330EEa46a18382f251e'],
	 *     },
	 *     {
	 *       address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
	 *       abi,
	 *       functionName: 'totalSupply',
	 *     },
	 *   ],
	 * })
	 * // [{ result: 424122n, status: 'success' }, { result: 1000000n, status: 'success' }]
	 */
	async function multicall$1(client, parameters) {
	    const { account, authorizationList, allowFailure = true, blockNumber, blockOverrides, blockTag, stateOverride, } = parameters;
	    const contracts = parameters.contracts;
	    const { batchSize = parameters.batchSize ?? 1024, deployless = parameters.deployless ?? false, } = typeof client.batch?.multicall === 'object' ? client.batch.multicall : {};
	    const multicallAddress = (() => {
	        if (parameters.multicallAddress)
	            return parameters.multicallAddress;
	        if (deployless)
	            return null;
	        if (client.chain) {
	            return getChainContractAddress({
	                blockNumber,
	                chain: client.chain,
	                contract: 'multicall3',
	            });
	        }
	        throw new Error('client chain not configured. multicallAddress is required.');
	    })();
	    const chunkedCalls = [[]];
	    let currentChunk = 0;
	    let currentChunkSize = 0;
	    for (let i = 0; i < contracts.length; i++) {
	        const { abi, address, args, functionName } = contracts[i];
	        try {
	            const callData = encodeFunctionData({ abi, args, functionName });
	            currentChunkSize += (callData.length - 2) / 2;
	            // Check to see if we need to create a new chunk.
	            if (
	            // Check if batching is enabled.
	            batchSize > 0 &&
	                // Check if the current size of the batch exceeds the size limit.
	                currentChunkSize > batchSize &&
	                // Check if the current chunk is not already empty.
	                chunkedCalls[currentChunk].length > 0) {
	                currentChunk++;
	                currentChunkSize = (callData.length - 2) / 2;
	                chunkedCalls[currentChunk] = [];
	            }
	            chunkedCalls[currentChunk] = [
	                ...chunkedCalls[currentChunk],
	                {
	                    allowFailure: true,
	                    callData,
	                    target: address,
	                },
	            ];
	        }
	        catch (err) {
	            const error = getContractError(err, {
	                abi,
	                address,
	                args,
	                docsPath: '/docs/contract/multicall',
	                functionName,
	                sender: account,
	            });
	            if (!allowFailure)
	                throw error;
	            chunkedCalls[currentChunk] = [
	                ...chunkedCalls[currentChunk],
	                {
	                    allowFailure: true,
	                    callData: '0x',
	                    target: address,
	                },
	            ];
	        }
	    }
	    const aggregate3Results = await Promise.allSettled(chunkedCalls.map((calls) => getAction$1(client, readContract$1, 'readContract')({
	        ...(multicallAddress === null
	            ? { code: multicall3Bytecode }
	            : { address: multicallAddress }),
	        abi: multicall3Abi,
	        account,
	        args: [calls],
	        authorizationList,
	        blockNumber,
	        blockOverrides,
	        blockTag,
	        functionName: 'aggregate3',
	        stateOverride,
	    })));
	    const results = [];
	    for (let i = 0; i < aggregate3Results.length; i++) {
	        const result = aggregate3Results[i];
	        // If an error occurred in a `readContract` invocation (ie. network error),
	        // then append the failure reason to each contract result.
	        if (result.status === 'rejected') {
	            if (!allowFailure)
	                throw result.reason;
	            for (let j = 0; j < chunkedCalls[i].length; j++) {
	                results.push({
	                    status: 'failure',
	                    error: result.reason,
	                    result: undefined,
	                });
	            }
	            continue;
	        }
	        // If the `readContract` call was successful, then decode the results.
	        const aggregate3Result = result.value;
	        for (let j = 0; j < aggregate3Result.length; j++) {
	            // Extract the response from `readContract`
	            const { returnData, success } = aggregate3Result[j];
	            // Extract the request call data from the original call.
	            const { callData } = chunkedCalls[i][j];
	            // Extract the contract config for this call from the `contracts` argument
	            // for decoding.
	            const { abi, address, functionName, args } = contracts[results.length];
	            try {
	                if (callData === '0x')
	                    throw new AbiDecodingZeroDataError();
	                if (!success)
	                    throw new RawContractError({ data: returnData });
	                const result = decodeFunctionResult({
	                    abi,
	                    args,
	                    data: returnData,
	                    functionName,
	                });
	                results.push(allowFailure ? { result, status: 'success' } : result);
	            }
	            catch (err) {
	                const error = getContractError(err, {
	                    abi,
	                    address,
	                    args,
	                    docsPath: '/docs/contract/multicall',
	                    functionName,
	                });
	                if (!allowFailure)
	                    throw error;
	                results.push({ error, result: undefined, status: 'failure' });
	            }
	        }
	    }
	    if (results.length !== contracts.length)
	        throw new BaseError$3('multicall results mismatch');
	    return results;
	}

	class AccountNotFoundError extends BaseError$3 {
	    constructor({ docsPath } = {}) {
	        super([
	            'Could not find an Account to execute with this Action.',
	            'Please provide an Account with the `account` argument on the Action, or by supplying an `account` to the Client.',
	        ].join('\n'), {
	            docsPath,
	            docsSlug: 'account',
	            name: 'AccountNotFoundError',
	        });
	    }
	}
	class AccountTypeNotSupportedError extends BaseError$3 {
	    constructor({ docsPath, metaMessages, type, }) {
	        super(`Account type "${type}" is not supported.`, {
	            docsPath,
	            metaMessages,
	            name: 'AccountTypeNotSupportedError',
	        });
	    }
	}

	/**
	 * Sends a **signed** transaction to the network
	 *
	 * - Docs: https://viem.sh/docs/actions/wallet/sendRawTransaction
	 * - JSON-RPC Method: [`eth_sendRawTransaction`](https://ethereum.github.io/execution-apis/api-documentation/)
	 *
	 * @param client - Client to use
	 * @param parameters - {@link SendRawTransactionParameters}
	 * @returns The transaction hash. {@link SendRawTransactionReturnType}
	 *
	 * @example
	 * import { createWalletClient, custom } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { sendRawTransaction } from 'viem/wallet'
	 *
	 * const client = createWalletClient({
	 *   chain: mainnet,
	 *   transport: custom(window.ethereum),
	 * })
	 *
	 * const hash = await sendRawTransaction(client, {
	 *   serializedTransaction: '0x02f850018203118080825208808080c080a04012522854168b27e5dc3d5839bab5e6b39e1a0ffd343901ce1622e3d64b48f1a04e00902ae0502c4728cbf12156290df99c3ed7de85b1dbfe20b5c36931733a33'
	 * })
	 */
	async function sendRawTransaction(client, { serializedTransaction }) {
	    return client.request({
	        method: 'eth_sendRawTransaction',
	        params: [serializedTransaction],
	    }, { retryCount: 0 });
	}

	const supportsWalletNamespace = new LruMap(128);
	/**
	 * Creates, signs, and sends a new transaction to the network.
	 *
	 * - Docs: https://viem.sh/docs/actions/wallet/sendTransaction
	 * - Examples: https://stackblitz.com/github/wevm/viem/tree/main/examples/transactions_sending-transactions
	 * - JSON-RPC Methods:
	 *   - JSON-RPC Accounts: [`eth_sendTransaction`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendtransaction)
	 *   - Local Accounts: [`eth_sendRawTransaction`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sendrawtransaction)
	 *
	 * @param client - Client to use
	 * @param parameters - {@link SendTransactionParameters}
	 * @returns The [Transaction](https://viem.sh/docs/glossary/terms#transaction) hash. {@link SendTransactionReturnType}
	 *
	 * @example
	 * import { createWalletClient, custom } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { sendTransaction } from 'viem/wallet'
	 *
	 * const client = createWalletClient({
	 *   chain: mainnet,
	 *   transport: custom(window.ethereum),
	 * })
	 * const hash = await sendTransaction(client, {
	 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
	 *   value: 1000000000000000000n,
	 * })
	 *
	 * @example
	 * // Account Hoisting
	 * import { createWalletClient, http } from 'viem'
	 * import { privateKeyToAccount } from 'viem/accounts'
	 * import { mainnet } from 'viem/chains'
	 * import { sendTransaction } from 'viem/wallet'
	 *
	 * const client = createWalletClient({
	 *   account: privateKeyToAccount('0x…'),
	 *   chain: mainnet,
	 *   transport: http(),
	 * })
	 * const hash = await sendTransaction(client, {
	 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
	 *   value: 1000000000000000000n,
	 * })
	 */
	async function sendTransaction$1(client, parameters) {
	    const { account: account_ = client.account, chain = client.chain, accessList, authorizationList, blobs, data, gas, gasPrice, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, nonce, type, value, ...rest } = parameters;
	    if (typeof account_ === 'undefined')
	        throw new AccountNotFoundError({
	            docsPath: '/docs/actions/wallet/sendTransaction',
	        });
	    const account = account_ ? parseAccount(account_) : null;
	    try {
	        assertRequest(parameters);
	        const to = await (async () => {
	            // If `to` exists on the parameters, use that.
	            if (parameters.to)
	                return parameters.to;
	            // If `to` is null, we are sending a deployment transaction.
	            if (parameters.to === null)
	                return undefined;
	            // If no `to` exists, and we are sending a EIP-7702 transaction, use the
	            // address of the first authorization in the list.
	            if (authorizationList && authorizationList.length > 0)
	                return await recoverAuthorizationAddress({
	                    authorization: authorizationList[0],
	                }).catch(() => {
	                    throw new BaseError$3('`to` is required. Could not infer from `authorizationList`.');
	                });
	            // Otherwise, we are sending a deployment transaction.
	            return undefined;
	        })();
	        if (account?.type === 'json-rpc' || account === null) {
	            let chainId;
	            if (chain !== null) {
	                chainId = await getAction$1(client, getChainId, 'getChainId')({});
	                assertCurrentChain({
	                    currentChainId: chainId,
	                    chain,
	                });
	            }
	            const chainFormat = client.chain?.formatters?.transactionRequest?.format;
	            const format = chainFormat || formatTransactionRequest;
	            const request = format({
	                // Pick out extra data that might exist on the chain's transaction request type.
	                ...extract(rest, { format: chainFormat }),
	                accessList,
	                account,
	                authorizationList,
	                blobs,
	                chainId,
	                data,
	                gas,
	                gasPrice,
	                maxFeePerBlobGas,
	                maxFeePerGas,
	                maxPriorityFeePerGas,
	                nonce,
	                to,
	                type,
	                value,
	            }, 'sendTransaction');
	            const isWalletNamespaceSupported = supportsWalletNamespace.get(client.uid);
	            const method = isWalletNamespaceSupported
	                ? 'wallet_sendTransaction'
	                : 'eth_sendTransaction';
	            try {
	                return await client.request({
	                    method,
	                    params: [request],
	                }, { retryCount: 0 });
	            }
	            catch (e) {
	                if (isWalletNamespaceSupported === false)
	                    throw e;
	                const error = e;
	                // If the transport does not support the method or input, attempt to use the
	                // `wallet_sendTransaction` method.
	                if (error.name === 'InvalidInputRpcError' ||
	                    error.name === 'InvalidParamsRpcError' ||
	                    error.name === 'MethodNotFoundRpcError' ||
	                    error.name === 'MethodNotSupportedRpcError') {
	                    return await client
	                        .request({
	                        method: 'wallet_sendTransaction',
	                        params: [request],
	                    }, { retryCount: 0 })
	                        .then((hash) => {
	                        supportsWalletNamespace.set(client.uid, true);
	                        return hash;
	                    })
	                        .catch((e) => {
	                        const walletNamespaceError = e;
	                        if (walletNamespaceError.name === 'MethodNotFoundRpcError' ||
	                            walletNamespaceError.name === 'MethodNotSupportedRpcError') {
	                            supportsWalletNamespace.set(client.uid, false);
	                            throw error;
	                        }
	                        throw walletNamespaceError;
	                    });
	                }
	                throw error;
	            }
	        }
	        if (account?.type === 'local') {
	            // Prepare the request for signing (assign appropriate fees, etc.)
	            const request = await getAction$1(client, prepareTransactionRequest, 'prepareTransactionRequest')({
	                account,
	                accessList,
	                authorizationList,
	                blobs,
	                chain,
	                data,
	                gas,
	                gasPrice,
	                maxFeePerBlobGas,
	                maxFeePerGas,
	                maxPriorityFeePerGas,
	                nonce,
	                nonceManager: account.nonceManager,
	                parameters: [...defaultParameters, 'sidecars'],
	                type,
	                value,
	                ...rest,
	                to,
	            });
	            const serializer = chain?.serializers?.transaction;
	            const serializedTransaction = (await account.signTransaction(request, {
	                serializer,
	            }));
	            return await getAction$1(client, sendRawTransaction, 'sendRawTransaction')({
	                serializedTransaction,
	            });
	        }
	        if (account?.type === 'smart')
	            throw new AccountTypeNotSupportedError({
	                metaMessages: [
	                    'Consider using the `sendUserOperation` Action instead.',
	                ],
	                docsPath: '/docs/actions/bundler/sendUserOperation',
	                type: 'smart',
	            });
	        throw new AccountTypeNotSupportedError({
	            docsPath: '/docs/actions/wallet/sendTransaction',
	            type: account?.type,
	        });
	    }
	    catch (err) {
	        if (err instanceof AccountTypeNotSupportedError)
	            throw err;
	        throw getTransactionError(err, {
	            ...parameters,
	            account,
	            chain: parameters.chain || undefined,
	        });
	    }
	}

	/**
	 * Calculates an Ethereum-specific signature in [EIP-191 format](https://eips.ethereum.org/EIPS/eip-191): `keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))`.
	 *
	 * - Docs: https://viem.sh/docs/actions/wallet/signMessage
	 * - JSON-RPC Methods:
	 *   - JSON-RPC Accounts: [`personal_sign`](https://docs.metamask.io/guide/signing-data#personal-sign)
	 *   - Local Accounts: Signs locally. No JSON-RPC request.
	 *
	 * With the calculated signature, you can:
	 * - use [`verifyMessage`](https://viem.sh/docs/utilities/verifyMessage) to verify the signature,
	 * - use [`recoverMessageAddress`](https://viem.sh/docs/utilities/recoverMessageAddress) to recover the signing address from a signature.
	 *
	 * @param client - Client to use
	 * @param parameters - {@link SignMessageParameters}
	 * @returns The signed message. {@link SignMessageReturnType}
	 *
	 * @example
	 * import { createWalletClient, custom } from 'viem'
	 * import { mainnet } from 'viem/chains'
	 * import { signMessage } from 'viem/wallet'
	 *
	 * const client = createWalletClient({
	 *   chain: mainnet,
	 *   transport: custom(window.ethereum),
	 * })
	 * const signature = await signMessage(client, {
	 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 *   message: 'hello world',
	 * })
	 *
	 * @example
	 * // Account Hoisting
	 * import { createWalletClient, custom } from 'viem'
	 * import { privateKeyToAccount } from 'viem/accounts'
	 * import { mainnet } from 'viem/chains'
	 * import { signMessage } from 'viem/wallet'
	 *
	 * const client = createWalletClient({
	 *   account: privateKeyToAccount('0x…'),
	 *   chain: mainnet,
	 *   transport: custom(window.ethereum),
	 * })
	 * const signature = await signMessage(client, {
	 *   message: 'hello world',
	 * })
	 */
	async function signMessage$1(client, { account: account_ = client.account, message, }) {
	    if (!account_)
	        throw new AccountNotFoundError({
	            docsPath: '/docs/actions/wallet/signMessage',
	        });
	    const account = parseAccount(account_);
	    if (account.signMessage)
	        return account.signMessage({ message });
	    const message_ = (() => {
	        if (typeof message === 'string')
	            return stringToHex(message);
	        if (message.raw instanceof Uint8Array)
	            return toHex(message.raw);
	        return message.raw;
	    })();
	    return client.request({
	        method: 'personal_sign',
	        params: [message_, account.address],
	    }, { retryCount: 0 });
	}

	/**
	 * Retrieves and returns an action from the client (if exists), and falls
	 * back to the tree-shakable action.
	 *
	 * Useful for extracting overridden actions from a client (ie. if a consumer
	 * wants to override the `sendTransaction` implementation).
	 */
	function getAction(client, actionFn, 
	// Some minifiers drop `Function.prototype.name`, or replace it with short letters,
	// meaning that `actionFn.name` will not always work. For that case, the consumer
	// needs to pass the name explicitly.
	name) {
	    const action_implicit = client[actionFn.name];
	    if (typeof action_implicit === 'function')
	        return action_implicit;
	    const action_explicit = client[name];
	    if (typeof action_explicit === 'function')
	        return action_explicit;
	    return (params) => actionFn(client, params);
	}

	const version = '2.22.1';

	const getVersion = () => `@wagmi/core@${version}`;

	var __classPrivateFieldGet = (undefined && undefined.__classPrivateFieldGet) || function (receiver, state, kind, f) {
	    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
	    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
	    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
	};
	var _BaseError_instances, _BaseError_walk;
	class BaseError extends Error {
	    get docsBaseUrl() {
	        return 'https://wagmi.sh/core';
	    }
	    get version() {
	        return getVersion();
	    }
	    constructor(shortMessage, options = {}) {
	        super();
	        _BaseError_instances.add(this);
	        Object.defineProperty(this, "details", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "docsPath", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "metaMessages", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "shortMessage", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: void 0
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'WagmiCoreError'
	        });
	        const details = options.cause instanceof BaseError
	            ? options.cause.details
	            : options.cause?.message
	                ? options.cause.message
	                : options.details;
	        const docsPath = options.cause instanceof BaseError
	            ? options.cause.docsPath || options.docsPath
	            : options.docsPath;
	        this.message = [
	            shortMessage || 'An error occurred.',
	            '',
	            ...(options.metaMessages ? [...options.metaMessages, ''] : []),
	            ...(docsPath
	                ? [
	                    `Docs: ${this.docsBaseUrl}${docsPath}.html${options.docsSlug ? `#${options.docsSlug}` : ''}`,
	                ]
	                : []),
	            ...(details ? [`Details: ${details}`] : []),
	            `Version: ${this.version}`,
	        ].join('\n');
	        if (options.cause)
	            this.cause = options.cause;
	        this.details = details;
	        this.docsPath = docsPath;
	        this.metaMessages = options.metaMessages;
	        this.shortMessage = shortMessage;
	    }
	    walk(fn) {
	        return __classPrivateFieldGet(this, _BaseError_instances, "m", _BaseError_walk).call(this, this, fn);
	    }
	}
	_BaseError_instances = new WeakSet(), _BaseError_walk = function _BaseError_walk(err, fn) {
	    if (fn?.(err))
	        return err;
	    if (err.cause)
	        return __classPrivateFieldGet(this, _BaseError_instances, "m", _BaseError_walk).call(this, err.cause, fn);
	    return err;
	};

	class ChainNotConfiguredError extends BaseError {
	    constructor() {
	        super('Chain not configured.');
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ChainNotConfiguredError'
	        });
	    }
	}
	class ConnectorAlreadyConnectedError extends BaseError {
	    constructor() {
	        super('Connector already connected.');
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ConnectorAlreadyConnectedError'
	        });
	    }
	}
	class ConnectorNotConnectedError extends BaseError {
	    constructor() {
	        super('Connector not connected.');
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ConnectorNotConnectedError'
	        });
	    }
	}
	class ConnectorAccountNotFoundError extends BaseError {
	    constructor({ address, connector, }) {
	        super(`Account "${address}" not found for connector "${connector.name}".`);
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ConnectorAccountNotFoundError'
	        });
	    }
	}
	class ConnectorChainMismatchError extends BaseError {
	    constructor({ connectionChainId, connectorChainId, }) {
	        super(`The current chain of the connector (id: ${connectorChainId}) does not match the connection's chain (id: ${connectionChainId}).`, {
	            metaMessages: [
	                `Current Chain ID:  ${connectorChainId}`,
	                `Expected Chain ID: ${connectionChainId}`,
	            ],
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ConnectorChainMismatchError'
	        });
	    }
	}
	class ConnectorUnavailableReconnectingError extends BaseError {
	    constructor({ connector }) {
	        super(`Connector "${connector.name}" unavailable while reconnecting.`, {
	            details: [
	                'During the reconnection step, the only connector methods guaranteed to be available are: `id`, `name`, `type`, `uid`.',
	                'All other methods are not guaranteed to be available until reconnection completes and connectors are fully restored.',
	                'This error commonly occurs for connectors that asynchronously inject after reconnection has already started.',
	            ].join(' '),
	        });
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ConnectorUnavailableReconnectingError'
	        });
	    }
	}

	/** https://wagmi.sh/core/api/actions/connect */
	async function connect(config, parameters) {
	    // "Register" connector if not already created
	    let connector;
	    if (typeof parameters.connector === 'function') {
	        connector = config._internal.connectors.setup(parameters.connector);
	    }
	    else
	        connector = parameters.connector;
	    // Check if connector is already connected
	    if (connector.uid === config.state.current)
	        throw new ConnectorAlreadyConnectedError();
	    try {
	        config.setState((x) => ({ ...x, status: 'connecting' }));
	        connector.emitter.emit('message', { type: 'connecting' });
	        const { connector: _, ...rest } = parameters;
	        const data = await connector.connect(rest);
	        connector.emitter.off('connect', config._internal.events.connect);
	        connector.emitter.on('change', config._internal.events.change);
	        connector.emitter.on('disconnect', config._internal.events.disconnect);
	        await config.storage?.setItem('recentConnectorId', connector.id);
	        config.setState((x) => ({
	            ...x,
	            connections: new Map(x.connections).set(connector.uid, {
	                accounts: (rest.withCapabilities
	                    ? data.accounts.map((account) => typeof account === 'object' ? account.address : account)
	                    : data.accounts),
	                chainId: data.chainId,
	                connector: connector,
	            }),
	            current: connector.uid,
	            status: 'connected',
	        }));
	        return {
	            // TODO(v3): Remove `withCapabilities: true` default behavior so remove compat marshalling
	            // Workaround so downstream connectors work with `withCapabilities` without any changes required
	            accounts: (rest.withCapabilities
	                ? data.accounts.map((address) => typeof address === 'object'
	                    ? address
	                    : { address, capabilities: {} })
	                : data.accounts),
	            chainId: data.chainId,
	        };
	    }
	    catch (error) {
	        config.setState((x) => ({
	            ...x,
	            // Keep existing connector connected in case of error
	            status: x.current ? 'connected' : 'disconnected',
	        }));
	        throw error;
	    }
	}

	const size$1 = 256;
	let index$2 = size$1;
	let buffer$1;
	function uid$1(length = 11) {
	    if (!buffer$1 || index$2 + length > size$1 * 2) {
	        buffer$1 = '';
	        index$2 = 0;
	        for (let i = 0; i < size$1; i++) {
	            buffer$1 += ((256 + Math.random() * 256) | 0).toString(16).substring(1);
	        }
	    }
	    return buffer$1.substring(index$2, index$2++ + length);
	}

	function createClient(parameters) {
	    const { batch, chain, ccipRead, key = 'base', name = 'Base Client', type = 'base', } = parameters;
	    const experimental_blockTag = parameters.experimental_blockTag ??
	        (typeof chain?.experimental_preconfirmationTime === 'number'
	            ? 'pending'
	            : undefined);
	    const blockTime = chain?.blockTime ?? 12_000;
	    const defaultPollingInterval = Math.min(Math.max(Math.floor(blockTime / 2), 500), 4_000);
	    const pollingInterval = parameters.pollingInterval ?? defaultPollingInterval;
	    const cacheTime = parameters.cacheTime ?? pollingInterval;
	    const account = parameters.account
	        ? parseAccount(parameters.account)
	        : undefined;
	    const { config, request, value } = parameters.transport({
	        chain,
	        pollingInterval,
	    });
	    const transport = { ...config, ...value };
	    const client = {
	        account,
	        batch,
	        cacheTime,
	        ccipRead,
	        chain,
	        key,
	        name,
	        pollingInterval,
	        request,
	        transport,
	        type,
	        uid: uid$1(),
	        ...(experimental_blockTag ? { experimental_blockTag } : {}),
	    };
	    function extend(base) {
	        return (extendFn) => {
	            const extended = extendFn(base);
	            for (const key in client)
	                delete extended[key];
	            const combined = { ...base, ...extended };
	            return Object.assign(combined, { extend: extend(combined) });
	        };
	    }
	    return Object.assign(client, { extend: extend(client) });
	}

	/**
	 * @description Creates an transport intended to be used with a client.
	 */
	function createTransport({ key, methods, name, request, retryCount = 3, retryDelay = 150, timeout, type, }, value) {
	    const uid = uid$1();
	    return {
	        config: {
	            key,
	            methods,
	            name,
	            request,
	            retryCount,
	            retryDelay,
	            timeout,
	            type,
	        },
	        request: buildRequest(request, { methods, retryCount, retryDelay, uid }),
	        value,
	    };
	}

	/**
	 * @description Creates a custom transport given an EIP-1193 compliant `request` attribute.
	 */
	function custom(provider, config = {}) {
	    const { key = 'custom', methods, name = 'Custom Provider', retryDelay, } = config;
	    return ({ retryCount: defaultRetryCount }) => createTransport({
	        key,
	        methods,
	        name,
	        request: provider.request.bind(provider),
	        retryCount: config.retryCount ?? defaultRetryCount,
	        retryDelay,
	        type: 'custom',
	    });
	}

	class UrlRequiredError extends BaseError$3 {
	    constructor() {
	        super('No URL was provided to the Transport. Please provide a valid RPC URL to the Transport.', {
	            docsPath: '/docs/clients/intro',
	            name: 'UrlRequiredError',
	        });
	    }
	}

	/**
	 * @description Creates a HTTP transport that connects to a JSON-RPC API.
	 */
	function http(
	/** URL of the JSON-RPC API. Defaults to the chain's public RPC URL. */
	url, config = {}) {
	    const { batch, fetchFn, fetchOptions, key = 'http', methods, name = 'HTTP JSON-RPC', onFetchRequest, onFetchResponse, retryDelay, raw, } = config;
	    return ({ chain, retryCount: retryCount_, timeout: timeout_ }) => {
	        const { batchSize = 1000, wait = 0 } = typeof batch === 'object' ? batch : {};
	        const retryCount = config.retryCount ?? retryCount_;
	        const timeout = timeout_ ?? config.timeout ?? 10_000;
	        const url_ = chain?.rpcUrls.default.http[0];
	        if (!url_)
	            throw new UrlRequiredError();
	        const rpcClient = getHttpRpcClient(url_, {
	            fetchFn,
	            fetchOptions,
	            onRequest: onFetchRequest,
	            onResponse: onFetchResponse,
	            timeout,
	        });
	        return createTransport({
	            key,
	            methods,
	            name,
	            async request({ method, params }) {
	                const body = { method, params };
	                const { schedule } = createBatchScheduler({
	                    id: url_,
	                    wait,
	                    shouldSplitBatch(requests) {
	                        return requests.length > batchSize;
	                    },
	                    fn: (body) => rpcClient.request({
	                        body,
	                    }),
	                    sort: (a, b) => a.id - b.id,
	                });
	                const fn = async (body) => batch
	                    ? schedule(body)
	                    : [
	                        await rpcClient.request({
	                            body,
	                        }),
	                    ];
	                const [{ error, result }] = await fn(body);
	                if (raw)
	                    return { error, result };
	                if (error)
	                    throw new RpcRequestError({
	                        body,
	                        error,
	                        url: url_,
	                    });
	                return result;
	            },
	            retryCount,
	            retryDelay,
	            timeout,
	            type: 'http',
	        }, {
	            fetchOptions,
	            url: url_,
	        });
	    };
	}

	/** https://wagmi.sh/core/api/actions/getConnectorClient */
	async function getConnectorClient(config, parameters = {}) {
	    const { assertChainId = true } = parameters;
	    // Get connection
	    let connection;
	    if (parameters.connector) {
	        const { connector } = parameters;
	        if (config.state.status === 'reconnecting' &&
	            !connector.getAccounts &&
	            !connector.getChainId)
	            throw new ConnectorUnavailableReconnectingError({ connector });
	        const [accounts, chainId] = await Promise.all([
	            connector.getAccounts().catch((e) => {
	                if (parameters.account === null)
	                    return [];
	                throw e;
	            }),
	            connector.getChainId(),
	        ]);
	        connection = {
	            accounts: accounts,
	            chainId,
	            connector,
	        };
	    }
	    else
	        connection = config.state.connections.get(config.state.current);
	    if (!connection)
	        throw new ConnectorNotConnectedError();
	    const chainId = parameters.chainId ?? connection.chainId;
	    // Check connector using same chainId as connection
	    const connectorChainId = await connection.connector.getChainId();
	    if (assertChainId && connectorChainId !== chainId)
	        throw new ConnectorChainMismatchError({
	            connectionChainId: chainId,
	            connectorChainId,
	        });
	    const connector = connection.connector;
	    if (connector.getClient)
	        return connector.getClient({ chainId });
	    // Default using `custom` transport
	    const account = parseAccount(parameters.account ?? connection.accounts[0]);
	    if (account)
	        account.address = getAddress(account.address); // TODO: Checksum address as part of `parseAccount`?
	    // If account was provided, check that it exists on the connector
	    if (parameters.account &&
	        !connection.accounts.some((x) => x.toLowerCase() === account.address.toLowerCase()))
	        throw new ConnectorAccountNotFoundError({
	            address: account.address,
	            connector,
	        });
	    const chain = config.chains.find((chain) => chain.id === chainId);
	    const provider = (await connection.connector.getProvider({ chainId }));
	    return createClient({
	        account,
	        chain,
	        name: 'Connector Client',
	        transport: (opts) => custom(provider)({ ...opts, retryCount: 0 }),
	    });
	}

	/** https://wagmi.sh/core/api/actions/disconnect */
	async function disconnect(config, parameters = {}) {
	    let connector;
	    if (parameters.connector)
	        connector = parameters.connector;
	    else {
	        const { connections, current } = config.state;
	        const connection = connections.get(current);
	        connector = connection?.connector;
	    }
	    const connections = config.state.connections;
	    if (connector) {
	        await connector.disconnect();
	        connector.emitter.off('change', config._internal.events.change);
	        connector.emitter.off('disconnect', config._internal.events.disconnect);
	        connector.emitter.on('connect', config._internal.events.connect);
	        connections.delete(connector.uid);
	    }
	    config.setState((x) => {
	        // if no connections exist, move to disconnected state
	        if (connections.size === 0)
	            return {
	                ...x,
	                connections: new Map(),
	                current: null,
	                status: 'disconnected',
	            };
	        // switch over to another connection
	        const nextConnection = connections.values().next().value;
	        return {
	            ...x,
	            connections: new Map(connections),
	            current: nextConnection.connector.uid,
	        };
	    });
	    // Set recent connector if exists
	    {
	        const current = config.state.current;
	        if (!current)
	            return;
	        const connector = config.state.connections.get(current)?.connector;
	        if (!connector)
	            return;
	        await config.storage?.setItem('recentConnectorId', connector.id);
	    }
	}

	function getUnit(unit) {
	    if (typeof unit === 'number')
	        return unit;
	    if (unit === 'wei')
	        return 0;
	    return Math.abs(weiUnits[unit]);
	}

	/** https://wagmi.sh/core/api/actions/getAccount */
	function getAccount(config) {
	    const uid = config.state.current;
	    const connection = config.state.connections.get(uid);
	    const addresses = connection?.accounts;
	    const address = addresses?.[0];
	    const chain = config.chains.find((chain) => chain.id === connection?.chainId);
	    const status = config.state.status;
	    switch (status) {
	        case 'connected':
	            return {
	                address: address,
	                addresses: addresses,
	                chain,
	                chainId: connection?.chainId,
	                connector: connection?.connector,
	                isConnected: true,
	                isConnecting: false,
	                isDisconnected: false,
	                isReconnecting: false,
	                status,
	            };
	        case 'reconnecting':
	            return {
	                address,
	                addresses,
	                chain,
	                chainId: connection?.chainId,
	                connector: connection?.connector,
	                isConnected: !!address,
	                isConnecting: false,
	                isDisconnected: false,
	                isReconnecting: true,
	                status,
	            };
	        case 'connecting':
	            return {
	                address,
	                addresses,
	                chain,
	                chainId: connection?.chainId,
	                connector: connection?.connector,
	                isConnected: false,
	                isConnecting: true,
	                isDisconnected: false,
	                isReconnecting: false,
	                status,
	            };
	        case 'disconnected':
	            return {
	                address: undefined,
	                addresses: undefined,
	                chain: undefined,
	                chainId: undefined,
	                connector: undefined,
	                isConnected: false,
	                isConnecting: false,
	                isDisconnected: true,
	                isReconnecting: false,
	                status,
	            };
	    }
	}

	async function multicall(config, parameters) {
	    const { allowFailure = true, chainId, contracts, ...rest } = parameters;
	    const client = config.getClient({ chainId });
	    const action = getAction(client, multicall$1, 'multicall');
	    return action({
	        allowFailure,
	        contracts,
	        ...rest,
	    });
	}

	/** https://wagmi.sh/core/api/actions/readContract */
	function readContract(config, parameters) {
	    const { chainId, ...rest } = parameters;
	    const client = config.getClient({ chainId });
	    const action = getAction(client, readContract$1, 'readContract');
	    return action(rest);
	}

	async function readContracts(config, parameters) {
	    const { allowFailure = true, blockNumber, blockTag, ...rest } = parameters;
	    const contracts = parameters.contracts;
	    try {
	        const contractsByChainId = {};
	        for (const [index, contract] of contracts.entries()) {
	            const chainId = contract.chainId ?? config.state.chainId;
	            if (!contractsByChainId[chainId])
	                contractsByChainId[chainId] = [];
	            contractsByChainId[chainId]?.push({ contract, index });
	        }
	        const promises = () => Object.entries(contractsByChainId).map(([chainId, contracts]) => multicall(config, {
	            ...rest,
	            allowFailure,
	            blockNumber,
	            blockTag,
	            chainId: Number.parseInt(chainId, 10),
	            contracts: contracts.map(({ contract }) => contract),
	        }));
	        const multicallResults = (await Promise.all(promises())).flat();
	        // Reorder the contract results back to the order they were
	        // provided in.
	        const resultIndexes = Object.values(contractsByChainId).flatMap((contracts) => contracts.map(({ index }) => index));
	        return multicallResults.reduce((results, result, index) => {
	            if (results)
	                results[resultIndexes[index]] = result;
	            return results;
	        }, []);
	    }
	    catch (error) {
	        if (error instanceof ContractFunctionExecutionError)
	            throw error;
	        const promises = () => contracts.map((contract) => readContract(config, { ...contract, blockNumber, blockTag }));
	        if (allowFailure)
	            return (await Promise.allSettled(promises())).map((result) => {
	                if (result.status === 'fulfilled')
	                    return { result: result.value, status: 'success' };
	                return { error: result.reason, result: undefined, status: 'failure' };
	            });
	        return (await Promise.all(promises()));
	    }
	}

	/** https://wagmi.sh/core/api/actions/getBalance */
	async function getBalance(config, parameters) {
	    const { address, blockNumber, blockTag, chainId, token: tokenAddress, unit = 'ether', } = parameters;
	    if (tokenAddress) {
	        try {
	            return await getTokenBalance(config, {
	                balanceAddress: address,
	                chainId,
	                symbolType: 'string',
	                tokenAddress,
	            });
	        }
	        catch (error) {
	            // In the chance that there is an error upon decoding the contract result,
	            // it could be likely that the contract data is represented as bytes32 instead
	            // of a string.
	            if (error.name ===
	                'ContractFunctionExecutionError') {
	                const balance = await getTokenBalance(config, {
	                    balanceAddress: address,
	                    chainId,
	                    symbolType: 'bytes32',
	                    tokenAddress,
	                });
	                const symbol = hexToString(trim(balance.symbol, { dir: 'right' }));
	                return { ...balance, symbol };
	            }
	            throw error;
	        }
	    }
	    const client = config.getClient({ chainId });
	    const action = getAction(client, getBalance$1, 'getBalance');
	    const value = await action(blockNumber ? { address, blockNumber } : { address, blockTag });
	    const chain = config.chains.find((x) => x.id === chainId) ?? client.chain;
	    return {
	        decimals: chain.nativeCurrency.decimals,
	        formatted: formatUnits(value, getUnit(unit)),
	        symbol: chain.nativeCurrency.symbol,
	        value,
	    };
	}
	async function getTokenBalance(config, parameters) {
	    const { balanceAddress, chainId, symbolType, tokenAddress, unit } = parameters;
	    const contract = {
	        abi: [
	            {
	                type: 'function',
	                name: 'balanceOf',
	                stateMutability: 'view',
	                inputs: [{ type: 'address' }],
	                outputs: [{ type: 'uint256' }],
	            },
	            {
	                type: 'function',
	                name: 'decimals',
	                stateMutability: 'view',
	                inputs: [],
	                outputs: [{ type: 'uint8' }],
	            },
	            {
	                type: 'function',
	                name: 'symbol',
	                stateMutability: 'view',
	                inputs: [],
	                outputs: [{ type: symbolType }],
	            },
	        ],
	        address: tokenAddress,
	    };
	    const [value, decimals, symbol] = await readContracts(config, {
	        allowFailure: false,
	        contracts: [
	            {
	                ...contract,
	                functionName: 'balanceOf',
	                args: [balanceAddress],
	                chainId,
	            },
	            { ...contract, functionName: 'decimals', chainId },
	            { ...contract, functionName: 'symbol', chainId },
	        ],
	    });
	    const formatted = formatUnits(value ?? '0', getUnit(unit ?? decimals));
	    return { decimals, formatted, symbol, value };
	}

	/** Forked from https://github.com/epoberezkin/fast-deep-equal */
	function deepEqual(a, b) {
	    if (a === b)
	        return true;
	    if (a && b && typeof a === 'object' && typeof b === 'object') {
	        if (a.constructor !== b.constructor)
	            return false;
	        let length;
	        let i;
	        if (Array.isArray(a) && Array.isArray(b)) {
	            length = a.length;
	            if (length !== b.length)
	                return false;
	            for (i = length; i-- !== 0;)
	                if (!deepEqual(a[i], b[i]))
	                    return false;
	            return true;
	        }
	        if (typeof a.valueOf === 'function' &&
	            a.valueOf !== Object.prototype.valueOf)
	            return a.valueOf() === b.valueOf();
	        if (typeof a.toString === 'function' &&
	            a.toString !== Object.prototype.toString)
	            return a.toString() === b.toString();
	        const keys = Object.keys(a);
	        length = keys.length;
	        if (length !== Object.keys(b).length)
	            return false;
	        for (i = length; i-- !== 0;)
	            if (!Object.hasOwn(b, keys[i]))
	                return false;
	        for (i = length; i-- !== 0;) {
	            const key = keys[i];
	            if (key && !deepEqual(a[key], b[key]))
	                return false;
	        }
	        return true;
	    }
	    // true if both NaN, false otherwise
	    // biome-ignore lint/suspicious/noSelfCompare: using
	    return a !== a && b !== b;
	}

	let previousConnectors = [];
	/** https://wagmi.sh/core/api/actions/getConnectors */
	function getConnectors(config) {
	    const connectors = config.connectors;
	    if (previousConnectors.length === connectors.length &&
	        previousConnectors.every((connector, index) => connector === connectors[index]))
	        return previousConnectors;
	    previousConnectors = connectors;
	    return connectors;
	}

	let isReconnecting = false;
	/** https://wagmi.sh/core/api/actions/reconnect */
	async function reconnect(config, parameters = {}) {
	    // If already reconnecting, do nothing
	    if (isReconnecting)
	        return [];
	    isReconnecting = true;
	    config.setState((x) => ({
	        ...x,
	        status: x.current ? 'reconnecting' : 'connecting',
	    }));
	    const connectors = [];
	    if (parameters.connectors?.length) {
	        for (const connector_ of parameters.connectors) {
	            let connector;
	            // "Register" connector if not already created
	            if (typeof connector_ === 'function')
	                connector = config._internal.connectors.setup(connector_);
	            else
	                connector = connector_;
	            connectors.push(connector);
	        }
	    }
	    else
	        connectors.push(...config.connectors);
	    // Try recently-used connectors first
	    let recentConnectorId;
	    try {
	        recentConnectorId = await config.storage?.getItem('recentConnectorId');
	    }
	    catch { }
	    const scores = {};
	    for (const [, connection] of config.state.connections) {
	        scores[connection.connector.id] = 1;
	    }
	    if (recentConnectorId)
	        scores[recentConnectorId] = 0;
	    const sorted = Object.keys(scores).length > 0
	        ? // .toSorted()
	            [...connectors].sort((a, b) => (scores[a.id] ?? 10) - (scores[b.id] ?? 10))
	        : connectors;
	    // Iterate through each connector and try to connect
	    let connected = false;
	    const connections = [];
	    const providers = [];
	    for (const connector of sorted) {
	        const provider = await connector.getProvider().catch(() => undefined);
	        if (!provider)
	            continue;
	        // If we already have an instance of this connector's provider,
	        // then we have already checked it (ie. injected connectors can
	        // share the same `window.ethereum` instance, so we don't want to
	        // connect to it again).
	        if (providers.some((x) => x === provider))
	            continue;
	        const isAuthorized = await connector.isAuthorized();
	        if (!isAuthorized)
	            continue;
	        const data = await connector
	            .connect({ isReconnecting: true })
	            .catch(() => null);
	        if (!data)
	            continue;
	        connector.emitter.off('connect', config._internal.events.connect);
	        connector.emitter.on('change', config._internal.events.change);
	        connector.emitter.on('disconnect', config._internal.events.disconnect);
	        config.setState((x) => {
	            const connections = new Map(connected ? x.connections : new Map()).set(connector.uid, { accounts: data.accounts, chainId: data.chainId, connector });
	            return {
	                ...x,
	                current: connected ? x.current : connector.uid,
	                connections,
	            };
	        });
	        connections.push({
	            accounts: data.accounts,
	            chainId: data.chainId,
	            connector,
	        });
	        providers.push(provider);
	        connected = true;
	    }
	    // Prevent overwriting connected status from race condition
	    if (config.state.status === 'reconnecting' ||
	        config.state.status === 'connecting') {
	        // If connecting didn't succeed, set to disconnected
	        if (!connected)
	            config.setState((x) => ({
	                ...x,
	                connections: new Map(),
	                current: null,
	                status: 'disconnected',
	            }));
	        else
	            config.setState((x) => ({ ...x, status: 'connected' }));
	    }
	    isReconnecting = false;
	    return connections;
	}

	/** https://wagmi.sh/core/api/actions/sendTransaction */
	async function sendTransaction(config, parameters) {
	    const { account, chainId, connector, ...rest } = parameters;
	    let client;
	    if (typeof account === 'object' && account?.type === 'local')
	        client = config.getClient({ chainId });
	    else
	        client = await getConnectorClient(config, {
	            account: account ?? undefined,
	            assertChainId: false,
	            chainId,
	            connector,
	        });
	    const action = getAction(client, sendTransaction$1, 'sendTransaction');
	    const hash = await action({
	        ...rest,
	        ...(account ? { account } : {}),
	        chain: chainId ? { id: chainId } : null,
	        gas: rest.gas ?? undefined,
	    });
	    return hash;
	}

	/** https://wagmi.sh/core/api/actions/signMessage */
	async function signMessage(config, parameters) {
	    const { account, connector, ...rest } = parameters;
	    let client;
	    if (typeof account === 'object' && account.type === 'local')
	        client = config.getClient();
	    else
	        client = await getConnectorClient(config, { account, connector });
	    const action = getAction(client, signMessage$1, 'signMessage');
	    return action({
	        ...rest,
	        ...(account ? { account } : {}),
	    });
	}

	class ProviderNotFoundError extends BaseError {
	    constructor() {
	        super('Provider not found.');
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'ProviderNotFoundError'
	        });
	    }
	}
	class SwitchChainNotSupportedError extends BaseError {
	    constructor({ connector }) {
	        super(`"${connector.name}" does not support programmatic chain switching.`);
	        Object.defineProperty(this, "name", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: 'SwitchChainNotSupportedError'
	        });
	    }
	}

	/** https://wagmi.sh/core/api/actions/switchChain */
	async function switchChain(config, parameters) {
	    const { addEthereumChainParameter, chainId } = parameters;
	    const connection = config.state.connections.get(parameters.connector?.uid ?? config.state.current);
	    if (connection) {
	        const connector = connection.connector;
	        if (!connector.switchChain)
	            throw new SwitchChainNotSupportedError({ connector });
	        const chain = await connector.switchChain({
	            addEthereumChainParameter,
	            chainId,
	        });
	        return chain;
	    }
	    const chain = config.chains.find((x) => x.id === chainId);
	    if (!chain)
	        throw new ChainNotConfiguredError();
	    config.setState((x) => ({ ...x, chainId }));
	    return chain;
	}

	/** https://wagmi.sh/core/api/actions/watchAccount */
	function watchAccount(config, parameters) {
	    const { onChange } = parameters;
	    return config.subscribe(() => getAccount(config), onChange, {
	        equalityFn(a, b) {
	            const { connector: aConnector, ...aRest } = a;
	            const { connector: bConnector, ...bRest } = b;
	            return (deepEqual(aRest, bRest) &&
	                // check connector separately
	                aConnector?.id === bConnector?.id &&
	                aConnector?.uid === bConnector?.uid);
	        },
	    });
	}

	/** https://wagmi.sh/core/api/actions/watchChainId */
	function watchChainId(config, parameters) {
	    const { onChange } = parameters;
	    return config.subscribe((state) => state.chainId, onChange);
	}

	function createConnector(createConnectorFn) {
	    return createConnectorFn;
	}

	injected.type = 'injected';
	function injected(parameters = {}) {
	    const { shimDisconnect = true, unstable_shimAsyncInject } = parameters;
	    function getTarget() {
	        const target = parameters.target;
	        if (typeof target === 'function') {
	            const result = target();
	            if (result)
	                return result;
	        }
	        if (typeof target === 'object')
	            return target;
	        if (typeof target === 'string')
	            return {
	                ...(targetMap[target] ?? {
	                    id: target,
	                    name: `${target[0].toUpperCase()}${target.slice(1)}`,
	                    provider: `is${target[0].toUpperCase()}${target.slice(1)}`,
	                }),
	            };
	        return {
	            id: 'injected',
	            name: 'Injected',
	            provider(window) {
	                return window?.ethereum;
	            },
	        };
	    }
	    let accountsChanged;
	    let chainChanged;
	    let connect;
	    let disconnect;
	    return createConnector((config) => ({
	        get icon() {
	            return getTarget().icon;
	        },
	        get id() {
	            return getTarget().id;
	        },
	        get name() {
	            return getTarget().name;
	        },
	        /** @deprecated */
	        get supportsSimulation() {
	            return true;
	        },
	        type: injected.type,
	        async setup() {
	            const provider = await this.getProvider();
	            // Only start listening for events if `target` is set, otherwise `injected()` will also receive events
	            if (provider?.on && parameters.target) {
	                if (!connect) {
	                    connect = this.onConnect.bind(this);
	                    provider.on('connect', connect);
	                }
	                // We shouldn't need to listen for `'accountsChanged'` here since the `'connect'` event should suffice (and wallet shouldn't be connected yet).
	                // Some wallets, like MetaMask, do not implement the `'connect'` event and overload `'accountsChanged'` instead.
	                if (!accountsChanged) {
	                    accountsChanged = this.onAccountsChanged.bind(this);
	                    provider.on('accountsChanged', accountsChanged);
	                }
	            }
	        },
	        async connect({ chainId, isReconnecting, withCapabilities } = {}) {
	            const provider = await this.getProvider();
	            if (!provider)
	                throw new ProviderNotFoundError();
	            let accounts = [];
	            if (isReconnecting)
	                accounts = await this.getAccounts().catch(() => []);
	            else if (shimDisconnect) {
	                // Attempt to show another prompt for selecting account if `shimDisconnect` flag is enabled
	                try {
	                    const permissions = await provider.request({
	                        method: 'wallet_requestPermissions',
	                        params: [{ eth_accounts: {} }],
	                    });
	                    accounts = permissions[0]?.caveats?.[0]?.value?.map((x) => getAddress(x));
	                    // `'wallet_requestPermissions'` can return a different order of accounts than `'eth_accounts'`
	                    // switch to `'eth_accounts'` ordering if more than one account is connected
	                    // https://github.com/wevm/wagmi/issues/4140
	                    if (accounts.length > 0) {
	                        const sortedAccounts = await this.getAccounts();
	                        accounts = sortedAccounts;
	                    }
	                }
	                catch (err) {
	                    const error = err;
	                    // Not all injected providers support `wallet_requestPermissions` (e.g. MetaMask iOS).
	                    // Only bubble up error if user rejects request
	                    if (error.code === UserRejectedRequestError.code)
	                        throw new UserRejectedRequestError(error);
	                    // Or prompt is already open
	                    if (error.code === ResourceUnavailableRpcError.code)
	                        throw error;
	                }
	            }
	            try {
	                if (!accounts?.length && !isReconnecting) {
	                    const requestedAccounts = await provider.request({
	                        method: 'eth_requestAccounts',
	                    });
	                    accounts = requestedAccounts.map((x) => getAddress(x));
	                }
	                // Manage EIP-1193 event listeners
	                // https://eips.ethereum.org/EIPS/eip-1193#events
	                if (connect) {
	                    provider.removeListener('connect', connect);
	                    connect = undefined;
	                }
	                if (!accountsChanged) {
	                    accountsChanged = this.onAccountsChanged.bind(this);
	                    provider.on('accountsChanged', accountsChanged);
	                }
	                if (!chainChanged) {
	                    chainChanged = this.onChainChanged.bind(this);
	                    provider.on('chainChanged', chainChanged);
	                }
	                if (!disconnect) {
	                    disconnect = this.onDisconnect.bind(this);
	                    provider.on('disconnect', disconnect);
	                }
	                // Switch to chain if provided
	                let currentChainId = await this.getChainId();
	                if (chainId && currentChainId !== chainId) {
	                    const chain = await this.switchChain({ chainId }).catch((error) => {
	                        if (error.code === UserRejectedRequestError.code)
	                            throw error;
	                        return { id: currentChainId };
	                    });
	                    currentChainId = chain?.id ?? currentChainId;
	                }
	                // Remove disconnected shim if it exists
	                if (shimDisconnect)
	                    await config.storage?.removeItem(`${this.id}.disconnected`);
	                // Add connected shim if no target exists
	                if (!parameters.target)
	                    await config.storage?.setItem('injected.connected', true);
	                return {
	                    accounts: (withCapabilities
	                        ? accounts.map((address) => ({ address, capabilities: {} }))
	                        : accounts),
	                    chainId: currentChainId,
	                };
	            }
	            catch (err) {
	                const error = err;
	                if (error.code === UserRejectedRequestError.code)
	                    throw new UserRejectedRequestError(error);
	                if (error.code === ResourceUnavailableRpcError.code)
	                    throw new ResourceUnavailableRpcError(error);
	                throw error;
	            }
	        },
	        async disconnect() {
	            const provider = await this.getProvider();
	            if (!provider)
	                throw new ProviderNotFoundError();
	            // Manage EIP-1193 event listeners
	            if (chainChanged) {
	                provider.removeListener('chainChanged', chainChanged);
	                chainChanged = undefined;
	            }
	            if (disconnect) {
	                provider.removeListener('disconnect', disconnect);
	                disconnect = undefined;
	            }
	            if (!connect) {
	                connect = this.onConnect.bind(this);
	                provider.on('connect', connect);
	            }
	            // Experimental support for MetaMask disconnect
	            // https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md
	            try {
	                // Adding timeout as not all wallets support this method and can hang
	                // https://github.com/wevm/wagmi/issues/4064
	                await withTimeout(() => 
	                // TODO: Remove explicit type for viem@3
	                provider.request({
	                    // `'wallet_revokePermissions'` added in `viem@2.10.3`
	                    method: 'wallet_revokePermissions',
	                    params: [{ eth_accounts: {} }],
	                }), { timeout: 100 });
	            }
	            catch { }
	            // Add shim signalling connector is disconnected
	            if (shimDisconnect) {
	                await config.storage?.setItem(`${this.id}.disconnected`, true);
	            }
	            if (!parameters.target)
	                await config.storage?.removeItem('injected.connected');
	        },
	        async getAccounts() {
	            const provider = await this.getProvider();
	            if (!provider)
	                throw new ProviderNotFoundError();
	            const accounts = await provider.request({ method: 'eth_accounts' });
	            return accounts.map((x) => getAddress(x));
	        },
	        async getChainId() {
	            const provider = await this.getProvider();
	            if (!provider)
	                throw new ProviderNotFoundError();
	            const hexChainId = await provider.request({ method: 'eth_chainId' });
	            return Number(hexChainId);
	        },
	        async getProvider() {
	            if (typeof window === 'undefined')
	                return undefined;
	            let provider;
	            const target = getTarget();
	            if (typeof target.provider === 'function')
	                provider = target.provider(window);
	            else if (typeof target.provider === 'string')
	                provider = findProvider(window, target.provider);
	            else
	                provider = target.provider;
	            // Some wallets do not conform to EIP-1193 (e.g. Trust Wallet)
	            // https://github.com/wevm/wagmi/issues/3526#issuecomment-1912683002
	            if (provider && !provider.removeListener) {
	                // Try using `off` handler if it exists, otherwise noop
	                if ('off' in provider && typeof provider.off === 'function')
	                    provider.removeListener =
	                        provider.off;
	                else
	                    provider.removeListener = () => { };
	            }
	            return provider;
	        },
	        async isAuthorized() {
	            try {
	                const isDisconnected = shimDisconnect &&
	                    // If shim exists in storage, connector is disconnected
	                    (await config.storage?.getItem(`${this.id}.disconnected`));
	                if (isDisconnected)
	                    return false;
	                // Don't allow injected connector to connect if no target is set and it hasn't already connected
	                // (e.g. flag in storage is not set). This prevents a targetless injected connector from connecting
	                // automatically whenever there is a targeted connector configured.
	                if (!parameters.target) {
	                    const connected = await config.storage?.getItem('injected.connected');
	                    if (!connected)
	                        return false;
	                }
	                const provider = await this.getProvider();
	                if (!provider) {
	                    if (unstable_shimAsyncInject !== undefined &&
	                        unstable_shimAsyncInject !== false) {
	                        // If no provider is found, check for async injection
	                        // https://github.com/wevm/references/issues/167
	                        // https://github.com/MetaMask/detect-provider
	                        const handleEthereum = async () => {
	                            if (typeof window !== 'undefined')
	                                window.removeEventListener('ethereum#initialized', handleEthereum);
	                            const provider = await this.getProvider();
	                            return !!provider;
	                        };
	                        const timeout = typeof unstable_shimAsyncInject === 'number'
	                            ? unstable_shimAsyncInject
	                            : 1_000;
	                        const res = await Promise.race([
	                            ...(typeof window !== 'undefined'
	                                ? [
	                                    new Promise((resolve) => window.addEventListener('ethereum#initialized', () => resolve(handleEthereum()), { once: true })),
	                                ]
	                                : []),
	                            new Promise((resolve) => setTimeout(() => resolve(handleEthereum()), timeout)),
	                        ]);
	                        if (res)
	                            return true;
	                    }
	                    throw new ProviderNotFoundError();
	                }
	                // Use retry strategy as some injected wallets (e.g. MetaMask) fail to
	                // immediately resolve JSON-RPC requests on page load.
	                const accounts = await withRetry(() => this.getAccounts());
	                return !!accounts.length;
	            }
	            catch {
	                return false;
	            }
	        },
	        async switchChain({ addEthereumChainParameter, chainId }) {
	            const provider = await this.getProvider();
	            if (!provider)
	                throw new ProviderNotFoundError();
	            const chain = config.chains.find((x) => x.id === chainId);
	            if (!chain)
	                throw new SwitchChainError(new ChainNotConfiguredError());
	            const promise = new Promise((resolve) => {
	                const listener = ((data) => {
	                    if ('chainId' in data && data.chainId === chainId) {
	                        config.emitter.off('change', listener);
	                        resolve();
	                    }
	                });
	                config.emitter.on('change', listener);
	            });
	            try {
	                await Promise.all([
	                    provider
	                        .request({
	                        method: 'wallet_switchEthereumChain',
	                        params: [{ chainId: numberToHex(chainId) }],
	                    })
	                        // During `'wallet_switchEthereumChain'`, MetaMask makes a `'net_version'` RPC call to the target chain.
	                        // If this request fails, MetaMask does not emit the `'chainChanged'` event, but will still switch the chain.
	                        // To counter this behavior, we request and emit the current chain ID to confirm the chain switch either via
	                        // this callback or an externally emitted `'chainChanged'` event.
	                        // https://github.com/MetaMask/metamask-extension/issues/24247
	                        .then(async () => {
	                        const currentChainId = await this.getChainId();
	                        if (currentChainId === chainId)
	                            config.emitter.emit('change', { chainId });
	                    }),
	                    promise,
	                ]);
	                return chain;
	            }
	            catch (err) {
	                const error = err;
	                // Indicates chain is not added to provider
	                if (error.code === 4902 ||
	                    // Unwrapping for MetaMask Mobile
	                    // https://github.com/MetaMask/metamask-mobile/issues/2944#issuecomment-976988719
	                    error
	                        ?.data?.originalError?.code === 4902) {
	                    try {
	                        const { default: blockExplorer, ...blockExplorers } = chain.blockExplorers ?? {};
	                        let blockExplorerUrls;
	                        if (addEthereumChainParameter?.blockExplorerUrls)
	                            blockExplorerUrls = addEthereumChainParameter.blockExplorerUrls;
	                        else if (blockExplorer)
	                            blockExplorerUrls = [
	                                blockExplorer.url,
	                                ...Object.values(blockExplorers).map((x) => x.url),
	                            ];
	                        let rpcUrls;
	                        if (addEthereumChainParameter?.rpcUrls?.length)
	                            rpcUrls = addEthereumChainParameter.rpcUrls;
	                        else
	                            rpcUrls = [chain.rpcUrls.default?.http[0] ?? ''];
	                        const addEthereumChain = {
	                            blockExplorerUrls,
	                            chainId: numberToHex(chainId),
	                            chainName: addEthereumChainParameter?.chainName ?? chain.name,
	                            iconUrls: addEthereumChainParameter?.iconUrls,
	                            nativeCurrency: addEthereumChainParameter?.nativeCurrency ??
	                                chain.nativeCurrency,
	                            rpcUrls,
	                        };
	                        await Promise.all([
	                            provider
	                                .request({
	                                method: 'wallet_addEthereumChain',
	                                params: [addEthereumChain],
	                            })
	                                .then(async () => {
	                                const currentChainId = await this.getChainId();
	                                if (currentChainId === chainId)
	                                    config.emitter.emit('change', { chainId });
	                                else
	                                    throw new UserRejectedRequestError(new Error('User rejected switch after adding network.'));
	                            }),
	                            promise,
	                        ]);
	                        return chain;
	                    }
	                    catch (error) {
	                        throw new UserRejectedRequestError(error);
	                    }
	                }
	                if (error.code === UserRejectedRequestError.code)
	                    throw new UserRejectedRequestError(error);
	                throw new SwitchChainError(error);
	            }
	        },
	        async onAccountsChanged(accounts) {
	            // Disconnect if there are no accounts
	            if (accounts.length === 0)
	                this.onDisconnect();
	            // Connect if emitter is listening for connect event (e.g. is disconnected and connects through wallet interface)
	            else if (config.emitter.listenerCount('connect')) {
	                const chainId = (await this.getChainId()).toString();
	                this.onConnect({ chainId });
	                // Remove disconnected shim if it exists
	                if (shimDisconnect)
	                    await config.storage?.removeItem(`${this.id}.disconnected`);
	            }
	            // Regular change event
	            else
	                config.emitter.emit('change', {
	                    accounts: accounts.map((x) => getAddress(x)),
	                });
	        },
	        onChainChanged(chain) {
	            const chainId = Number(chain);
	            config.emitter.emit('change', { chainId });
	        },
	        async onConnect(connectInfo) {
	            const accounts = await this.getAccounts();
	            if (accounts.length === 0)
	                return;
	            const chainId = Number(connectInfo.chainId);
	            config.emitter.emit('connect', { accounts, chainId });
	            // Manage EIP-1193 event listeners
	            const provider = await this.getProvider();
	            if (provider) {
	                if (connect) {
	                    provider.removeListener('connect', connect);
	                    connect = undefined;
	                }
	                if (!accountsChanged) {
	                    accountsChanged = this.onAccountsChanged.bind(this);
	                    provider.on('accountsChanged', accountsChanged);
	                }
	                if (!chainChanged) {
	                    chainChanged = this.onChainChanged.bind(this);
	                    provider.on('chainChanged', chainChanged);
	                }
	                if (!disconnect) {
	                    disconnect = this.onDisconnect.bind(this);
	                    provider.on('disconnect', disconnect);
	                }
	            }
	        },
	        async onDisconnect(error) {
	            const provider = await this.getProvider();
	            // If MetaMask emits a `code: 1013` error, wait for reconnection before disconnecting
	            // https://github.com/MetaMask/providers/pull/120
	            if (error && error.code === 1013) {
	                if (provider && !!(await this.getAccounts()).length)
	                    return;
	            }
	            // No need to remove `${this.id}.disconnected` from storage because `onDisconnect` is typically
	            // only called when the wallet is disconnected through the wallet's interface, meaning the wallet
	            // actually disconnected and we don't need to simulate it.
	            config.emitter.emit('disconnect');
	            // Manage EIP-1193 event listeners
	            if (provider) {
	                if (chainChanged) {
	                    provider.removeListener('chainChanged', chainChanged);
	                    chainChanged = undefined;
	                }
	                if (disconnect) {
	                    provider.removeListener('disconnect', disconnect);
	                    disconnect = undefined;
	                }
	                if (!connect) {
	                    connect = this.onConnect.bind(this);
	                    provider.on('connect', connect);
	                }
	            }
	        },
	    }));
	}
	const targetMap = {
	    coinbaseWallet: {
	        id: 'coinbaseWallet',
	        name: 'Coinbase Wallet',
	        provider(window) {
	            if (window?.coinbaseWalletExtension)
	                return window.coinbaseWalletExtension;
	            return findProvider(window, 'isCoinbaseWallet');
	        },
	    },
	    metaMask: {
	        id: 'metaMask',
	        name: 'MetaMask',
	        provider(window) {
	            return findProvider(window, (provider) => {
	                if (!provider.isMetaMask)
	                    return false;
	                // Brave tries to make itself look like MetaMask
	                // Could also try RPC `web3_clientVersion` if following is unreliable
	                if (provider.isBraveWallet && !provider._events && !provider._state)
	                    return false;
	                // Other wallets that try to look like MetaMask
	                const flags = [
	                    'isApexWallet',
	                    'isAvalanche',
	                    'isBitKeep',
	                    'isBlockWallet',
	                    'isKuCoinWallet',
	                    'isMathWallet',
	                    'isOkxWallet',
	                    'isOKExWallet',
	                    'isOneInchIOSWallet',
	                    'isOneInchAndroidWallet',
	                    'isOpera',
	                    'isPhantom',
	                    'isPortal',
	                    'isRabby',
	                    'isTokenPocket',
	                    'isTokenary',
	                    'isUniswapWallet',
	                    'isZerion',
	                ];
	                for (const flag of flags)
	                    if (provider[flag])
	                        return false;
	                return true;
	            });
	        },
	    },
	    phantom: {
	        id: 'phantom',
	        name: 'Phantom',
	        provider(window) {
	            if (window?.phantom?.ethereum)
	                return window.phantom?.ethereum;
	            return findProvider(window, 'isPhantom');
	        },
	    },
	};
	function findProvider(window, select) {
	    function isProvider(provider) {
	        if (typeof select === 'function')
	            return select(provider);
	        if (typeof select === 'string')
	            return provider[select];
	        return true;
	    }
	    const ethereum = window.ethereum;
	    if (ethereum?.providers)
	        return ethereum.providers.find((provider) => isProvider(provider));
	    if (ethereum && isProvider(ethereum))
	        return ethereum;
	    return undefined;
	}

	/**
	 * Announces an EIP-1193 Provider.
	 */
	/**
	 * Watches for EIP-1193 Providers to be announced.
	 */
	function requestProviders(listener) {
	    if (typeof window === 'undefined')
	        return;
	    const handler = (event) => listener(event.detail);
	    window.addEventListener('eip6963:announceProvider', handler);
	    window.dispatchEvent(new CustomEvent('eip6963:requestProvider'));
	    return () => window.removeEventListener('eip6963:announceProvider', handler);
	}

	function createStore$1() {
	    const listeners = new Set();
	    let providerDetails = [];
	    const request = () => requestProviders((providerDetail) => {
	        if (providerDetails.some(({ info }) => info.uuid === providerDetail.info.uuid))
	            return;
	        providerDetails = [...providerDetails, providerDetail];
	        listeners.forEach((listener) => listener(providerDetails, { added: [providerDetail] }));
	    });
	    let unwatch = request();
	    return {
	        _listeners() {
	            return listeners;
	        },
	        clear() {
	            listeners.forEach((listener) => listener([], { removed: [...providerDetails] }));
	            providerDetails = [];
	        },
	        destroy() {
	            this.clear();
	            listeners.clear();
	            unwatch?.();
	        },
	        findProvider({ rdns }) {
	            return providerDetails.find((providerDetail) => providerDetail.info.rdns === rdns);
	        },
	        getProviders() {
	            return providerDetails;
	        },
	        reset() {
	            this.clear();
	            unwatch?.();
	            unwatch = request();
	        },
	        subscribe(listener, { emitImmediately } = {}) {
	            listeners.add(listener);
	            if (emitImmediately)
	                listener(providerDetails, { added: providerDetails });
	            return () => listeners.delete(listener);
	        },
	    };
	}

	const subscribeWithSelectorImpl = (fn) => (set, get, api) => {
	  const origSubscribe = api.subscribe;
	  api.subscribe = (selector, optListener, options) => {
	    let listener = selector;
	    if (optListener) {
	      const equalityFn = (options == null ? void 0 : options.equalityFn) || Object.is;
	      let currentSlice = selector(api.getState());
	      listener = (state) => {
	        const nextSlice = selector(state);
	        if (!equalityFn(currentSlice, nextSlice)) {
	          const previousSlice = currentSlice;
	          optListener(currentSlice = nextSlice, previousSlice);
	        }
	      };
	      if (options == null ? void 0 : options.fireImmediately) {
	        optListener(currentSlice, currentSlice);
	      }
	    }
	    return origSubscribe(listener);
	  };
	  const initialState = fn(set, get, api);
	  return initialState;
	};
	const subscribeWithSelector = subscribeWithSelectorImpl;

	function createJSONStorage(getStorage, options) {
	  let storage;
	  try {
	    storage = getStorage();
	  } catch (e) {
	    return;
	  }
	  const persistStorage = {
	    getItem: (name) => {
	      var _a;
	      const parse = (str2) => {
	        if (str2 === null) {
	          return null;
	        }
	        return JSON.parse(str2, void 0 );
	      };
	      const str = (_a = storage.getItem(name)) != null ? _a : null;
	      if (str instanceof Promise) {
	        return str.then(parse);
	      }
	      return parse(str);
	    },
	    setItem: (name, newValue) => storage.setItem(
	      name,
	      JSON.stringify(newValue, void 0 )
	    ),
	    removeItem: (name) => storage.removeItem(name)
	  };
	  return persistStorage;
	}
	const toThenable = (fn) => (input) => {
	  try {
	    const result = fn(input);
	    if (result instanceof Promise) {
	      return result;
	    }
	    return {
	      then(onFulfilled) {
	        return toThenable(onFulfilled)(result);
	      },
	      catch(_onRejected) {
	        return this;
	      }
	    };
	  } catch (e) {
	    return {
	      then(_onFulfilled) {
	        return this;
	      },
	      catch(onRejected) {
	        return toThenable(onRejected)(e);
	      }
	    };
	  }
	};
	const persistImpl = (config, baseOptions) => (set, get, api) => {
	  let options = {
	    storage: createJSONStorage(() => localStorage),
	    partialize: (state) => state,
	    version: 0,
	    merge: (persistedState, currentState) => ({
	      ...currentState,
	      ...persistedState
	    }),
	    ...baseOptions
	  };
	  let hasHydrated = false;
	  const hydrationListeners = /* @__PURE__ */ new Set();
	  const finishHydrationListeners = /* @__PURE__ */ new Set();
	  let storage = options.storage;
	  if (!storage) {
	    return config(
	      (...args) => {
	        console.warn(
	          `[zustand persist middleware] Unable to update item '${options.name}', the given storage is currently unavailable.`
	        );
	        set(...args);
	      },
	      get,
	      api
	    );
	  }
	  const setItem = () => {
	    const state = options.partialize({ ...get() });
	    return storage.setItem(options.name, {
	      state,
	      version: options.version
	    });
	  };
	  const savedSetState = api.setState;
	  api.setState = (state, replace) => {
	    savedSetState(state, replace);
	    void setItem();
	  };
	  const configResult = config(
	    (...args) => {
	      set(...args);
	      void setItem();
	    },
	    get,
	    api
	  );
	  api.getInitialState = () => configResult;
	  let stateFromStorage;
	  const hydrate = () => {
	    var _a, _b;
	    if (!storage) return;
	    hasHydrated = false;
	    hydrationListeners.forEach((cb) => {
	      var _a2;
	      return cb((_a2 = get()) != null ? _a2 : configResult);
	    });
	    const postRehydrationCallback = ((_b = options.onRehydrateStorage) == null ? void 0 : _b.call(options, (_a = get()) != null ? _a : configResult)) || void 0;
	    return toThenable(storage.getItem.bind(storage))(options.name).then((deserializedStorageValue) => {
	      if (deserializedStorageValue) {
	        if (typeof deserializedStorageValue.version === "number" && deserializedStorageValue.version !== options.version) {
	          if (options.migrate) {
	            return [
	              true,
	              options.migrate(
	                deserializedStorageValue.state,
	                deserializedStorageValue.version
	              )
	            ];
	          }
	          console.error(
	            `State loaded from storage couldn't be migrated since no migrate function was provided`
	          );
	        } else {
	          return [false, deserializedStorageValue.state];
	        }
	      }
	      return [false, void 0];
	    }).then((migrationResult) => {
	      var _a2;
	      const [migrated, migratedState] = migrationResult;
	      stateFromStorage = options.merge(
	        migratedState,
	        (_a2 = get()) != null ? _a2 : configResult
	      );
	      set(stateFromStorage, true);
	      if (migrated) {
	        return setItem();
	      }
	    }).then(() => {
	      postRehydrationCallback == null ? void 0 : postRehydrationCallback(stateFromStorage, void 0);
	      stateFromStorage = get();
	      hasHydrated = true;
	      finishHydrationListeners.forEach((cb) => cb(stateFromStorage));
	    }).catch((e) => {
	      postRehydrationCallback == null ? void 0 : postRehydrationCallback(void 0, e);
	    });
	  };
	  api.persist = {
	    setOptions: (newOptions) => {
	      options = {
	        ...options,
	        ...newOptions
	      };
	      if (newOptions.storage) {
	        storage = newOptions.storage;
	      }
	    },
	    clearStorage: () => {
	      storage == null ? void 0 : storage.removeItem(options.name);
	    },
	    getOptions: () => options,
	    rehydrate: () => hydrate(),
	    hasHydrated: () => hasHydrated,
	    onHydrate: (cb) => {
	      hydrationListeners.add(cb);
	      return () => {
	        hydrationListeners.delete(cb);
	      };
	    },
	    onFinishHydration: (cb) => {
	      finishHydrationListeners.add(cb);
	      return () => {
	        finishHydrationListeners.delete(cb);
	      };
	    }
	  };
	  if (!options.skipHydration) {
	    hydrate();
	  }
	  return stateFromStorage || configResult;
	};
	const persist = persistImpl;

	const createStoreImpl = (createState) => {
	  let state;
	  const listeners = /* @__PURE__ */ new Set();
	  const setState = (partial, replace) => {
	    const nextState = typeof partial === "function" ? partial(state) : partial;
	    if (!Object.is(nextState, state)) {
	      const previousState = state;
	      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
	      listeners.forEach((listener) => listener(state, previousState));
	    }
	  };
	  const getState = () => state;
	  const getInitialState = () => initialState;
	  const subscribe = (listener) => {
	    listeners.add(listener);
	    return () => listeners.delete(listener);
	  };
	  const api = { setState, getState, getInitialState, subscribe };
	  const initialState = state = createState(setState, getState, api);
	  return api;
	};
	const createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;

	class Emitter {
	    constructor(uid) {
	        Object.defineProperty(this, "uid", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: uid
	        });
	        Object.defineProperty(this, "_emitter", {
	            enumerable: true,
	            configurable: true,
	            writable: true,
	            value: new EventEmitter()
	        });
	    }
	    on(eventName, fn) {
	        this._emitter.on(eventName, fn);
	    }
	    once(eventName, fn) {
	        this._emitter.once(eventName, fn);
	    }
	    off(eventName, fn) {
	        this._emitter.off(eventName, fn);
	    }
	    emit(eventName, ...params) {
	        const data = params[0];
	        this._emitter.emit(eventName, { uid: this.uid, ...data });
	    }
	    listenerCount(eventName) {
	        return this._emitter.listenerCount(eventName);
	    }
	}
	function createEmitter(uid) {
	    return new Emitter(uid);
	}

	function deserialize(value, reviver) {
	    return JSON.parse(value, (key, value_) => {
	        let value = value_;
	        if (value?.__type === 'bigint')
	            value = BigInt(value.value);
	        if (value?.__type === 'Map')
	            value = new Map(value.value);
	        return reviver?.(key, value) ?? value;
	    });
	}

	/**
	 * Get the reference key for the circular value
	 *
	 * @param keys the keys to build the reference key from
	 * @param cutoff the maximum number of keys to include
	 * @returns the reference key
	 */
	function getReferenceKey(keys, cutoff) {
	    return keys.slice(0, cutoff).join('.') || '.';
	}
	/**
	 * Faster `Array.prototype.indexOf` implementation build for slicing / splicing
	 *
	 * @param array the array to match the value in
	 * @param value the value to match
	 * @returns the matching index, or -1
	 */
	function getCutoff(array, value) {
	    const { length } = array;
	    for (let index = 0; index < length; ++index) {
	        if (array[index] === value) {
	            return index + 1;
	        }
	    }
	    return 0;
	}
	/**
	 * Create a replacer method that handles circular values
	 *
	 * @param [replacer] a custom replacer to use for non-circular values
	 * @param [circularReplacer] a custom replacer to use for circular methods
	 * @returns the value to stringify
	 */
	function createReplacer(replacer, circularReplacer) {
	    const hasReplacer = typeof replacer === 'function';
	    const hasCircularReplacer = typeof circularReplacer === 'function';
	    const cache = [];
	    const keys = [];
	    return function replace(key, value) {
	        if (typeof value === 'object') {
	            if (cache.length) {
	                const thisCutoff = getCutoff(cache, this);
	                if (thisCutoff === 0) {
	                    cache[cache.length] = this;
	                }
	                else {
	                    cache.splice(thisCutoff);
	                    keys.splice(thisCutoff);
	                }
	                keys[keys.length] = key;
	                const valueCutoff = getCutoff(cache, value);
	                if (valueCutoff !== 0) {
	                    return hasCircularReplacer
	                        ? circularReplacer.call(this, key, value, getReferenceKey(keys, valueCutoff))
	                        : `[ref=${getReferenceKey(keys, valueCutoff)}]`;
	                }
	            }
	            else {
	                cache[0] = value;
	                keys[0] = key;
	            }
	        }
	        return hasReplacer ? replacer.call(this, key, value) : value;
	    };
	}
	/**
	 * Stringifier that handles circular values
	 *
	 * Forked from https://github.com/planttheidea/fast-stringify
	 *
	 * @param value to stringify
	 * @param [replacer] a custom replacer function for handling standard values
	 * @param [indent] the number of spaces to indent the output by
	 * @param [circularReplacer] a custom replacer function for handling circular values
	 * @returns the stringified output
	 */
	function serialize(value, replacer, indent, circularReplacer) {
	    return JSON.stringify(value, createReplacer((key, value_) => {
	        let value = value_;
	        if (typeof value === 'bigint')
	            value = { __type: 'bigint', value: value_.toString() };
	        if (value instanceof Map)
	            value = { __type: 'Map', value: Array.from(value_.entries()) };
	        return replacer?.(key, value) ?? value;
	    }, circularReplacer), indent ?? undefined);
	}

	function createStorage(parameters) {
	    const { deserialize: deserialize$1 = deserialize, key: prefix = 'wagmi', serialize: serialize$1 = serialize, storage = noopStorage, } = parameters;
	    function unwrap(value) {
	        if (value instanceof Promise)
	            return value.then((x) => x).catch(() => null);
	        return value;
	    }
	    return {
	        ...storage,
	        key: prefix,
	        async getItem(key, defaultValue) {
	            const value = storage.getItem(`${prefix}.${key}`);
	            const unwrapped = await unwrap(value);
	            if (unwrapped)
	                return deserialize$1(unwrapped) ?? null;
	            return (defaultValue ?? null);
	        },
	        async setItem(key, value) {
	            const storageKey = `${prefix}.${key}`;
	            if (value === null)
	                await unwrap(storage.removeItem(storageKey));
	            else
	                await unwrap(storage.setItem(storageKey, serialize$1(value)));
	        },
	        async removeItem(key) {
	            await unwrap(storage.removeItem(`${prefix}.${key}`));
	        },
	    };
	}
	const noopStorage = {
	    getItem: () => null,
	    setItem: () => { },
	    removeItem: () => { },
	};
	function getDefaultStorage() {
	    const storage = (() => {
	        // biome-ignore lint/complexity/useOptionalChain: _
	        if (typeof window !== 'undefined' && window.localStorage)
	            return window.localStorage;
	        return noopStorage;
	    })();
	    return {
	        getItem(key) {
	            return storage.getItem(key);
	        },
	        removeItem(key) {
	            storage.removeItem(key);
	        },
	        setItem(key, value) {
	            try {
	                storage.setItem(key, value);
	                // silence errors by default (QuotaExceededError, SecurityError, etc.)
	            }
	            catch { }
	        },
	    };
	}

	const size = 256;
	let index$1 = size;
	let buffer;
	function uid(length = 11) {
	    if (!buffer || index$1 + length > size * 2) {
	        buffer = '';
	        index$1 = 0;
	        for (let i = 0; i < size; i++) {
	            buffer += ((256 + Math.random() * 256) | 0).toString(16).substring(1);
	        }
	    }
	    return buffer.substring(index$1, index$1++ + length);
	}

	function createConfig(parameters) {
	    const { multiInjectedProviderDiscovery = true, storage = createStorage({
	        storage: getDefaultStorage(),
	    }), syncConnectedChain = true, ssr = false, ...rest } = parameters;
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    // Set up connectors, clients, etc.
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    const mipd = typeof window !== 'undefined' && multiInjectedProviderDiscovery
	        ? createStore$1()
	        : undefined;
	    const chains = createStore(() => rest.chains);
	    const connectors = createStore(() => {
	        const collection = [];
	        const rdnsSet = new Set();
	        for (const connectorFns of rest.connectors ?? []) {
	            const connector = setup(connectorFns);
	            collection.push(connector);
	            if (!ssr && connector.rdns) {
	                const rdnsValues = typeof connector.rdns === 'string' ? [connector.rdns] : connector.rdns;
	                for (const rdns of rdnsValues) {
	                    rdnsSet.add(rdns);
	                }
	            }
	        }
	        if (!ssr && mipd) {
	            const providers = mipd.getProviders();
	            for (const provider of providers) {
	                if (rdnsSet.has(provider.info.rdns))
	                    continue;
	                collection.push(setup(providerDetailToConnector(provider)));
	            }
	        }
	        return collection;
	    });
	    function setup(connectorFn) {
	        // Set up emitter with uid and add to connector so they are "linked" together.
	        const emitter = createEmitter(uid());
	        const connector = {
	            ...connectorFn({
	                emitter,
	                chains: chains.getState(),
	                storage,
	                transports: rest.transports,
	            }),
	            emitter,
	            uid: emitter.uid,
	        };
	        // Start listening for `connect` events on connector setup
	        // This allows connectors to "connect" themselves without user interaction (e.g. MetaMask's "Manually connect to current site")
	        emitter.on('connect', connect);
	        connector.setup?.();
	        return connector;
	    }
	    function providerDetailToConnector(providerDetail) {
	        const { info } = providerDetail;
	        const provider = providerDetail.provider;
	        return injected({ target: { ...info, id: info.rdns, provider } });
	    }
	    const clients = new Map();
	    function getClient(config = {}) {
	        const chainId = config.chainId ?? store.getState().chainId;
	        const chain = chains.getState().find((x) => x.id === chainId);
	        // chainId specified and not configured
	        if (config.chainId && !chain)
	            throw new ChainNotConfiguredError();
	        {
	            const client = clients.get(store.getState().chainId);
	            if (client && !chain)
	                return client;
	            if (!chain)
	                throw new ChainNotConfiguredError();
	        }
	        // If a memoized client exists for a chain id, use that.
	        {
	            const client = clients.get(chainId);
	            if (client)
	                return client;
	        }
	        let client;
	        if (rest.client)
	            client = rest.client({ chain });
	        else {
	            const chainId = chain.id;
	            const chainIds = chains.getState().map((x) => x.id);
	            // Grab all properties off `rest` and resolve for use in `createClient`
	            const properties = {};
	            const entries = Object.entries(rest);
	            for (const [key, value] of entries) {
	                if (key === 'chains' ||
	                    key === 'client' ||
	                    key === 'connectors' ||
	                    key === 'transports')
	                    continue;
	                if (typeof value === 'object') {
	                    // check if value is chainId-specific since some values can be objects
	                    // e.g. { batch: { multicall: { batchSize: 1024 } } }
	                    if (chainId in value)
	                        properties[key] = value[chainId];
	                    else {
	                        // check if value is chainId-specific, but does not have value for current chainId
	                        const hasChainSpecificValue = chainIds.some((x) => x in value);
	                        if (hasChainSpecificValue)
	                            continue;
	                        properties[key] = value;
	                    }
	                }
	                else
	                    properties[key] = value;
	            }
	            client = createClient({
	                ...properties,
	                chain,
	                batch: properties.batch ?? { multicall: true },
	                transport: (parameters) => rest.transports[chainId]({ ...parameters, connectors }),
	            });
	        }
	        clients.set(chainId, client);
	        return client;
	    }
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    // Create store
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    function getInitialState() {
	        return {
	            chainId: chains.getState()[0].id,
	            connections: new Map(),
	            current: null,
	            status: 'disconnected',
	        };
	    }
	    let currentVersion;
	    const prefix = '0.0.0-canary-';
	    if (version.startsWith(prefix))
	        currentVersion = Number.parseInt(version.replace(prefix, ''), 10);
	    // use package major version to version store
	    else
	        currentVersion = Number.parseInt(version.split('.')[0] ?? '0', 10);
	    const store = createStore(subscribeWithSelector(
	    // only use persist middleware if storage exists
	    storage
	        ? persist(getInitialState, {
	            migrate(persistedState, version) {
	                if (version === currentVersion)
	                    return persistedState;
	                const initialState = getInitialState();
	                const chainId = validatePersistedChainId(persistedState, initialState.chainId);
	                return { ...initialState, chainId };
	            },
	            name: 'store',
	            partialize(state) {
	                // Only persist "critical" store properties to preserve storage size.
	                return {
	                    connections: {
	                        __type: 'Map',
	                        value: Array.from(state.connections.entries()).map(([key, connection]) => {
	                            const { id, name, type, uid } = connection.connector;
	                            const connector = { id, name, type, uid };
	                            return [key, { ...connection, connector }];
	                        }),
	                    },
	                    chainId: state.chainId,
	                    current: state.current,
	                };
	            },
	            merge(persistedState, currentState) {
	                // `status` should not be persisted as it messes with reconnection
	                if (typeof persistedState === 'object' &&
	                    persistedState &&
	                    'status' in persistedState)
	                    delete persistedState.status;
	                // Make sure persisted `chainId` is valid
	                const chainId = validatePersistedChainId(persistedState, currentState.chainId);
	                return {
	                    ...currentState,
	                    ...persistedState,
	                    chainId,
	                };
	            },
	            skipHydration: ssr,
	            storage: storage,
	            version: currentVersion,
	        })
	        : getInitialState));
	    store.setState(getInitialState());
	    function validatePersistedChainId(persistedState, defaultChainId) {
	        return persistedState &&
	            typeof persistedState === 'object' &&
	            'chainId' in persistedState &&
	            typeof persistedState.chainId === 'number' &&
	            chains.getState().some((x) => x.id === persistedState.chainId)
	            ? persistedState.chainId
	            : defaultChainId;
	    }
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    // Subscribe to changes
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    // Update default chain when connector chain changes
	    if (syncConnectedChain)
	        store.subscribe(({ connections, current }) => current ? connections.get(current)?.chainId : undefined, (chainId) => {
	            // If chain is not configured, then don't switch over to it.
	            const isChainConfigured = chains
	                .getState()
	                .some((x) => x.id === chainId);
	            if (!isChainConfigured)
	                return;
	            return store.setState((x) => ({
	                ...x,
	                chainId: chainId ?? x.chainId,
	            }));
	        });
	    // EIP-6963 subscribe for new wallet providers
	    mipd?.subscribe((providerDetails) => {
	        const connectorIdSet = new Set();
	        const connectorRdnsSet = new Set();
	        for (const connector of connectors.getState()) {
	            connectorIdSet.add(connector.id);
	            if (connector.rdns) {
	                const rdnsValues = typeof connector.rdns === 'string' ? [connector.rdns] : connector.rdns;
	                for (const rdns of rdnsValues) {
	                    connectorRdnsSet.add(rdns);
	                }
	            }
	        }
	        const newConnectors = [];
	        for (const providerDetail of providerDetails) {
	            if (connectorRdnsSet.has(providerDetail.info.rdns))
	                continue;
	            const connector = setup(providerDetailToConnector(providerDetail));
	            if (connectorIdSet.has(connector.id))
	                continue;
	            newConnectors.push(connector);
	        }
	        if (storage && !store.persist.hasHydrated())
	            return;
	        connectors.setState((x) => [...x, ...newConnectors], true);
	    });
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    // Emitter listeners
	    /////////////////////////////////////////////////////////////////////////////////////////////////
	    function change(data) {
	        store.setState((x) => {
	            const connection = x.connections.get(data.uid);
	            if (!connection)
	                return x;
	            return {
	                ...x,
	                connections: new Map(x.connections).set(data.uid, {
	                    accounts: data.accounts ??
	                        connection.accounts,
	                    chainId: data.chainId ?? connection.chainId,
	                    connector: connection.connector,
	                }),
	            };
	        });
	    }
	    function connect(data) {
	        // Disable handling if reconnecting/connecting
	        if (store.getState().status === 'connecting' ||
	            store.getState().status === 'reconnecting')
	            return;
	        store.setState((x) => {
	            const connector = connectors.getState().find((x) => x.uid === data.uid);
	            if (!connector)
	                return x;
	            if (connector.emitter.listenerCount('connect'))
	                connector.emitter.off('connect', change);
	            if (!connector.emitter.listenerCount('change'))
	                connector.emitter.on('change', change);
	            if (!connector.emitter.listenerCount('disconnect'))
	                connector.emitter.on('disconnect', disconnect);
	            return {
	                ...x,
	                connections: new Map(x.connections).set(data.uid, {
	                    accounts: data.accounts,
	                    chainId: data.chainId,
	                    connector: connector,
	                }),
	                current: data.uid,
	                status: 'connected',
	            };
	        });
	    }
	    function disconnect(data) {
	        store.setState((x) => {
	            const connection = x.connections.get(data.uid);
	            if (connection) {
	                const connector = connection.connector;
	                if (connector.emitter.listenerCount('change'))
	                    connection.connector.emitter.off('change', change);
	                if (connector.emitter.listenerCount('disconnect'))
	                    connection.connector.emitter.off('disconnect', disconnect);
	                if (!connector.emitter.listenerCount('connect'))
	                    connection.connector.emitter.on('connect', connect);
	            }
	            x.connections.delete(data.uid);
	            if (x.connections.size === 0)
	                return {
	                    ...x,
	                    connections: new Map(),
	                    current: null,
	                    status: 'disconnected',
	                };
	            const nextConnection = x.connections.values().next().value;
	            return {
	                ...x,
	                connections: new Map(x.connections),
	                current: nextConnection.connector.uid,
	            };
	        });
	    }
	    return {
	        get chains() {
	            return chains.getState();
	        },
	        get connectors() {
	            return connectors.getState();
	        },
	        storage,
	        getClient,
	        get state() {
	            return store.getState();
	        },
	        setState(value) {
	            let newState;
	            if (typeof value === 'function')
	                newState = value(store.getState());
	            else
	                newState = value;
	            // Reset state if it got set to something not matching the base state
	            const initialState = getInitialState();
	            if (typeof newState !== 'object')
	                newState = initialState;
	            const isCorrupt = Object.keys(initialState).some((x) => !(x in newState));
	            if (isCorrupt)
	                newState = initialState;
	            store.setState(newState, true);
	        },
	        subscribe(selector, listener, options) {
	            return store.subscribe(selector, listener, options
	                ? {
	                    ...options,
	                    fireImmediately: options.emitImmediately,
	                    // Workaround cast since Zustand does not support `'exactOptionalPropertyTypes'`
	                }
	                : undefined);
	        },
	        _internal: {
	            mipd,
	            async revalidate() {
	                // Check connections to see if they are still active
	                const state = store.getState();
	                const connections = state.connections;
	                let current = state.current;
	                for (const [, connection] of connections) {
	                    const connector = connection.connector;
	                    // check if `connect.isAuthorized` exists
	                    // partial connectors in storage do not have it
	                    const isAuthorized = connector.isAuthorized
	                        ? await connector.isAuthorized()
	                        : false;
	                    if (isAuthorized)
	                        continue;
	                    // Remove stale connection
	                    connections.delete(connector.uid);
	                    if (current === connector.uid)
	                        current = null;
	                }
	                // set connections
	                store.setState((x) => ({ ...x, connections, current }));
	            },
	            store,
	            ssr: Boolean(ssr),
	            syncConnectedChain,
	            transports: rest.transports,
	            chains: {
	                setState(value) {
	                    const nextChains = (typeof value === 'function' ? value(chains.getState()) : value);
	                    if (nextChains.length === 0)
	                        return;
	                    return chains.setState(nextChains, true);
	                },
	                subscribe(listener) {
	                    return chains.subscribe(listener);
	                },
	            },
	            connectors: {
	                providerDetailToConnector,
	                setup: setup,
	                setState(value) {
	                    return connectors.setState(typeof value === 'function' ? value(connectors.getState()) : value, true);
	                },
	                subscribe(listener) {
	                    return connectors.subscribe(listener);
	                },
	            },
	            events: { change, connect, disconnect },
	        },
	    };
	}

	const cookieStorage = {
	    getItem(key) {
	        if (typeof window === 'undefined')
	            return null;
	        const value = parseCookie(document.cookie, key);
	        return value ?? null;
	    },
	    setItem(key, value) {
	        if (typeof window === 'undefined')
	            return;
	        // biome-ignore lint/suspicious/noDocumentCookie: using
	        document.cookie = `${key}=${value};path=/;samesite=Lax`;
	    },
	    removeItem(key) {
	        if (typeof window === 'undefined')
	            return;
	        // biome-ignore lint/suspicious/noDocumentCookie: using
	        document.cookie = `${key}=;max-age=-1;path=/`;
	    },
	};
	function parseCookie(cookie, key) {
	    const keyValue = cookie.split('; ').find((x) => x.startsWith(`${key}=`));
	    if (!keyValue)
	        return undefined;
	    return keyValue.substring(key.length + 1);
	}

	/**
	 * Predeploy contracts for OP Stack.
	 * @see https://github.com/ethereum-optimism/optimism/blob/develop/specs/predeploys.md
	 */
	const contracts = {
	    gasPriceOracle: { address: '0x420000000000000000000000000000000000000F' },
	    l1Block: { address: '0x4200000000000000000000000000000000000015' },
	    l2CrossDomainMessenger: {
	        address: '0x4200000000000000000000000000000000000007',
	    },
	    l2Erc721Bridge: { address: '0x4200000000000000000000000000000000000014' },
	    l2StandardBridge: { address: '0x4200000000000000000000000000000000000010' },
	    l2ToL1MessagePasser: {
	        address: '0x4200000000000000000000000000000000000016',
	    },
	};

	const formatters = {
	    block: /*#__PURE__*/ defineBlock({
	        format(args) {
	            const transactions = args.transactions?.map((transaction) => {
	                if (typeof transaction === 'string')
	                    return transaction;
	                const formatted = formatTransaction(transaction);
	                if (formatted.typeHex === '0x7e') {
	                    formatted.isSystemTx = transaction.isSystemTx;
	                    formatted.mint = transaction.mint
	                        ? hexToBigInt(transaction.mint)
	                        : undefined;
	                    formatted.sourceHash = transaction.sourceHash;
	                    formatted.type = 'deposit';
	                }
	                return formatted;
	            });
	            return {
	                transactions,
	                stateRoot: args.stateRoot,
	            };
	        },
	    }),
	    transaction: /*#__PURE__*/ defineTransaction({
	        format(args) {
	            const transaction = {};
	            if (args.type === '0x7e') {
	                transaction.isSystemTx = args.isSystemTx;
	                transaction.mint = args.mint ? hexToBigInt(args.mint) : undefined;
	                transaction.sourceHash = args.sourceHash;
	                transaction.type = 'deposit';
	            }
	            return transaction;
	        },
	    }),
	    transactionReceipt: /*#__PURE__*/ defineTransactionReceipt({
	        format(args) {
	            return {
	                l1GasPrice: args.l1GasPrice ? hexToBigInt(args.l1GasPrice) : null,
	                l1GasUsed: args.l1GasUsed ? hexToBigInt(args.l1GasUsed) : null,
	                l1Fee: args.l1Fee ? hexToBigInt(args.l1Fee) : null,
	                l1FeeScalar: args.l1FeeScalar ? Number(args.l1FeeScalar) : null,
	            };
	        },
	    }),
	};

	function serializeTransaction(transaction, signature) {
	    if (isDeposit(transaction))
	        return serializeTransactionDeposit(transaction);
	    return serializeTransaction$1(transaction, signature);
	}
	const serializers = {
	    transaction: serializeTransaction,
	};
	function serializeTransactionDeposit(transaction) {
	    assertTransactionDeposit(transaction);
	    const { sourceHash, data, from, gas, isSystemTx, mint, to, value } = transaction;
	    const serializedTransaction = [
	        sourceHash,
	        from,
	        to ?? '0x',
	        mint ? toHex(mint) : '0x',
	        value ? toHex(value) : '0x',
	        gas ? toHex(gas) : '0x',
	        isSystemTx ? '0x1' : '0x',
	        data ?? '0x',
	    ];
	    return concatHex([
	        '0x7e',
	        toRlp(serializedTransaction),
	    ]);
	}
	function isDeposit(transaction) {
	    if (transaction.type === 'deposit')
	        return true;
	    if (typeof transaction.sourceHash !== 'undefined')
	        return true;
	    return false;
	}
	function assertTransactionDeposit(transaction) {
	    const { from, to } = transaction;
	    if (from && !isAddress(from))
	        throw new InvalidAddressError({ address: from });
	    if (to && !isAddress(to))
	        throw new InvalidAddressError({ address: to });
	}

	const chainConfig$1 = {
	    blockTime: 2_000,
	    contracts,
	    formatters,
	    serializers,
	};

	const arbitrum = /*#__PURE__*/ defineChain({
	    id: 42_161,
	    name: 'Arbitrum One',
	    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	    blockTime: 250,
	    rpcUrls: {
	        default: {
	            http: ['https://arb1.arbitrum.io/rpc'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Arbiscan',
	            url: 'https://arbiscan.io',
	            apiUrl: 'https://api.arbiscan.io/api',
	        },
	    },
	    contracts: {
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 7654707,
	        },
	    },
	});

	const sourceId$1 = 1; // mainnet
	const base = /*#__PURE__*/ defineChain({
	    ...chainConfig$1,
	    id: 8453,
	    name: 'Base',
	    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://mainnet.base.org'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Basescan',
	            url: 'https://basescan.org',
	            apiUrl: 'https://api.basescan.org/api',
	        },
	    },
	    contracts: {
	        ...chainConfig$1.contracts,
	        disputeGameFactory: {
	            [sourceId$1]: {
	                address: '0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e',
	            },
	        },
	        l2OutputOracle: {
	            [sourceId$1]: {
	                address: '0x56315b90c40730925ec5485cf004d835058518A0',
	            },
	        },
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 5022,
	        },
	        portal: {
	            [sourceId$1]: {
	                address: '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e',
	                blockCreated: 17482143,
	            },
	        },
	        l1StandardBridge: {
	            [sourceId$1]: {
	                address: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35',
	                blockCreated: 17482143,
	            },
	        },
	    },
	    sourceId: sourceId$1,
	});
	/*#__PURE__*/ defineChain({
	    ...base,
	    experimental_preconfirmationTime: 200,
	    rpcUrls: {
	        default: {
	            http: ['https://mainnet-preconf.base.org'],
	        },
	    },
	});

	const gnosis = /*#__PURE__*/ defineChain({
	    id: 100,
	    name: 'Gnosis',
	    nativeCurrency: {
	        decimals: 18,
	        name: 'xDAI',
	        symbol: 'XDAI',
	    },
	    blockTime: 5_000,
	    rpcUrls: {
	        default: {
	            http: ['https://rpc.gnosischain.com'],
	            webSocket: ['wss://rpc.gnosischain.com/wss'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Gnosisscan',
	            url: 'https://gnosisscan.io',
	            apiUrl: 'https://api.gnosisscan.io/api',
	        },
	    },
	    contracts: {
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 21022491,
	        },
	    },
	});

	const goerli = /*#__PURE__*/ defineChain({
	    id: 5,
	    name: 'Goerli',
	    nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://5.rpc.thirdweb.com'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Etherscan',
	            url: 'https://goerli.etherscan.io',
	            apiUrl: 'https://api-goerli.etherscan.io/api',
	        },
	    },
	    contracts: {
	        ensRegistry: {
	            address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
	        },
	        ensUniversalResolver: {
	            address: '0xfc4AC75C46C914aF5892d6d3eFFcebD7917293F1',
	            blockCreated: 10_339_206,
	        },
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 6507670,
	        },
	    },
	    testnet: true,
	});

	/**
	 * Estimates the gas and fees per gas necessary to complete a transaction without submitting it to the network.
	 *
	 * @param client - Client to use
	 * @param parameters - {@link EstimateGasParameters}
	 * @returns A gas estimate and fees per gas (in wei). {@link EstimateGasReturnType}
	 *
	 * @example
	 * import { createPublicClient, http, parseEther } from 'viem'
	 * import { linea } from 'viem/chains'
	 * import { estimateGas } from 'viem/linea'
	 *
	 * const client = createPublicClient({
	 *   chain: linea,
	 *   transport: http(),
	 * })
	 * const gasEstimate = await estimateGas(client, {
	 *   account: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
	 *   to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
	 *   value: 0n,
	 * })
	 */
	async function estimateGas(client, args) {
	    const { account: account_ = client.account } = args;
	    if (!account_)
	        throw new AccountNotFoundError();
	    const account = parseAccount(account_);
	    try {
	        const { accessList, blockNumber, blockTag, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value, ...rest } = args;
	        const blockNumberHex = typeof blockNumber === 'bigint' ? numberToHex(blockNumber) : undefined;
	        const block = blockNumberHex || blockTag;
	        assertRequest(args);
	        const chainFormat = client.chain?.formatters?.transactionRequest?.format;
	        const format = chainFormat || formatTransactionRequest;
	        const request = format({
	            // Pick out extra data that might exist on the chain's transaction request type.
	            ...extract(rest, { format: chainFormat }),
	            account,
	            accessList,
	            data,
	            gas,
	            gasPrice,
	            maxFeePerGas,
	            maxPriorityFeePerGas,
	            nonce,
	            to,
	            value,
	        }, 'estimateGas');
	        const { baseFeePerGas, gasLimit, priorityFeePerGas } = await client.request({
	            method: 'linea_estimateGas',
	            params: block ? [request, block] : [request],
	        });
	        return {
	            baseFeePerGas: BigInt(baseFeePerGas),
	            gasLimit: BigInt(gasLimit),
	            priorityFeePerGas: BigInt(priorityFeePerGas),
	        };
	    }
	    catch (err) {
	        throw getCallError(err, {
	            ...args,
	            account,
	            chain: client.chain,
	        });
	    }
	}

	const chainConfig = {
	    fees: {
	        estimateFeesPerGas,
	        async maxPriorityFeePerGas({ block, client, request }) {
	            const response = await estimateFeesPerGas({
	                block,
	                client,
	                multiply: (x) => x,
	                request,
	                type: 'eip1559',
	            });
	            // Returning `null` will trigger the base `estimateMaxPriorityFeePerGas` to perform
	            // fallback mechanisms to estimate priority fee.
	            if (!response?.maxPriorityFeePerGas)
	                return null;
	            return response.maxPriorityFeePerGas;
	        },
	    },
	};
	///////////////////////////////////////////////////////////////////////////
	// Internal
	///////////////////////////////////////////////////////////////////////////
	async function estimateFeesPerGas({ client, multiply, request, type, }) {
	    try {
	        const response = await estimateGas(client, {
	            ...request,
	            account: request?.account,
	        });
	        const { priorityFeePerGas: maxPriorityFeePerGas } = response;
	        const baseFeePerGas = multiply(BigInt(response.baseFeePerGas));
	        const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;
	        if (type === 'legacy')
	            return { gasPrice: maxFeePerGas };
	        return {
	            maxFeePerGas,
	            maxPriorityFeePerGas,
	        };
	    }
	    catch {
	        // Returning `null` will trigger the base `estimateFeesPerGas` to perform
	        // fallback mechanisms to estimate fees.
	        return null;
	    }
	}

	const linea = /*#__PURE__*/ defineChain({
	    ...chainConfig,
	    id: 59_144,
	    name: 'Linea Mainnet',
	    blockTime: 2000,
	    nativeCurrency: { name: 'Linea Ether', symbol: 'ETH', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://rpc.linea.build'],
	            webSocket: ['wss://rpc.linea.build'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Etherscan',
	            url: 'https://lineascan.build',
	            apiUrl: 'https://api.lineascan.build/api',
	        },
	    },
	    contracts: {
	        multicall3: {
	            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
	            blockCreated: 42,
	        },
	        ensRegistry: {
	            address: '0x50130b669B28C339991d8676FA73CF122a121267',
	            blockCreated: 6682888,
	        },
	        ensUniversalResolver: {
	            address: '0x4D41762915F83c76EcaF6776d9b08076aA32b492',
	            blockCreated: 22_222_151,
	        },
	    },
	    ensTlds: ['.linea.eth'],
	    testnet: false,
	});

	const lineaSepolia = /*#__PURE__*/ defineChain({
	    ...chainConfig,
	    id: 59_141,
	    name: 'Linea Sepolia Testnet',
	    nativeCurrency: { name: 'Linea Ether', symbol: 'ETH', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://rpc.sepolia.linea.build'],
	            webSocket: ['wss://rpc.sepolia.linea.build'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Etherscan',
	            url: 'https://sepolia.lineascan.build',
	            apiUrl: 'https://api-sepolia.lineascan.build/api',
	        },
	    },
	    contracts: {
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 227427,
	        },
	        ensRegistry: {
	            address: '0x5B2636F0f2137B4aE722C01dd5122D7d3e9541f7',
	            blockCreated: 2395094,
	        },
	        ensUniversalResolver: {
	            address: '0x4D41762915F83c76EcaF6776d9b08076aA32b492',
	            blockCreated: 17_168_484,
	        },
	    },
	    ensTlds: ['.linea.eth'],
	    testnet: true,
	});

	const localhost = /*#__PURE__*/ defineChain({
	    id: 1_337,
	    name: 'Localhost',
	    nativeCurrency: {
	        decimals: 18,
	        name: 'Ether',
	        symbol: 'ETH',
	    },
	    rpcUrls: {
	        default: { http: ['http://127.0.0.1:8545'] },
	    },
	});

	const mainnet = /*#__PURE__*/ defineChain({
	    id: 1,
	    name: 'Ethereum',
	    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	    blockTime: 12_000,
	    rpcUrls: {
	        default: {
	            http: ['https://eth.merkle.io'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Etherscan',
	            url: 'https://etherscan.io',
	            apiUrl: 'https://api.etherscan.io/api',
	        },
	    },
	    contracts: {
	        ensUniversalResolver: {
	            address: '0xeeeeeeee14d718c2b47d9923deab1335e144eeee',
	            blockCreated: 23_085_558,
	        },
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 14_353_601,
	        },
	    },
	});

	const sourceId = 1; // mainnet
	const optimism = /*#__PURE__*/ defineChain({
	    ...chainConfig$1,
	    id: 10,
	    name: 'OP Mainnet',
	    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://mainnet.optimism.io'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Optimism Explorer',
	            url: 'https://optimistic.etherscan.io',
	            apiUrl: 'https://api-optimistic.etherscan.io/api',
	        },
	    },
	    contracts: {
	        ...chainConfig$1.contracts,
	        disputeGameFactory: {
	            [sourceId]: {
	                address: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9',
	            },
	        },
	        l2OutputOracle: {
	            [sourceId]: {
	                address: '0xdfe97868233d1aa22e815a266982f2cf17685a27',
	            },
	        },
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 4286263,
	        },
	        portal: {
	            [sourceId]: {
	                address: '0xbEb5Fc579115071764c7423A4f12eDde41f106Ed',
	            },
	        },
	        l1StandardBridge: {
	            [sourceId]: {
	                address: '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1',
	            },
	        },
	    },
	    sourceId,
	});

	const polygon = /*#__PURE__*/ defineChain({
	    id: 137,
	    name: 'Polygon',
	    blockTime: 2000,
	    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://polygon-rpc.com'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'PolygonScan',
	            url: 'https://polygonscan.com',
	            apiUrl: 'https://api.polygonscan.com/api',
	        },
	    },
	    contracts: {
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 25770160,
	        },
	    },
	});

	const sepolia = /*#__PURE__*/ defineChain({
	    id: 11_155_111,
	    name: 'Sepolia',
	    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
	    rpcUrls: {
	        default: {
	            http: ['https://11155111.rpc.thirdweb.com'],
	        },
	    },
	    blockExplorers: {
	        default: {
	            name: 'Etherscan',
	            url: 'https://sepolia.etherscan.io',
	            apiUrl: 'https://api-sepolia.etherscan.io/api',
	        },
	    },
	    contracts: {
	        multicall3: {
	            address: '0xca11bde05977b3631167028862be2a173976ca11',
	            blockCreated: 751532,
	        },
	        ensUniversalResolver: {
	            address: '0xeeeeeeee14d718c2b47d9923deab1335e144eeee',
	            blockCreated: 8_928_790,
	        },
	    },
	    testnet: true,
	});

	const DEFAULT_CHAINS = [
	    mainnet,
	    polygon,
	    arbitrum,
	    base,
	    optimism,
	    gnosis,
	    sepolia,
	    goerli,
	    lineaSepolia,
	    linea,
	    localhost,
	];
	const DEFAULT_TRANSPORTS = DEFAULT_CHAINS.reduce((acc, chain) => {
	    acc[chain.id] = http();
	    return acc;
	}, {});
	function createWidgetWagmiClient(options = {}) {
	    const preferredConnectorId = options.provider
	        ? 'aomi-embedded-provider'
	        : undefined;
	    const connectorTarget = options.provider
	        ? (() => ({
	            id: preferredConnectorId,
	            name: 'Embedded Wallet',
	            provider: () => options.provider,
	        }))
	        : undefined;
	    const connectors = [
	        injected({
	            shimDisconnect: true,
	            unstable_shimAsyncInject: true,
	            target: connectorTarget,
	        }),
	    ];
	    const isBrowser = typeof window !== 'undefined';
	    const storage = isBrowser
	        ? createStorage({ storage: cookieStorage })
	        : undefined;
	    const config = createConfig({
	        chains: DEFAULT_CHAINS,
	        connectors,
	        transports: DEFAULT_TRANSPORTS,
	        storage,
	        ssr: !isBrowser,
	    });
	    return {
	        config,
	        preferredConnectorId,
	    };
	}

	// WalletManager - Handles wallet connection and transactions
	/*
	 * ============================================================================
	 * WALLET MANAGER CLASS
	 * ============================================================================
	 */
	class WalletManager extends EventEmitter {
	    constructor(provider) {
	        super();
	        this.currentAccount = null;
	        this.currentChainId = null;
	        this.isConnected = false;
	        this.handleAccountChange = (account, previous) => {
	            this.applyAccountState(account, previous);
	        };
	        this.handleChainIdChange = (chainId, previous) => {
	            if (!this.isConnected || !chainId || chainId === previous) {
	                return;
	            }
	            const normalized = this.normalizeChainId(chainId);
	            if (!normalized || normalized === this.currentChainId) {
	                return;
	            }
	            this.currentChainId = normalized;
	            this.emit('chainChange', normalized);
	        };
	        this.provider = provider;
	        this.initializeWagmiClient();
	    }
	    /*
	     * ============================================================================
	     * PUBLIC API
	     * ============================================================================
	     */
	    /**
	     * Gets the current connected account
	     */
	    getCurrentAccount() {
	        return this.currentAccount;
	    }
	    /**
	     * Gets the current chain ID
	     */
	    getCurrentChainId() {
	        return this.currentChainId;
	    }
	    /**
	     * Gets the current network name
	     */
	    getCurrentNetworkName() {
	        if (!this.currentChainId)
	            return null;
	        return SUPPORTED_CHAINS[this.currentChainId] || 'Unknown Network';
	    }
	    /**
	     * Checks if wallet is connected
	     */
	    getIsConnected() {
	        return this.isConnected;
	    }
	    /**
	     * Connects to the wallet
	     */
	    async connect() {
	        try {
	            const connector = this.selectConnector();
	            if (!connector) {
	                throw createWidgetError(ERROR_CODES.PROVIDER_ERROR, 'No wallet connectors are available');
	            }
	            const result = await connect(this.wagmiConfig, { connector });
	            const account = result.accounts[0];
	            if (!account || !isEthereumAddress(account)) {
	                throw createWidgetError(ERROR_CODES.WALLET_CONNECTION_FAILED, 'No accounts returned from wallet');
	            }
	            return account;
	        }
	        catch (error) {
	            if (this.isUserRejectedRequestError(error)) {
	                const rejectionMessage = error?.message || 'User rejected wallet connection';
	                const rejectionError = createWidgetError(ERROR_CODES.PERMISSION_DENIED, rejectionMessage);
	                this.emit('error', rejectionError);
	                throw rejectionError;
	            }
	            const walletError = error instanceof Error
	                ? createWidgetError(ERROR_CODES.WALLET_CONNECTION_FAILED, error.message)
	                : createWidgetError(ERROR_CODES.WALLET_CONNECTION_FAILED, 'Unknown error');
	            this.emit('error', walletError);
	            throw walletError;
	        }
	    }
	    /**
	     * Disconnects from the wallet
	     */
	    async disconnect() {
	        try {
	            await disconnect(this.wagmiConfig);
	        }
	        catch {
	            // Ignore disconnect errors and fall back to local cleanup
	        }
	        finally {
	            this.handleDisconnect();
	        }
	    }
	    /**
	     * Switches to a specific network
	     */
	    async switchNetwork(chainId) {
	        try {
	            await switchChain(this.wagmiConfig, { chainId });
	        }
	        catch (error) {
	            throw createWidgetError(ERROR_CODES.UNSUPPORTED_NETWORK, error?.message
	                ? `Failed to switch to network ${chainId}: ${error.message}`
	                : `Failed to switch to network ${chainId}`);
	        }
	    }
	    /**
	     * Sends a transaction
	     */
	    async sendTransaction(transaction) {
	        if (!this.isConnected || !this.currentAccount) {
	            throw createWidgetError(ERROR_CODES.WALLET_NOT_CONNECTED, 'Wallet is not connected');
	        }
	        try {
	            validateTransactionPayload(transaction);
	            const txHash = await sendTransaction(this.wagmiConfig, {
	                account: this.currentAccount,
	                chainId: this.currentChainId ?? undefined,
	                to: transaction.to,
	                data: transaction.data,
	                value: this.hexToBigInt(transaction.value),
	                gas: this.hexToBigInt(transaction.gas),
	            });
	            if (!isTransactionHash(txHash)) {
	                throw createWidgetError(ERROR_CODES.TRANSACTION_FAILED, 'Invalid transaction hash returned');
	            }
	            return txHash;
	        }
	        catch (error) {
	            // Handle user rejection
	            if (error.code === 4001) {
	                throw createWidgetError(ERROR_CODES.TRANSACTION_REJECTED, 'Transaction was rejected by user');
	            }
	            const message = error.message || 'Transaction failed';
	            throw createWidgetError(ERROR_CODES.TRANSACTION_FAILED, message);
	        }
	    }
	    /**
	     * Signs a message
	     */
	    async signMessage(message) {
	        if (!this.isConnected || !this.currentAccount) {
	            throw createWidgetError(ERROR_CODES.WALLET_NOT_CONNECTED, 'Wallet is not connected');
	        }
	        try {
	            return await signMessage(this.wagmiConfig, {
	                account: this.currentAccount,
	                message,
	            });
	        }
	        catch (error) {
	            if (error.code === 4001) {
	                throw createWidgetError(ERROR_CODES.TRANSACTION_REJECTED, 'Message signing was rejected by user');
	            }
	            throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, `Failed to sign message: ${error?.message || 'Unknown error'}`);
	        }
	    }
	    /**
	     * Gets account balance
	     */
	    async getBalance(address) {
	        const accountAddress = address || this.currentAccount;
	        if (!accountAddress) {
	            throw createWidgetError(ERROR_CODES.WALLET_NOT_CONNECTED, 'No account available');
	        }
	        try {
	            const result = await getBalance(this.wagmiConfig, {
	                address: accountAddress,
	                chainId: this.currentChainId ?? undefined,
	            });
	            return this.bigIntToHex(result.value);
	        }
	        catch (error) {
	            throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, `Failed to get balance: ${error?.message || 'Unknown error'}`);
	        }
	    }
	    /**
	     * Updates the provider
	     */
	    updateProvider(provider) {
	        this.provider = provider;
	        this.initializeWagmiClient();
	    }
	    /**
	     * Destroys the wallet manager
	     */
	    destroy() {
	        this.teardownWagmiWatchers();
	        void this.disconnect();
	        this.removeAllListeners();
	    }
	    /*
	     * ============================================================================
	     * PRIVATE METHODS
	     * ============================================================================
	     */
	    initializeWagmiClient() {
	        this.teardownWagmiWatchers();
	        const { config, preferredConnectorId } = createWidgetWagmiClient({
	            provider: this.provider,
	        });
	        this.wagmiConfig = config;
	        this.preferredConnectorId = preferredConnectorId;
	        this.setupWagmiWatchers();
	        this.syncInitialAccountState();
	        void this.tryReconnect();
	    }
	    async tryReconnect() {
	        try {
	            await reconnect(this.wagmiConfig);
	        }
	        catch (error) {
	            console.warn('Failed to reconnect wallet session:', error);
	        }
	        finally {
	            this.syncInitialAccountState();
	        }
	    }
	    setupWagmiWatchers() {
	        this.unwatchAccount = watchAccount(this.wagmiConfig, {
	            onChange: this.handleAccountChange,
	        });
	        this.unwatchChain = watchChainId(this.wagmiConfig, {
	            onChange: this.handleChainIdChange,
	        });
	    }
	    teardownWagmiWatchers() {
	        this.unwatchAccount?.();
	        this.unwatchAccount = undefined;
	        this.unwatchChain?.();
	        this.unwatchChain = undefined;
	    }
	    syncInitialAccountState() {
	        const account = getAccount(this.wagmiConfig);
	        this.applyAccountState(account, null);
	    }
	    applyAccountState(account, previous) {
	        if (account.isConnected && account.address) {
	            const address = account.address;
	            const addresses = account.addresses ?? (address ? [address] : []);
	            const chainId = this.normalizeChainId(account.chainId);
	            const previousAddresses = previous?.addresses ?? [];
	            const addressesChanged = addresses.length !== previousAddresses.length ||
	                addresses.some((addr, index) => (previousAddresses[index] ?? '').toLowerCase() !== addr.toLowerCase());
	            const addressChanged = this.currentAccount?.toLowerCase() !== address.toLowerCase();
	            this.currentAccount = address;
	            this.isConnected = true;
	            if (chainId && this.currentChainId !== chainId) {
	                this.currentChainId = chainId;
	                this.emit('chainChange', chainId);
	            }
	            if (!previous || !previous.isConnected || addressChanged) {
	                this.emit('connect', address);
	            }
	            else if (addressesChanged && addresses.length > 0) {
	                this.emit('accountsChange', [...addresses]);
	            }
	        }
	        else if (previous?.isConnected || this.isConnected) {
	            this.handleDisconnect();
	        }
	    }
	    handleDisconnect() {
	        if (!this.isConnected && !this.currentAccount) {
	            return;
	        }
	        this.currentAccount = null;
	        this.currentChainId = null;
	        this.isConnected = false;
	        this.emit('disconnect');
	    }
	    selectConnector() {
	        const connectors = getConnectors(this.wagmiConfig);
	        if (!connectors || connectors.length === 0) {
	            return null;
	        }
	        if (this.preferredConnectorId) {
	            const preferred = connectors.find((connector) => connector.id === this.preferredConnectorId);
	            if (preferred) {
	                return preferred;
	            }
	        }
	        return connectors[0] ?? null;
	    }
	    normalizeChainId(chainId) {
	        if (!chainId)
	            return null;
	        return Object.prototype.hasOwnProperty.call(SUPPORTED_CHAINS, chainId)
	            ? chainId
	            : null;
	    }
	    hexToBigInt(value) {
	        if (!value)
	            return undefined;
	        try {
	            const normalized = value === '0x' ? '0x0' : value;
	            return BigInt(normalized);
	        }
	        catch {
	            return undefined;
	        }
	    }
	    bigIntToHex(value) {
	        return `0x${value.toString(16)}`;
	    }
	    isUserRejectedRequestError(error) {
	        if (!error || typeof error !== 'object')
	            return false;
	        const rpcError = error;
	        return (rpcError.code === 4001 ||
	            rpcError.code === 'ACTION_REJECTED' ||
	            rpcError.name === 'UserRejectedRequestError');
	    }
	}
	/*
	 * ============================================================================
	 * UTILITY FUNCTIONS
	 * ============================================================================
	 */
	/**
	 * Creates a wallet manager instance
	 */
	function createWalletManager(provider) {
	    return new WalletManager(provider);
	}
	/**
	 * Checks if a provider supports the required methods
	 */
	function isValidProvider(provider) {
	    if (!provider || typeof provider !== 'object')
	        return false;
	    const p = provider;
	    return (typeof p.request === 'function' &&
	        typeof p.on === 'function');
	}
	/**
	 * Detects available wallets
	 */
	function detectWallets() {
	    if (typeof window === 'undefined')
	        return [];
	    const wallets = [];
	    // MetaMask
	    if (window.ethereum?.isMetaMask) {
	        wallets.push({
	            name: 'MetaMask',
	            provider: window.ethereum,
	        });
	    }
	    // WalletConnect
	    if (window.ethereum?.isWalletConnect) {
	        wallets.push({
	            name: 'WalletConnect',
	            provider: window.ethereum,
	        });
	    }
	    // Generic ethereum provider
	    if (window.ethereum && !window.ethereum.isMetaMask && !window.ethereum.isWalletConnect) {
	        wallets.push({
	            name: 'Injected Wallet',
	            provider: window.ethereum,
	        });
	    }
	    return wallets;
	}

	const IFRAME_TEMPLATE = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        font-family: inherit;
        background: transparent;
      }
    </style>
  </head>
  <body></body>
</html>
`;
	class WidgetSurface {
	    constructor(container, options) {
	        this.container = container;
	        this.options = options;
	        this.iframe = null;
	        if (options.mode === 'iframe') {
	            const iframe = this.createIframe();
	            this.container.innerHTML = '';
	            this.container.appendChild(iframe);
	            this.iframe = iframe;
	            const iframeDocument = iframe.contentDocument;
	            if (!iframeDocument || !iframeDocument.body) {
	                throw new Error('Failed to initialize iframe document');
	            }
	            iframeDocument.open();
	            iframeDocument.write(IFRAME_TEMPLATE);
	            iframeDocument.close();
	            this.documentRef = iframe.contentDocument || iframeDocument;
	            this.rootElement = this.documentRef.body;
	        }
	        else {
	            this.container.innerHTML = '';
	            const ownerDocument = this.container.ownerDocument;
	            if (!ownerDocument) {
	                throw new Error('Container is detached from a document');
	            }
	            this.documentRef = ownerDocument;
	            this.rootElement = this.container;
	        }
	    }
	    getDocument() {
	        return this.documentRef;
	    }
	    getRoot() {
	        return this.rootElement;
	    }
	    clear() {
	        this.rootElement.innerHTML = '';
	    }
	    setDimensions(width, height) {
	        const targetWidth = width || DEFAULT_WIDGET_WIDTH;
	        const targetHeight = height || DEFAULT_WIDGET_HEIGHT;
	        if (this.iframe) {
	            Object.assign(this.iframe.style, {
	                width: targetWidth,
	                height: targetHeight,
	            });
	        }
	        else {
	            Object.assign(this.container.style, {
	                width: targetWidth,
	                height: targetHeight,
	            });
	        }
	    }
	    destroy() {
	        if (this.iframe && this.iframe.parentElement) {
	            this.iframe.parentElement.removeChild(this.iframe);
	        }
	        else {
	            this.container.innerHTML = '';
	        }
	    }
	    createIframe() {
	        const iframe = this.container.ownerDocument.createElement('iframe');
	        iframe.setAttribute('title', 'Aomi Chat Widget');
	        iframe.setAttribute('aria-live', 'polite');
	        iframe.className = CSS_CLASSES.WIDGET_IFRAME;
	        iframe.style.border = '0';
	        iframe.style.width = this.options.width || DEFAULT_WIDGET_WIDTH;
	        iframe.style.height = this.options.height || DEFAULT_WIDGET_HEIGHT;
	        iframe.style.display = 'block';
	        return iframe;
	    }
	}

	// AomiWidget - Main widget factory and management class
	/*
	 * ============================================================================
	 * WIDGET HANDLER IMPLEMENTATION
	 * ============================================================================
	 */
	class DefaultAomiWidget {
	    constructor(container, config) {
	        this.walletManager = null;
	        this.widgetElement = null;
	        this.messageListElement = null;
	        this.messageInputElement = null;
	        this.sendButtonElement = null;
	        this.walletStatusElement = null;
	        this.lastState = null;
	        this.activeSessionId = null;
	        this.eventEmitter = new EventEmitter();
	        this.container = container;
	        this.config = config;
	        this.refreshResolvedParams();
	        this.rebuildSurface();
	        // Initialize managers
	        this.chatManager = new ChatManager({
	            backendUrl: config.params.baseUrl || 'http://localhost:8080',
	            sessionId: config.params.sessionId || generateSessionId(),
	            maxMessageLength: 2000,
	            reconnectAttempts: 5,
	            reconnectDelay: 3000,
	        });
	        // Initialize wallet manager if provider is available
	        if (config.provider) {
	            this.walletManager = new WalletManager(config.provider);
	        }
	        this.setupEventListeners();
	        this.registerConfigListeners();
	        this.render();
	        this.initialize();
	        this.updateStateView(this.chatManager.getState());
	    }
	    /*
	     * ============================================================================
	     * PUBLIC API METHODS
	     * ============================================================================
	     */
	    async sendMessage(message) {
	        return this.chatManager.sendMessage(message);
	    }
	    updateParams(params) {
	        // Validate new parameters
	        const mergedParams = { ...this.config.params, ...params };
	        const errors = validateWidgetParams(mergedParams);
	        if (errors.length > 0) {
	            throw createWidgetError(ERROR_CODES.INVALID_CONFIG, `Invalid parameters: ${errors.join(', ')}`);
	        }
	        const previousSurfaceMode = this.resolvedParams.renderSurface;
	        this.config.params = mergedParams;
	        this.refreshResolvedParams();
	        if (this.resolvedParams.renderSurface !== previousSurfaceMode) {
	            this.rebuildSurface();
	        }
	        this.updateDimensions();
	        this.render();
	    }
	    updateProvider(provider) {
	        this.config.provider = provider;
	        if (provider) {
	            if (this.walletManager) {
	                this.walletManager.updateProvider(provider);
	            }
	            else {
	                this.walletManager = new WalletManager(provider);
	                this.setupWalletEventListeners();
	            }
	        }
	        else {
	            if (this.walletManager) {
	                this.walletManager.destroy();
	                this.walletManager = null;
	            }
	        }
	        this.updateWalletStatus();
	    }
	    getState() {
	        return this.chatManager.getState();
	    }
	    getSessionId() {
	        return this.chatManager.getSessionId();
	    }
	    isReady() {
	        const state = this.getState();
	        return state.connectionStatus === ConnectionStatus.CONNECTED;
	    }
	    on(event, listener) {
	        const eventName = this.getEventNameForListener(event);
	        this.eventEmitter.on(eventName, listener);
	        return this;
	    }
	    off(event, listener) {
	        const eventName = this.getEventNameForListener(event);
	        this.eventEmitter.off(eventName, listener);
	        return this;
	    }
	    clearChat() {
	        this.chatManager.clearMessages();
	    }
	    exportChat() {
	        return this.getState().messages;
	    }
	    focus() {
	        if (!this.widgetElement)
	            return;
	        const input = this.widgetElement.querySelector('input, textarea');
	        if (input) {
	            input.focus();
	        }
	    }
	    destroy() {
	        // Clean up managers
	        this.chatManager.destroy();
	        if (this.walletManager) {
	            this.walletManager.destroy();
	        }
	        if (this.widgetElement && this.widgetElement.parentNode) {
	            this.widgetElement.parentNode.removeChild(this.widgetElement);
	        }
	        this.surface.destroy();
	        if (this.activeSessionId) {
	            this.eventEmitter.emit(WIDGET_EVENTS.SESSION_END, this.activeSessionId);
	            this.activeSessionId = null;
	        }
	        this.eventEmitter.emit(WIDGET_EVENTS.DESTROY);
	        this.eventEmitter.removeAllListeners();
	    }
	    /*
	     * ============================================================================
	     * PRIVATE METHODS
	     * ============================================================================
	     */
	    async initialize() {
	        try {
	            // Connect to backend
	            await this.chatManager.connectSSE();
	            this.eventEmitter.emit(WIDGET_EVENTS.READY);
	        }
	        catch (error) {
	            const widgetError = error instanceof Error
	                ? error
	                : createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Failed to initialize widget');
	            this.eventEmitter.emit(WIDGET_EVENTS.ERROR, widgetError);
	        }
	    }
	    setupEventListeners() {
	        // Chat manager events
	        this.chatManager.on('stateChange', (state) => {
	            // Forward state changes to widget listeners
	            this.forwardStateEvents(state);
	        });
	        this.chatManager.on('message', (message) => {
	            this.eventEmitter.emit(WIDGET_EVENTS.MESSAGE, message);
	        });
	        this.chatManager.on('error', (error) => {
	            this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
	            this.pushSystemNotification(error.message);
	        });
	        this.chatManager.on('connectionChange', (status) => {
	            this.handleConnectionStatusChange(status);
	            this.eventEmitter.emit(WIDGET_EVENTS.CONNECTION_CHANGE, status);
	        });
	        this.chatManager.on('transactionRequest', (transaction) => {
	            this.eventEmitter.emit(WIDGET_EVENTS.TRANSACTION_REQUEST, transaction);
	            this.handleTransactionRequest(transaction);
	        });
	        // Set up wallet event listeners if wallet manager exists
	        if (this.walletManager) {
	            this.setupWalletEventListeners();
	        }
	    }
	    setupWalletEventListeners() {
	        if (!this.walletManager)
	            return;
	        this.walletManager.on('connect', (address) => {
	            this.eventEmitter.emit(WIDGET_EVENTS.WALLET_CONNECT, address);
	            this.pushSystemNotification(`Wallet connected: ${truncateAddress(address)}`);
	            this.updateWalletStatus();
	            this.refreshResolvedParams();
	        });
	        this.walletManager.on('disconnect', () => {
	            this.eventEmitter.emit(WIDGET_EVENTS.WALLET_DISCONNECT);
	            this.pushSystemNotification('Wallet disconnected.');
	            this.updateWalletStatus();
	            this.refreshResolvedParams();
	        });
	        this.walletManager.on('chainChange', (chainId) => {
	            this.eventEmitter.emit(WIDGET_EVENTS.NETWORK_CHANGE, chainId);
	            this.pushSystemNotification(`Switched to ${SUPPORTED_CHAINS[chainId] || `chain ${chainId}`}.`);
	            this.updateWalletStatus();
	            this.refreshResolvedParams();
	        });
	        this.walletManager.on('error', (error) => {
	            this.eventEmitter.emit(WIDGET_EVENTS.ERROR, error);
	            this.updateWalletStatus();
	        });
	    }
	    forwardStateEvents(state) {
	        this.updateStateView(state);
	    }
	    async handleTransactionRequest(transaction) {
	        if (!this.walletManager) {
	            await this.chatManager.sendTransactionResult(false, undefined, 'No wallet connected');
	            return;
	        }
	        try {
	            const txHash = await this.walletManager.sendTransaction({
	                to: transaction.to,
	                value: transaction.value,
	                data: transaction.data,
	                gas: transaction.gas,
	            });
	            await this.chatManager.sendTransactionResult(true, txHash);
	        }
	        catch (error) {
	            const message = error instanceof Error ? error.message : 'Transaction failed';
	            await this.chatManager.sendTransactionResult(false, undefined, message);
	        }
	    }
	    render() {
	        this.surface.setDimensions(this.resolvedParams.width, this.resolvedParams.height);
	        this.surface.clear();
	        this.resetDomReferences();
	        // Create widget element
	        const palette = this.getThemePalette();
	        this.widgetElement = createElement('div', {
	            className: [CSS_CLASSES.WIDGET_ROOT, CSS_CLASSES.WIDGET_CONTAINER].join(' '),
	            styles: {
	                width: '100%',
	                height: '100%',
	                maxHeight: '100vh',
	                position: 'relative',
	                overflow: 'hidden',
	                display: 'flex',
	                flexDirection: 'column',
	                fontFamily: this.getFontFamily(),
	                backgroundColor: palette.background,
	                color: palette.text,
	            },
	        }, this.surface.getDocument());
	        // Render chat interface
	        this.renderChatInterface();
	        // Add to container
	        this.surface.getRoot().appendChild(this.widgetElement);
	        if (this.lastState) {
	            this.updateStateView(this.lastState);
	        }
	    }
	    renderChatInterface() {
	        if (!this.widgetElement)
	            return;
	        const palette = this.getThemePalette();
	        const chatInterface = createElement('div', {
	            className: CSS_CLASSES.CHAT_INTERFACE,
	            styles: {
	                width: '100%',
	                height: '100%',
	                display: 'flex',
	                flexDirection: 'column',
	                backgroundColor: palette.surface,
	                borderRadius: '12px',
	                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
	                overflow: 'hidden',
	                minHeight: '0',
	            },
	        }, this.surface.getDocument());
	        const header = this.createHeader();
	        const body = this.createBody();
	        const actionBar = this.createActionBar();
	        chatInterface.appendChild(header);
	        chatInterface.appendChild(body);
	        chatInterface.appendChild(actionBar);
	        this.widgetElement.appendChild(chatInterface);
	        this.bindActionBarEvents();
	    }
	    createHeader() {
	        const palette = this.getThemePalette();
	        const title = createElement('div', {
	            className: CSS_CLASSES.CHAT_TITLE,
	            styles: {
	                fontWeight: '600',
	                fontSize: '15px',
	                color: palette.text,
	            },
	            children: [this.getWidgetTitle()],
	        }, this.surface.getDocument());
	        this.walletStatusElement = createElement('button', {
	            className: CSS_CLASSES.WALLET_STATUS,
	            attributes: { type: 'button' },
	            styles: {
	                display: 'inline-flex',
	                alignItems: 'center',
	                gap: '8px',
	                padding: '6px 12px',
	                borderRadius: '999px',
	                backgroundColor: palette.surface,
	                border: `1px solid ${palette.border}`,
	                color: palette.textSecondary,
	                fontSize: '12px',
	                fontWeight: '500',
	                cursor: 'pointer',
	                transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
	            },
	            children: ['Connect Wallet'],
	        }, this.surface.getDocument());
	        this.walletStatusElement.addEventListener('click', () => {
	            void this.handleWalletButtonClick();
	        });
	        const header = createElement('div', {
	            className: CSS_CLASSES.CHAT_HEADER,
	            styles: {
	                display: 'flex',
	                justifyContent: 'space-between',
	                alignItems: 'center',
	                padding: '16px 20px',
	                backgroundColor: palette.background,
	            },
	        }, this.surface.getDocument());
	        header.appendChild(title);
	        header.appendChild(this.walletStatusElement);
	        this.updateWalletStatus();
	        return header;
	    }
	    createBody() {
	        const palette = this.getThemePalette();
	        this.messageListElement = createElement('div', {
	            className: CSS_CLASSES.MESSAGE_LIST,
	            styles: {
	                flex: '1 1 auto',
	                overflowY: 'auto',
	                padding: '32px 32px 24px',
	                display: 'flex',
	                flexDirection: 'column',
	                gap: '24px',
	                backgroundColor: palette.background,
	                minHeight: '0',
	            },
	        }, this.surface.getDocument());
	        // Initial placeholder
	        this.messageListElement.appendChild(this.createMessageBubble({
	            type: 'system',
	            content: this.getEmptyStateMessage(),
	            timestamp: new Date(),
	        }));
	        const body = createElement('div', {
	            className: CSS_CLASSES.CHAT_BODY,
	            styles: {
	                flex: '1 1 auto',
	                display: 'flex',
	                flexDirection: 'column',
	                backgroundColor: palette.background,
	                minHeight: '0',
	                overflow: 'hidden',
	            },
	        }, this.surface.getDocument());
	        body.appendChild(this.messageListElement);
	        return body;
	    }
	    createActionBar() {
	        const palette = this.getThemePalette();
	        this.messageInputElement = createElement('textarea', {
	            className: [CSS_CLASSES.MESSAGE_INPUT, CSS_CLASSES.INPUT_FIELD],
	            attributes: {
	                placeholder: this.resolvedParams.placeholder ||
	                    '',
	                rows: '1',
	            },
	            styles: {
	                flex: '1',
	                resize: 'none',
	                border: 'none',
	                outline: 'none',
	                fontSize: '14px',
	                lineHeight: '20px',
	                backgroundColor: 'transparent',
	                color: palette.text,
	                minHeight: '48px',
	            },
	        }, this.surface.getDocument());
	        this.sendButtonElement = createElement('button', {
	            className: CSS_CLASSES.SEND_BUTTON,
	            attributes: { type: 'button' },
	            styles: {
	                border: 'none',
	                borderRadius: '12px',
	                padding: '10px 14px',
	                background: '#e5e7eb',
	                color: palette.text,
	                fontWeight: '500',
	                cursor: 'pointer',
	                transition: 'background-color 0.2s ease, opacity 0.2s ease',
	            },
	            children: ['↑'],
	        }, this.surface.getDocument());
	        const controls = createElement('div', {
	            className: CSS_CLASSES.ACTION_BAR,
	            styles: {
	                display: 'flex',
	                alignItems: 'center',
	                gap: '12px',
	                padding: '12px 16px',
	                backgroundColor: palette.surface,
	                borderRadius: '10px',
	                border: `1px solid ${palette.border}`,
	            },
	            children: [this.messageInputElement, this.sendButtonElement],
	        }, this.surface.getDocument());
	        const actionBarWrapper = createElement('div', {
	            className: CSS_CLASSES.INPUT_FORM,
	            styles: {
	                padding: '16px 20px 20px',
	                backgroundColor: palette.background,
	                flexShrink: '0',
	            },
	            children: [controls],
	        }, this.surface.getDocument());
	        return actionBarWrapper;
	    }
	    createMessageBubble({ type, content, toolStream, }) {
	        const palette = this.getThemePalette();
	        const isUser = type === 'user';
	        const isSystem = type === 'system';
	        const fontFamily = this.getFontFamily();
	        const monospaceFont = this.getMonospaceFontFamily();
	        const wrapper = createElement('div', {
	            className: CSS_CLASSES.MESSAGE_CONTAINER,
	            styles: {
	                display: 'flex',
	                flexDirection: 'column',
	                gap: '6px',
	                alignItems: isUser ? 'flex-end' : 'flex-start',
	            },
	        }, this.surface.getDocument());
	        const contentHost = createElement('div', {
	            className: [
	                CSS_CLASSES.MESSAGE_BUBBLE,
	                isUser
	                    ? CSS_CLASSES.MESSAGE_USER
	                    : isSystem
	                        ? CSS_CLASSES.MESSAGE_SYSTEM
	                        : CSS_CLASSES.MESSAGE_ASSISTANT,
	            ].join(' '),
	            styles: isUser
	                ? {
	                    maxWidth: '65%',
	                    padding: '12px 18px',
	                    borderRadius: '999px',
	                    backgroundColor: palette.surface,
	                    border: `1px solid ${palette.border}`,
	                    color: palette.text,
	                    fontSize: '14px',
	                    lineHeight: '22px',
	                    display: 'flex',
	                    flexDirection: 'column',
	                    gap: '8px',
	                    fontFamily,
	                    textAlign: 'left',
	                }
	                : {
	                    maxWidth: '75%',
	                    padding: '0',
	                    borderRadius: '0',
	                    backgroundColor: 'transparent',
	                    color: palette.text,
	                    fontSize: '15px',
	                    lineHeight: '24px',
	                    display: 'flex',
	                    flexDirection: 'column',
	                    gap: '12px',
	                    fontFamily,
	                    textAlign: 'left',
	                },
	        }, this.surface.getDocument());
	        const trimmedContent = content?.trim() ?? '';
	        if (trimmedContent.length > 0) {
	            const markdownElement = renderMarkdown(trimmedContent, {
	                fontFamily,
	                monospaceFontFamily: monospaceFont,
	            }, this.surface.getDocument());
	            markdownElement.style.wordBreak = 'break-word';
	            markdownElement.style.margin = '0';
	            contentHost.appendChild(markdownElement);
	        }
	        if (toolStream) {
	            const accentColor = palette.accent || palette.primary;
	            const toolWrapper = createElement('div', {
	                styles: {
	                    display: 'flex',
	                    flexDirection: 'column',
	                    gap: '4px',
	                    padding: '8px 10px',
	                    borderRadius: '10px',
	                    border: `1px solid ${accentColor}`,
	                    backgroundColor: palette.surface,
	                },
	            }, this.surface.getDocument());
	            toolWrapper.appendChild(createElement('div', {
	                styles: {
	                    fontSize: '12px',
	                    fontWeight: '600',
	                    color: accentColor,
	                    textTransform: 'uppercase',
	                    letterSpacing: '0.04em',
	                },
	                children: [`Tool • ${toolStream.topic}`],
	            }, this.surface.getDocument()));
	            const toolContent = createElement('pre', {
	                styles: {
	                    margin: '0',
	                    padding: '0',
	                    fontFamily: monospaceFont,
	                    fontSize: '12px',
	                    lineHeight: '1.5',
	                    whiteSpace: 'pre-wrap',
	                    wordBreak: 'break-word',
	                    color: palette.textSecondary,
	                    backgroundColor: 'transparent',
	                },
	            }, this.surface.getDocument());
	            toolContent.textContent = toolStream.content;
	            toolWrapper.appendChild(toolContent);
	            contentHost.appendChild(toolWrapper);
	        }
	        wrapper.appendChild(contentHost);
	        return wrapper;
	    }
	    resetDomReferences() {
	        this.messageListElement = null;
	        this.messageInputElement = null;
	        this.sendButtonElement = null;
	        this.walletStatusElement = null;
	    }
	    refreshResolvedParams() {
	        this.resolvedParams = resolveWidgetParams(this.config.params);
	    }
	    registerConfigListeners() {
	        const listeners = this.config.listeners;
	        if (!listeners)
	            return;
	        const bindings = [
	            { key: 'onReady', event: WIDGET_EVENTS.READY },
	            { key: 'onMessage', event: WIDGET_EVENTS.MESSAGE },
	            { key: 'onTransactionRequest', event: WIDGET_EVENTS.TRANSACTION_REQUEST },
	            { key: 'onError', event: WIDGET_EVENTS.ERROR },
	            { key: 'onSessionStart', event: WIDGET_EVENTS.SESSION_START },
	            { key: 'onSessionEnd', event: WIDGET_EVENTS.SESSION_END },
	            { key: 'onNetworkChange', event: WIDGET_EVENTS.NETWORK_CHANGE },
	            { key: 'onWalletConnect', event: WIDGET_EVENTS.WALLET_CONNECT },
	            { key: 'onWalletDisconnect', event: WIDGET_EVENTS.WALLET_DISCONNECT },
	        ];
	        bindings.forEach(({ key, event }) => {
	            const handler = listeners[key];
	            if (handler) {
	                this.eventEmitter.on(event, handler);
	            }
	        });
	    }
	    getEventNameForListener(event) {
	        const map = {
	            onReady: WIDGET_EVENTS.READY,
	            onMessage: WIDGET_EVENTS.MESSAGE,
	            onTransactionRequest: WIDGET_EVENTS.TRANSACTION_REQUEST,
	            onError: WIDGET_EVENTS.ERROR,
	            onSessionStart: WIDGET_EVENTS.SESSION_START,
	            onSessionEnd: WIDGET_EVENTS.SESSION_END,
	            onNetworkChange: WIDGET_EVENTS.NETWORK_CHANGE,
	            onWalletConnect: WIDGET_EVENTS.WALLET_CONNECT,
	            onWalletDisconnect: WIDGET_EVENTS.WALLET_DISCONNECT,
	        };
	        return map[event] || event;
	    }
	    bindActionBarEvents() {
	        if (!this.messageInputElement || !this.sendButtonElement) {
	            return;
	        }
	        this.sendButtonElement.addEventListener('click', () => {
	            void this.handleSendMessage();
	        });
	        this.messageInputElement.addEventListener('input', () => {
	            this.autoResizeMessageInput();
	        });
	        this.messageInputElement.addEventListener('keydown', (event) => {
	            if (event.key === 'Enter' && !event.shiftKey) {
	                event.preventDefault();
	                void this.handleSendMessage();
	            }
	        });
	        this.autoResizeMessageInput();
	    }
	    async handleSendMessage() {
	        if (!this.messageInputElement) {
	            return;
	        }
	        const value = this.messageInputElement.value.trim();
	        if (!value) {
	            return;
	        }
	        const currentState = this.lastState || this.chatManager.getState();
	        if (currentState.connectionStatus !== ConnectionStatus.CONNECTED) {
	            this.pushSystemNotification('Waiting for connection before sending messages.');
	            return;
	        }
	        try {
	            await this.chatManager.sendMessage(value);
	            this.messageInputElement.value = '';
	            this.autoResizeMessageInput();
	        }
	        catch (error) {
	            const message = error instanceof Error ? error.message : 'Failed to send message';
	            this.pushSystemNotification(message);
	        }
	    }
	    autoResizeMessageInput() {
	        if (!this.messageInputElement)
	            return;
	        const minHeight = 48;
	        this.messageInputElement.style.height = 'auto';
	        const targetHeight = Math.min(Math.max(this.messageInputElement.scrollHeight, minHeight), 180);
	        this.messageInputElement.style.height = `${targetHeight}px`;
	    }
	    updateStateView(state) {
	        if (state.sessionId && state.sessionId !== this.activeSessionId) {
	            if (this.activeSessionId) {
	                this.eventEmitter.emit(WIDGET_EVENTS.SESSION_END, this.activeSessionId);
	            }
	            this.activeSessionId = state.sessionId;
	            this.eventEmitter.emit(WIDGET_EVENTS.SESSION_START, state.sessionId);
	        }
	        this.updateMessages(state.messages);
	        this.updateWalletStatus();
	        this.lastState = state;
	    }
	    pushSystemNotification(message) {
	        if (!this.messageListElement)
	            return;
	        const bubble = this.createMessageBubble({
	            type: 'system',
	            content: message,
	            timestamp: new Date(),
	        });
	        this.messageListElement.appendChild(bubble);
	        this.scrollMessagesToBottom();
	    }
	    updateMessages(messages) {
	        if (!this.messageListElement)
	            return;
	        this.messageListElement.innerHTML = '';
	        if (messages.length === 0) {
	            this.messageListElement.appendChild(this.createMessageBubble({
	                type: 'system',
	                content: this.getEmptyStateMessage(),
	                timestamp: new Date(),
	            }));
	        }
	        else {
	            messages.forEach((message) => {
	                this.messageListElement.appendChild(this.createMessageBubble({
	                    type: message.type,
	                    content: message.content,
	                    timestamp: message.timestamp,
	                    toolStream: message.toolStream,
	                }));
	            });
	        }
	    }
	    scrollMessagesToBottom() {
	        if (!this.messageListElement)
	            return;
	        this.messageListElement.scrollTop = this.messageListElement.scrollHeight;
	    }
	    updateWalletStatus() {
	        if (!this.walletStatusElement)
	            return;
	        const palette = this.getThemePalette();
	        const isConnected = this.walletManager?.getIsConnected() ?? false;
	        const address = this.walletManager?.getCurrentAccount() ?? null;
	        if (isConnected && address) {
	            this.walletStatusElement.textContent = truncateAddress(address);
	            Object.assign(this.walletStatusElement.style, {
	                backgroundColor: palette.success,
	                border: `1px solid ${palette.success}`,
	                color: palette.background,
	            });
	            return;
	        }
	        this.walletStatusElement.textContent = 'Connect Wallet';
	        Object.assign(this.walletStatusElement.style, {
	            backgroundColor: palette.surface,
	            border: `1px solid ${palette.border}`,
	            color: palette.textSecondary,
	        });
	    }
	    async handleWalletButtonClick() {
	        if (!this.walletManager) {
	            this.pushSystemNotification('No wallet provider configured. Embed with an injected provider to enable transactions.');
	            return;
	        }
	        const isConnected = this.walletManager.getIsConnected();
	        this.updateWalletStatus();
	        try {
	            if (isConnected) {
	                this.walletManager.disconnect();
	            }
	            else {
	                await this.walletManager.connect();
	            }
	        }
	        catch (error) {
	            const message = error instanceof Error ? error.message : 'Wallet action failed';
	            this.pushSystemNotification(message);
	        }
	        finally {
	            this.updateWalletStatus();
	        }
	    }
	    handleConnectionStatusChange(status) {
	        const previousStatus = this.lastState?.connectionStatus;
	        if (previousStatus === status) {
	            return;
	        }
	        switch (status) {
	            case ConnectionStatus.CONNECTED:
	                if (previousStatus && previousStatus !== ConnectionStatus.CONNECTED) {
	                    this.pushSystemNotification('Connection restored. Preparing services…');
	                }
	                break;
	            case ConnectionStatus.RECONNECTING:
	                this.pushSystemNotification('Connection dropped. Attempting to reconnect…');
	                break;
	            case ConnectionStatus.DISCONNECTED:
	                this.pushSystemNotification('Connection lost. We will retry shortly.');
	                break;
	            case ConnectionStatus.ERROR:
	                this.pushSystemNotification('A connection error occurred. Please retry.');
	                break;
	        }
	    }
	    updateDimensions() {
	        this.surface.setDimensions(this.resolvedParams.width, this.resolvedParams.height);
	        if (this.widgetElement) {
	            this.widgetElement.style.width = '100%';
	            this.widgetElement.style.height = '100%';
	        }
	    }
	    getThemePalette() {
	        return this.resolvedParams.theme.palette;
	    }
	    getFontFamily() {
	        return this.resolvedParams.theme.fonts.primary;
	    }
	    getMonospaceFontFamily() {
	        return this.resolvedParams.theme.fonts.monospace;
	    }
	    getWidgetTitle() {
	        return this.config.params.title?.trim() || 'Aomi Assistant';
	    }
	    getEmptyStateMessage() {
	        return this.config.params.emptyStateMessage?.trim() || 'Chat interface is initializing…';
	    }
	    rebuildSurface() {
	        if (this.surface) {
	            this.surface.destroy();
	        }
	        this.surface = new WidgetSurface(this.container, {
	            mode: this.resolvedParams.renderSurface,
	            width: this.resolvedParams.width,
	            height: this.resolvedParams.height,
	        });
	    }
	}
	/*
	 * ============================================================================
	 * WIDGET FACTORY FUNCTION
	 * ============================================================================
	 */
	/**
	 * Creates and initializes an Aomi Chat Widget
	 */
	function createAomiWidget(container, config) {
	    // Validate environment
	    if (!isBrowser()) {
	        throw new Error('Widget can only be created in a browser environment');
	    }
	    // Validate container
	    if (!container || !(container instanceof HTMLElement)) {
	        throw new Error('Container must be a valid HTML element');
	    }
	    // Validate configuration
	    const errors = validateWidgetParams(config.params);
	    if (errors.length > 0) {
	        throw createWidgetError(ERROR_CODES.INVALID_CONFIG, `Configuration errors: ${errors.join(', ')}`);
	    }
	    // Create and return widget handler
	    return new DefaultAomiWidget(container, config);
	}

	var jsxRuntime = {exports: {}};

	var reactJsxRuntime_production_min = {};

	/**
	 * @license React
	 * react-jsx-runtime.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	var hasRequiredReactJsxRuntime_production_min;

	function requireReactJsxRuntime_production_min () {
		if (hasRequiredReactJsxRuntime_production_min) return reactJsxRuntime_production_min;
		hasRequiredReactJsxRuntime_production_min = 1;
	var f=require$$0,k=Symbol.for("react.element"),l=Symbol.for("react.fragment"),m=Object.prototype.hasOwnProperty,n=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,p={key:true,ref:true,__self:true,__source:true};
		function q(c,a,g){var b,d={},e=null,h=null;void 0!==g&&(e=""+g);void 0!==a.key&&(e=""+a.key);void 0!==a.ref&&(h=a.ref);for(b in a)m.call(a,b)&&!p.hasOwnProperty(b)&&(d[b]=a[b]);if(c&&c.defaultProps)for(b in a=c.defaultProps,a) void 0===d[b]&&(d[b]=a[b]);return {$$typeof:k,type:c,key:e,ref:h,props:d,_owner:n.current}}reactJsxRuntime_production_min.Fragment=l;reactJsxRuntime_production_min.jsx=q;reactJsxRuntime_production_min.jsxs=q;
		return reactJsxRuntime_production_min;
	}

	var reactJsxRuntime_development = {};

	/**
	 * @license React
	 * react-jsx-runtime.development.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */

	var hasRequiredReactJsxRuntime_development;

	function requireReactJsxRuntime_development () {
		if (hasRequiredReactJsxRuntime_development) return reactJsxRuntime_development;
		hasRequiredReactJsxRuntime_development = 1;

		if (process.env.NODE_ENV !== "production") {
		  (function() {

		var React = require$$0;

		// ATTENTION
		// When adding new symbols to this file,
		// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
		// The Symbol used to tag the ReactElement-like types.
		var REACT_ELEMENT_TYPE = Symbol.for('react.element');
		var REACT_PORTAL_TYPE = Symbol.for('react.portal');
		var REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
		var REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
		var REACT_PROFILER_TYPE = Symbol.for('react.profiler');
		var REACT_PROVIDER_TYPE = Symbol.for('react.provider');
		var REACT_CONTEXT_TYPE = Symbol.for('react.context');
		var REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
		var REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
		var REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
		var REACT_MEMO_TYPE = Symbol.for('react.memo');
		var REACT_LAZY_TYPE = Symbol.for('react.lazy');
		var REACT_OFFSCREEN_TYPE = Symbol.for('react.offscreen');
		var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
		var FAUX_ITERATOR_SYMBOL = '@@iterator';
		function getIteratorFn(maybeIterable) {
		  if (maybeIterable === null || typeof maybeIterable !== 'object') {
		    return null;
		  }

		  var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

		  if (typeof maybeIterator === 'function') {
		    return maybeIterator;
		  }

		  return null;
		}

		var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

		function error(format) {
		  {
		    {
		      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
		        args[_key2 - 1] = arguments[_key2];
		      }

		      printWarning('error', format, args);
		    }
		  }
		}

		function printWarning(level, format, args) {
		  // When changing this logic, you might want to also
		  // update consoleWithStackDev.www.js as well.
		  {
		    var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
		    var stack = ReactDebugCurrentFrame.getStackAddendum();

		    if (stack !== '') {
		      format += '%s';
		      args = args.concat([stack]);
		    } // eslint-disable-next-line react-internal/safe-string-coercion


		    var argsWithFormat = args.map(function (item) {
		      return String(item);
		    }); // Careful: RN currently depends on this prefix

		    argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
		    // breaks IE9: https://github.com/facebook/react/issues/13610
		    // eslint-disable-next-line react-internal/no-production-logging

		    Function.prototype.apply.call(console[level], console, argsWithFormat);
		  }
		}

		// -----------------------------------------------------------------------------

		var enableScopeAPI = false; // Experimental Create Event Handle API.
		var enableCacheElement = false;
		var enableTransitionTracing = false; // No known bugs, but needs performance testing

		var enableLegacyHidden = false; // Enables unstable_avoidThisFallback feature in Fiber
		// stuff. Intended to enable React core members to more easily debug scheduling
		// issues in DEV builds.

		var enableDebugTracing = false; // Track which Fiber(s) schedule render work.

		var REACT_MODULE_REFERENCE;

		{
		  REACT_MODULE_REFERENCE = Symbol.for('react.module.reference');
		}

		function isValidElementType(type) {
		  if (typeof type === 'string' || typeof type === 'function') {
		    return true;
		  } // Note: typeof might be other than 'symbol' or 'number' (e.g. if it's a polyfill).


		  if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing  || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden  || type === REACT_OFFSCREEN_TYPE || enableScopeAPI  || enableCacheElement  || enableTransitionTracing ) {
		    return true;
		  }

		  if (typeof type === 'object' && type !== null) {
		    if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
		    // types supported by any Flight configuration anywhere since
		    // we don't know which Flight build this will end up being used
		    // with.
		    type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== undefined) {
		      return true;
		    }
		  }

		  return false;
		}

		function getWrappedName(outerType, innerType, wrapperName) {
		  var displayName = outerType.displayName;

		  if (displayName) {
		    return displayName;
		  }

		  var functionName = innerType.displayName || innerType.name || '';
		  return functionName !== '' ? wrapperName + "(" + functionName + ")" : wrapperName;
		} // Keep in sync with react-reconciler/getComponentNameFromFiber


		function getContextName(type) {
		  return type.displayName || 'Context';
		} // Note that the reconciler package should generally prefer to use getComponentNameFromFiber() instead.


		function getComponentNameFromType(type) {
		  if (type == null) {
		    // Host root, text node or just invalid type.
		    return null;
		  }

		  {
		    if (typeof type.tag === 'number') {
		      error('Received an unexpected object in getComponentNameFromType(). ' + 'This is likely a bug in React. Please file an issue.');
		    }
		  }

		  if (typeof type === 'function') {
		    return type.displayName || type.name || null;
		  }

		  if (typeof type === 'string') {
		    return type;
		  }

		  switch (type) {
		    case REACT_FRAGMENT_TYPE:
		      return 'Fragment';

		    case REACT_PORTAL_TYPE:
		      return 'Portal';

		    case REACT_PROFILER_TYPE:
		      return 'Profiler';

		    case REACT_STRICT_MODE_TYPE:
		      return 'StrictMode';

		    case REACT_SUSPENSE_TYPE:
		      return 'Suspense';

		    case REACT_SUSPENSE_LIST_TYPE:
		      return 'SuspenseList';

		  }

		  if (typeof type === 'object') {
		    switch (type.$$typeof) {
		      case REACT_CONTEXT_TYPE:
		        var context = type;
		        return getContextName(context) + '.Consumer';

		      case REACT_PROVIDER_TYPE:
		        var provider = type;
		        return getContextName(provider._context) + '.Provider';

		      case REACT_FORWARD_REF_TYPE:
		        return getWrappedName(type, type.render, 'ForwardRef');

		      case REACT_MEMO_TYPE:
		        var outerName = type.displayName || null;

		        if (outerName !== null) {
		          return outerName;
		        }

		        return getComponentNameFromType(type.type) || 'Memo';

		      case REACT_LAZY_TYPE:
		        {
		          var lazyComponent = type;
		          var payload = lazyComponent._payload;
		          var init = lazyComponent._init;

		          try {
		            return getComponentNameFromType(init(payload));
		          } catch (x) {
		            return null;
		          }
		        }

		      // eslint-disable-next-line no-fallthrough
		    }
		  }

		  return null;
		}

		var assign = Object.assign;

		// Helpers to patch console.logs to avoid logging during side-effect free
		// replaying on render function. This currently only patches the object
		// lazily which won't cover if the log function was extracted eagerly.
		// We could also eagerly patch the method.
		var disabledDepth = 0;
		var prevLog;
		var prevInfo;
		var prevWarn;
		var prevError;
		var prevGroup;
		var prevGroupCollapsed;
		var prevGroupEnd;

		function disabledLog() {}

		disabledLog.__reactDisabledLog = true;
		function disableLogs() {
		  {
		    if (disabledDepth === 0) {
		      /* eslint-disable react-internal/no-production-logging */
		      prevLog = console.log;
		      prevInfo = console.info;
		      prevWarn = console.warn;
		      prevError = console.error;
		      prevGroup = console.group;
		      prevGroupCollapsed = console.groupCollapsed;
		      prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099

		      var props = {
		        configurable: true,
		        enumerable: true,
		        value: disabledLog,
		        writable: true
		      }; // $FlowFixMe Flow thinks console is immutable.

		      Object.defineProperties(console, {
		        info: props,
		        log: props,
		        warn: props,
		        error: props,
		        group: props,
		        groupCollapsed: props,
		        groupEnd: props
		      });
		      /* eslint-enable react-internal/no-production-logging */
		    }

		    disabledDepth++;
		  }
		}
		function reenableLogs() {
		  {
		    disabledDepth--;

		    if (disabledDepth === 0) {
		      /* eslint-disable react-internal/no-production-logging */
		      var props = {
		        configurable: true,
		        enumerable: true,
		        writable: true
		      }; // $FlowFixMe Flow thinks console is immutable.

		      Object.defineProperties(console, {
		        log: assign({}, props, {
		          value: prevLog
		        }),
		        info: assign({}, props, {
		          value: prevInfo
		        }),
		        warn: assign({}, props, {
		          value: prevWarn
		        }),
		        error: assign({}, props, {
		          value: prevError
		        }),
		        group: assign({}, props, {
		          value: prevGroup
		        }),
		        groupCollapsed: assign({}, props, {
		          value: prevGroupCollapsed
		        }),
		        groupEnd: assign({}, props, {
		          value: prevGroupEnd
		        })
		      });
		      /* eslint-enable react-internal/no-production-logging */
		    }

		    if (disabledDepth < 0) {
		      error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');
		    }
		  }
		}

		var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
		var prefix;
		function describeBuiltInComponentFrame(name, source, ownerFn) {
		  {
		    if (prefix === undefined) {
		      // Extract the VM specific prefix used by each line.
		      try {
		        throw Error();
		      } catch (x) {
		        var match = x.stack.trim().match(/\n( *(at )?)/);
		        prefix = match && match[1] || '';
		      }
		    } // We use the prefix to ensure our stacks line up with native stack frames.


		    return '\n' + prefix + name;
		  }
		}
		var reentry = false;
		var componentFrameCache;

		{
		  var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
		  componentFrameCache = new PossiblyWeakMap();
		}

		function describeNativeComponentFrame(fn, construct) {
		  // If something asked for a stack inside a fake render, it should get ignored.
		  if ( !fn || reentry) {
		    return '';
		  }

		  {
		    var frame = componentFrameCache.get(fn);

		    if (frame !== undefined) {
		      return frame;
		    }
		  }

		  var control;
		  reentry = true;
		  var previousPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe It does accept undefined.

		  Error.prepareStackTrace = undefined;
		  var previousDispatcher;

		  {
		    previousDispatcher = ReactCurrentDispatcher.current; // Set the dispatcher in DEV because this might be call in the render function
		    // for warnings.

		    ReactCurrentDispatcher.current = null;
		    disableLogs();
		  }

		  try {
		    // This should throw.
		    if (construct) {
		      // Something should be setting the props in the constructor.
		      var Fake = function () {
		        throw Error();
		      }; // $FlowFixMe


		      Object.defineProperty(Fake.prototype, 'props', {
		        set: function () {
		          // We use a throwing setter instead of frozen or non-writable props
		          // because that won't throw in a non-strict mode function.
		          throw Error();
		        }
		      });

		      if (typeof Reflect === 'object' && Reflect.construct) {
		        // We construct a different control for this case to include any extra
		        // frames added by the construct call.
		        try {
		          Reflect.construct(Fake, []);
		        } catch (x) {
		          control = x;
		        }

		        Reflect.construct(fn, [], Fake);
		      } else {
		        try {
		          Fake.call();
		        } catch (x) {
		          control = x;
		        }

		        fn.call(Fake.prototype);
		      }
		    } else {
		      try {
		        throw Error();
		      } catch (x) {
		        control = x;
		      }

		      fn();
		    }
		  } catch (sample) {
		    // This is inlined manually because closure doesn't do it for us.
		    if (sample && control && typeof sample.stack === 'string') {
		      // This extracts the first frame from the sample that isn't also in the control.
		      // Skipping one frame that we assume is the frame that calls the two.
		      var sampleLines = sample.stack.split('\n');
		      var controlLines = control.stack.split('\n');
		      var s = sampleLines.length - 1;
		      var c = controlLines.length - 1;

		      while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
		        // We expect at least one stack frame to be shared.
		        // Typically this will be the root most one. However, stack frames may be
		        // cut off due to maximum stack limits. In this case, one maybe cut off
		        // earlier than the other. We assume that the sample is longer or the same
		        // and there for cut off earlier. So we should find the root most frame in
		        // the sample somewhere in the control.
		        c--;
		      }

		      for (; s >= 1 && c >= 0; s--, c--) {
		        // Next we find the first one that isn't the same which should be the
		        // frame that called our sample function and the control.
		        if (sampleLines[s] !== controlLines[c]) {
		          // In V8, the first line is describing the message but other VMs don't.
		          // If we're about to return the first line, and the control is also on the same
		          // line, that's a pretty good indicator that our sample threw at same line as
		          // the control. I.e. before we entered the sample frame. So we ignore this result.
		          // This can happen if you passed a class to function component, or non-function.
		          if (s !== 1 || c !== 1) {
		            do {
		              s--;
		              c--; // We may still have similar intermediate frames from the construct call.
		              // The next one that isn't the same should be our match though.

		              if (c < 0 || sampleLines[s] !== controlLines[c]) {
		                // V8 adds a "new" prefix for native classes. Let's remove it to make it prettier.
		                var _frame = '\n' + sampleLines[s].replace(' at new ', ' at '); // If our component frame is labeled "<anonymous>"
		                // but we have a user-provided "displayName"
		                // splice it in to make the stack more readable.


		                if (fn.displayName && _frame.includes('<anonymous>')) {
		                  _frame = _frame.replace('<anonymous>', fn.displayName);
		                }

		                {
		                  if (typeof fn === 'function') {
		                    componentFrameCache.set(fn, _frame);
		                  }
		                } // Return the line we found.


		                return _frame;
		              }
		            } while (s >= 1 && c >= 0);
		          }

		          break;
		        }
		      }
		    }
		  } finally {
		    reentry = false;

		    {
		      ReactCurrentDispatcher.current = previousDispatcher;
		      reenableLogs();
		    }

		    Error.prepareStackTrace = previousPrepareStackTrace;
		  } // Fallback to just using the name if we couldn't make it throw.


		  var name = fn ? fn.displayName || fn.name : '';
		  var syntheticFrame = name ? describeBuiltInComponentFrame(name) : '';

		  {
		    if (typeof fn === 'function') {
		      componentFrameCache.set(fn, syntheticFrame);
		    }
		  }

		  return syntheticFrame;
		}
		function describeFunctionComponentFrame(fn, source, ownerFn) {
		  {
		    return describeNativeComponentFrame(fn, false);
		  }
		}

		function shouldConstruct(Component) {
		  var prototype = Component.prototype;
		  return !!(prototype && prototype.isReactComponent);
		}

		function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {

		  if (type == null) {
		    return '';
		  }

		  if (typeof type === 'function') {
		    {
		      return describeNativeComponentFrame(type, shouldConstruct(type));
		    }
		  }

		  if (typeof type === 'string') {
		    return describeBuiltInComponentFrame(type);
		  }

		  switch (type) {
		    case REACT_SUSPENSE_TYPE:
		      return describeBuiltInComponentFrame('Suspense');

		    case REACT_SUSPENSE_LIST_TYPE:
		      return describeBuiltInComponentFrame('SuspenseList');
		  }

		  if (typeof type === 'object') {
		    switch (type.$$typeof) {
		      case REACT_FORWARD_REF_TYPE:
		        return describeFunctionComponentFrame(type.render);

		      case REACT_MEMO_TYPE:
		        // Memo may contain any component type so we recursively resolve it.
		        return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);

		      case REACT_LAZY_TYPE:
		        {
		          var lazyComponent = type;
		          var payload = lazyComponent._payload;
		          var init = lazyComponent._init;

		          try {
		            // Lazy may contain any component type so we recursively resolve it.
		            return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
		          } catch (x) {}
		        }
		    }
		  }

		  return '';
		}

		var hasOwnProperty = Object.prototype.hasOwnProperty;

		var loggedTypeFailures = {};
		var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;

		function setCurrentlyValidatingElement(element) {
		  {
		    if (element) {
		      var owner = element._owner;
		      var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
		      ReactDebugCurrentFrame.setExtraStackFrame(stack);
		    } else {
		      ReactDebugCurrentFrame.setExtraStackFrame(null);
		    }
		  }
		}

		function checkPropTypes(typeSpecs, values, location, componentName, element) {
		  {
		    // $FlowFixMe This is okay but Flow doesn't know it.
		    var has = Function.call.bind(hasOwnProperty);

		    for (var typeSpecName in typeSpecs) {
		      if (has(typeSpecs, typeSpecName)) {
		        var error$1 = void 0; // Prop type validation may throw. In case they do, we don't want to
		        // fail the render phase where it didn't fail before. So we log it.
		        // After these have been cleaned up, we'll let them throw.

		        try {
		          // This is intentionally an invariant that gets caught. It's the same
		          // behavior as without this statement except with a better message.
		          if (typeof typeSpecs[typeSpecName] !== 'function') {
		            // eslint-disable-next-line react-internal/prod-error-codes
		            var err = Error((componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' + 'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' + 'This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.');
		            err.name = 'Invariant Violation';
		            throw err;
		          }

		          error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
		        } catch (ex) {
		          error$1 = ex;
		        }

		        if (error$1 && !(error$1 instanceof Error)) {
		          setCurrentlyValidatingElement(element);

		          error('%s: type specification of %s' + ' `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', location, typeSpecName, typeof error$1);

		          setCurrentlyValidatingElement(null);
		        }

		        if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
		          // Only monitor this failure once because there tends to be a lot of the
		          // same error.
		          loggedTypeFailures[error$1.message] = true;
		          setCurrentlyValidatingElement(element);

		          error('Failed %s type: %s', location, error$1.message);

		          setCurrentlyValidatingElement(null);
		        }
		      }
		    }
		  }
		}

		var isArrayImpl = Array.isArray; // eslint-disable-next-line no-redeclare

		function isArray(a) {
		  return isArrayImpl(a);
		}

		/*
		 * The `'' + value` pattern (used in in perf-sensitive code) throws for Symbol
		 * and Temporal.* types. See https://github.com/facebook/react/pull/22064.
		 *
		 * The functions in this module will throw an easier-to-understand,
		 * easier-to-debug exception with a clear errors message message explaining the
		 * problem. (Instead of a confusing exception thrown inside the implementation
		 * of the `value` object).
		 */
		// $FlowFixMe only called in DEV, so void return is not possible.
		function typeName(value) {
		  {
		    // toStringTag is needed for namespaced types like Temporal.Instant
		    var hasToStringTag = typeof Symbol === 'function' && Symbol.toStringTag;
		    var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || 'Object';
		    return type;
		  }
		} // $FlowFixMe only called in DEV, so void return is not possible.


		function willCoercionThrow(value) {
		  {
		    try {
		      testStringCoercion(value);
		      return false;
		    } catch (e) {
		      return true;
		    }
		  }
		}

		function testStringCoercion(value) {
		  // If you ended up here by following an exception call stack, here's what's
		  // happened: you supplied an object or symbol value to React (as a prop, key,
		  // DOM attribute, CSS property, string ref, etc.) and when React tried to
		  // coerce it to a string using `'' + value`, an exception was thrown.
		  //
		  // The most common types that will cause this exception are `Symbol` instances
		  // and Temporal objects like `Temporal.Instant`. But any object that has a
		  // `valueOf` or `[Symbol.toPrimitive]` method that throws will also cause this
		  // exception. (Library authors do this to prevent users from using built-in
		  // numeric operators like `+` or comparison operators like `>=` because custom
		  // methods are needed to perform accurate arithmetic or comparison.)
		  //
		  // To fix the problem, coerce this object or symbol value to a string before
		  // passing it to React. The most reliable way is usually `String(value)`.
		  //
		  // To find which value is throwing, check the browser or debugger console.
		  // Before this exception was thrown, there should be `console.error` output
		  // that shows the type (Symbol, Temporal.PlainDate, etc.) that caused the
		  // problem and how that type was used: key, atrribute, input value prop, etc.
		  // In most cases, this console output also shows the component and its
		  // ancestor components where the exception happened.
		  //
		  // eslint-disable-next-line react-internal/safe-string-coercion
		  return '' + value;
		}
		function checkKeyStringCoercion(value) {
		  {
		    if (willCoercionThrow(value)) {
		      error('The provided key is an unsupported type %s.' + ' This value must be coerced to a string before before using it here.', typeName(value));

		      return testStringCoercion(value); // throw (to help callers find troubleshooting comments)
		    }
		  }
		}

		var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
		var RESERVED_PROPS = {
		  key: true,
		  ref: true,
		  __self: true,
		  __source: true
		};
		var specialPropKeyWarningShown;
		var specialPropRefWarningShown;

		function hasValidRef(config) {
		  {
		    if (hasOwnProperty.call(config, 'ref')) {
		      var getter = Object.getOwnPropertyDescriptor(config, 'ref').get;

		      if (getter && getter.isReactWarning) {
		        return false;
		      }
		    }
		  }

		  return config.ref !== undefined;
		}

		function hasValidKey(config) {
		  {
		    if (hasOwnProperty.call(config, 'key')) {
		      var getter = Object.getOwnPropertyDescriptor(config, 'key').get;

		      if (getter && getter.isReactWarning) {
		        return false;
		      }
		    }
		  }

		  return config.key !== undefined;
		}

		function warnIfStringRefCannotBeAutoConverted(config, self) {
		  {
		    if (typeof config.ref === 'string' && ReactCurrentOwner.current && self) ;
		  }
		}

		function defineKeyPropWarningGetter(props, displayName) {
		  {
		    var warnAboutAccessingKey = function () {
		      if (!specialPropKeyWarningShown) {
		        specialPropKeyWarningShown = true;

		        error('%s: `key` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
		      }
		    };

		    warnAboutAccessingKey.isReactWarning = true;
		    Object.defineProperty(props, 'key', {
		      get: warnAboutAccessingKey,
		      configurable: true
		    });
		  }
		}

		function defineRefPropWarningGetter(props, displayName) {
		  {
		    var warnAboutAccessingRef = function () {
		      if (!specialPropRefWarningShown) {
		        specialPropRefWarningShown = true;

		        error('%s: `ref` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
		      }
		    };

		    warnAboutAccessingRef.isReactWarning = true;
		    Object.defineProperty(props, 'ref', {
		      get: warnAboutAccessingRef,
		      configurable: true
		    });
		  }
		}
		/**
		 * Factory method to create a new React element. This no longer adheres to
		 * the class pattern, so do not use new to call it. Also, instanceof check
		 * will not work. Instead test $$typeof field against Symbol.for('react.element') to check
		 * if something is a React Element.
		 *
		 * @param {*} type
		 * @param {*} props
		 * @param {*} key
		 * @param {string|object} ref
		 * @param {*} owner
		 * @param {*} self A *temporary* helper to detect places where `this` is
		 * different from the `owner` when React.createElement is called, so that we
		 * can warn. We want to get rid of owner and replace string `ref`s with arrow
		 * functions, and as long as `this` and owner are the same, there will be no
		 * change in behavior.
		 * @param {*} source An annotation object (added by a transpiler or otherwise)
		 * indicating filename, line number, and/or other information.
		 * @internal
		 */


		var ReactElement = function (type, key, ref, self, source, owner, props) {
		  var element = {
		    // This tag allows us to uniquely identify this as a React Element
		    $$typeof: REACT_ELEMENT_TYPE,
		    // Built-in properties that belong on the element
		    type: type,
		    key: key,
		    ref: ref,
		    props: props,
		    // Record the component responsible for creating this element.
		    _owner: owner
		  };

		  {
		    // The validation flag is currently mutative. We put it on
		    // an external backing store so that we can freeze the whole object.
		    // This can be replaced with a WeakMap once they are implemented in
		    // commonly used development environments.
		    element._store = {}; // To make comparing ReactElements easier for testing purposes, we make
		    // the validation flag non-enumerable (where possible, which should
		    // include every environment we run tests in), so the test framework
		    // ignores it.

		    Object.defineProperty(element._store, 'validated', {
		      configurable: false,
		      enumerable: false,
		      writable: true,
		      value: false
		    }); // self and source are DEV only properties.

		    Object.defineProperty(element, '_self', {
		      configurable: false,
		      enumerable: false,
		      writable: false,
		      value: self
		    }); // Two elements created in two different places should be considered
		    // equal for testing purposes and therefore we hide it from enumeration.

		    Object.defineProperty(element, '_source', {
		      configurable: false,
		      enumerable: false,
		      writable: false,
		      value: source
		    });

		    if (Object.freeze) {
		      Object.freeze(element.props);
		      Object.freeze(element);
		    }
		  }

		  return element;
		};
		/**
		 * https://github.com/reactjs/rfcs/pull/107
		 * @param {*} type
		 * @param {object} props
		 * @param {string} key
		 */

		function jsxDEV(type, config, maybeKey, source, self) {
		  {
		    var propName; // Reserved names are extracted

		    var props = {};
		    var key = null;
		    var ref = null; // Currently, key can be spread in as a prop. This causes a potential
		    // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
		    // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
		    // but as an intermediary step, we will use jsxDEV for everything except
		    // <div {...props} key="Hi" />, because we aren't currently able to tell if
		    // key is explicitly declared to be undefined or not.

		    if (maybeKey !== undefined) {
		      {
		        checkKeyStringCoercion(maybeKey);
		      }

		      key = '' + maybeKey;
		    }

		    if (hasValidKey(config)) {
		      {
		        checkKeyStringCoercion(config.key);
		      }

		      key = '' + config.key;
		    }

		    if (hasValidRef(config)) {
		      ref = config.ref;
		      warnIfStringRefCannotBeAutoConverted(config, self);
		    } // Remaining properties are added to a new props object


		    for (propName in config) {
		      if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
		        props[propName] = config[propName];
		      }
		    } // Resolve default props


		    if (type && type.defaultProps) {
		      var defaultProps = type.defaultProps;

		      for (propName in defaultProps) {
		        if (props[propName] === undefined) {
		          props[propName] = defaultProps[propName];
		        }
		      }
		    }

		    if (key || ref) {
		      var displayName = typeof type === 'function' ? type.displayName || type.name || 'Unknown' : type;

		      if (key) {
		        defineKeyPropWarningGetter(props, displayName);
		      }

		      if (ref) {
		        defineRefPropWarningGetter(props, displayName);
		      }
		    }

		    return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
		  }
		}

		var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
		var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;

		function setCurrentlyValidatingElement$1(element) {
		  {
		    if (element) {
		      var owner = element._owner;
		      var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
		      ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
		    } else {
		      ReactDebugCurrentFrame$1.setExtraStackFrame(null);
		    }
		  }
		}

		var propTypesMisspellWarningShown;

		{
		  propTypesMisspellWarningShown = false;
		}
		/**
		 * Verifies the object is a ReactElement.
		 * See https://reactjs.org/docs/react-api.html#isvalidelement
		 * @param {?object} object
		 * @return {boolean} True if `object` is a ReactElement.
		 * @final
		 */


		function isValidElement(object) {
		  {
		    return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
		  }
		}

		function getDeclarationErrorAddendum() {
		  {
		    if (ReactCurrentOwner$1.current) {
		      var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);

		      if (name) {
		        return '\n\nCheck the render method of `' + name + '`.';
		      }
		    }

		    return '';
		  }
		}

		function getSourceInfoErrorAddendum(source) {
		  {

		    return '';
		  }
		}
		/**
		 * Warn if there's no key explicitly set on dynamic arrays of children or
		 * object keys are not valid. This allows us to keep track of children between
		 * updates.
		 */


		var ownerHasKeyUseWarning = {};

		function getCurrentComponentErrorInfo(parentType) {
		  {
		    var info = getDeclarationErrorAddendum();

		    if (!info) {
		      var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;

		      if (parentName) {
		        info = "\n\nCheck the top-level render call using <" + parentName + ">.";
		      }
		    }

		    return info;
		  }
		}
		/**
		 * Warn if the element doesn't have an explicit key assigned to it.
		 * This element is in an array. The array could grow and shrink or be
		 * reordered. All children that haven't already been validated are required to
		 * have a "key" property assigned to it. Error statuses are cached so a warning
		 * will only be shown once.
		 *
		 * @internal
		 * @param {ReactElement} element Element that requires a key.
		 * @param {*} parentType element's parent's type.
		 */


		function validateExplicitKey(element, parentType) {
		  {
		    if (!element._store || element._store.validated || element.key != null) {
		      return;
		    }

		    element._store.validated = true;
		    var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);

		    if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
		      return;
		    }

		    ownerHasKeyUseWarning[currentComponentErrorInfo] = true; // Usually the current owner is the offender, but if it accepts children as a
		    // property, it may be the creator of the child that's responsible for
		    // assigning it a key.

		    var childOwner = '';

		    if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
		      // Give the component that originally created this child.
		      childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
		    }

		    setCurrentlyValidatingElement$1(element);

		    error('Each child in a list should have a unique "key" prop.' + '%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);

		    setCurrentlyValidatingElement$1(null);
		  }
		}
		/**
		 * Ensure that every element either is passed in a static location, in an
		 * array with an explicit keys property defined, or in an object literal
		 * with valid key property.
		 *
		 * @internal
		 * @param {ReactNode} node Statically passed child of any type.
		 * @param {*} parentType node's parent's type.
		 */


		function validateChildKeys(node, parentType) {
		  {
		    if (typeof node !== 'object') {
		      return;
		    }

		    if (isArray(node)) {
		      for (var i = 0; i < node.length; i++) {
		        var child = node[i];

		        if (isValidElement(child)) {
		          validateExplicitKey(child, parentType);
		        }
		      }
		    } else if (isValidElement(node)) {
		      // This element was passed in a valid location.
		      if (node._store) {
		        node._store.validated = true;
		      }
		    } else if (node) {
		      var iteratorFn = getIteratorFn(node);

		      if (typeof iteratorFn === 'function') {
		        // Entry iterators used to provide implicit keys,
		        // but now we print a separate warning for them later.
		        if (iteratorFn !== node.entries) {
		          var iterator = iteratorFn.call(node);
		          var step;

		          while (!(step = iterator.next()).done) {
		            if (isValidElement(step.value)) {
		              validateExplicitKey(step.value, parentType);
		            }
		          }
		        }
		      }
		    }
		  }
		}
		/**
		 * Given an element, validate that its props follow the propTypes definition,
		 * provided by the type.
		 *
		 * @param {ReactElement} element
		 */


		function validatePropTypes(element) {
		  {
		    var type = element.type;

		    if (type === null || type === undefined || typeof type === 'string') {
		      return;
		    }

		    var propTypes;

		    if (typeof type === 'function') {
		      propTypes = type.propTypes;
		    } else if (typeof type === 'object' && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
		    // Inner props are checked in the reconciler.
		    type.$$typeof === REACT_MEMO_TYPE)) {
		      propTypes = type.propTypes;
		    } else {
		      return;
		    }

		    if (propTypes) {
		      // Intentionally inside to avoid triggering lazy initializers:
		      var name = getComponentNameFromType(type);
		      checkPropTypes(propTypes, element.props, 'prop', name, element);
		    } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
		      propTypesMisspellWarningShown = true; // Intentionally inside to avoid triggering lazy initializers:

		      var _name = getComponentNameFromType(type);

		      error('Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?', _name || 'Unknown');
		    }

		    if (typeof type.getDefaultProps === 'function' && !type.getDefaultProps.isReactClassApproved) {
		      error('getDefaultProps is only used on classic React.createClass ' + 'definitions. Use a static property named `defaultProps` instead.');
		    }
		  }
		}
		/**
		 * Given a fragment, validate that it can only be provided with fragment props
		 * @param {ReactElement} fragment
		 */


		function validateFragmentProps(fragment) {
		  {
		    var keys = Object.keys(fragment.props);

		    for (var i = 0; i < keys.length; i++) {
		      var key = keys[i];

		      if (key !== 'children' && key !== 'key') {
		        setCurrentlyValidatingElement$1(fragment);

		        error('Invalid prop `%s` supplied to `React.Fragment`. ' + 'React.Fragment can only have `key` and `children` props.', key);

		        setCurrentlyValidatingElement$1(null);
		        break;
		      }
		    }

		    if (fragment.ref !== null) {
		      setCurrentlyValidatingElement$1(fragment);

		      error('Invalid attribute `ref` supplied to `React.Fragment`.');

		      setCurrentlyValidatingElement$1(null);
		    }
		  }
		}

		var didWarnAboutKeySpread = {};
		function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
		  {
		    var validType = isValidElementType(type); // We warn in this case but don't throw. We expect the element creation to
		    // succeed and there will likely be errors in render.

		    if (!validType) {
		      var info = '';

		      if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
		        info += ' You likely forgot to export your component from the file ' + "it's defined in, or you might have mixed up default and named imports.";
		      }

		      var sourceInfo = getSourceInfoErrorAddendum();

		      if (sourceInfo) {
		        info += sourceInfo;
		      } else {
		        info += getDeclarationErrorAddendum();
		      }

		      var typeString;

		      if (type === null) {
		        typeString = 'null';
		      } else if (isArray(type)) {
		        typeString = 'array';
		      } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
		        typeString = "<" + (getComponentNameFromType(type.type) || 'Unknown') + " />";
		        info = ' Did you accidentally export a JSX literal instead of a component?';
		      } else {
		        typeString = typeof type;
		      }

		      error('React.jsx: type is invalid -- expected a string (for ' + 'built-in components) or a class/function (for composite ' + 'components) but got: %s.%s', typeString, info);
		    }

		    var element = jsxDEV(type, props, key, source, self); // The result can be nullish if a mock or a custom function is used.
		    // TODO: Drop this when these are no longer allowed as the type argument.

		    if (element == null) {
		      return element;
		    } // Skip key warning if the type isn't valid since our key validation logic
		    // doesn't expect a non-string/function type and can throw confusing errors.
		    // We don't want exception behavior to differ between dev and prod.
		    // (Rendering will throw with a helpful message and as soon as the type is
		    // fixed, the key warnings will appear.)


		    if (validType) {
		      var children = props.children;

		      if (children !== undefined) {
		        if (isStaticChildren) {
		          if (isArray(children)) {
		            for (var i = 0; i < children.length; i++) {
		              validateChildKeys(children[i], type);
		            }

		            if (Object.freeze) {
		              Object.freeze(children);
		            }
		          } else {
		            error('React.jsx: Static children should always be an array. ' + 'You are likely explicitly calling React.jsxs or React.jsxDEV. ' + 'Use the Babel transform instead.');
		          }
		        } else {
		          validateChildKeys(children, type);
		        }
		      }
		    }

		    {
		      if (hasOwnProperty.call(props, 'key')) {
		        var componentName = getComponentNameFromType(type);
		        var keys = Object.keys(props).filter(function (k) {
		          return k !== 'key';
		        });
		        var beforeExample = keys.length > 0 ? '{key: someKey, ' + keys.join(': ..., ') + ': ...}' : '{key: someKey}';

		        if (!didWarnAboutKeySpread[componentName + beforeExample]) {
		          var afterExample = keys.length > 0 ? '{' + keys.join(': ..., ') + ': ...}' : '{}';

		          error('A props object containing a "key" prop is being spread into JSX:\n' + '  let props = %s;\n' + '  <%s {...props} />\n' + 'React keys must be passed directly to JSX without using spread:\n' + '  let props = %s;\n' + '  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);

		          didWarnAboutKeySpread[componentName + beforeExample] = true;
		        }
		      }
		    }

		    if (type === REACT_FRAGMENT_TYPE) {
		      validateFragmentProps(element);
		    } else {
		      validatePropTypes(element);
		    }

		    return element;
		  }
		} // These two functions exist to still get child warnings in dev
		// even with the prod transform. This means that jsxDEV is purely
		// opt-in behavior for better messages but that we won't stop
		// giving you warnings if you use production apis.

		function jsxWithValidationStatic(type, props, key) {
		  {
		    return jsxWithValidation(type, props, key, true);
		  }
		}
		function jsxWithValidationDynamic(type, props, key) {
		  {
		    return jsxWithValidation(type, props, key, false);
		  }
		}

		var jsx =  jsxWithValidationDynamic ; // we may want to special case jsxs internally to take advantage of static children.
		// for now we can ship identical prod functions

		var jsxs =  jsxWithValidationStatic ;

		reactJsxRuntime_development.Fragment = REACT_FRAGMENT_TYPE;
		reactJsxRuntime_development.jsx = jsx;
		reactJsxRuntime_development.jsxs = jsxs;
		  })();
		}
		return reactJsxRuntime_development;
	}

	if (process.env.NODE_ENV === 'production') {
	  jsxRuntime.exports = requireReactJsxRuntime_production_min();
	} else {
	  jsxRuntime.exports = requireReactJsxRuntime_development();
	}

	var jsxRuntimeExports = jsxRuntime.exports;

	function AomiChatWidget({ params, provider, listeners, className, style, }) {
	    const containerRef = require$$0.useRef(null);
	    const handlerRef = require$$0.useRef(null);
	    const listenersRef = require$$0.useRef(listeners);
	    const [error, setError] = require$$0.useState(null);
	    const destroyHandler = require$$0.useCallback(() => {
	        if (handlerRef.current) {
	            handlerRef.current.destroy();
	            handlerRef.current = null;
	        }
	    }, []);
	    require$$0.useEffect(() => {
	        const container = containerRef.current;
	        if (!container)
	            return;
	        if (!handlerRef.current) {
	            try {
	                handlerRef.current = createAomiWidget(container, {
	                    params,
	                    provider,
	                    listeners,
	                });
	                listenersRef.current = listeners;
	                setError(null);
	            }
	            catch (creationError) {
	                setError(creationError instanceof Error
	                    ? creationError
	                    : new Error('Failed to create widget'));
	            }
	            return;
	        }
	        try {
	            handlerRef.current.updateParams(params);
	        }
	        catch (updateError) {
	            setError(updateError instanceof Error
	                ? updateError
	                : new Error('Failed to update widget parameters'));
	        }
	    }, [params]);
	    require$$0.useEffect(() => {
	        return () => {
	            destroyHandler();
	        };
	    }, [destroyHandler]);
	    require$$0.useEffect(() => {
	        const handler = handlerRef.current;
	        if (!handler || listenersRef.current === listeners) {
	            return;
	        }
	        // Recreate the widget to ensure listeners attach predictably
	        const container = containerRef.current;
	        destroyHandler();
	        if (!container) {
	            return;
	        }
	        try {
	            handlerRef.current = createAomiWidget(container, {
	                params,
	                provider,
	                listeners,
	            });
	            listenersRef.current = listeners;
	        }
	        catch (creationError) {
	            setError(creationError instanceof Error
	                ? creationError
	                : new Error('Failed to refresh widget listeners'));
	        }
	    }, [listeners, params, provider, destroyHandler]);
	    require$$0.useEffect(() => {
	        if (!handlerRef.current) {
	            return;
	        }
	        handlerRef.current.updateProvider(provider);
	    }, [provider]);
	    if (error) {
	        return (jsxRuntimeExports.jsx("div", { className: className, style: { color: '#dc2626', ...style }, children: error.message }));
	    }
	    return jsxRuntimeExports.jsx("div", { ref: containerRef, className: className, style: style });
	}

	// Main entry point for the Aomi Chat Widget Library
	// Package version (this would be set during build)
	const VERSION = '0.1.0';
	// Simple convenience function for basic usage
	function createChatWidget(containerId, options) {
	    // Get container element
	    const container = typeof containerId === 'string'
	        ? document.getElementById(containerId)
	        : containerId;
	    if (!container) {
	        throw new Error(typeof containerId === 'string'
	            ? `Element with id "${containerId}" not found`
	            : 'Invalid container element');
	    }
	    // Create widget configuration
	    const config = {
	        params: {
	            appCode: options.appCode,
	            width: options.width,
	            height: options.height,
	            baseUrl: options.baseUrl,
	        },
	        provider: options.provider,
	        listeners: {
	            onReady: options.onReady,
	            onMessage: options.onMessage,
	            onError: options.onError,
	        },
	    };
	    return createAomiWidget(container, config);
	}
	// Default export for convenience
	var index = {
	    createChatWidget,
	    createAomiWidget,
	    VERSION,
	    SUPPORTED_CHAINS,
	    ERROR_CODES,
	    WIDGET_EVENTS,
	};

	exports.API_ENDPOINTS = API_ENDPOINTS;
	exports.CSS_CLASSES = CSS_CLASSES;
	exports.ChatManager = ChatManager;
	exports.DEFAULT_CHAIN_ID = DEFAULT_CHAIN_ID;
	exports.DEFAULT_MAX_HEIGHT = DEFAULT_MAX_HEIGHT;
	exports.DEFAULT_MESSAGE_LENGTH = DEFAULT_MESSAGE_LENGTH;
	exports.DEFAULT_RECONNECT_ATTEMPTS = DEFAULT_RECONNECT_ATTEMPTS;
	exports.DEFAULT_RECONNECT_DELAY = DEFAULT_RECONNECT_DELAY;
	exports.DEFAULT_WIDGET_HEIGHT = DEFAULT_WIDGET_HEIGHT;
	exports.DEFAULT_WIDGET_WIDTH = DEFAULT_WIDGET_WIDTH;
	exports.ERROR_CODES = ERROR_CODES;
	exports.ReactAomiWidget = AomiChatWidget;
	exports.SUPPORTED_CHAINS = SUPPORTED_CHAINS;
	exports.TIMING = TIMING;
	exports.VERSION = VERSION;
	exports.WIDGET_EVENTS = WIDGET_EVENTS;
	exports.WalletManager = WalletManager;
	exports.createAomiWidget = createAomiWidget;
	exports.createChatWidget = createChatWidget;
	exports.createElement = createElement;
	exports.createWalletManager = createWalletManager;
	exports.createWidgetError = createWidgetError;
	exports.default = index;
	exports.detectWallets = detectWallets;
	exports.generateSessionId = generateSessionId;
	exports.isBrowser = isBrowser;
	exports.isEthereumAddress = isEthereumAddress;
	exports.isTransactionHash = isTransactionHash;
	exports.isValidProvider = isValidProvider;
	exports.resolveWidgetParams = resolveWidgetParams;
	exports.truncateAddress = truncateAddress;
	exports.validateWidgetParams = validateWidgetParams;
	exports.withTimeout = withTimeout$1;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.js.map
