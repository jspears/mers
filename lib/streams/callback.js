var stream = require('stream'), Readable = stream.Readable, inherits = require('util').inherits;
;
function CallbackStream(cb) {
    if (!(this instanceof CallbackStream)) {
        return new CallbackStream(cb);
    }
    Readable.call(this, {objectMode: true});
    if (typeof cb === 'function') {
        cb(this.asCallback());
    }
};
inherits(CallbackStream, Readable);
CallbackStream.prototype._read = function () {
    this._connected = true;
    if (this._data != null) {
        this.push(this._data);
        this.push(null);
    }
}

CallbackStream.prototype.asCallback = function () {
    var self = this;
    return function (e, o) {

        if (e) {
            self.emit('error', e);
        } else if (o) {
            if (self._connected) {
                self.push(o);
            } else {
                self._data = o;
            }
        }
        if (self._connected)
            self.push(null);
    }
};

module.exports = CallbackStream;