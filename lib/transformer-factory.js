var _u = require('underscore'), util = require('./util'), ObjTransformer = require('./streams').ObjTransformer,
    flatten = Function.apply.bind(Array.prototype.concat, []),
    inject = require('./inject'),
    slice = Function.call.bind(Array.prototype.slice)
    ;
function _null(v, k) {
    return v != null;
}

function TransformerFactory(options) {
    if (!(this instanceof TransformerFactory)) {
        return new TransformerFactory(options);
    }
    //make a copy of the transformers...
    var transformers = this._transformers = _u.extend({}, this.transformers, options.transformers);
    _u.each(transformers, function (v, k) {
        transformers[k] = inject.resolveBind(v);
    });

};
TransformerFactory.prototype.transformers = {
    'labelval': function (data) {
        return {
            label: data.label || data.name || data.title,
            val: data._id
        }
    }

}

TransformerFactory.prototype.pump = function (stream, ctx, transformers) {
    if (!stream)
        throw new Error('Must have a stream to pump from');
    var to = this.createStream(ctx, transformers, ctx.query && ctx.query.transformers || [], ctx.query && ctx.query.transform);
    var ret = to ? stream.pipe(to) : stream;
    return ret;
}

TransformerFactory.prototype.createStream = function (ctx, transformers) {
    transformers = flatten(slice(arguments, 1))
    var self = this;
    transformers = transformers.map(function TransformerFactory$createStream$map(v) {
        if (v == null) return v;
        var bound;
        if (_u.isFunction(v)) {
            bound = inject.resolveBind(v);
            return function TransformerFactory$createStream$return() {
                return bound.apply(self, [ctx].concat(slice(arguments)));
            }
        }
        //should have already been resolveBinded.
        if (this[v]) {
            bound = this[v]
            return function TransformerFactory$createStream$builtin$return() {
                return bound.apply(self, [ctx].concat(slice(arguments)));
            }
            /* function $createStream$return() {
             var args = [ctx].concat(slice(arguments));
             return v.apply(null, args);
             }*/
        }

        console.log('could not find transformer for ' + v);

    }, this._transformers).filter(_null);
    return transformers.length ? ObjTransformer({transformers: transformers}) : null;
}

module.exports = TransformerFactory;