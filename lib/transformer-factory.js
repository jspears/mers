var _u = require('underscore'), streams = require('./streams'), util = require('./util'), u = require('util');
function _null(v, k) {
    return v != null;
}
function createLabel(Model) {
    var label = util.getsafe(Model, 'options.display.labelAttr');
    if (label)
        return label;
    Model.schema.eachPath(function (v, k) {
        if (v != '_id' && ( v.toLowerCase() == 'name' || v.toLowerCase() == 'title')) {
            label = v;
            return true;
        }
    });
    if (label)
        util.setunless(Model, 'options.display.labelAttr', label);
    return label;
}

var TransformerFactory = function (options) {
    _u.extend(this.transformers, options.transformers);
}
TransformerFactory.prototype.pump = function (stream, Model, label) {
    if (!stream)
        throw new Error('Must have a stream to pump from');
    var to = this.createStream(Model, label);
    var ret = to ? stream.pipe(to) : stream;
    return ret;
}

TransformerFactory.prototype.createStream = function (Model, label) {
    if (!label)
        return null;
    var splits;
    if (_u.isString(label)) {
        splits = util.split(label);
    } else if (_u.isArray(label)) {
        splits = label;
    } else if (_u.isFunction(label)) {
        splits = [label];
    }
    var trans = splits.map(
        function (v, k) {
            if (_u.isFunction(v)) {

                return v;
            }
            if (this.transformers[v])
                return this.transformers[v](Model, v);

            console.warn('no transformer for [' + v + ']');

        }, this).filter(_null);

    if (trans.length)
        return  new streams.StreamTransformer(trans);
}

TransformerFactory.prototype.transformers = {
    labelval: function (Model) {
        var labelAttr = createLabel(Model);
        this.only = ['_id'];
        if (labelAttr) {
            this.only.push(labelAttr);
            return function (obj) {
                return {
                    val: obj._id,
                    label: obj[labelAttr]
                }
            }
        }
        var modelName = Model.modelName;
        return function (obj) {
            return { val: obj._id, label: modelName + ' [' + obj._id + ']' }
        }
    }
}
module.exports.TransformerFactory = TransformerFactory;