var _u = require('underscore'), util = require('./util'), ObjTransformer = require('./streams').ObjTransformer,
    flatten = Function.apply.bind(Array.prototype.concat, []),
    inject = require('./inject')
    ;
function _null(v, k) {
    return v != null;
}

function TransformerFactory(options) {
    if (!(this instanceof TransformerFactory)) {
        return new TransformerFactory(options);
    }
    var transformers = _u.extend(this.transformers, options.transformers);
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
    var to = this.createStream(ctx, transformers);
    var ret = to ? stream.pipe(to) : stream;
    return ret;
}

TransformerFactory.prototype.createStream = function (ctx, transformers) {
    transformers = (transformers || []);

    transformers = flatten(transformers, ctx.query && ctx.query.transformers || [], ctx.query && ctx.query.transform || []).map(function (v) {
        if (v == null) return;
        if (_u.isFunction(v)) {
            //inline transform function
            return inject.resolveBind(v).bind(ctx);
        }
        //should have already been resolveBinded.
        if (this[v]) {
            return this[v].bind(this, ctx);
        }

        console.log('could not find transformer for ' + v);

    }, this.transformers).filter(_null);
    return transformers.length ? ObjTransformer({transformers: transformers}) : null;
}

module.exports = TransformerFactory;