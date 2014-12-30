var Transform = require("stream").Transform,
    inherits = require("util").inherits,
    w = require('../when');

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
   return w.promise(cb).chain(chunk, this.transformers);
}

module.exports = ObjTransformer;
