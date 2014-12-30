var stream = require('stream'), Readable = stream.Readable, inherits = require('util').inherits;
;
function CallbackStream() {
    if (!(this instanceof CallbackStream)) {
        return new CallbackStream();
    }
    Readable.call(this, {objectMode: true});

};
inherits(CallbackStream, Readable);
CallbackStream.prototype._read = function () {
    this._connected = true;
    if (Object.has(this, '_data')) {
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