"use strict";
var _u = require('underscore'), invoker = require('./inject'),
    util = require('./util'),
    _q = require('./query'),
    domain = require('domain'),
    populate = _q.populate,
    sort = _q.sort,
    paginate = _q.paginate,
    clean = _q.clean,
    filter = _q.filter,
    idObj = _q.idObj,
    streams = require('./streams'),
    Stream = require('stream').Stream,
    w = require('./when'), promise = w.promise, domain = require('domain');
;
module.exports = function MongooseRestRouter(base, router, options) {
    var ResponseStream = options.responseStream,
        conn = options.conn || options.mongoose && options.mongoose.connection || options.mongoose,
        ModelType = conn.Model || conn.base.Model,
        reGet = new RegExp('^\\' + base + '\/(.*)$'), ppush = Function.apply.bind(Array.prototype.push);


    var api = router.route(reGet);
    api.all(function (req, res, next) {
        var p = req.params = normalize(req.params);
        var Model = m(p.shift());
        if (!Model) {
            return next('No model of type ' + req.params.type);
        }
        req.Model = Model;
        delete req.params.type;
        var d = req._domain = domain.create();
        d.add(req);
        d.add(res);
        d.run(next);
    });

    function m(model) {
        return _q.m(conn, model);
    }


    function transform(stream, ctx) {
        return options.transformer.pump(stream, ctx);
    }

    function run(ctx, res) {

        return function run$return(e, o) {

            o = o instanceof Stream ? o : streams.ToStream(o);
            transform(o, ctx).pipe(options.responseStream({
                response: {},
                single: true
            })).pipe(streams.ToJson()).pipe(streams.Stringify()).pipe(res);
        }
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

    /* router.get(base + '/:type', function (req, res, next) {
     var Model = req.Model;
     Model.count({}, finder(Model, Model.find({}), req, res, next));
     });
     */

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
        ret = _u.compact(ret);
        return ret;
    }

    function ctx(req) {
        return _u.pick(req, 'query', 'session', 'params', 'body', 'Model');
    }

    api.get(function (req, res, next) {
            var params = req.params, find, Model = req.Model, id = params.shift();
            //    var single = 'single' in req.query ? req.query.single : (params.length + (id == "finder" ? -1 : 0) % 2 == 0);
            var _ctx = ctx(req);

            //    transform(createstream(cbs, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);

            //swallow finders
            if (id === 'finder' || typeof Model[params[0]] === 'function') {
                find = Model;
            } else {

                if (id) {
                    find = function(){
                        return Model.findOne(idObj(id));
                    }
                    // find = Model.findOne.bind(Model, idObj(id));
                } else {
                    // find = Model.find.bind(Model, {});
                    find = function(){
                        return Model.find({});
                    }

                }
                if (params.length) {
                    populate(find, {populate: [params.join('.')]});
                }
            }
            invoker.invoke(find, params, _ctx, get$advice, function (e, o) {
                o = o instanceof Stream ? o : streams.ToStream(o);
                transform(o, _ctx).pipe(options.responseStream({response: {total: _ctx.body.count}})).pipe(streams.ToJson()).pipe(streams.Stringify()).pipe(res);
            });

        }
    );

    function get$advice(str, ctx, obj, advice, nValue) {
        if (isF(nValue, 'where')) {
            _q.filter(nValue, ctx.query, ctx.Model);
        }

        if (ctx.query.single == true) {
            if (isF(nValue, 'stream')) {
                return advice(nValue.stream());
            }
            return advice(nValue);
        }
        if (str.length === 0 && isF(nValue, 'count')) {

            nValue.count(function (e, c) {
                if (e) return advice(e);
                ctx.body.count = c;

                advice(nValue.stream());
            });
        } else {
            advice(nValue);
        }

    }

    function isF(obj, f) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (!obj) return false;
        while (args.length) {
            if (!(typeof obj[args.shift()] === 'function'))
                return false;
        }
        return true;
    }

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

    api.put(function (req, res, next) {
        var params = req.params, Model = req.Model, _ctx = ctx(req);
        invoker.invoke(Model.findOne(idObj(params.shift())), params, _ctx, put$advice, run(_ctx, res));
    });


    function post$advice(str, ctx, obj, advice, nValue) {
        //Can't save embedded documents, so we will do this.  There is a possibility that somewhere in the chain we get a model that is not the current var Model.
        // We should be OK.
        var saveTo;
        if (nValue instanceof ModelType) {
            saveTo = ctx.model = nValue;
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
                if (idx) {
                    obj.set(idx, ctx.body)
                } else {
                    try {
                        saveTo.set(ctx.body);
                    } catch (e) {
                        console.log('error ', e);
                    }
                }
            }
            return saveTo.save(function (e, o) {
                if (e)
                    return advice(e);
                return advice(idx ? nValue[idx] : o);
            });
        }
        advice(nValue);

    }

    api.delete(function (req, res, next) {
        var path = (req.params[0] || '').split(/\/+?/g);
        var type = req.Model;

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
    api.post(function (req, res, next) {
        var params = req.params, id = params.shift(), Model = req.Model, _ctx = ctx(req), cb = run(_ctx, res);
        if (id) {
            if (!Model[id]) {
                if (!params.length) {
                    return cb({
                        message: 'Invalid Post'
                    });
                }
                params.unshift(Model.findOne.bind(Model, idObj(id)));
            } else {
                params.unshift(id);
            }
        }
        invoker.invoke(Model, params, _ctx, post$advice, cb);

    });
    /*
     router.post(base + '/:type', function (req, res) {
     var Model = m(req);
     new Model(clean(req.body)).save(run({total: 1}, res, Model, req.query));
     });
     */
    /*
     api.route('/:id')
     .put(function (req, res, next) {
     var Model = req.Model;
     Model.findOne(idObj(req), function (err, obj) {
     if (err)return next(err);
     _u.extend(obj, clean(req.body));
     obj.save(run({total: 1}, res, Model, req.query));
     });

     }).delete(function (req, res, next) {
     req.Model.findOneAndRemove(idObj(req), function (err) {
     if (err)           return next(err);
     res.send({
     status: 0,
     payload: []
     })
     });
     });
     */
};
