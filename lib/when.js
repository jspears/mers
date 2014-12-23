var Promise = require('mongoose/node_modules/mpromise'), slice = Array.prototype.slice, flatten = Function.apply.bind(Array.prototype.concat, []), _u = require('underscore');


function promise(cb) {
    return new Promise(cb);
}

function checkIsPromise(val) {
    if (!_u.isObject(val)) {
        return false;
    }
    return 'emitted' in val;
}
function when(subordinates) {
    subordinates = flatten(arguments);
    var length = subordinates.length, pro = this instanceof Promise ? this : promise(), i = 0, current = length, values = Array(length), sub, tmp;
    if (length === 0) {
        pro.resolve(null, values);
    }
    for (; i < length; i++) {
        sub = subordinates[i];
        //speeding things up by not creating anonymous function when it is not a promise;
        if (!checkIsPromise(sub)) {
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
    if (0 === current) {
        pro.resolve(null, values);
    }
    return pro;

}
Promise.prototype.when = when;
module.exports.promise = promise;
module.exports.when = when;