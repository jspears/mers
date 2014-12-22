"use strict";
var _u = require('underscore'), flatten = Function.apply.bind(Array.prototype.concat, []), slice = Function.call.bind(Array.prototype.slice),
    funcRe = /\s*function\s*\((.*)\).*/, paramRe = /(\/\*\$([^]*?)\$\*\/|\/\*[^]*?\*\/)?\s*([^,]*)?\s*,?\s*/g;

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
    return function (ctx, settings, param) {
        //does the function being resolved allow it to be?
        return !settings || ( ('resolve' in settings) ? settings.resolve : true) ? ( ctx && ctx[name] || {})[param] : void(0);
    }
};

var defSettings = {
    search: ['query', 'param', 'body', 'session'],

    resolvers: {
        query: basicResolver('query'),
        session: basicResolver('session'),
        body: basicResolver('body'),
        param: basicResolver('param'),
        require: function (ctx, settings, param) {
            console.log(__dirname + '')
            var path = slice(arguments, 2).map(function (v) {
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
        any: function (ctx, settings, parts) {
            var ret = api.resolveWrap.apply(api, [settings, defSettings.search].concat(parts));

            return ret.apply(api, arguments);
        }
    }
};

function keys(obj) {
    if (Array.isArray(obj)) return obj
    if (typeof obj === 'string') return obj.split(/,\s*/);
    return Object.keys(obj);
}
function onEachResolverMap(v) {
    var parts = v.split('$'), resolvers = parts.length > 1 ? [parts.shift()] : this.search;
    return api.resolveWrap(this, resolvers, parts);
}
var api = {
    split: /\/+?/gi,
    idField: '_id',
    extractArgNames: extractArgNames,
    settings: function (options) {
        options = options || {};
        _.extend(defSettings.resolvers, options.resolvers, noOverride.resolvers);

    },
    injectArgs: function (fn, args) {
        return api.extractValues(api.extractArgNames(fn), slice(arguments, 1));
    },
    injectApply: function (fn, scope, args) {
        return fn.apply(scope, api.extractValues(api.extractArgNames(fn), slice(arguments, 2)));
    },
    /**
     * Returns an array of functions, that correspond to the resolvers.
     * @param fn
     * @param settings
     * @param args
     * @returns [function(ctx)];
     */
    extractResolvers: function invoke$extractResolvers(fn, settings) {
        settings = settings ? _.extend({}, defSettings, fn.settings) : defSettings;
        return extractArgNames(fn).map(onEachResolverMap, settings);

    },
    resolve: function invoke$resolve(fn, scope, ctx) {
        return fn.apply(ctx, api.extractResolvers(fn).map(function invoke$resolve$map(f) {
            return f.call(api, ctx);
        }));
    },
    resolveBind: function invoke$resolveBind(fn, scope, bCtx) {
        var resolvers = api.extractResolvers(fn);
        return function invoke$resolveBind$return(ctx) {
            return fn.apply(scope, resolvers.map(function (f) {
                return f.call(api, ctx || bCtx);
            }, api));
        }
    },
    /**
     * It will resolve from right to left.  The first resolver to not return undefined, the value is used.   This
     * can be null.  This will be performance critical
     * @param settings
     * @param resolvers
     * @param parts
     * @returns {Function}
     */
    resolveWrap: function invoke$resolveWrap(settings, resolvers, parts) {
        var res = defSettings.resolvers;
        return function invoke$resolveWrap$return(ctx) {
            var args = [ctx, settings].concat(parts);
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
        var names = api.extractArgNames(fn);
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
    invoke: function invoke(obj, str, cb, ctx) {
//        if (obj == null)
//            return cb(new Error("Object is null for path [" + str + "]"))

        if (str && !Array.isArray(str)) {
            return this.invoke(obj, str.split(this.split), cb);
        }
        var resp, current = str.shift();
        if (obj instanceof Error) {
            return cb(obj, null);
        }
        if (obj && obj[current] && typeof obj[current] === 'function'){
            api.resolveApply(current, obj[current], req);
        }
        //Duck type check for promise
        if (api.isPromise(obj)) {
            return obj.then(api.rbind(api.invoke, str, cb), cb);
        }
        //Check for execs.
        if (api.isExec(obj)) {
            return obj.exec(function (e, o) {
                if (e) return cb(e);
                api.invoke(o, str, cb);
            });
        }
        if (obj instanceof Function) {
            try {
                resp = obj.call(null, current);
            } catch (e) {
                return cb(e, null);
            }
        } else {
            if (typeof current == 'undefined')
                return cb(null, obj);
            if (Array.isArray(obj)) {
                var id = current;
                var idx = parseInt(id);
                if ("" + idx !== id) {
                    if (typeof obj.id === 'function') {
                        resp = obj.id(id);
                    } else {
                        return cb("can't locate " + str);
                    }
                } else {
                    resp = obj[idx];
                }
            } else if (obj && current in obj) {
                resp = obj[current];
            } else {
                console.log('Not sure what to do with ', obj, typeof obj, current, str);
            }
        }
        if (resp instanceof Function) {
            resp = resp.bind(obj);
        }
        return api.invoke(resp, str, cb, ctx);
    }
};

return (module.exports = api);