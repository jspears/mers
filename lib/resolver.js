"use strict";
var _u = require('underscore'), slice = Function.call.bind(Array.prototype.slice),
    funcRe = /\s*function\s*.*\((.*)\).*/, paramRe = /(\/\*\$([^]*?)\$\*\/|\/\*[^]*?\*\/)?\s*([^,]*)?\s*,?\s*/g;

function extractArgNames(f) {
    if (!f) return [];
    paramRe.lastIndex = funcRe.lastIndex = 0;
    //javascript wtf?

    var first = funcRe.exec(f.toString());
    var me = first && first[1] || '', match, ret = [];
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
    search: ['query', 'session', 'body'],
    //resolve or compat (maybe others in teh future)
    resolverStyle: 'resolve',
    //Map parameter names to resolvers.. user to session.user;
    resolverMap: {},
    /**
     * Resolvers are scoped to the Resolver object.
     **/
    resolvers: {
        query: basicResolver('query'),
        session: basicResolver('session'),
        body: basicResolver('body'),
        require: function (ctx, settings, param) {
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
            var ret = this.resolveWrap.apply(this, [settings, defSettings.search].concat(parts));

            return ret.apply(this, arguments);
        }
    }
};

function keys(obj) {
    if (Array.isArray(obj)) return obj
    if (typeof obj === 'string') return obj.split(/,\s*/);
    return Object.keys(obj);
}
function onEachResolverMap(settings, v) {
    return this.resolveWrap.apply(this, this._resolveResolvers(this, settings, v));
}
function Resolver(options) {
    options = options || {};
    this.settings = {resolvers: {}};
    _.extend(this.settings.resolvers, defSettings.resolvers, options.resolvers, noOverride.resolvers);
    this.resolve = this['_' + options.resolverStyle] || this._resolve;
}

_u.extend(Resolver.prototype, {
    split: /\/+?/gi,
    extractArgNames: extractArgNames,
    _resolveResolvers: function (settings, v) {
        var parts = v.split('$');
        if (settings.resolverMap[v]) {
            return [settings.resolverMap[v], parts];
        }
        if (parts.length > 1) {
            return [settings.resolvers[parts.shift()], parts];
        }
        return [settings.search, parts];
    },

    /**
     * Returns an array of functions, that correspond to the resolvers.
     * @param fn
     * @param settings
     * @param args
     * @returns [function(ctx)];
     */
    extractResolvers: function invoke$extractResolvers(fn, settings) {
        settings = fn.settings ? _.extend({}, this.settings, fn.settings) : this.settings;
        return extractArgNames(fn).map(onEachResolverMap.bind(this, settings), this);
    },

    _compat: function (fn, scope, ctx) {
        return fn.apply(scope, slice(arguments, 2));
    },
    _resolve: function invoke$resolve(fn, scope, ctx) {
        return fn.apply(scope, this.extractResolvers(fn).map(function invoke$resolve$map(f) {
            return f.call(this, ctx);
        }, this));
    },
    resolveBind: function invoke$resolveBind(fn, scope) {
        var resolvers = this.extractResolvers(fn), api = this;
        return function invoke$resolveBind$return(ctx) {
            return fn.apply(scope, resolvers.map(function invoke$resolveBind$return$map(f) {
                return f.call(api, ctx);
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
        var res = settings.resolvers, api = this;
        if (!Array.isArray(resolvers)) {
            return function (ctx) {
                return res[resolvers].apply(api, [ctx, settings].concat(parts));
            }
        }
        /**
         * If their are multiple resolvers...
         */
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
    }
});

return (module.exports = Resolver);
