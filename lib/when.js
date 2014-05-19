var Promise = require('mongoose/node_modules/mpromise'), slice = Array.prototype.slice;



function promise(cb) {
    return new Promise(cb);
}

function when(subordinates) {
    var length = subordinates.length, pro = promise(), i = 0, current = length, values = Array(length);
    for (; i < length; i++) {
        (function (c, sub) {
            var emitted = sub.emitted, r, f, isError;
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
            } else {
                sub.then(function (val) {
                    values[c] = val;
                    if (0 === (--current)) {
                        return pro.resolve(null, values);
                    }
                }, function (e) {
                    pro.resolve(e, values);
                })
            }
        }(i, subordinates[i]));
    }

    return pro;

}

module.exports.promise = promise;
module.exports.when = when;