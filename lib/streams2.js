var Transform = require("stream").Transform, inherits = require("util").inherits

function ToJson(options) {
    Transform.call(this, options)
}

inherits(ToJson, Transform)

ToJson.prototype._transform = function (chunk, encoding, callback) {
    var data = chunk.toJSON ? chunk.toJSON() : chunk;
    this.push(data)
    callback()
}

// a simple transform stream
var tx = new ToJson;

// a simple source stream
var Readable = require('stream').Readable;
var rs = new Readable;
var a = {
    toJSON: function () {
        return {a: c++};
    }

}, c = 0;
rs.push(a);
rs.push(a);
rs.push(null);

rs.pipe(tx).pipe(process.stdout);