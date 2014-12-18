"use strict";
var _u = require('underscore'), slice = Function.call.bind(Array.prototype.slice);
var api = {
    split: /\/+?/gi,
    idField: '_id',
    findById: function (obj, value) {
        var field = this.idField;
        return _u.first(_u.filter(obj, function (v) {
            return v[field] == value;
        }));
    },
    rbind: function invoke$rbind(func, args) {
        args = slice(arguments, 1);
        return function invoke$rbind$return() {
            return func.apply(this, slice(arguments).concat(args));
        };

    },
    isPromise: function (o) {
        if (o != null && typeof o !== 'string' && typeof o !== 'number')
            return typeof o.then === 'function';
        return false;
    },
    isExec: function (o) {
        if (o != null && typeof o !== 'string' && typeof o !== 'number')
            return typeof o.exec === 'function';
        return false;
    },
    invoke: function invoke(obj, str, cb) {
//        if (obj == null)
//            return cb(new Error("Object is null for path [" + str + "]"))

        if (str && !Array.isArray(str)) {
            return this.invoke(obj, str.split(this.split), cb);
        }
        var resp, current = str.shift();
        if (obj instanceof Error) {
            return cb(obj, null);
        }
        //Duck type check for promise
        if (api.isPromise(obj)) {
            return obj.then(api.rbind(api.invoke, str, cb), cb);
        }
        //Check for execs.
        if (api.isExec(obj)) {
            return obj.exec(function (e, o) {
                if (e) return cb(e);
                api.invoke(o, str, cb);
            });
        }
        //Handle promises via duck typing.
        if (obj instanceof Function) {
            try {
                resp = obj.call(null, current);
            } catch (e) {
                return cb(e, null);
            }
        } else {
            if (typeof current == 'undefined')
                return cb(null, obj);
            if (Array.isArray(obj)) {
                var id = current;
                var idx = parseInt(id);
                if ("" + idx !== id) {
                    if (typeof obj.id === 'function') {
                        resp = obj.id(id);
                    } else {
                        return cb("can't locate " + str);
                    }
                } else {
                    resp = obj[idx];
                }
            } else if (obj && current in obj) {
                resp = obj[current];
            } else {
                console.log('Not sure what to do with ', obj, typeof obj, current, str);
            }
        }
        if (resp instanceof Function) {
            resp = resp.bind(obj);
        }
        return api.invoke(resp, str, cb);
    }
};

return (module.exports = api);