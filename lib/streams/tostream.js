var stream = require('stream'), Readable = stream.Readable, inherits = require('util').inherits;

function ToStream(data) {
    if (!(this instanceof ToStream)) {
        return new ToStream(data);
    }
    this._data = data ? Array.isArray(data) ? data : [data] : [];
    Readable.call(this, {objectMode: true});
};

inherits(ToStream, Readable);

ToStream.prototype._read = function () {
    this._data.forEach(function (v) {
        this.push(v)
    }, this);
    this.push(null);
};

module.exports = ToStream;