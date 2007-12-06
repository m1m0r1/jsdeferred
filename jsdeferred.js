/* Header::
 * jQuery Deferred
 * Copyright (c) 2007 cho45 ( www.lowreal.net )
 *
 * License:: MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ($) {
/* Usage::
 *
 *     $.deferred.define();
 *
 *     $.get("/hoge").next(function (data) {
 *         alert(data);
 *     }).
 *
 *     parallel([$.get("foo.html"), $.get("bar.html")]).next(function (values) {
 *         log($.map(values, function (v) { return v.length }));
 *         if (values[1].match(/nextUrl:\s*([^\s]+)/)) {
 *             return $.get(RegExp.$1).next(function (d) {
 *                 return d;
 *             });
 *         }
 *     }).
 *     next(function (d) {
 *         log(d.length)
 *     });
 *
 */


/* function Deferred () //=> constructor
 *
 * `Deferred` function is constructor of Deferred.
 *
 * Sample:
 *     var d = new $.deferred(); //=> new Deferred;
 *     // or this is shothand of above.
 *     var d = $.deferred();
 */
/* function Deferred.prototype.next   (fun) //=> Deferred
 *
 * Create new Deferred and sets `fun` as its callback.
 */
/* function Deferred.prototype.error  (fun) //=> Deferred
 *
 * Create new Deferred and sets `fun` as its errorback.
 *
 * If `fun` not throws error but returns normal value, Deferred treats
 * the given error is recovery and continue callback chain.
 */
/* function Deferred.prototype.call   (val) //=> this
 *
 * Invokes self callback chain.
 */
/* function Deferred.prototype.fail   (err) //=> this
 *
 * Invokes self errorback chain.
 */
/* function Deferred.prototype.cancel (err) //=> this
 *
 * Cancels self callback chain.
 */
function Deferred () { return (this instanceof Deferred) ? this.init(this) : new Deferred() }
Deferred.prototype = {
	init : function () {
		this.callback = {
			ok: function (x) { return x },
			ng: function (x) { throw  x }
		};
		this._next    = null;
		return this;
	},

	next  : function (fun) { return this._post("ok", fun) },
	error : function (fun) { return this._post("ng", fun) },
	call  : function (val) { return this._fire("ok", val) },
	fail  : function (err) { return this._fire("ng", err) },

	cancel : function () {
		(this.canceller || function () {})();
		return this.init();
	},

	_post : function (okng, fun) {
		this._next =  new Deferred();
		this._next.callback[okng] = fun;
		return this._next;
	},

	_fire : function (okng, value) {
		var self = this, next = "ok";
		try {
			value = self.callback[okng].call(self, value);
		} catch (e) {
			next  = "ng";
			value = e;
		}
		if (value instanceof Deferred) {
			value._next = self._next;
		} else {
			var id = setTimeout(function () {
				clearTimeout(id);
				if (self._next) self._next._fire(next, value);
			}, 0);
		}
		return this;
	}
};

/* function Deferred.register (name, fun) //=> void 0
 *
 * Register `fun` to Deferred prototype for method chain.
 *
 * Sample::
 *     // Deferred.register("loop", loop);
 *
 *     // Global Deferred function
 *     loop(10, function (n) {
 *         print(n);
 *     }).
 *     // Registered Deferred.prototype.loop
 *     loop(10, function (n) {
 *         print(n);
 *     });
 */
Deferred.register = function (name, fun) {
	this.prototype[name] = function () {
		return this.next(Deferred.wrap(fun).apply(null, arguments));
	};
};

/* function Deferred.wrap (dfun) //=> Function
 *
 * Create and return function which run `dfun` with arguments.
 *
 * Sample::
 *     var dloop = Deferred.wrap(loop);
 *
 *     next(dloop(10, function (n) {
 *         print(n);
 *     }));
 */
Deferred.wrap = function (dfun) {
	return function () {
		var a = arguments;
		return function () {
			return dfun.apply(null, a);
		};
	};
};

/* function parallel (deferredlist) //=> Deferred
 *
 * `parallel` wraps up `deferredlist` to one deferred.
 * This is useful when some asynchronous resources required.
 *
 * `deferredlist` can be Array or Object (Hash).
 *
 * Sample:
 *     parallel([
 *         $.get("foo.html"),
 *         $.get("bar.html")
 *     ]).next(function (values) {
 *         values[0] //=> foo.html data
 *         values[1] //=> bar.html data
 *     });
 *
 *     parallel({
 *         foo: $.get("foo.html"),
 *         bar: $.get("bar.html")
 *     }).next(function (values) {
 *         values.foo //=> foo.html data
 *         values.bar //=> bar.html data
 *     });
 */
function parallel (dl) {
	var ret = new Deferred(), values = {}, num = 0;
	for (var i in dl) {
		if (!dl.hasOwnProperty(i)) continue;
		(function (d, i) {
			d.next(function (v) {
				values[i] = v;
				if (--num <= 0) {
					if (dl instanceof Array) {
						// Object to Array
						values.length = dl.length;
						values = Array.prototype.slice.call(values, 0);
					}
					ret.call(values);
				}
			}).error(function (e) {
				ret.fail(e);
			});
			num++;
		})(dl[i], i)
	}
	return ret;
}

/* function wait (sec) //=> Deferred
 *
 * `wait` returns deferred that will be called after `sec` elapsed
 * with real elapsed time (msec)
 *
 * Sample:
 *     wait(1).next(function (elapsed) {
 *         log(elapsed); //=> may be 990-1100
 *     });
 */
function wait (n) {
	var d = new Deferred(), t = new Date();
	var id = setTimeout(function () {
		clearTimeout(id);
		d.call((new Date).getTime() - t.getTime());
	}, n * 1000)
	d.canceller   = function () { try { clearTimeout(id) } catch (e) {} };
	return d;
}
Deferred.register("wait", wait);

/* function next (fun) //=> Deferred
 *
 * `next` is shorthand for creating new deferred which
 * is called after current queue.
 */
function next (fun) {
	var d = new Deferred();
	var id = setTimeout(function () { clearTimeout(id); d.call() }, 0);
	d.callback.ok = fun;
	d.canceller   = function () { try { clearTimeout(id) } catch (e) {} };
	return d;
}

/* function call (fun[, args...]) //=> Deferred
 *
 * `call` function is for calling function asynchronous.
 *
 * Sample:
 *     next(function () {
 *         function pow (x, n) {
 *             function _pow (n, r) {
 *                 print([n, r]);
 *                 if (n == 0) return r;
 *                 return call(_pow, n - 1, x * r);
 *             }
 *             return call(_pow, n, 1);
 *         }
 *         return call(pow, 2, 10);
 *     }).
 *     next(function (r) {
 *         print([r, "end"]);
 *     })
 *
 */
function call (f, args) {
	args = Array.prototype.slice.call(arguments);
	f    = args.shift();
	return next(function () {
		return f.apply(this, args);
	});
}

/* function loop (n, fun) //=> Deferred
 *
 * `loop` function provides browser-non-blocking loop.
 * This loop is slow but not stop browser's appearance.
 *
 * Sample:
 *     //=> loop 1 to 100
 *     loop({begin:1, end:100,step:10}, function (n, o) {
 *         for (var i = 0; i < o.step; i++) {
 *             log(n+i);
 *         }
 *     });
 *
 *     //=> loop 10 times
 *     loop(10, function (n) {
 *         log(n);
 *     });
 */
function loop (n, fun) {
	var o = {
		begin : n.begin || 0,
		end   : n.end   || (n - 1),
		step  : n.step  || 1,
		last  : false,
		prev  : null
	};
	var ret, step = o.step;
	return next(function () {
		function _loop (i) {
			if (i <= o.end) {
				if ((i + step) > o.end) {
					o.last = true;
					o.step = o.end - i + 1;
				}
				o.prev = ret;
				ret = fun.call(this, i, o);
				if (ret instanceof Deferred) {
					return ret.next(function (r) {
						ret = r;
						return call(_loop, i + step);
					});
				} else {
					return call(_loop, i + step);
				}
			} else {
				return ret;
			}
		}
		return call(_loop, o.begin);
	});
}
Deferred.register("loop", loop);

$.deferred          = Deferred;
$.deferred.parallel = parallel;
$.deferred.wait     = wait;
$.deferred.next     = next;
$.deferred.call     = call;
$.deferred.loop     = loop;
$.deferred.define   = function (obj, list) {
	if (!list) list = ["parallel", "wait", "next", "call", "loop"];
	if (!obj)  obj  = (function () { return this })();
	$.each(list, function (n, i) {
		obj[i] = $.deferred[i];
	});
};

// override jQuery Ajax functions
$.each(["get", "getJSON", "post"], function (n, i) {
	var orig = $[i];
	$[i] = function (url, data, callback) {
		if (typeof data == "function") {
			data = undefined;
			callback = data;
		}
		var d = $.deferred();
		orig(url, data, function (data) {
			d.call(data);
		});
		if (callback) d = d.next(callback);
		return d;
	};
});

// end
})(jQuery);