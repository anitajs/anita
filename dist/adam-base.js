/*
---
name: adam
...
*/

(function(global, undefined){

	'use strict';

	var root,

		// Configure whether for debug mode
		debug = false,

		// Configure whether for silent mode
		silent = true,
		
		// A global GUID counter for objects
		uid = 1,
			
		// Enumerables flag
		enumerables = true,

		// [[Class]] -> type pairs
		class2type = {},

		// Save a reference to {}.toString method
		toString = class2type.toString,

		// Pre-detect whether has module and module.export
		hasExports = typeof module !== 'undefined' && module.exports,

		// Pre-detect are run in a plain global object
		hasGlobalObject = this === global,

		// Local Adam object
		local;

	// Extended Function object, including overloading, implement, extend and other methods
	for (var i in {toString: 1}) enumerables = null;
	if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

	Function.prototype.overloadSetter = function(usePlural){
		var self = this;
		return function(a, b){
			if (a == null) return this;
			if (usePlural || typeof a !== 'string'){
				for (var k in a) self.call(this, k, a[k]);
				if (enumerables) for (var i = enumerables.length; i--;){
					k = enumerables[i];
					if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
				}
			} else {
				self.call(this, a, b);
			}
			return this;
		};
	};

	Function.prototype.implement = function(key, value){
		this.prototype[key] = value;
	}.overloadSetter();

	Function.implement({

		extend: function(key, value){
			this[key] = value;
		}.overloadSetter(),

		overloadGetter: function(usePlural){
			var self = this;
			return function(a){
				var args, result;
				if (typeof a !== 'string') args = a;
				else if (arguments.length > 1) args = arguments;
				else if (usePlural) args = [a];
				if (args){
					result = {};
					for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
				} else {
					result = self.call(this, a);
				}
				return result;
			};
		},

		traversalSetter: function(usePlural){
			var self = this;
			return function(a, b, c){
				if (a == null || b == null) return a || this;
				if (!a.length && !a.nodeType) a = [a];
				for (var i = 0, l = a.length; i < l; i++){
					if (usePlural || typeof b !== 'string'){
						for (var k in b) self.call(this, a[i], k, b[k]);
					} else {
						self.call(this, a[i], b, c);
					}
				}
				return a.length ? a : a[0];
			};
		}

	});

	var rfilepath = /^\.*\/?(.*?)(\.*(js|css|node|$))/;
	var rcamelcase = /^[a-z]?/;
	var rmeta = /\.+/g;

	local = function(name, factory){
		factory = factory || name;
		if (typeof name !== 'string') name = '';

		if (typeof define === 'function' && (define.amd || define.cmd)){
			define(factory);
		} else if (typeof exports !== 'undefined'){
			var results = factory(require, exports, module);
			if (typeof results === 'undefined') return;
			if (hasExports) exports = module.exports = results;
			if (name) exports[name.substring(name.lastIndexOf('.') + 1)] = results;
		} else {
			var namespaces = name.split('.');
			var scope = root;
			var module = {};
			var require = function(idx){
				idx = idx.replace(rfilepath, '$1').replace(rmeta, '/').split('/');

				var stack, id;

				for (var i = 0, l = idx.length; i < l; i++){
					id = idx[i];
					if (root[id]) stack = root[id];
					else if (stack && stack[id]) stack = stack[id];
				}

				if (!stack) stack = root[id.replace(rcamelcase, function(match){
					return match.toUpperCase();
				})];

				return stack || root;
			};

			for (var i = 0, l = namespaces.length - 1; i <= l; i++){
				var packageName = namespaces[i];
				var result = i < l ? {} : factory(require, module.exports = {}, module);
				if (typeof scope[packageName] === 'undefined'){
					scope[packageName] = result || module.exports;
				}
				scope = scope[packageName];
			}
	    }
	};

	local.extend({

		global: global,

		version: '0.0.5',

		noop: function(){},

		type: function(item){
			if (item == null) return String(item);
			return typeof item === 'object' || typeof item === 'function' ?
				class2type[toString.call(item)] || typeOfNode(item) || 'object' :
				typeof item;
		},

		log: function(){
			if (debug && global['console'] !== undefined && console.log){
				 console.log.apply(console, arguments);
			}
		},

		warn: function(){
	        if (!silent && global['console'] !== undefined && console.warn){
	            console.warn.apply(console, arguments);
	            if (debug && console.trace) console.trace();
	        }
		},

		error: function(msg, e){
			if (debug) throw new (e || Error)(msg);
		},

		uidOf: function(item){
			return item.uniqueNumber || (item.uniqueNumber = uid++);
		},

		isEnumerable: function(item){
			return (item != null && typeof item !== 'string' && typeof item.length === 'number' && toString.call(item) !== '[object Function]');
		}
		
	});

	'Boolean,Number,String,Function,Array,Date,RegExp,Object,Error,Arguments,Window'.replace(/[^,]+/g, function(name){
		class2type["[object " + name + "]"] = name.toLowerCase();
	});

	(function(){
		var args = arguments;

		var extend = function(name, method){
			if (this[name] == null) this[name] = method;
		}.overloadSetter();

		var implement = function(name, method){
			if (this.prototype[name] == null) this.prototype[name] = method;
		}.overloadSetter();

		for (var i = 0, l = args.length, object; i < l; i++){
			object = args[i];
			object.extend = extend;
			object.implement = implement;
		}
	})(Array, String, Function, Date, Object, local);	

	function typeOfNode(item){
		if (item === item.window) return 'window';

		if (item.nodeName){
			if (item.nodeType === 1) return 'element';
			if (item.nodeType === 9) return 'document';
			if (item.nodeType === 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
		} else if (typeof item.length === 'number'){
			if ('callee' in item) return 'arguments';
			if ('item' in item) return 'collection';
		} 
	}

	// Export the adam object for **Node.js**, 
	// with backwards-compatibility for the old `require()` API. 
	// If we're in the browser, add `adam` as a global object.
	if (hasExports) exports = module.exports = local;
	if (!hasGlobalObject) global['adam'] = local;
	if (!this['adam']) this['adam'] = local;

	root = this.adam || global;

}).call(/*<CommonJS>*/typeof exports !== 'undefined' ? exports : /*</CommonJS>*/this, this);
/*
---
name: Array
...
*/

 
(function(){

	var slice = [].slice;
	var toString = ({}).toString;

	Array.extend({

		/*<!ES5>*/
		isArray: function(item){
			return toString.call(item) === '[object Array]';
		},
		/*</!ES5>*/

		/*<!ES6>*/
		from: function(item, fn, bind){
			var array = slice.call(item);
			return fn ? array.map(fn, bind) : array;
		}
		/*</!ES6>*/

	});

})();

Array.implement({

	/*<!ES5>*/
	forEach: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) fn.call(bind, this[i], i, this);
		}
	},

	every: function(fn, bind){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function(fn, bind){
		var item, results = [];
		for (var i = 0, l = this.length >>> 0; i < l; i++) if (i in this){
			item = this[i];
			if (fn.call(bind, item, i, this)) results.push(item);
		}
		return results;
	},

	indexOf: function(item, from){
		var len = this.length >>> 0;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function(fn, bind){
		var len = this.length >>> 0, results = Array(len);
		for (var i = 0; i < len; i++){
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function(fn, bind){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},

	reduce: function(fn, value){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if (i in this) value = value === void 0 ? this[i] : fn.call(null, value, this[i], i, this);
		}
		return value;
	},

	reduceRight: function(fn, value){
		var i = this.length >>> 0;
		while (i--){
			if (i in this) value = value === void 0 ? this[i] : fn.call(null, value, this[i], i, this);
		}
		return value;		
	},
	/*</!ES5>*/

	/*<!ES6>*/
	find: function(fn, bind){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return this[i];
		}
	},

	findIndex: function(fn, bind){
		for (var i = 0, l = this.length >>> 0; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return i;
		}
		return -1;
	}
	/*</!ES6>*/

});
/*
---
name: String
...
*/

String.implement({

	//<!ES5>
	trim: function(){
		return String(this).replace(/^\s+|\s+$/g, '');
	},
	//</!ES5>

	//<!ES6>
	repeat: function(times){
		times = parseInt(times, 10);
		return times > 0 ? new Array(times + 1).join(this) : '';
	},

	startsWith: function(string, index){
		index = index || 0;
		return String(this).lastIndexOf(string, index) === index;
	},

	endsWith: function(string, index){
		index = Math.min(index || this.length, this.length) - string.length;
		return String(this).indexOf(string, index) === index;
	},

	contains: function(string, index){
		return (index ? String(this).slice(index) : String(this)).indexOf(string) > -1;
	}
	//</!ES6>

});
/*
---
name: Function
...
*/

/**
 * Contains Function Prototypes like create, bind, pass, and delay.
 */
Function.extend({

	attempt: function(){
		for (var i = 0, l = arguments.length; i < l; i++){
			try {
				return arguments[i]();
			} catch (e){}
		}
		return null;
	}

});

(function(){

var slice = [].slice,
	toString = ({}).toString;

function isEnumerable(item){
	return (item != null && typeof item !== 'string' && typeof item.length === 'number' && toString.call(item) !== '[object Function]');
}

Function.implement({

	/*<!ES5-bind>*/
	bind: function(that){
		var self = this,
			args = arguments.length > 1 ? slice.call(arguments, 1) : null,
			F = function(){};

		var bound = function(){
			var context = that, length = arguments.length;
			if (this instanceof bound){
				F.prototype = self.prototype;
				context = new F;
			}
			var result = (!args && !length)
				? self.call(context)
				: self.apply(context, args && length ? args.concat(Array.from(arguments)) : args || arguments);
			return context == that ? result : context;
		};
		return bound;
	},
	/*</!ES5-bind>*/

	pass: function(args, bind){
		var self = this;
		if (args != null) args = isEnumerable(args) ? slice.call(args) : [args];
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	delay: function(delay, bind, args){
		return setTimeout(this.pass((args == null ? [] : slice.call(arguments, 2)), bind), delay);
	}

});

})();
/*
---
name: Date
...
*/


/*<!ES5>*/
Date.extend('now', function(){
	return +(new Date);
});
/*</!ES5>*/
/*
---
name: Object
...
*/

(function(){

	//<!ES5>
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	//</!ES5>

	Object.extend({

		//<!ES5>
		keys: function(object){
			var keys = [];
			for (var key in object){
				if (hasOwnProperty.call(object, key)) keys.push(key);
			}
			return keys;
		},
		//</!ES5>

		//<!ES6>
		is: function(a, b){
			if (a === 0 && b === 0) return 1 / a === 1 / b;
			else if (a !== a) return b !== b;
			else return a === b;
		},

		assign: function(original){
			for (var i = 1, l = arguments.length; i < l; i++){
				var extended = arguments[i] || {};
				for (var key in extended) original[key] = extended[key];
			}
			return original;
		}
		//</!ES6>

	});

})();
/*
---
name: JSON
...
*/


(function(local){

	var global = local.global;

	var special = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'};

	var escape = function(chr){
		return special[chr] || '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4);
	};

	var validate = function(string){
		string = string.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
						replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
						replace(/(?:^|:|,)(?:\s*\[)+/g, '');

		return (/^[\],:{}\s]*$/).test(string);
	};

	if (typeof global.JSON === 'undefined') global.JSON = {

		secure: true,

		stringify: function(obj){
			if (obj && obj.toJSON) obj = obj.toJSON();

			switch (local.type(obj)){
				case 'string':
					return '"' + obj.replace(/[\x00-\x1f\\"]/g, escape) + '"';
				case 'array':
					return '[' + obj.map(JSON.stringify).clean() + ']';
				case 'object':
					var string = [];
					Object.each(obj, function(value, key){
						var json = JSON.stringify(value);
						if (json) string.push(JSON.stringify(key) + ':' + json);
					});
					return '{' + string + '}';
				case 'number': case 'boolean': return '' + obj;
				case 'null': return 'null';
			}

			return null;
		},

		parse: function(string, secure){
			if (typeof string !== 'string') return null;

			if (secure == null) secure = JSON.secure;

			if (secure && !validate(string)) throw new Error('JSON could not decode the input; security is enabled and the value is not secure.');

			return eval('(' + string + ')');
		}

	};

})(adam);