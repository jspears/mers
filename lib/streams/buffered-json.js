var Transform = require("stream").Transform, inherits = require("util").inherits;

function BufferedJSONStream(options) {
    if (!(this instanceof BufferedJSONStream )) {
        return new BufferedJSONStream(options);
    }
    // allow use without new
    options = options || {};
    this._single = options.single == "true" || options.single == true || false;
    this._response = options.response || {};
    if (!this._response.status){
        this._response.status = 0;
    }

    options.objectMode = true;

    this._payload = [];

    // init Transform
    Transform.call(this, options);
};

inherits(BufferedJSONStream, Transform);

BufferedJSONStream.prototype._transform = function (chunk, enc, cb) {
    this._payload.push(chunk);
    cb();
};

BufferedJSONStream.prototype._flush = function (cb) {
    var payload = this._payload, response = this._response;
    if (payload) {

        if (this._single) {
            response.payload = payload[0];
        } else {
            if (!('total' in response)) {
                response.total = payload.length;
            }
            response.payload = payload;
        }
    }
    this.push(response);
    cb();
};

BufferedJSONStream.prototype.pipe = function (to) {
    if (typeof to.set === 'function') {
        to.set('Content-Type', 'application/json');
    }
    return Transform.prototype.pipe.call(this, to);
};

module.exports = BufferedJSONStream;