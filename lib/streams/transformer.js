var Transform = require("stream").Transform,
    inherits = require("util").inherits,
    chainCB = require('nojector/lib/when').chainCB;

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
    chainCB(cb, this.transformers.map(function(v){
        return v(chunk);
    }));
}

module.exports = ObjTransformer;
