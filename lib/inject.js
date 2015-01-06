"use strict";

var _u = require('underscore'), q = require('./query'), flatten = Function.apply.bind(Array.prototype.concat, []), slice = Function.call.bind(Array.prototype.slice),
    funcRe = /\s*function\s*.*\((.*)\).*/, paramRe = /(\/\*\$([^]*?)\$\*\/|\/\*[^]*?\*\/)?\s*([^,]*)?\s*,?\s*/g, w = require('./when'), when = w.when, promise = w.promise,
    push = Function.apply.bind(Array.prototype.push)
    ;

function extractArgNames(f) {
    if (!f) return [];
    paramRe.lastIndex = funcRe.lastIndex = 0;
    //javascript wtf?
    var me = funcRe.exec(f.toString())[1], match, ret = [];
    while ((match = paramRe.exec(me)) != null && (match[1] || match[2] || match[3] || match[4])) {
        ret.push(_u.compact(match.slice(2)).join('$'));
    }
    return ret;
}
function basicResolver(name) {
    return function (ctx, settings, i, param) {
        //does the function being resolved allow it to be?
        //obj, str, ctx, cb)

        if (('resolve' in settings) && !settings.resolve)
            return;
        if (param) {
            return (ctx[name] || {})[param];
        }
        return ctx[name];
    }
};

function isPromise(p) {
    return p && typeof p.then === 'function';
}
var defSettings = {
    search: ['args', 'session', 'query', 'params', 'body', 'meta'],

    resolvers: {
        query: basicResolver('query'),
        session: basicResolver('session'),
        body: basicResolver('body'),
        params: basicResolver('params'),
        meta: basicResolver('meta'),
        args: function (ctx, settings, i, param) {
            return ctx.args && ctx.args.length ? ctx.args[i] : void(0);
        },

        require: function (ctx, settings, i, param) {
            console.log(__dirname + '')
            var path = slice(arguments, 3).map(function (v) {
                return v ? v : '.'
            });
            var p = [], last = '';

            for (var i = 0, l = path.length; i < l; i++) {
                var c = path[i];
                if (c === '.') {
                    last += c;
                    continue;
                } else if (last) {
                    p.push(last);
                    last = '';
                }
                p.push(c);
            }
            return require(p.join('/'));
        },
        none: function () {
            return null;
        },
        any: function (ctx, settings, i, parts) {
            var ret = this.resolveWrap.apply(this, [settings, i, this.settings.search].concat(parts));

            return ret.apply(this, arguments);
        }
    }
};

function keys(obj) {
    if (Array.isArray(obj)) return obj
    if (typeof obj === 'string') return obj.split(/,\s*/);
    return Object.keys(obj);
}
function onEachResolverMap(settings, v, i) {
    var parts = v.split('$'), resolvers = parts.length > 1 ? [parts.shift()] : settings.search;
    return this.resolveWrap(settings, i, resolvers, parts);
}

var Injector = function (options) {
    options = options || {};
    this.settings = _u.extend({}, defSettings, options);
    this.resolvers = _u.extend(this.settings.resolvers, options.resolvers);
}
_u.extend(Injector.prototype, {
    split: /\/+?/gi,
    idField: '_id',
    extractArgNames: extractArgNames,

    injectArgs: function (fn, args) {
        return this.extractValues(this.extractArgNames(fn), slice(arguments, 1));
    },
    injectApply: function (fn, scope, args) {

        return fn.apply(scope, this.extractValues(this.extractArgNames(fn), slice(arguments, 2)));
    },
    inject$advice: function () {

    },
    /**
     * Returns an array of functions, that correspond to the resolvers.
     * @param fn
     * @param settings
     * @param args
     * @returns [function(ctx)];
     */
    extractResolvers: function invoke$extractResolvers(fn, settings) {
        settings = settings ? _u.extend({}, defSettings, fn.settings) : defSettings;
        var names = extractArgNames(fn);
        return names.map(onEachResolverMap.bind(this, settings));
    },
    resolve: function invoke$resolve(fn, scope, ctx) {
        var api = this;
        var resolvers = this.extractResolvers(fn);
        ctx.args = slice(arguments, 3);
        return when(resolvers).then(function (values) {
            var args = values && values.length ? values.map(function invoke$resolve$map(f, i) {
                return f.call(api, ctx);
            }) : [];

            return fn.apply(scope, args);
        });

    },

    /**
     * Returns a promise, that resolves to a function that is
     * ready to be resolved.
     * @param fn
     * @returns {function(ctx)}
     */
    resolveBind: function invoke$resolveBind(fn) {
        var values = this.extractResolvers(fn), api = this;
        return function invoke$resolveBind$return(ctx) {
            ctx.args = slice(arguments, 1);
            //var _args = slice(arguments);
            var args = values && values.length ? values.map(function invoke$resolve$map(f, i) {
                return f.call(api, ctx);
            }) : [];

            return fn.apply(this, args);
        };
    },

    /**
     * It will resolve from right to left.  The first resolver to not return undefined, the value is used.   This
     * can be null.  This will be performance critical
     * @param settings
     * @param resolvers
     * @param parts
     * @returns {Function}
     */
    resolveWrap: function invoke$resolveWrap(settings, pos, resolvers, parts) {
        var res = settings.resolvers || [], api = this, resolvers = resolvers || [];
        return function invoke$resolveWrap$return(ctx) {
            var args = [ctx, settings, pos].concat(parts);
            for (var i = resolvers.length - 1; i > -1; i--) {
                var ret = res[resolvers[i]].apply(api, args);
                if (ret !== void(0)) {
                    return ret;
                }
            }
            //returning undefined to follow contract.
            return;
        }
    },
    extractValues: function (names, args) {
        args = flatten(slice(arguments, 1));
        var inject = _u.map(names, function (name) {
            var v = null;
            _u.each(args, function (value) {
                if (value == null) return;
                if (name in value) {
                    v = value[name];
                }
            });
            return v;
        });
        return inject;
    },
    /**
     *
     * @param fn
     * @param scope //optiona defaults to this of the func execution
     * @param args //optional
     * @returns {Function}
     */
    injectBind: function (fn, scope, args) {
        args = slice(arguments, 2);
        var names = this.extractArgNames(fn), api = this;
        return function injectArgsBind$return() {
            return fn.apply(scope || this, api.extractValues.apply(api, [names].concat(args.concat(slice(arguments)))));
        }
    },
    findById: function (obj, value) {
        var field = this.idField;
        return _u.first(_u.filter(obj, function (v) {
            return v[field] == value;
        }));
    },
    rbind: function invoke$rbind(func, args) {
        args = slice(arguments, 1);
        return function invoke$rbind$return() {
            return func.apply(this, slice(arguments).concat(args));
        };

    },
    isPromise: function (o) {
        if (o != null && typeof o !== 'string' && typeof o !== 'number')
            return typeof o.then === 'function';
        return false;
    },
    isExec: function (o) {
        if (o != null && typeof o !== 'string' && typeof o !== 'number')
            return typeof o.exec === 'function';
        return false;
    },
    advice: function inject$advice(str, ctx, obj, next, bv) {
        return next(bv);
    },

    invoke: function invoke(obj, str, ctx, advice, cb) {
        var last = arguments[arguments.length - 1];
        if (last === advice) {
            cb = advice;
            advice = this.advice;
        } else {
            advice = advice || this.advice;
        }
        if (str && _u.isString(str)) {
            str = str.split(this.split);
        }
        //sometimes it returns a promise sometimes not....
        var ret = promise(cb);
        try {
            this._invokeInternal(ret, str, ctx, advice, obj);
        } catch (e) {
            ret.reject(e);
        }
        return ret;

    },
    _invokeInternal: function (p, str, ctx, advice, obj) {
        //Short circuit on null values.   Not an error just not anything else we can do.
        if (obj == null)
            return p.resolve(null, obj);//might be undefined.

        //Short circuit on error, won't descend on them;
        if (obj instanceof Error) {
            obj._errorPath = str.join('.');
            return p.reject(obj);
        }
        var self = this, bound = function (robj) {
            return advice.call(self, str, ctx, obj, self._invokeInternal.bind(self, p, str, ctx, advice), robj);
        }
        //Duck type check for promise
        if (this.isPromise(obj)) {
            return obj.then(bound, bound);
        }

        //Check for execs.
        if (this.isExec(obj)) {
            try {
                return obj.exec(function (e, o) {
                    if (e) return p.reject(e);
                    return bound(o);
                });
            } catch (e) {
                console.log('woops', e);
            }
        }
        if (typeof obj === 'function') {
            return this.resolve(obj, null, ctx).then(bound, bound);
        }
        //create a new context, so parent does not disappear in the async bits.
        var current = str.shift();
        ctx = _u.extend({}, ctx, {parent: obj});
        //not an object (maybe a number or bool?) nothing else we can do...
        if (!_u.isObject(obj)) {
            return str.length ? p.reject(new Error("not an object and could not descend " + str)) : p.resolve(null, obj);
        }
        if (typeof current === 'function') {
            return this.resolve(current, obj, ctx).then(bound, bound);
        }

        //arrays an objects can be returned when there's nothing else to do.

        if (typeof obj[current] === 'function') {
            return this.resolve(obj[current], obj, ctx).then(bound, bound);
        }


        if (current === void(0)) {
            p.resolve(null, obj);
            return;
        }

        if (Array.isArray(obj)) {
            //is it not an index property try finding it by id.
            if (!/^\d+?$/.test(current)) {
                var id = current;
                if (typeof obj.id === 'function') {
                    var node = obj.id(id);
                    if (node !== void(0))
                        return bound(node);
                }
            }
        }
        //Perhaps it is a property on the array 0,1,2 or anything else.
        return bound(obj[current]);

    }

});

return (module.exports = new Injector());