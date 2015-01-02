var stream = require('stream'), Readable = stream.Readable, inherits = require('util').inherits, w = require('../when');
;
function PromiseStream(opts) {
    if (!(this instanceof PromiseStream)) {
        return new PromiseStream(opts);
    }
    opts = opts || {};
    opts.objectMode = true;
    this._connected = false;
    Readable.call(this, opts);
};
inherits(PromiseStream, Readable);
PromiseStream.prototype.promise = function (cb) {
    var p = w.promise(cb);
    p.then(this.onResolve.bind(this), this.onFail.bind(this));
    return p;

}
PromiseStream.prototype.onResolve = function (d) {
    if (this._connected) {
        this.push(d);
        this.push(null);
    } else {
        this._data = d;
    }
}

PromiseStream.prototype.onFail = function (e) {
    this.emit('error', e instanceof Error ? e : new Error(e));
    this.push(null);
}

PromiseStream.prototype._read = function () {
    this._connected = true;
    // if (Object.hasOwnProperty(this, '_data')) {
    if (this._data) {
        this.push(this._data);
        this.push(null);
    }
    // }
}