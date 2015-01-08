var Promise = require('mongoose/node_modules/mpromise'),
    flatten = Function.apply.bind(Array.prototype.concat, []),
    slice = Function.call.bind(Array.prototype.slice)
    , _u = require('underscore');


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
    var length = subordinates.length, i = 0, current = length, values = Array(length), sub, tmp;
    if (length === 0) {
        cb(null, values);
    }
    for (; i < length; i++) {
        sub = subordinates[i];
        //speeding things up by not creating anonymous function when it is not a promise;
        if (!isPromise(sub)) {
            if (sub instanceof Error) {
                cb(sub);
            } else {
                values[i] = sub;
                current--;
                continue;
            }
        }


        (function when$each(c, sub, emitted, r, f, isError) {
            emitted = sub.emitted;
            if (emitted && emitted.fulfill && (f = emitted.fulfill[0]) || emitted.reject && ( r = emitted.reject[0])) {
                isError = emitted.reject && emitted.reject.length > 0;
                values[c] = isError ? f : r;
                if (0 === (--current) || isError) {
                    if (isError) {
                        cb(r, values);
                    } else {
                        cb(null, values);
                    }
                }
                return;
            }
            sub.then(function (val) {
                values[c] = val;
                if (0 === (--current)) {
                    return cb(null, values);
                }
            }, cb)

        }(i, sub));
    }
    if (0 === current) {
        cb(null, values);
    }
}

function when(subordinates) {
    var pro = this instanceof Promise ? this : promise();
    whenCB(function (e, o) {
        pro.resolve(e, o);

    }, flatten(arguments));
    return pro;

}

/**
 * Takes a value and a list of functions, values or promises, and
 * attempts to resolve them in order....
 *
 * @param val
 * @param subordinates
 * @returns {Promise}
 */

function chain(subordinates) {
    subordinates = flatten(arguments);
    var length = subordinates.length, pro = this instanceof Promise ? this : promise(), reject = pro.reject.bind(pro);

    function _handleChain(p, val, sub) {
        sub = sub || subordinates[p];
        if (isPromise(sub)) {
            sub.then(function (v) {
                _handleChain(p + 1, v);
            }, reject);
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
            return pro.resolve(null, val);
        }

        _handleChain(p + 1, sub);

    };

    _handleChain(0);

    return pro;

}

Promise.prototype.when = when;
Promise.prototype.chain = chain;
module.exports.promise = promise;
module.exports.chain = chain;
module.exports.when = when;
module.exports.whenCB = whenCB;