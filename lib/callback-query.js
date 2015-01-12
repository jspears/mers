var _u = require('underscore'), CallbackStream = require('./streams').CallbackStream, w = require('nojector/lib/when'), promise = w.promise;
/**
 * A convienece object for doing raw mongodb or query, or really
 * any other query.
 *
 * @param query will be passed the Query object and a callback(err, results);
 * @param countQuery
 * @constructor
 */

function Query(query, countQuery) {

    var _this = this, opts = this.options = {};
    this.exec = function (callback) {
        var ret;
        if (callback == null) {
            ret = promise();
            callback = ret.resolve;
        }

        if (_this._results || _this._err) {
            return callback(_this._err, _this._results);
        }
        query.call(_this, function Query$doCallback(err, result) {
            err = err || result && result.errmsg ? result : null;
            if (err) {
                _this._err = err;
                return callback(err, null);
            }
            _this._results = result;
            callback(null, result);
        });
        return ret;
    };


    this.supported.forEach(function (method) {
        this[method] = function (k, n) {
            if (n) {
                (opts[method] || (opts[method] = {}))[k] = n;
            } else
                opts[method] = k;
            return this;
        }
    }, this);


    //Imagine your query returns the count, it wouldn't make since
    // to query again, so cache the results and get back to them...
    // make sure this Query is not reused!
    if (countQuery === void(0)) {
        this.count = function (callback) {
            if (!(_u.isUndefined(_this._count || _this._err)))
                callback(_this._err, _this._count);
            else
                this.exec(function () {
                    callback(_this._err, _this._count);
                })
        }
    }
    this.stream = function () {
        return new CallbackStream(this.exec);
    }
}
/**
 * Subclass this to announce what functions are supported, by default its 'populate', 'limit', 'skip', 'sort','and','nor','or',or
 * @type {Array}
 */
Query.prototype.supported = ['populate', 'limit', 'where', 'skip', 'sort', 'and', 'nor', 'or'];
module.exports = Query;