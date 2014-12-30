var Transform = require("stream").Transform,
    inherits = require("util").inherits;
function ToJson(options) {
    if (!(this instanceof ToJson)) {
        return new ToJson(options);
    }
    // init Transform
    if (!options) options = {}; // ensure object

    options.objectMode = true; // forcing object mode

    if (options.toJSON)
        this.toJSON = options.toJSON;

    Transform.call(this, options);
}

inherits(ToJson, Transform);
ToJson.prototype.toJSON = function ToJson$toJSON(obj) {
    if (obj && typeof obj.toJSON === 'function') {
        return obj.toJSON();
    }
    return obj;
};


ToJson.prototype._transform = function (chunk, encoding, callback) {
    callback(null, this.toJSON(chunk));
}

module.exports = ToJson;