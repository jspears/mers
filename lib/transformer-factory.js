var _u = require('underscore'), util = require('./util'), ObjTransformer = require('./streams').ObjTransformer,
    flatten = Function.apply.bind(Array.prototype.concat, []), slice = Function.call.bind(Array.prototype.slice);
function _null(v, k) {
    return v != null;
}

function TransformerFactory(options) {
    _u.extend(this.transformers, options.transformers);
};
TransformerFactory.prototype.transformers = {
    'labelval': function (data) {
        return {
            label: data.title,
            val: data._id
        }
    }
}

TransformerFactory.prototype.pump = function (stream, ctx) {
    if (!stream)
        throw new Error('Must have a stream to pump from');
    var to = this.createStream(ctx.query.transform, ctx.query.transformers);
    var ret = to ? stream.pipe(to) : stream;
    return ret;
}

TransformerFactory.prototype.createStream = function (transformers) {

    transformers = flatten(arguments).map(function (v) {
        if (v == null) return;
        if (_u.isFunction(v)) {
            return v;
        } else if (_u.isFunction(this[v])) {
            return this[v];
        } else {
            console.log('could not find transformer for ' + v);
        }
    }, this.transformers).filter(_null);
    return transformers.length ? new ObjTransformer({transformers: transformers}) : null;
}

module.exports.TransformerFactory = TransformerFactory;