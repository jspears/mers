"use strict";
var _u = require('underscore'), invoker = require('./inject'),
    util = require('./util'),
    _q = require('./query'),
    populate = _q.populate,
    sort = _q.sort,
    paginate = _q.paginate,
    clean = _q.clean,
    filter = _q.filter,
    idObj = _q.idObj,
    w = require('./when'), promise = w.promise;
;
module.exports = function MongooseRestRouter(base, router, options) {
    var ResponseStream = options.responseStream,
        conn = options.conn || options.mongoose && options.mongoose.connection || options.mongoose,
        ModelType = conn.Model || conn.base.Model,
        reGet = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$'), ppush = Function.apply.bind(Array.prototype.push);

    function m(model) {
        return _q.m(conn, model);
    }

    function createstream(query, req, res, next) {
        var stream = query.stream && query.stream() || new options.streams.CallbackStream(query.exec || query);
        stream.on('error', function (err) {
            console.log('mers:libs stream error [' + (err && err.message || 'unknown') + ']', err);
            this.destroy();
            return options.error(err, req, res, next);
        });
        return stream;
    }

    function transform(stream, query, Model) {
        return options.transformer.pump(stream, Model, query.transform);
    }

    function run(meta, tostream, Model, query) {
        if (!tostream) {
            tostream = meta;
            meta = {};
        }

        var ts = options.transformer.createStream(Model, query.transform);
        var rs = new ResponseStream(meta, true);
        if (!ts) {
            return rs.asCallback(tostream);
        }


        rs.pipe(tostream);
        return ts.asCallback(rs)
    }

    var finder = function (Model, find, req, res, next) {
        var single = req.query.single;
        return function (err, count) {
            if (err) return next(err);
            populate(find, req.query);
            paginate(find, req.query);
            sort(find, req.query);
            var stream = transform(createstream(find, req, res, next), req.query, Model);
            if (req.query.filter && Model) {
                filter(find, req.query, Model);
                delete find.options.sort;
                find.count(function (err, fcount) {
                    if (err) return next(err);
                    stream.pipe(new ResponseStream({total: count, filterTotal: fcount}, single)).pipe(res);
                });
            } else {
                stream.pipe(new ResponseStream({total: count}, single)).pipe(res);
            }
        }
    };

    router.get(base + '/:type', function (req, res, next) {
        var Model = m(req);
        if (!Model) {
            return next(new Error("could not find model for: " + req.params.type))
        }
        Model.count({}, finder(Model, Model.find({}), req, res, next));
    });


    function normalize(params) {
        var ret = [];
        if (!params) return ret;
        if (_u.isArray(params)) {
            for (var i = 0, l = params.length; i < l; i++) {
                var v = params[i];

                ppush(ret, v && v.split ? v.split(/\//g) : v == null ? [] : [v]);
            }
        } else {
            Object.keys(params).sort().forEach(function (k) {
                var v = params[k];

                ppush(ret, v && v.split ? v.split(/\//g) : v == null ? [] : [v]);
            })
        }
        return _u.compact(ret);

    }

    function ctx(req) {
        return _u.pick(req, 'query', 'session', 'params', 'body');
    }

    router.get(reGet, function (req, res, next) {
        var params = normalize(req.params);
        var single = 'single' in req.query ? req.query.single : params.length % 2 == 0;
        var Model = m(params.shift());
        var id = params.shift();
        var find = id == 'finder' ? Model[params.shift()] : Model.findOne(idObj(id))
        if (params.length) {
            populate(find, {populate: [params.join('.')]});
        }
        var cbs = new options.streams.CallbackStream();
        transform(createstream(cbs, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);
        invoker.invoke(find, params, ctx(req), cbs.asCallback());
    });

    function put$advice(str, ctx, obj, advice, nValue) {
        //Can't save embedded documents, so we will do this.  There is a possibility that somewhere in the chain we get a model that is not the current var Model.
        // We should be OK.
        var saveTo = nValue instanceof ModelType ? (ctx.model = nValue) : ctx.model;
        if (str.length === 0) {
            nValue.set(ctx.body);
            return saveTo.save(function (e, o) {
                return advice(e || nValue);
            });
        }
        advice(nValue);
    }

    router.put(reGet, function (req, res, next) {
        var params = normalize(req.params), Model = m(params.shift());
        invoker.invoke(Model.findOne(idObj(params.shift())), params, ctx(req), put$advice, run({total: 1}, res, Model, req.query));
    });


    function post$advice(str, ctx, obj, advice, nValue) {
        //Can't save embedded documents, so we will do this.  There is a possibility that somewhere in the chain we get a model that is not the current var Model.
        // We should be OK.
        var saveTo;
        if (nValue instanceof ModelType) {
            saveTo
            ctx.model = nValue;
        } else {
            saveTo = ctx.model;
        }

        if (saveTo && str.length === 0) {
            var idx = str.shift();
            if (Array.isArray(nValue)) {
                if (/^\d+?$/.test(idx)) {
                    nValue.splice(idx, ctx.body, 0);
                } else {
                    nValue.push(ctx.body);
                    idx = nValue.length - 1;
                }
            } else {
                obj.set(idx, ctx.body)
            }
            return saveTo.save(function (e, o) {
                return advice(e || nValue[idx]);
            });
        }
        advice(nValue);

    }

    router.post(reGet, function (req, res, next) {
        var params = normalize(req.params),
            single = 'single' in req.query ? req.query.single : params.length % 2 == 0,
            Model = m(params.shift());
        invoker.invoke(Model.findOne(idObj(params.shift())), params, ctx(req), post$advice, run({total: 1}, res, Model, req.query));

    });

    router.post(base + '/:type', function (req, res) {
        var Model = m(req);
        new Model(clean(req.body)).save(run({total: 1}, res, Model, req.query));
    });


    router.put(base + '/:type/:id', function (req, res, next) {
        var Model = m(req);
        Model.findOne(idObj(req), function (err, obj) {
            if (err)return next(err);
            _u.extend(obj, clean(req.body));
            obj.save(run({total: 1}, res, Model, req.query));
        });

    });
    router.delete(base + '/:type/:id/*', function (req, res, next) {
        var path = (req.params[0] || '').split(/\/+?/g);
        var type = m(req);

        type.findOne(idObj(req), function (err, doc) {
            if (err)           return next(err);
            var obj = doc;
            while (path.length > 1) {
                obj = obj[path.shift()];
            }
            if (obj)
                obj.pull(path.shift());


            doc.save(function (e) {
                if (e)           return next(err);
                res.send({
                    status: 0
                })

            })
        });

    });
    router.delete(base + '/:type/:id?', function (req, res, next) {
        m(req).findOneAndRemove(idObj(req), function (err) {
            if (err)           return next(err);
            res.send({
                status: 0,
                payload: []
            })
        });
    });


};
