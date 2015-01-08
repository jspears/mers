var Promise = require('mongoose/node_modules/mpromise'),
    flatten = Function.apply.bind(Array.prototype.concat, []),
    slice = Function.call.bind(Array.prototype.slice)
    , _u = require('underscore'), inherits = require('util').inherits;

function promise(cb) {
    return new Promise(cb);
}

function isPromise(val) {
    if (!_u.isObject(val)) {
        return false;
    }
    return typeof val.then === 'function';
}
function whenCB(cb, subordinates) {
    subordinates = flatten(slice(arguments, 1));
    var length = subordinates.length, i = 0, current = length, values = Array(length), sub;
    for (; i < length; i++) {
        sub = subordinates[i];
        //speeding things up by not creating anonymous function when it is not a promise;
        if (!isPromise(sub)) {
            if (sub instanceof Error) {
                return cb(sub);
            } else {
                values[i] = sub;
                if (0 === (--current)) {
                    return cb(null, values);
                }
            }
        }else if ((function when$each(c, sub, emitted, r, f, isError) {
                emitted = sub.emitted;
                if (emitted && ( emitted.fulfill && (f = emitted.fulfill[0]) || emitted.reject && ( r = emitted.reject[0]))) {
                    values[c] = r == null ? f : r;
                    if (r) {
                        cb(r);
                        return false;
                    }
                    if (0 === (--current)) {
                        cb(null, values);
                        return false;
                    }
                    return;
                }
                sub.then(function (val) {
                    values[c] = val;
                    if (0 === (--current)) {
                        return cb(null, values);
                    }
                }, function (e) {
                    current = -1;
                    length = 0;
                    cb(e);

                });

            }(i, sub)) === false) {
            return;
        }
        ;
    }
    if (0 === current) {
        cb(null, values);
    }
}

function when(subordinates) {
    var pro = this instanceof Promise ? this : promise();
    whenCB(pro.resolve.bind(pro), flatten(arguments));
    return pro;

}

/**
 * Takes a value and a list of functions, values or promises, and
 * attempts to resolve them in order....
 *
 * @param cb
 * @param subordinates
 */

function chainCB(cb, subordinates) {
    subordinates = flatten(slice(arguments, 1));
    var length = subordinates.length;

    function _handleChain(p, val, sub) {
        sub = sub || subordinates[p];
        if (isPromise(sub)) {
            sub.then(function (v) {
                _handleChain(p + 1, v);
            }, cb);
            return;
        }
        if (typeof sub === 'function') {
            var ret = sub(val);
            if (isPromise(ret)) {
                _handleChain(p, val, ret);
            } else {
                _handleChain(p + 1, ret || val);
            }

            return;
        }
        if (length <= p || p && val == null) {
            return cb(null, val);
        }

        _handleChain(p + 1, sub);

    };

    _handleChain(0);


}
function chain(subordinates) {
    var pro = this instanceof Promise ? this : promise();
    chainCB(pro.resolve.bind(pro), flatten(arguments));

    return pro;
}


Promise.prototype.when = when;
Promise.prototype.chain = chain;

module.exports.promise = promise;
module.exports.chain = chain;
module.exports.when = when;
module.exports.whenCB = whenCB;
module.exports.chainCB = chainCB;