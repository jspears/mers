var Transform = require("stream").Transform,
    inherits = require("util").inherits;
//through2([ options, ] [ transformFunction ] [, flushFunction ])
/**
 * A quick and dirty through2 implementation.   If you really need
 * this don't use this one get the real one.
 *
 * @param options
 * @param transformFunction
 * @param flushFunction
 * @returns {Through}
 * @constructor
 */
function Through(options, transformFunction, flushFunction) {

    if (!(this instanceof Through)) {
        return new Through(options, transformFunction, flushFunction);
    }
    if (typeof options !== 'object') {
        flushFunction = transformFunction;
        transformFunction = options;
        options = {};
    }
    if (flushFunction)
        this._flush = flushFunction;
    if (transformFunction)
        this._transform = transformFunction;
    Transform.call(this, options);
}
Through.obj = function (options, transformFunction, flushFunction) {
    if (!(typeof options === 'object')) {
        flushFunction = transformFunction;
        transformFunction = options;
        options = {};
    }
    options.objectMode = true
    return Through.call(null, options, transformFunction, flushFunction)
}

inherits(Through, Transform);

module.exports = Through;
