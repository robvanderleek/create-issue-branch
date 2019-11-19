module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(335);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 26:
/***/ (function(module, exports) {

"use strict";


/*
 json-stringify-safe
 Like JSON.stringify, but doesn't throw on circular references.

 Originally forked from https://github.com/isaacs/json-stringify-safe
 version 5.0.1 on 2017-09-21 and modified to handle Errors serialization.
 Tests for this are in test/vendor.

 ISC license: https://github.com/isaacs/json-stringify-safe/blob/master/LICENSE
 */

exports = module.exports = stringify;
exports.getSerialize = serializer;

function stringify(obj, replacer, spaces, cycleReplacer) {
  return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces);
}

// https://github.com/ftlabs/js-abbreviate/blob/fa709e5f139e7770a71827b1893f22418097fbda/index.js#L95-L106
function stringifyError(value) {
  var err = {
    // These properties are implemented as magical getters and don't show up in for in
    stack: value.stack,
    message: value.message,
    name: value.name
  };

  for (var i in value) {
    if (Object.prototype.hasOwnProperty.call(value, i)) {
      err[i] = value[i];
    }
  }

  return err;
}

function serializer(replacer, cycleReplacer) {
  var stack = [];
  var keys = [];

  if (cycleReplacer == null) {
    cycleReplacer = function(key, value) {
      if (stack[0] === value) {
        return '[Circular ~]';
      }
      return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
    };
  }

  return function(key, value) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this);
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);

      if (~stack.indexOf(value)) {
        value = cycleReplacer.call(this, key, value);
      }
    } else {
      stack.push(value);
    }

    return replacer == null
      ? value instanceof Error ? stringifyError(value) : value
      : replacer.call(this, key, value);
  };
}


/***/ }),

/***/ 82:
/***/ (function(module) {

module.exports = require("console");

/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 105:
/***/ (function(__unusedmodule, exports) {

exports.get = function(belowFn) {
  var oldLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = Infinity;

  var dummyObject = {};

  var v8Handler = Error.prepareStackTrace;
  Error.prepareStackTrace = function(dummyObject, v8StackTrace) {
    return v8StackTrace;
  };
  Error.captureStackTrace(dummyObject, belowFn || exports.get);

  var v8StackTrace = dummyObject.stack;
  Error.prepareStackTrace = v8Handler;
  Error.stackTraceLimit = oldLimit;

  return v8StackTrace;
};

exports.parse = function(err) {
  if (!err.stack) {
    return [];
  }

  var self = this;
  var lines = err.stack.split('\n').slice(1);

  return lines
    .map(function(line) {
      if (line.match(/^\s*[-]{4,}$/)) {
        return self._createParsedCallSite({
          fileName: line,
          lineNumber: null,
          functionName: null,
          typeName: null,
          methodName: null,
          columnNumber: null,
          'native': null,
        });
      }

      var lineMatch = line.match(/at (?:(.+)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/);
      if (!lineMatch) {
        return;
      }

      var object = null;
      var method = null;
      var functionName = null;
      var typeName = null;
      var methodName = null;
      var isNative = (lineMatch[5] === 'native');

      if (lineMatch[1]) {
        functionName = lineMatch[1];
        var methodStart = functionName.lastIndexOf('.');
        if (functionName[methodStart-1] == '.')
          methodStart--;
        if (methodStart > 0) {
          object = functionName.substr(0, methodStart);
          method = functionName.substr(methodStart + 1);
          var objectEnd = object.indexOf('.Module');
          if (objectEnd > 0) {
            functionName = functionName.substr(objectEnd + 1);
            object = object.substr(0, objectEnd);
          }
        }
        typeName = null;
      }

      if (method) {
        typeName = object;
        methodName = method;
      }

      if (method === '<anonymous>') {
        methodName = null;
        functionName = null;
      }

      var properties = {
        fileName: lineMatch[2] || null,
        lineNumber: parseInt(lineMatch[3], 10) || null,
        functionName: functionName,
        typeName: typeName,
        methodName: methodName,
        columnNumber: parseInt(lineMatch[4], 10) || null,
        'native': isNative,
      };

      return self._createParsedCallSite(properties);
    })
    .filter(function(callSite) {
      return !!callSite;
    });
};

function CallSite(properties) {
  for (var property in properties) {
    this[property] = properties[property];
  }
}

var strProperties = [
  'this',
  'typeName',
  'functionName',
  'methodName',
  'fileName',
  'lineNumber',
  'columnNumber',
  'function',
  'evalOrigin'
];
var boolProperties = [
  'topLevel',
  'eval',
  'native',
  'constructor'
];
strProperties.forEach(function (property) {
  CallSite.prototype[property] = null;
  CallSite.prototype['get' + property[0].toUpperCase() + property.substr(1)] = function () {
    return this[property];
  }
});
boolProperties.forEach(function (property) {
  CallSite.prototype[property] = false;
  CallSite.prototype['is' + property[0].toUpperCase() + property.substr(1)] = function () {
    return this[property];
  }
});

exports._createParsedCallSite = function(properties) {
  return new CallSite(properties);
};


/***/ }),

/***/ 156:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var events = __webpack_require__(614);
var util = __webpack_require__(669);
var timeoutReq = __webpack_require__(949);

var http = __webpack_require__(605);
var https = __webpack_require__(211);

var agentOptions = {keepAlive: true, maxSockets: 100};
var httpAgent = new http.Agent(agentOptions);
var httpsAgent = new https.Agent(agentOptions);

function Transport() {}
util.inherits(Transport, events.EventEmitter);

function HTTPTransport(options) {
  this.defaultPort = 80;
  this.transport = http;
  this.options = options || {};
  this.agent = httpAgent;
}
util.inherits(HTTPTransport, Transport);
HTTPTransport.prototype.send = function(client, message, headers, eventId, cb) {
  var options = {
    hostname: client.dsn.host,
    path: client.dsn.path + 'api/' + client.dsn.project_id + '/store/',
    headers: headers,
    method: 'POST',
    port: client.dsn.port || this.defaultPort,
    ca: client.ca,
    agent: this.agent
  };
  for (var key in this.options) {
    if (this.options.hasOwnProperty(key)) {
      options[key] = this.options[key];
    }
  }

  // prevent off heap memory explosion
  var _name = this.agent.getName({host: client.dsn.host, port: client.dsn.port});
  var _requests = this.agent.requests[_name];
  if (_requests && Object.keys(_requests).length > client.maxReqQueueCount) {
    // other feedback strategy
    client.emit('error', new Error('client req queue is full..'));
    return;
  }

  var req = this.transport.request(options, function(res) {
    res.setEncoding('utf8');
    if (res.statusCode >= 200 && res.statusCode < 300) {
      client.emit('logged', eventId);
      cb && cb(null, eventId);
    } else {
      var reason = res.headers['x-sentry-error'];
      var e = new Error('HTTP Error (' + res.statusCode + '): ' + reason);
      e.response = res;
      e.statusCode = res.statusCode;
      e.reason = reason;
      e.sendMessage = message;
      e.requestHeaders = headers;
      e.eventId = eventId;
      client.emit('error', e);
      cb && cb(e);
    }

    // force the socket to drain
    var noop = function() {};
    res.on('data', noop);
    res.on('end', noop);
  });

  timeoutReq(req, client.sendTimeout * 1000);

  var cbFired = false;
  req.on('error', function(e) {
    client.emit('error', e);
    if (!cbFired) {
      cb && cb(e);
      cbFired = true;
    }
  });
  req.end(message);
};

function HTTPSTransport(options) {
  this.defaultPort = 443;
  this.transport = https;
  this.options = options || {};
  this.agent = httpsAgent;
}
util.inherits(HTTPSTransport, HTTPTransport);

module.exports.http = new HTTPTransport();
module.exports.https = new HTTPSTransport();
module.exports.Transport = Transport;
module.exports.HTTPTransport = HTTPTransport;
module.exports.HTTPSTransport = HTTPSTransport;


/***/ }),

/***/ 201:
/***/ (function(module, __unusedexports, __webpack_require__) {

var v1 = __webpack_require__(250);
var v4 = __webpack_require__(792);

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;


/***/ }),

/***/ 211:
/***/ (function(module) {

module.exports = require("https");

/***/ }),

/***/ 229:
/***/ (function(module) {

module.exports = require("domain");

/***/ }),

/***/ 239:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


module.exports = __webpack_require__(846);
module.exports.utils = __webpack_require__(709);

module.exports.transports = __webpack_require__(156);
module.exports.parsers = __webpack_require__(843);

// To infinity and beyond
Error.stackTraceLimit = Infinity;


/***/ }),

/***/ 250:
/***/ (function(module, __unusedexports, __webpack_require__) {

var rng = __webpack_require__(611);
var bytesToUuid = __webpack_require__(772);

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;


/***/ }),

/***/ 282:
/***/ (function(module) {

module.exports = require("module");

/***/ }),

/***/ 335:
/***/ (function(module, __unusedexports, __webpack_require__) {

const Raven = __webpack_require__(239)

module.exports = app => {
  app.log('App was loaded')

  if (process.env.NODE_ENV) {
    app.log('Setting up Sentry.io logging...')
    Raven.config(process.env.SENTRY_DSN).install()
  } else {
    app.log('Skipping Sentry.io setup')
  }

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const owner = getRepoOwner(ctx)
    const repo = getRepoName(ctx)
    const config = await ctx.config('issue-branch.yml', {})
    const branchName = await getBranchNameFromIssue(ctx, config)
    if (await branchExists(ctx, owner, repo, branchName)) {
      app.log('Branch already exists')
    } else {
      const sha = await getSourceBranchHeadSha(ctx, config, app.log)
      await createBranch(ctx, owner, repo, branchName, sha, app.log)
    }
  })
}

function getRepoOwner (ctx) {
  return ctx.payload.repository.owner.login
}

function getRepoName (ctx) {
  return ctx.payload.repository.name
}

function getIssueNumber (ctx) {
  return ctx.payload.issue.number
}

function getIssueTitle (ctx) {
  return ctx.payload.issue.title
}

function getDefaultBranch (ctx) {
  return ctx.payload.repository.default_branch
}

function getIssueLabels (ctx) {
  return ctx.payload.issue.labels.map(l => l.name)
}

async function branchExists (ctx, owner, repo, branchName) {
  try {
    await ctx.github.gitdata.getRef({
      owner: owner, repo: repo, ref: `heads/${branchName}`
    })
    return true
  } catch (err) {
    return false
  }
}

async function getSourceBranchHeadSha (ctx, config, log) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  let result
  if (branchConfig && branchConfig.name) {
    result = await getBranchHeadSha(ctx, branchConfig.name)
    if (result) {
      log(`Source branch: ${branchConfig.name}`)
    }
  }
  if (!result) {
    const defaultBranch = getDefaultBranch(ctx)
    log(`Source branch: ${defaultBranch}`)
    result = await getBranchHeadSha(ctx, defaultBranch)
  }
  return result
}

async function getBranchHeadSha (ctx, branch) {
  try {
    const res = await ctx.github.gitdata.getRef({
      owner: getRepoOwner(ctx), repo: getRepoName(ctx), ref: `heads/${branch}`
    })
    const ref = res.data.object
    return ref.sha
  } catch (e) {
    return undefined
  }
}

async function createBranch (ctx, owner, repo, branchName, sha, log) {
  try {
    const res = await ctx.github.gitdata.createRef({
      owner: owner, repo: repo, ref: `refs/heads/${branchName}`, sha: sha
    })
    log(`Branch created: ${branchName}`)
    return res
  } catch (e) {
    log.warn(`Could not create branch (${e.message})`)
  }
}

function getIssueBranchConfig (ctx, config) {
  if (config.branches) {
    const issueLabels = getIssueLabels(ctx)
    for (const branchConfiguration of config.branches) {
      if (issueLabels.includes(branchConfiguration.label)) {
        return branchConfiguration
      }
    }
  }
  return undefined
}

function getIssueBranchPrefix (ctx, config) {
  let result = ''
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.prefix) {
    result = branchConfig.prefix
  }
  return interpolate(result, ctx.payload)
}

async function getBranchNameFromIssue (ctx, config) {
  const number = getIssueNumber(ctx)
  const title = getIssueTitle(ctx)
  let result
  if (config.branchName && config.branchName === 'tiny') {
    result = `i${number}`
  } else if (config.branchName && config.branchName === 'short') {
    result = `issue-${number}`
  } else {
    result = getFullBranchNameFromIssue(number, title)
  }
  return getIssueBranchPrefix(ctx, config) + result
}

function getFullBranchNameFromIssue (number, title) {
  let branchTitle = title.replace(/[\W]+/g, '_')
  if (branchTitle.endsWith('_')) {
    branchTitle = branchTitle.slice(0, -1)
  }
  return `issue-${number}-${branchTitle}`
}

function interpolate (s, obj) {
  return s.replace(/[$]{([^}]+)}/g, function (_, path) {
    const properties = path.split('.')
    return properties.reduce((prev, curr) => prev && prev[curr], obj)
  })
}

// For unit-tests
module.exports.getFullBranchNameFromIssue = getFullBranchNameFromIssue
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
module.exports.getIssueBranchConfig = getIssueBranchConfig
module.exports.getIssueBranchPrefix = getIssueBranchPrefix
module.exports.createBranch = createBranch
module.exports.interpolate = interpolate


/***/ }),

/***/ 417:
/***/ (function(module) {

module.exports = require("crypto");

/***/ }),

/***/ 489:
/***/ (function(module) {

var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

module.exports = charenc;


/***/ }),

/***/ 605:
/***/ (function(module) {

module.exports = require("http");

/***/ }),

/***/ 611:
/***/ (function(module, __unusedexports, __webpack_require__) {

// Unique ID creation requires a high quality random # generator.  In node.js
// this is pretty straight-forward - we use the crypto API.

var crypto = __webpack_require__(417);

module.exports = function nodeRNG() {
  return crypto.randomBytes(16);
};


/***/ }),

/***/ 614:
/***/ (function(module) {

module.exports = require("events");

/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 669:
/***/ (function(module) {

module.exports = require("util");

/***/ }),

/***/ 709:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var fs = __webpack_require__(747);
var url = __webpack_require__(835);
var transports = __webpack_require__(156);
var path = __webpack_require__(622);
var lsmod = __webpack_require__(746);
var stacktrace = __webpack_require__(105);
var stringify = __webpack_require__(26);

var ravenVersion = __webpack_require__(909).version;

var protocolMap = {
  http: 80,
  https: 443
};

var consoleAlerts = new Set();

// Default Node.js REPL depth
var MAX_SERIALIZE_EXCEPTION_DEPTH = 3;
// 50kB, as 100kB is max payload size, so half sounds reasonable
var MAX_SERIALIZE_EXCEPTION_SIZE = 50 * 1024;
var MAX_SERIALIZE_KEYS_LENGTH = 40;

function utf8Length(value) {
  return ~-encodeURI(value).split(/%..|./).length;
}

function jsonSize(value) {
  return utf8Length(JSON.stringify(value));
}

function isError(what) {
  return (
    Object.prototype.toString.call(what) === '[object Error]' || what instanceof Error
  );
}

module.exports.isError = isError;

function isPlainObject(what) {
  return Object.prototype.toString.call(what) === '[object Object]';
}

module.exports.isPlainObject = isPlainObject;

function serializeValue(value) {
  var maxLength = 40;

  if (typeof value === 'string') {
    return value.length <= maxLength ? value : value.substr(0, maxLength - 1) + '\u2026';
  } else if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return value;
  }

  var type = Object.prototype.toString.call(value);

  // Node.js REPL notation
  if (type === '[object Object]') return '[Object]';
  if (type === '[object Array]') return '[Array]';
  if (type === '[object Function]')
    return value.name ? '[Function: ' + value.name + ']' : '[Function]';

  return value;
}

function serializeObject(value, depth) {
  if (depth === 0) return serializeValue(value);

  if (isPlainObject(value)) {
    return Object.keys(value).reduce(function(acc, key) {
      acc[key] = serializeObject(value[key], depth - 1);
      return acc;
    }, {});
  } else if (Array.isArray(value)) {
    return value.map(function(val) {
      return serializeObject(val, depth - 1);
    });
  }

  return serializeValue(value);
}

function serializeException(ex, depth, maxSize) {
  if (!isPlainObject(ex)) return ex;

  depth = typeof depth !== 'number' ? MAX_SERIALIZE_EXCEPTION_DEPTH : depth;
  maxSize = typeof depth !== 'number' ? MAX_SERIALIZE_EXCEPTION_SIZE : maxSize;

  var serialized = serializeObject(ex, depth);

  if (jsonSize(stringify(serialized)) > maxSize) {
    return serializeException(ex, depth - 1);
  }

  return serialized;
}

module.exports.serializeException = serializeException;

function serializeKeysForMessage(keys, maxLength) {
  if (typeof keys === 'number' || typeof keys === 'string') return keys.toString();
  if (!Array.isArray(keys)) return '';

  keys = keys.filter(function(key) {
    return typeof key === 'string';
  });
  if (keys.length === 0) return '[object has no keys]';

  maxLength = typeof maxLength !== 'number' ? MAX_SERIALIZE_KEYS_LENGTH : maxLength;
  if (keys[0].length >= maxLength) return keys[0];

  for (var usedKeys = keys.length; usedKeys > 0; usedKeys--) {
    var serialized = keys.slice(0, usedKeys).join(', ');
    if (serialized.length > maxLength) continue;
    if (usedKeys === keys.length) return serialized;
    return serialized + '\u2026';
  }

  return '';
}

module.exports.serializeKeysForMessage = serializeKeysForMessage;

module.exports.disableConsoleAlerts = function disableConsoleAlerts() {
  consoleAlerts = false;
};

module.exports.enableConsoleAlerts = function enableConsoleAlerts() {
  consoleAlerts = new Set();
};

module.exports.consoleAlert = function consoleAlert(msg) {
  if (consoleAlerts) {
    console.warn('raven@' + ravenVersion + ' alert: ' + msg);
  }
};

module.exports.consoleAlertOnce = function consoleAlertOnce(msg) {
  if (consoleAlerts && !consoleAlerts.has(msg)) {
    consoleAlerts.add(msg);
    console.warn('raven@' + ravenVersion + ' alert: ' + msg);
  }
};

module.exports.extend =
  Object.assign ||
  function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };

module.exports.getAuthHeader = function getAuthHeader(timestamp, apiKey, apiSecret) {
  var header = ['Sentry sentry_version=5'];
  header.push('sentry_timestamp=' + timestamp);
  header.push('sentry_client=raven-node/' + ravenVersion);
  header.push('sentry_key=' + apiKey);
  if (apiSecret) header.push('sentry_secret=' + apiSecret);
  return header.join(', ');
};

module.exports.parseDSN = function parseDSN(dsn) {
  if (!dsn) {
    // Let a falsey value return false explicitly
    return false;
  }
  try {
    var parsed = url.parse(dsn),
      response = {
        protocol: parsed.protocol.slice(0, -1),
        public_key: parsed.auth.split(':')[0],
        host: parsed.host.split(':')[0]
      };

    if (parsed.auth.split(':')[1]) {
      response.private_key = parsed.auth.split(':')[1];
    }

    if (~response.protocol.indexOf('+')) {
      response.protocol = response.protocol.split('+')[1];
    }

    if (!transports.hasOwnProperty(response.protocol)) {
      throw new Error('Invalid transport');
    }

    var index = parsed.pathname.lastIndexOf('/');
    response.path = parsed.pathname.substr(0, index + 1);
    response.project_id = parsed.pathname.substr(index + 1);
    response.port = ~~parsed.port || protocolMap[response.protocol] || 443;
    return response;
  } catch (e) {
    throw new Error('Invalid Sentry DSN: ' + dsn);
  }
};

module.exports.getTransaction = function getTransaction(frame) {
  if (frame.module || frame.function) {
    return (frame.module || '?') + ' at ' + (frame.function || '?');
  }
  return '<unknown>';
};

var moduleCache;
module.exports.getModules = function getModules() {
  if (!moduleCache) {
    moduleCache = lsmod();
  }
  return moduleCache;
};

module.exports.fill = function(obj, name, replacement, track) {
  var orig = obj[name];
  obj[name] = replacement(orig);
  if (track) {
    track.push([obj, name, orig]);
  }
};

var LINES_OF_CONTEXT = 7;

function getFunction(line) {
  try {
    return (
      line.getFunctionName() ||
      line.getTypeName() + '.' + (line.getMethodName() || '<anonymous>')
    );
  } catch (e) {
    // This seems to happen sometimes when using 'use strict',
    // stemming from `getTypeName`.
    // [TypeError: Cannot read property 'constructor' of undefined]
    return '<anonymous>';
  }
}

var mainModule =
  ((require.main && require.main.filename && path.dirname(require.main.filename)) ||
    global.process.cwd()) + '/';

function getModule(filename, base) {
  if (!base) base = mainModule;

  // It's specifically a module
  var file = path.basename(filename, '.js');
  filename = path.dirname(filename);
  var n = filename.lastIndexOf('/node_modules/');
  if (n > -1) {
    // /node_modules/ is 14 chars
    return filename.substr(n + 14).replace(/\//g, '.') + ':' + file;
  }
  // Let's see if it's a part of the main module
  // To be a part of main module, it has to share the same base
  n = (filename + '/').lastIndexOf(base, 0);
  if (n === 0) {
    var module = filename.substr(base.length).replace(/\//g, '.');
    if (module) module += ':';
    module += file;
    return module;
  }
  return file;
}

function readSourceFiles(filenames, cb) {
  // we're relying on filenames being de-duped already
  if (filenames.length === 0) return setTimeout(cb, 0, {});

  var sourceFiles = {};
  var numFilesToRead = filenames.length;
  return filenames.forEach(function(filename) {
    fs.readFile(filename, function(readErr, file) {
      if (!readErr) sourceFiles[filename] = file.toString().split('\n');
      if (--numFilesToRead === 0) cb(sourceFiles);
    });
  });
}

// This is basically just `trim_line` from https://github.com/getsentry/sentry/blob/master/src/sentry/lang/javascript/processor.py#L67
function snipLine(line, colno) {
  var ll = line.length;
  if (ll <= 150) return line;
  if (colno > ll) colno = ll;

  var start = Math.max(colno - 60, 0);
  if (start < 5) start = 0;

  var end = Math.min(start + 140, ll);
  if (end > ll - 5) end = ll;
  if (end === ll) start = Math.max(end - 140, 0);

  line = line.slice(start, end);
  if (start > 0) line = '{snip} ' + line;
  if (end < ll) line += ' {snip}';

  return line;
}

function snipLine0(line) {
  return snipLine(line, 0);
}

function parseStack(err, cb) {
  if (!err) return cb([]);

  var stack = stacktrace.parse(err);
  if (!stack || !Array.isArray(stack) || !stack.length || !stack[0].getFileName) {
    // the stack is not the useful thing we were expecting :/
    return cb([]);
  }

  // Sentry expects the stack trace to be oldest -> newest, v8 provides newest -> oldest
  stack.reverse();

  var frames = [];
  var filesToRead = {};
  stack.forEach(function(line) {
    var frame = {
      filename: line.getFileName() || '',
      lineno: line.getLineNumber(),
      colno: line.getColumnNumber(),
      function: getFunction(line)
    };

    var isInternal =
      line.isNative() ||
      (frame.filename[0] !== '/' &&
        frame.filename[0] !== '.' &&
        frame.filename.indexOf(':\\') !== 1);

    // in_app is all that's not an internal Node function or a module within node_modules
    // note that isNative appears to return true even for node core libraries
    // see https://github.com/getsentry/raven-node/issues/176
    frame.in_app = !isInternal && frame.filename.indexOf('node_modules/') === -1;

    // Extract a module name based on the filename
    if (frame.filename) {
      frame.module = getModule(frame.filename);
      if (!isInternal) filesToRead[frame.filename] = true;
    }

    frames.push(frame);
  });

  return readSourceFiles(Object.keys(filesToRead), function(sourceFiles) {
    frames.forEach(function(frame) {
      if (frame.filename && sourceFiles[frame.filename]) {
        var lines = sourceFiles[frame.filename];
        try {
          frame.pre_context = lines
            .slice(Math.max(0, frame.lineno - (LINES_OF_CONTEXT + 1)), frame.lineno - 1)
            .map(snipLine0);
          frame.context_line = snipLine(lines[frame.lineno - 1], frame.colno);
          frame.post_context = lines
            .slice(frame.lineno, frame.lineno + LINES_OF_CONTEXT)
            .map(snipLine0);
        } catch (e) {
          // anomaly, being defensive in case
          // unlikely to ever happen in practice but can definitely happen in theory
        }
      }
    });

    cb(frames);
  });
}

// expose basically for testing because I don't know what I'm doing
module.exports.parseStack = parseStack;
module.exports.getModule = getModule;


/***/ }),

/***/ 730:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(709);

var defaultOnConfig = {
  console: true,
  http: true
};

var defaultConfig = {
  console: false,
  http: false,
  pg: false
};

function instrument(Raven, config) {
  if (config === false) {
    return;
  } else if (config === true) {
    config = defaultOnConfig;
  } else {
    config = utils.extend({}, defaultConfig, config);
  }

  Raven.instrumentedOriginals = [];
  Raven.instrumentedModules = [];

  var Module = __webpack_require__(282);
  utils.fill(
    Module,
    '_load',
    function(origLoad) {
      return function(moduleId, parent, isMain) {
        var origModule = origLoad.apply(this, arguments);
        if (config[moduleId] && Raven.instrumentedModules.indexOf(moduleId) === -1) {
          Raven.instrumentedModules.push(moduleId);
          return require('./' + moduleId)(Raven, origModule, Raven.instrumentedOriginals);
        }
        return origModule;
      };
    },
    Raven.instrumentedOriginals
  );

  // special case: since console is built-in and app-level code won't require() it, do that here
  if (config.console) {
    __webpack_require__(82);
  }

  // observation: when the https module does its own require('http'), it *does not* hit our hooked require to instrument http on the fly
  // but if we've previously instrumented http, https *does* get our already-instrumented version
  // this is because raven's transports are required before this instrumentation takes place, which loads https (and http)
  // so module cache will have uninstrumented http; proactively loading it here ensures instrumented version is in module cache
  // alternatively we could refactor to load our transports later, but this is easier and doesn't have much drawback
  if (config.http) {
    __webpack_require__(605);
  }
}

function deinstrument(Raven) {
  if (!Raven.instrumentedOriginals) return;
  var original;
  // eslint-disable-next-line no-cond-assign
  while ((original = Raven.instrumentedOriginals.shift())) {
    var obj = original[0];
    var name = original[1];
    var orig = original[2];
    obj[name] = orig;
  }
}

module.exports = {
  instrument: instrument,
  deinstrument: deinstrument
};


/***/ }),

/***/ 746:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


// Original repository: https://github.com/defunctzombie/node-lsmod/
//
// [2018-02-09] @kamilogorek - Handle scoped packages structure

// builtin
var fs = __webpack_require__(747);
var path = __webpack_require__(622);

// node 0.6 support
fs.existsSync = fs.existsSync || path.existsSync;

// mainPaths are the paths where our mainprog will be able to load from
// we store these to avoid grabbing the modules that were loaded as a result
// of a dependency module loading its dependencies, we only care about deps our
// mainprog loads
var mainPaths = (require.main && require.main.paths) || [];

module.exports = function() {
  var paths = Object.keys(require.cache || []);

  // module information
  var infos = {};

  // paths we have already inspected to avoid traversing again
  var seen = {};

  paths.forEach(function(p) {
    /* eslint-disable consistent-return */

    var dir = p;

    (function updir() {
      var orig = dir;
      dir = path.dirname(orig);

      if (/@[^/]+$/.test(dir)) {
        dir = path.dirname(dir);
      }

      if (!dir || orig === dir || seen[orig]) {
        return;
      } else if (mainPaths.indexOf(dir) < 0) {
        return updir();
      }

      var pkgfile = path.join(orig, 'package.json');
      var exists = fs.existsSync(pkgfile);

      seen[orig] = true;

      // travel up the tree if no package.json here
      if (!exists) {
        return updir();
      }

      try {
        var info = JSON.parse(fs.readFileSync(pkgfile, 'utf8'));
        infos[info.name] = info.version;
      } catch (e) {}
    })();

    /* eslint-enable consistent-return */
  });

  return infos;
};


/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 761:
/***/ (function(module) {

module.exports = require("zlib");

/***/ }),

/***/ 772:
/***/ (function(module) {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([bth[buf[i++]], bth[buf[i++]], 
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]]]).join('');
}

module.exports = bytesToUuid;


/***/ }),

/***/ 792:
/***/ (function(module, __unusedexports, __webpack_require__) {

var rng = __webpack_require__(611);
var bytesToUuid = __webpack_require__(772);

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),

/***/ 835:
/***/ (function(module) {

module.exports = require("url");

/***/ }),

/***/ 843:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var cookie = __webpack_require__(849);
var urlParser = __webpack_require__(835);
var stringify = __webpack_require__(26);

var utils = __webpack_require__(709);

module.exports.parseText = function parseText(message, kwargs) {
  kwargs = kwargs || {};
  kwargs.message = message;

  return kwargs;
};

module.exports.parseError = function parseError(err, kwargs, cb) {
  utils.parseStack(err, function(frames) {
    var name =
      ({}.hasOwnProperty.call(err, 'name') ? err.name : err.constructor.name) + '';
    if (typeof kwargs.message === 'undefined') {
      kwargs.message = name + ': ' + (err.message || '<no message>');
    }
    kwargs.exception = [
      {
        type: name,
        value: err.message,
        stacktrace: {
          frames: frames
        }
      }
    ];

    // Save additional error properties to `extra` under the error type (e.g. `extra.AttributeError`)
    var extraErrorProps;
    for (var key in err) {
      if (err.hasOwnProperty(key)) {
        if (key !== 'name' && key !== 'message' && key !== 'stack' && key !== 'domain') {
          extraErrorProps = extraErrorProps || {};
          extraErrorProps[key] = err[key];
        }
      }
    }
    if (extraErrorProps) {
      kwargs.extra = kwargs.extra || {};
      kwargs.extra[name] = extraErrorProps;
    }

    if (!kwargs.transaction && !kwargs.culprit) {
      for (var n = frames.length - 1; n >= 0; n--) {
        if (frames[n].in_app) {
          kwargs.transaction = utils.getTransaction(frames[n]);
          break;
        }
      }
    }

    cb(kwargs);
  });
};

module.exports.parseRequest = function parseRequest(req, parseUser) {
  var kwargs = {};

  // headers:
  //   node, express: req.headers
  //   koa: req.header
  var headers = req.headers || req.header || {};

  // method:
  //   node, express, koa: req.method
  var method = req.method;

  // host:
  //   express: req.hostname in > 4 and req.host in < 4
  //   koa: req.host
  //   node: req.headers.host
  var host = req.hostname || req.host || headers.host || '<no host>';

  // protocol:
  //   node: <n/a>
  //   express, koa: req.protocol
  var protocol =
    req.protocol === 'https' || req.secure || (req.socket || {}).encrypted
      ? 'https'
      : 'http';

  // url (including path and query string):
  //   node, express: req.originalUrl
  //   koa: req.url
  var originalUrl = req.originalUrl || req.url;

  // absolute url
  var absoluteUrl = protocol + '://' + host + originalUrl;

  // query string:
  //   node: req.url (raw)
  //   express, koa: req.query
  var query = req.query || urlParser.parse(originalUrl || '', true).query;

  // cookies:
  //   node, express, koa: req.headers.cookie
  var cookies = cookie.parse(headers.cookie || '');

  // body data:
  //   node, express, koa: req.body
  var data = req.body;
  if (['GET', 'HEAD'].indexOf(method) === -1) {
    if (typeof data === 'undefined') {
      data = '<unavailable>';
    }
  }

  if (data && typeof data !== 'string' && {}.toString.call(data) !== '[object String]') {
    // Make sure the request body is a string
    data = stringify(data);
  }

  // http interface
  var http = {
    method: method,
    query_string: query,
    headers: headers,
    cookies: cookies,
    data: data,
    url: absoluteUrl
  };

  // expose http interface
  kwargs.request = http;

  // user: typically found on req.user in express/passport patterns
  // five cases for parseUser value:
  //   absent: grab only id, username, email from req.user
  //   false: capture nothing
  //   true: capture all keys from req.user
  //   array: provided whitelisted keys to grab from req.user
  //   function :: req -> user: custom parsing function
  if (parseUser == null) parseUser = ['id', 'username', 'email'];
  if (parseUser) {
    var user = {};
    if (typeof parseUser === 'function') {
      user = parseUser(req);
    } else if (req.user) {
      if (parseUser === true) {
        for (var key in req.user) {
          if ({}.hasOwnProperty.call(req.user, key)) {
            user[key] = req.user[key];
          }
        }
      } else {
        parseUser.forEach(function(fieldName) {
          if ({}.hasOwnProperty.call(req.user, fieldName)) {
            user[fieldName] = req.user[fieldName];
          }
        });
      }
    }

    // client ip:
    //   node: req.connection.remoteAddress
    //   express, koa: req.ip
    var ip = req.ip || (req.connection && req.connection.remoteAddress);
    if (ip) {
      user.ip_address = ip;
    }

    kwargs.user = user;
  }

  return kwargs;
};


/***/ }),

/***/ 844:
/***/ (function(module) {

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}


/***/ }),

/***/ 846:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var stringify = __webpack_require__(26);
var parsers = __webpack_require__(843);
var zlib = __webpack_require__(761);
var utils = __webpack_require__(709);
var uuid = __webpack_require__(201);
var transports = __webpack_require__(156);
var nodeUtil = __webpack_require__(669); // nodeUtil to avoid confusion with "utils"
var events = __webpack_require__(614);
var domain = __webpack_require__(229);
var md5 = __webpack_require__(937);

var instrumentor = __webpack_require__(730);

var extend = utils.extend;

function Raven() {
  this.breadcrumbs = {
    record: this.captureBreadcrumb.bind(this)
  };
}

nodeUtil.inherits(Raven, events.EventEmitter);

extend(Raven.prototype, {
  config: function config(dsn, options) {
    // We get lots of users using raven-node when they want raven-js, hence this warning if it seems like a browser
    if (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof navigator !== 'undefined'
    ) {
      utils.consoleAlertOnce(
        "This looks like a browser environment; are you sure you don't want Raven.js for browser JavaScript? https://sentry.io/for/javascript"
      );
    }

    if (arguments.length === 0) {
      // no arguments, use default from environment
      dsn = global.process.env.SENTRY_DSN;
      options = {};
    }
    if (typeof dsn === 'object') {
      // They must only be passing through options
      options = dsn;
      dsn = global.process.env.SENTRY_DSN;
    }
    options = options || {};

    this.raw_dsn = dsn;
    this.dsn = utils.parseDSN(dsn);
    this.name =
      options.name || global.process.env.SENTRY_NAME || __webpack_require__(87).hostname();
    this.root = options.root || global.process.cwd();
    this.transport = options.transport || transports[this.dsn.protocol];
    this.sendTimeout = options.sendTimeout || 1;
    this.release = options.release || global.process.env.SENTRY_RELEASE;
    this.environment =
      options.environment ||
      global.process.env.SENTRY_ENVIRONMENT ||
      global.process.env.NODE_ENV;

    // autoBreadcrumbs: true enables all, autoBreadcrumbs: false disables all
    // autoBreadcrumbs: { http: true } enables a single type
    this.autoBreadcrumbs = options.autoBreadcrumbs || false;
    // default to 30, don't allow higher than 100
    this.maxBreadcrumbs = Math.max(0, Math.min(options.maxBreadcrumbs || 30, 100));

    this.captureUnhandledRejections = options.captureUnhandledRejections;
    this.loggerName = options.logger;
    this.dataCallback = options.dataCallback;
    this.shouldSendCallback = options.shouldSendCallback;
    this.sampleRate = typeof options.sampleRate === 'undefined' ? 1 : options.sampleRate;
    this.maxReqQueueCount = options.maxReqQueueCount || 100;
    this.parseUser = options.parseUser;
    this.stacktrace = options.stacktrace || false;

    if (!this.dsn) {
      utils.consoleAlert('no DSN provided, error reporting disabled');
    }

    if (this.dsn.protocol === 'https') {
      // In case we want to provide our own SSL certificates / keys
      this.ca = options.ca || null;
    }

    // enabled if a dsn is set
    this._enabled = !!this.dsn;

    var globalContext = (this._globalContext = {});
    if (options.tags) {
      globalContext.tags = options.tags;
    }
    if (options.extra) {
      globalContext.extra = options.extra;
    }

    this.onFatalError = this.defaultOnFatalError = function(err, sendErr, eventId) {
      console.error(err && err.stack ? err.stack : err);
      global.process.exit(1);
    };
    this.uncaughtErrorHandler = this.makeErrorHandler();

    this.on('error', function(err) {
      utils.consoleAlert('failed to send exception to sentry: ' + err.message);
    });

    return this;
  },

  install: function install(cb) {
    if (this.installed) return this;

    if (typeof cb === 'function') {
      this.onFatalError = cb;
    }

    global.process.on('uncaughtException', this.uncaughtErrorHandler);

    if (this.captureUnhandledRejections) {
      var self = this;
      global.process.on('unhandledRejection', function(reason, promise) {
        var context = (promise.domain && promise.domain.sentryContext) || {};
        context.extra = context.extra || {};
        context.extra.unhandledPromiseRejection = true;
        self.captureException(reason, context, function(sendErr, eventId) {
          if (!sendErr) {
            var reasonMessage = (reason && reason.message) || reason;
            utils.consoleAlert(
              'unhandledRejection captured\n' +
                'Event ID: ' +
                eventId +
                '\n' +
                'Reason: ' +
                reasonMessage
            );
          }
        });
      });
    }

    instrumentor.instrument(this, this.autoBreadcrumbs);

    this.installed = true;

    return this;
  },

  uninstall: function uninstall() {
    if (!this.installed) return this;

    instrumentor.deinstrument(this);

    // todo: this works for tests for now, but isn't what we ultimately want to be doing
    global.process.removeAllListeners('uncaughtException');
    global.process.removeAllListeners('unhandledRejection');

    this.installed = false;

    return this;
  },

  makeErrorHandler: function() {
    var self = this;
    var caughtFirstError = false;
    var caughtSecondError = false;
    var calledFatalError = false;
    var firstError;
    return function(err) {
      if (!caughtFirstError) {
        // this is the first uncaught error and the ultimate reason for shutting down
        // we want to do absolutely everything possible to ensure it gets captured
        // also we want to make sure we don't go recursion crazy if more errors happen after this one
        firstError = err;
        caughtFirstError = true;
        self.captureException(err, {level: 'fatal'}, function(sendErr, eventId) {
          if (!calledFatalError) {
            calledFatalError = true;
            self.onFatalError(err, sendErr, eventId);
          }
        });
      } else if (calledFatalError) {
        // we hit an error *after* calling onFatalError - pretty boned at this point, just shut it down
        utils.consoleAlert(
          'uncaught exception after calling fatal error shutdown callback - this is bad! forcing shutdown'
        );
        self.defaultOnFatalError(err);
      } else if (!caughtSecondError) {
        // two cases for how we can hit this branch:
        //   - capturing of first error blew up and we just caught the exception from that
        //     - quit trying to capture, proceed with shutdown
        //   - a second independent error happened while waiting for first error to capture
        //     - want to avoid causing premature shutdown before first error capture finishes
        // it's hard to immediately tell case 1 from case 2 without doing some fancy/questionable domain stuff
        // so let's instead just delay a bit before we proceed with our action here
        // in case 1, we just wait a bit unnecessarily but ultimately do the same thing
        // in case 2, the delay hopefully made us wait long enough for the capture to finish
        // two potential nonideal outcomes:
        //   nonideal case 1: capturing fails fast, we sit around for a few seconds unnecessarily before proceeding correctly by calling onFatalError
        //   nonideal case 2: case 2 happens, 1st error is captured but slowly, timeout completes before capture and we treat second error as the sendErr of (nonexistent) failure from trying to capture first error
        // note that after hitting this branch, we might catch more errors where (caughtSecondError && !calledFatalError)
        //   we ignore them - they don't matter to us, we're just waiting for the second error timeout to finish
        caughtSecondError = true;
        setTimeout(function() {
          if (!calledFatalError) {
            // it was probably case 1, let's treat err as the sendErr and call onFatalError
            calledFatalError = true;
            self.onFatalError(firstError, err);
          } else {
            // it was probably case 2, our first error finished capturing while we waited, cool, do nothing
          }
        }, (self.sendTimeout + 1) * 1000); // capturing could take at least sendTimeout to fail, plus an arbitrary second for how long it takes to collect surrounding source etc
      }
    };
  },

  generateEventId: function generateEventId() {
    return uuid().replace(/-/g, '');
  },

  process: function process(eventId, kwargs, cb) {
    // prod codepaths shouldn't hit this branch, for testing
    if (typeof eventId === 'object') {
      cb = kwargs;
      kwargs = eventId;
      eventId = this.generateEventId();
    }

    var domainContext = (domain.active && domain.active.sentryContext) || {};
    var globalContext = this._globalContext || {};
    kwargs.user = extend({}, globalContext.user, domainContext.user, kwargs.user);
    kwargs.tags = extend({}, globalContext.tags, domainContext.tags, kwargs.tags);
    kwargs.extra = extend({}, globalContext.extra, domainContext.extra, kwargs.extra);
    // Perform a shallow copy of breadcrums to not send one that we'll capture below through as well
    kwargs.breadcrumbs = {
      values:
        (domainContext.breadcrumbs && domainContext.breadcrumbs.slice()) ||
        (globalContext.breadcrumbs && globalContext.breadcrumbs.slice()) ||
        []
    };

    /*
      `request` is our specified property name for the http interface: https://docs.sentry.io/clientdev/interfaces/http/
      `req` is the conventional name for a request object in node/express/etc
      we want to enable someone to pass a `request` property to kwargs according to http interface
      but also want to provide convenience for passing a req object and having us parse it out
      so we only parse a `req` property if the `request` property is absent/empty (and hence we won't clobber)
      parseUser returns a partial kwargs object with a `request` property and possibly a `user` property
      */
    var request = this._createRequestObject(
      globalContext.request,
      domainContext.request,
      kwargs.request
    );
    delete kwargs.request;

    if (Object.keys(request).length === 0) {
      request = this._createRequestObject(
        globalContext.req,
        domainContext.req,
        kwargs.req
      );
      delete kwargs.req;
    }

    if (Object.keys(request).length > 0) {
      var parseUser = Object.keys(kwargs.user).length === 0 ? this.parseUser : false;
      extend(kwargs, parsers.parseRequest(request, parseUser));
    } else {
      kwargs.request = {};
    }

    kwargs.modules = utils.getModules();
    kwargs.server_name = kwargs.server_name || this.name;

    if (typeof global.process.version !== 'undefined') {
      kwargs.extra.node = global.process.version;
    }

    kwargs.environment = kwargs.environment || this.environment;
    kwargs.logger = kwargs.logger || this.loggerName;
    kwargs.event_id = eventId;
    kwargs.timestamp = new Date().toISOString().split('.')[0];
    kwargs.project = this.dsn && this.dsn.project_id;
    kwargs.platform = 'node';
    kwargs.release = this.release;

    // Cleanup empty properties before sending them to the server
    Object.keys(kwargs).forEach(function(key) {
      if (kwargs[key] == null || kwargs[key] === '') {
        delete kwargs[key];
      }
    });

    if (this.dataCallback) {
      kwargs = this.dataCallback(kwargs);
    }

    // Capture breadcrumb before sending it, as we also want to have it even when
    // it was dropped due to sampleRate or shouldSendCallback
    this.captureBreadcrumb({
      category: 'sentry',
      message: kwargs.message,
      event_id: kwargs.event_id,
      level: kwargs.level || 'error' // presume error unless specified
    });

    var shouldSend = true;
    if (!this._enabled) shouldSend = false;
    if (this.shouldSendCallback && !this.shouldSendCallback(kwargs)) shouldSend = false;
    if (Math.random() >= this.sampleRate) shouldSend = false;

    if (shouldSend) {
      this.send(kwargs, cb);
    } else {
      // wish there was a good way to communicate to cb why we didn't send; worth considering cb api change?
      // could be shouldSendCallback, could be disabled, could be sample rate
      // avoiding setImmediate here because node 0.8
      cb &&
        setTimeout(function() {
          cb(null, eventId);
        }, 0);
    }
  },

  send: function send(kwargs, cb) {
    var self = this;
    var skwargs = stringify(kwargs);
    var eventId = kwargs.event_id;

    zlib.deflate(skwargs, function(err, buff) {
      var message = buff.toString('base64'),
        timestamp = new Date().getTime(),
        headers = {
          'X-Sentry-Auth': utils.getAuthHeader(
            timestamp,
            self.dsn.public_key,
            self.dsn.private_key
          ),
          'Content-Type': 'application/octet-stream',
          'Content-Length': message.length
        };

      self.transport.send(self, message, headers, eventId, cb);
    });
  },

  captureMessage: function captureMessage(message, kwargs, cb) {
    if (!cb && typeof kwargs === 'function') {
      cb = kwargs;
      kwargs = {};
    } else {
      kwargs = utils.isPlainObject(kwargs) ? extend({}, kwargs) : {};
    }

    var eventId = this.generateEventId();

    if (this.stacktrace) {
      var ex = new Error(message);

      console.log(ex);

      utils.parseStack(
        ex,
        function(frames) {
          // We trim last frame, as it's our `new Error(message)` statement itself, which is redundant
          kwargs.stacktrace = {
            frames: frames.slice(0, -1)
          };
          this.process(eventId, parsers.parseText(message, kwargs), cb);
        }.bind(this)
      );
    } else {
      this.process(eventId, parsers.parseText(message, kwargs), cb);
    }

    return eventId;
  },

  captureException: function captureException(err, kwargs, cb) {
    if (!cb && typeof kwargs === 'function') {
      cb = kwargs;
      kwargs = {};
    } else {
      kwargs = utils.isPlainObject(kwargs) ? extend({}, kwargs) : {};
    }

    if (!utils.isError(err)) {
      if (utils.isPlainObject(err)) {
        // This will allow us to group events based on top-level keys
        // which is much better than creating new group when any key/value change
        var keys = Object.keys(err).sort();
        var message =
          'Non-Error exception captured with keys: ' +
          utils.serializeKeysForMessage(keys);
        kwargs = extend(kwargs, {
          message: message,
          fingerprint: [md5(keys)],
          extra: kwargs.extra || {}
        });
        kwargs.extra.__serialized__ = utils.serializeException(err);

        err = new Error(message);
      } else {
        // This handles when someone does:
        //   throw "something awesome";
        // We synthesize an Error here so we can extract a (rough) stack trace.
        err = new Error(err);
      }
    }

    var self = this;
    var eventId = this.generateEventId();
    parsers.parseError(err, kwargs, function(kw) {
      self.process(eventId, kw, cb);
    });

    return eventId;
  },

  context: function(ctx, func) {
    if (!func && typeof ctx === 'function') {
      func = ctx;
      ctx = {};
    }

    // todo/note: raven-js takes an args param to do apply(this, args)
    // i don't think it's correct/necessary to bind this to the wrap call
    // and i don't know if we need to support the args param; it's undocumented
    return this.wrap(ctx, func).apply(null);
  },

  wrap: function(options, func) {
    if (!this.installed) {
      utils.consoleAlertOnce(
        'Raven has not been installed, therefore no breadcrumbs will be captured. Call `Raven.config(...).install()` to fix this.'
      );
    }
    if (!func && typeof options === 'function') {
      func = options;
      options = {};
    }

    var wrapDomain = domain.create();
    // todo: better property name than sentryContext, maybe __raven__ or sth?
    wrapDomain.sentryContext = options;

    wrapDomain.on('error', this.uncaughtErrorHandler);
    var wrapped = wrapDomain.bind(func);

    for (var property in func) {
      if ({}.hasOwnProperty.call(func, property)) {
        wrapped[property] = func[property];
      }
    }
    wrapped.prototype = func.prototype;
    wrapped.__raven__ = true;
    wrapped.__inner__ = func;
    // note: domain.bind sets wrapped.domain, but it's not documented, unsure if we should rely on that
    wrapped.__domain__ = wrapDomain;

    return wrapped;
  },

  interceptErr: function(options, func) {
    if (!func && typeof options === 'function') {
      func = options;
      options = {};
    }
    var self = this;
    var wrapped = function() {
      var err = arguments[0];
      if (utils.isError(err)) {
        self.captureException(err, options);
      } else {
        func.apply(null, arguments);
      }
    };

    // repetitive with wrap
    for (var property in func) {
      if ({}.hasOwnProperty.call(func, property)) {
        wrapped[property] = func[property];
      }
    }
    wrapped.prototype = func.prototype;
    wrapped.__raven__ = true;
    wrapped.__inner__ = func;

    return wrapped;
  },

  setContext: function setContext(ctx) {
    if (domain.active) {
      domain.active.sentryContext = ctx;
    } else {
      this._globalContext = ctx;
    }
    return this;
  },

  mergeContext: function mergeContext(ctx) {
    extend(this.getContext(), ctx);
    return this;
  },

  getContext: function getContext() {
    if (domain.active) {
      if (!domain.active.sentryContext) {
        domain.active.sentryContext = {};
        utils.consoleAlert('sentry context not found on active domain');
      }
      return domain.active.sentryContext;
    }
    return this._globalContext;
  },

  setCallbackHelper: function(propertyName, callback) {
    var original = this[propertyName];
    if (typeof callback === 'function') {
      this[propertyName] = function(data) {
        return callback(data, original);
      };
    } else {
      this[propertyName] = callback;
    }

    return this;
  },

  /*
   * Set the dataCallback option
   *
   * @param {function} callback The callback to run which allows the
   *                            data blob to be mutated before sending
   * @return {Raven}
   */
  setDataCallback: function(callback) {
    return this.setCallbackHelper('dataCallback', callback);
  },

  /*
   * Set the shouldSendCallback option
   *
   * @param {function} callback The callback to run which allows
   *                            introspecting the blob before sending
   * @return {Raven}
   */
  setShouldSendCallback: function(callback) {
    return this.setCallbackHelper('shouldSendCallback', callback);
  },

  requestHandler: function() {
    var self = this;
    return function ravenRequestMiddleware(req, res, next) {
      self.context({req: req}, function() {
        domain.active.add(req);
        domain.active.add(res);
        next();
      });
    };
  },

  errorHandler: function() {
    var self = this;
    return function ravenErrorMiddleware(err, req, res, next) {
      var status =
        err.status ||
        err.statusCode ||
        err.status_code ||
        (err.output && err.output.statusCode) ||
        500;

      // skip anything not marked as an internal server error
      if (status < 500) return next(err);

      var eventId = self.captureException(err, {req: req});
      res.sentry = eventId;
      return next(err);
    };
  },

  captureBreadcrumb: function(breadcrumb) {
    // Avoid capturing global-scoped breadcrumbs before instrumentation finishes
    if (!this.installed) return;

    breadcrumb = extend(
      {
        timestamp: +new Date() / 1000
      },
      breadcrumb
    );
    var currCtx = this.getContext();
    if (!currCtx.breadcrumbs) currCtx.breadcrumbs = [];
    currCtx.breadcrumbs.push(breadcrumb);
    if (currCtx.breadcrumbs.length > this.maxBreadcrumbs) {
      currCtx.breadcrumbs.shift();
    }
    this.setContext(currCtx);
  },

  _createRequestObject: function() {
    /**
     * When using proxy, some of the attributes of req/request objects are non-enumerable.
     * To make sure, that they are still available to us after we consolidate our sources
     * (eg. globalContext.request + domainContext.request + kwargs.request),
     * we manually pull them out from original objects.
     *
     * Same scenario happens when some frameworks (eg. Koa) decide to use request within
     * request. eg `this.request.req`, which adds aliases to the main `request` object.
     * By manually reassigning them here, we don't need to add additional checks
     * like `req.method || (req.req && req.req.method)`
     *
     * We don't use Object.assign/extend as it's only merging over objects own properties,
     * and we don't want to go through all of the properties as well, as we simply don't
     * need all of them.
     **/
    var sources = Array.from(arguments).filter(function(source) {
      return Object.prototype.toString.call(source) === '[object Object]';
    });
    sources = [{}].concat(sources);
    var request = extend.apply(null, sources);
    var nonEnumerables = [
      'headers',
      'hostname',
      'ip',
      'method',
      'protocol',
      'query',
      'secure',
      'url'
    ];

    nonEnumerables.forEach(function(key) {
      sources.forEach(function(source) {
        if (source[key]) request[key] = source[key];
      });
    });

    /**
     * Check for 'host' *only* after we checked for 'hostname' first.
     * This way we can avoid the noise coming from Express deprecation warning
     * https://github.com/expressjs/express/blob/b97faff6e2aa4d34d79485fe4331cb0eec13ad57/lib/request.js#L450-L452
     * REF: https://github.com/getsentry/raven-node/issues/96#issuecomment-354748884
     **/
    if (!request.hasOwnProperty('hostname')) {
      sources.forEach(function(source) {
        if (source.host) request.host = source.host;
      });
    }

    return request;
  }
});

// Maintain old API compat, need to make sure arguments length is preserved
function Client(dsn, options) {
  if (dsn instanceof Client) return dsn;
  var ravenInstance = new Raven();
  return ravenInstance.config.apply(ravenInstance, arguments);
}
nodeUtil.inherits(Client, Raven);

// Singleton-by-default but not strictly enforced
// todo these extra export props are sort of an adhoc mess, better way to manage?
var defaultInstance = new Raven();
defaultInstance.Client = Client;
defaultInstance.version = __webpack_require__(909).version;
defaultInstance.disableConsoleAlerts = utils.disableConsoleAlerts;

module.exports = defaultInstance;


/***/ }),

/***/ 849:
/***/ (function(__unusedmodule, exports) {

"use strict";
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */



/**
 * Module exports.
 * @public
 */

exports.parse = parse;
exports.serialize = serialize;

/**
 * Module variables.
 * @private
 */

var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  var obj = {}
  var opt = options || {};
  var pairs = str.split(pairSplitRegExp);
  var dec = opt.decode || decode;

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var eq_idx = pair.indexOf('=');

    // skip things that don't look like key=value
    if (eq_idx < 0) {
      continue;
    }

    var key = pair.substr(0, eq_idx).trim()
    var val = pair.substr(++eq_idx, pair.length).trim();

    // quoted values
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once
    if (undefined == obj[key]) {
      obj[key] = tryDecode(val, dec);
    }
  }

  return obj;
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

function serialize(name, val, options) {
  var opt = options || {};
  var enc = opt.encode || encode;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  var value = enc(val);

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  var str = name + '=' + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;
    if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== 'function') {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + opt.expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === 'string'
      ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}


/***/ }),

/***/ 901:
/***/ (function(module) {

(function() {
  var base64map
      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  crypt = {
    // Bit-wise rotation left
    rotl: function(n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotation right
    rotr: function(n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = crypt.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function(n) {
      for (var bytes = []; n > 0; n--)
        bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
        words[b >>> 5] |= bytes[i] << (24 - b % 32);
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        for (var j = 0; j < 4; j++)
          if (i * 8 + j * 6 <= bytes.length * 8)
            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
          else
            base64.push('=');
      }
      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
          imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
      }
      return bytes;
    }
  };

  module.exports = crypt;
})();


/***/ }),

/***/ 909:
/***/ (function(module) {

module.exports = {"name":"raven","description":"A standalone (Node.js) client for Sentry","keywords":["debugging","errors","exceptions","logging","raven","sentry"],"version":"2.6.4","repository":"git://github.com/getsentry/raven-js.git","license":"BSD-2-Clause","homepage":"https://github.com/getsentry/raven-js","author":"Matt Robenolt <matt@ydekproductions.com>","main":"index.js","bin":{"raven":"./bin/raven"},"scripts":{"lint":"eslint .","test":"NODE_ENV=test istanbul cover _mocha  -- --reporter dot && NODE_ENV=test coffee ./test/run.coffee","test-mocha":"NODE_ENV=test mocha","test-full":"npm run test && cd test/instrumentation && ./run.sh"},"engines":{"node":">= 4.0.0"},"dependencies":{"cookie":"0.3.1","md5":"^2.2.1","stack-trace":"0.0.10","timed-out":"4.0.1","uuid":"3.3.2"},"devDependencies":{"coffee-script":"~1.10.0","connect":"*","eslint":"^4.5.0","eslint-config-prettier":"^2.3.0","express":"*","glob":"~3.1.13","istanbul":"^0.4.3","mocha":"~3.1.2","nock":"~9.0.0","prettier":"^1.6.1","should":"11.2.0","sinon":"^3.3.0"},"prettier":{"singleQuote":true,"bracketSpacing":false,"printWidth":90}};

/***/ }),

/***/ 937:
/***/ (function(module, __unusedexports, __webpack_require__) {

(function(){
  var crypt = __webpack_require__(901),
      utf8 = __webpack_require__(489).utf8,
      isBuffer = __webpack_require__(844),
      bin = __webpack_require__(489).bin,

  // The core
  md5 = function (message, options) {
    // Convert to byte array
    if (message.constructor == String)
      if (options && options.encoding === 'binary')
        message = bin.stringToBytes(message);
      else
        message = utf8.stringToBytes(message);
    else if (isBuffer(message))
      message = Array.prototype.slice.call(message, 0);
    else if (!Array.isArray(message))
      message = message.toString();
    // else, assume byte array already

    var m = crypt.bytesToWords(message),
        l = message.length * 8,
        a =  1732584193,
        b = -271733879,
        c = -1732584194,
        d =  271733878;

    // Swap endian
    for (var i = 0; i < m.length; i++) {
      m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
             ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
    }

    // Padding
    m[l >>> 5] |= 0x80 << (l % 32);
    m[(((l + 64) >>> 9) << 4) + 14] = l;

    // Method shortcuts
    var FF = md5._ff,
        GG = md5._gg,
        HH = md5._hh,
        II = md5._ii;

    for (var i = 0; i < m.length; i += 16) {

      var aa = a,
          bb = b,
          cc = c,
          dd = d;

      a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
      d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
      c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
      b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
      a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
      d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
      c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
      b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
      a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
      d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
      c = FF(c, d, a, b, m[i+10], 17, -42063);
      b = FF(b, c, d, a, m[i+11], 22, -1990404162);
      a = FF(a, b, c, d, m[i+12],  7,  1804603682);
      d = FF(d, a, b, c, m[i+13], 12, -40341101);
      c = FF(c, d, a, b, m[i+14], 17, -1502002290);
      b = FF(b, c, d, a, m[i+15], 22,  1236535329);

      a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
      d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
      c = GG(c, d, a, b, m[i+11], 14,  643717713);
      b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
      a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
      d = GG(d, a, b, c, m[i+10],  9,  38016083);
      c = GG(c, d, a, b, m[i+15], 14, -660478335);
      b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
      a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
      d = GG(d, a, b, c, m[i+14],  9, -1019803690);
      c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
      b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
      a = GG(a, b, c, d, m[i+13],  5, -1444681467);
      d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
      c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
      b = GG(b, c, d, a, m[i+12], 20, -1926607734);

      a = HH(a, b, c, d, m[i+ 5],  4, -378558);
      d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
      c = HH(c, d, a, b, m[i+11], 16,  1839030562);
      b = HH(b, c, d, a, m[i+14], 23, -35309556);
      a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
      d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
      c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
      b = HH(b, c, d, a, m[i+10], 23, -1094730640);
      a = HH(a, b, c, d, m[i+13],  4,  681279174);
      d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
      c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
      b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
      a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
      d = HH(d, a, b, c, m[i+12], 11, -421815835);
      c = HH(c, d, a, b, m[i+15], 16,  530742520);
      b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

      a = II(a, b, c, d, m[i+ 0],  6, -198630844);
      d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
      c = II(c, d, a, b, m[i+14], 15, -1416354905);
      b = II(b, c, d, a, m[i+ 5], 21, -57434055);
      a = II(a, b, c, d, m[i+12],  6,  1700485571);
      d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
      c = II(c, d, a, b, m[i+10], 15, -1051523);
      b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
      a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
      d = II(d, a, b, c, m[i+15], 10, -30611744);
      c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
      b = II(b, c, d, a, m[i+13], 21,  1309151649);
      a = II(a, b, c, d, m[i+ 4],  6, -145523070);
      d = II(d, a, b, c, m[i+11], 10, -1120210379);
      c = II(c, d, a, b, m[i+ 2], 15,  718787259);
      b = II(b, c, d, a, m[i+ 9], 21, -343485551);

      a = (a + aa) >>> 0;
      b = (b + bb) >>> 0;
      c = (c + cc) >>> 0;
      d = (d + dd) >>> 0;
    }

    return crypt.endian([a, b, c, d]);
  };

  // Auxiliary functions
  md5._ff  = function (a, b, c, d, x, s, t) {
    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._gg  = function (a, b, c, d, x, s, t) {
    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._hh  = function (a, b, c, d, x, s, t) {
    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._ii  = function (a, b, c, d, x, s, t) {
    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };

  // Package private blocksize
  md5._blocksize = 16;
  md5._digestsize = 16;

  module.exports = function (message, options) {
    if (message === undefined || message === null)
      throw new Error('Illegal argument ' + message);

    var digestbytes = crypt.wordsToBytes(md5(message, options));
    return options && options.asBytes ? digestbytes :
        options && options.asString ? bin.bytesToString(digestbytes) :
        crypt.bytesToHex(digestbytes);
  };

})();


/***/ }),

/***/ 949:
/***/ (function(module) {

"use strict";


module.exports = function (req, time) {
	if (req.timeoutTimer) {
		return req;
	}

	var delays = isNaN(time) ? time : {socket: time, connect: time};
	var host = req._headers ? (' to ' + req._headers.host) : '';

	if (delays.connect !== undefined) {
		req.timeoutTimer = setTimeout(function timeoutHandler() {
			req.abort();
			var e = new Error('Connection timed out on request' + host);
			e.code = 'ETIMEDOUT';
			req.emit('error', e);
		}, delays.connect);
	}

	// Clear the connection timeout timer once a socket is assigned to the
	// request and is connected.
	req.on('socket', function assign(socket) {
		// Socket may come from Agent pool and may be already connected.
		if (!(socket.connecting || socket._connecting)) {
			connect();
			return;
		}

		socket.once('connect', connect);
	});

	function clear() {
		if (req.timeoutTimer) {
			clearTimeout(req.timeoutTimer);
			req.timeoutTimer = null;
		}
	}

	function connect() {
		clear();

		if (delays.socket !== undefined) {
			// Abort the request if there is no activity on the socket for more
			// than `delays.socket` milliseconds.
			req.setTimeout(delays.socket, function socketTimeoutHandler() {
				req.abort();
				var e = new Error('Socket timed out on request' + host);
				e.code = 'ESOCKETTIMEDOUT';
				req.emit('error', e);
			});
		}
	}

	return req.on('error', clear);
};


/***/ })

/******/ });