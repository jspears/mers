var Promise = require('mongoose/node_modules/mpromise'),
    flatten = Function.apply.bind(Array.prototype.concat, []), _u = require('underscore');


function promise(cb) {
    return new Promise(cb);
}

function isPromise(val) {
    if (!_u.isObject(val)) {
        return false;
    }
    return typeof val.then === 'function';
}

/**
 * Make it act like a promise, but not all the overhead.
 * We use this when we have a list of values, but they may not
 * actually be async.  Rather incur the cost of a real promise,
 * we do this. Since this may happen in a lot of places, it might
 * be worth the "optimization";
 *
 * @param values
 * @returns {{then: Function}}
 */
function fakePromise(values) {
    var then = [], nvals;
    process.nextTick(function () {
        for (var i = 0, l = then.length; i < l; i++) {
            nvals = then[i](values);
            if (nvals !== void(0)) {
                values = nvals;
            }
        }
        then = null;
    });
    return {
        then: function (fn, err) {
            then.push(fn);
            return this;
        }
    };
}

function when(subordinates) {
    subordinates = flatten(arguments);
    var length = subordinates.length, pro = this instanceof Promise ? this : promise(), i = 0, current = length, values = Array(length), sub, tmp;

    for (; i < length; i++) {
        sub = subordinates[i];
        //speeding things up by not creating anonymous function when it is not a promise;

        if (!isPromise(sub)) {
            if (sub instanceof Error) {
                tmp = sub;
                //pass through and reject
                sub = promise();
                sub.reject(tmp);

            } else {
                values[i] = sub;
                current--;
                continue;
            }
        }
        //if we get here than its async, and we will need a promise;
        if (pro == null) {
            pro = promise();
        }
        (function when$each(c, sub, emitted, r, f, isError) {

            emitted = sub.emitted;
            if (emitted.fulfill && (f = emitted.fulfill[0]) || emitted.reject && ( r = emitted.reject[0])) {
                isError = emitted.reject && emitted.reject.length > 0;
                values[c] = isError ? f : r;
                if (0 === (--current) || isError) {
                    if (isError) {
                        pro.resolve(values);
                    } else {
                        pro.resolve(r, values);
                    }
                }
                return;
            }
            sub.then(function (val) {
                values[c] = val;
                if (0 === (--current)) {
                    return pro.resolve(null, values);
                }
            }, function (e) {
                pro.resolve(e, values);
            })

        }(i, sub));
    }
    //All sync here... so, let's just resolve unless it is a real promise;
    if (0 === current) {

        if (pro == null)
            return fakePromise(values);
        else
            pro.resolve(values);
    }
    return pro;

}

/**
 * Takes a value and a list of functions, values or promises, and
 * attempts to resolve them in order....
 *
 * @param val
 * @param subordinates
 * @returns {Promise|Object}
 */

function chain(subordinates) {
    subordinates = flatten(arguments);
    var length = subordinates.length, pro = this instanceof Promise ? this : null, stash;

    function _handleChain(p, val, sub) {
        sub = sub || subordinates[p];
        if (isPromise(sub)) {
            if (!pro) pro = promise();
            sub.then(_handleChain.bind(null, p + 1), pro.reject.bind(pro));
        } else if (typeof sub === 'function') {
            _handleChain(p, val, sub(val));
        } else if (length === p || p && val == null) {
            return pro ? pro.resolve(null, val) : (stash = val);
        } else {
            _handleChain(p + 1, sub);
        }
    };

    _handleChain(0);

    return pro == null ? fakePromise(stash) : pro;

}

Promise.prototype.when = when;
Promise.prototype.chain = chain;
module.exports.promise = promise;
module.exports.chain = chain;
module.exports.when = when;