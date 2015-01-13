var Transform = require("stream").Transform,
    inherits = require("util").inherits;

function Stringify(options) {
    if (!(this instanceof Stringify)) {
        return new Stringify(options);
    }
    if (!options) options = {}; // ensure object
    options.objectMode = true; // forcing object mode
    Transform.call(this, options);
}

inherits(Stringify, Transform);

Stringify.prototype._transform = function Stringify$_transform(chunk, enc, cb) {
    var res = JSON.stringify(chunk)
    return cb(null, res);
}
Stringify.prototype.pipe = function (to) {
    if (typeof to.contentType === 'function') {
        to.contentType('application/json');
    }

    return Transform.prototype.pipe.call(this, to);
}

module.exports = Stringify;
