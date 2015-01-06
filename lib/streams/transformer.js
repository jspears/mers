var Transform = require("stream").Transform,
    inherits = require("util").inherits,
    promise = require('../when').promise;

function ObjTransformer(options) {
    if (!(this instanceof ObjTransformer)) {
        return new ObjTransformer(options);
    }
    if (!options) options = {}; // ensure object
    options.objectMode = true; // forcing object mode
    this.transformers = options.transformers || [];
    Transform.call(this, options);
}

inherits(ObjTransformer, Transform);

ObjTransformer.prototype._transform = function ObjTransformer$_transform(chunk, enc, cb) {
    var p = promise(cb);
    p.chain(chunk, this.transformers);
    p.then(function (v) {
        cb(null, v);
    })
}

module.exports = ObjTransformer;
