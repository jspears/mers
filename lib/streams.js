var stream = require('stream'), Transform = stream.Transform, Readable = stream.Readable, __ = require('underscore'),
    inherits = require("util").inherits, through = require('through2');


module.exports = {
    BufferedJSONStream: require('./streams/buffered-json'),
    ObjTransformer: require('./streams/transformer'),
    ToJson: require('./streams/tojson'),
    Stringify: require('./streams/stringify'),
    ToStream:require('./streams/tostream'),
    CallbackStream: require('./streams/callback'),
    asCallback: function (stream) {
        var rs = new Readable({objectMode: true});

        return function (e, o) {
            if (e) {
                rs.emit('error', e);
            } else {
                rs.push(o);
            }
            rs.push(null);
            rs.pipe(stream);
        }
    }
}