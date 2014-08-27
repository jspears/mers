var Stream = require('stream').Stream, _u = require('underscore');
/**
 * A hacked querystream formatter which formats the output
 * as a json literal. Not production quality.
 */

function ArrayFormatter() {
    Stream.call(this);
    this.writable = true;
    this._done = false;
    this.meta = {};
}

ArrayFormatter.prototype.__proto__ = Stream.prototype;

ArrayFormatter.prototype.write = function (doc) {
    if (!this._hasWritten) {
        this._hasWritten = true;

        // open an object literal / array string along with the doc
        this.emit('data', '{ "results": [' + JSON.stringify(doc));

    } else {
        this.emit('data', ',' + JSON.stringify(doc));
    }

    return true;
}

ArrayFormatter.prototype.end =
    ArrayFormatter.prototype.destroy = function () {
        if (this._done) return;
        this._done = true;
        var str = ']';
        if (this.total) str += ',"total":' + this.total;
        if (this.totalFiltered) str += ',"totalFiltered":' + this.totalFiltered;
        str += "}";
        // close the object literal / array
        this.emit('data', str);
        // done
        this.emit('end');
    }

module.exports.ArrayFormatter = ArrayFormatter;

function StreamTransformer(transformers) {
    Stream.call(this);
    this.writable = true;
    this._done = false;
    this.transformers = transformers || [];
}
StreamTransformer.prototype.__proto__ = Stream.prototype;
StreamTransformer.prototype.asCallback =  function (tostream) {
    return function (err, obj) {
        this.pipe(tostream);
        this.write(obj);
        this.end();
    }.bind(this);
}
StreamTransformer.prototype.write = function (doc) {
    var result = doc;
    this.transformers.some(function (v, k) {
        result = v.call(null, result)
        return result == null;
    });
    if (result != null)
        this.emit('data', result);
    return true;
}
StreamTransformer.prototype.end = StreamTransformer.prototype.destroy = function () {
    if (this._done) return;
    this._done = true;
    // done
    this.emit('end');
}

module.exports.StreamTransformer = StreamTransformer;

function BufferedJSONStream(meta, single) {
    Stream.call(this);
    this.response = _u.extend({status:0}, meta);
    this.writable = true;
    this._done = false;
    this._single = single;
    this.once('drain', function(v){
        console.log('drain', v);
    });

}
BufferedJSONStream.prototype.__proto__ = Stream.prototype;
BufferedJSONStream.prototype.asCallback = function (tostream) {
    return function (err, obj) {
        if (err) {
            this.response.error = err;
            this.response.status = 1;
        } else
            this.response.payload = obj;
        this.pipe(tostream);
        tostream.contentType('json');
        this.end();
    }.bind(this);
}
BufferedJSONStream.prototype.write = function (doc) {
    (this.response.payload || (this.response.payload = [])).push(doc && doc.toJSON ? doc.toJSON() : doc);
    return true;
}
BufferedJSONStream.prototype.format = function (data) {
    return JSON.stringify(this.response);
}
BufferedJSONStream.prototype.end = BufferedJSONStream.prototype.destroy = function (data) {
    if (this._done) return;
    this._done = true;
    var payload = this.response.payload;

    if (payload) {
        var isArray = Array.isArray(payload)
        if (this._single == true || this._single == 'true') {
            if (isArray) {
                this.response.payload = payload.length ? payload[0] : null;
            }
        }


    } else if (!this.response.status) {
        this.response.payload = [];
    }

    //emit the response
    this.emit('data', this.format(this.response));
    // done
    this.emit('end');
}
module.exports.BufferedJSONStream = BufferedJSONStream;

module.exports.run = function (meta, tostream) {
    if (!tostream) {
        tostream = meta;
        meta = {};
    }

    return new BufferedJSONStream(meta).asCallback(tostream);
}

function CallbackStream(callback) {
    Stream.call(this);
    this.writable = true;
    this._done = false
    this._callback = callback;
    process.nextTick(this._call.bind(this));
}
CallbackStream.prototype.__proto__ = Stream.prototype;
CallbackStream.prototype._call = function(){
    if (this._callback)
        this._callback(this.asCallback());
}
CallbackStream.prototype.write = function (doc) {
    this.emit('data', doc);
    return true;
}
CallbackStream.prototype.stream = function () {
    return this;
}
CallbackStream.prototype.asCallback = function () {
    return function (err, obj) {
        if (err) {
            this.emit('error', err);
        } else {
            if (Array.isArray(obj))
                obj.forEach(this.write, this);
            else
                this.write(obj);
        }
        this.end();
    }.bind(this);

}
CallbackStream.prototype.end = CallbackStream.prototype.destroy = function () {
    if (this._done) return;
    this._done = true;
    // done
    this.emit('end');
}
module.exports.CallbackStream = CallbackStream;