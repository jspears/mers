var _u = require('underscore'),
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
    Stream = require('stream').Stream
    , domain = require('domain');

module.exports = function MongooseRestRouter(base, router, options) {
    "use strict";

    var ResponseStream = options.responseStream,
        conn = options.conn || options.mongoose && options.mongoose.connection || options.mongoose,
        ModelType = conn.Model || conn.base.Model,
        reGet = new RegExp('^\\' + base + '\/(.*)$'), ppush = Function.apply.bind(Array.prototype.push),
        inject = options.inject
        ;


    var api = router.route(reGet);
    api.all(function (req, res, next) {
        var p = req.params = normalize(req.params);
        var Model = m(p.shift());
        if (!Model) {
            return next('No model of type ' + req.params.type);
        }
        req.Model = Model;
        delete req.params.type;
        /*  var d = req._domain = domain.create();
         d.on('error', function (e) {
         console.log('error', e);
         return options.error(e, req, res);
         });
         d.add(req);
         d.add(res);
         d.run(next);*/
        next();
    });

    function m(model) {
        return _q.m(conn, model);
    }


    function transform(stream, ctx) {
        return options.transformer.pump(stream, ctx);
    }

    function run(ctx, res) {

        return function run$return(e, o) {
            if (e) {
                return options.error(e, null, res);
            }
            o = o instanceof Stream ? o : streams.ToStream(o);
            transform(o, ctx).pipe(options.responseStream({
                response: {},
                single: true
            })).pipe(streams.ToJson()).pipe(streams.Stringify()).pipe(res);
        }
    }


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
        return _u.pick(req, 'query', 'session', 'params', 'body', 'Model', 'meta');
    }

    function root(req, def) {
        var params = req.params, find, Model = req.Model, id = params.shift(), single = req.query.single, def = def || function () {
                return Model.find({});
            };
        //    var single = 'single' in req.query ? req.query.single : (params.length + (id == "finder" ? -1 : 0) % 2 == 0);
        var _ctx = ctx(req);
        _ctx.args = [req.query, params];

        //    transform(createstream(cbs, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);
        var single = params.length % 2 === 0;
        if (typeof Model[id] === 'function') {

            find = function () {
                return inject.resolve(Model[id], Model, _ctx, req.query, params);
            }
        } else
        //swallow finders
        if (id === 'finder') {
            // find = Model;
            if (id === 'finder') single = false;
            var m = params.shift();
            find = function () {
                return inject.resolve(Model[m], Model, _ctx, req.query, params);
            }
        } else {

            if (id) {
                single = params.length === 0 ? true : single;

                find = function () {
                    return Model.findOne(idObj(id));
                }
                // find = Model.findOne.bind(Model, idObj(id));
            } else {
                // find = Model.find.bind(Model, {});
                single = params.length === 0 ? false : single;
                find = def

            }
            if (params.length) {
                populate(find, {populate: [params.join('.')]});
            }
        }
        return {
            find: find,
            Model: Model,
            ctx: _ctx,
            single: single,
            params: params
        };
    }

    api.get(function (req, res, next) {
            var resolved = root(req), _ctx = resolved.ctx;

            inject.invokeCB(function (e, o) {

                if (e) {
                    return options.error(e, null, res);
                }
                o = o instanceof Stream ? o : streams.ToStream(o);
                transform(o, _ctx).pipe(options.responseStream({
                    single: ('single' in req.query) ? req.query.single : resolved.single,
                    response: {total: _ctx.body && _ctx.body.count}
                })).pipe(streams.ToJson()).pipe(streams.Stringify()).pipe(res);
            }, resolved.find, resolved.params, _ctx, get$advice);

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
            populate(nValue, ctx.query);
            paginate(nValue, ctx.query);
            filter(nValue, ctx.query, ctx.Model);
            //   var _sort = nValue.options.sort;
            //  delete nValue.options.sort;
            var op = nValue.op;
            nValue.count(function (e, c) {
                if (e) return advice(e);
                nValue.op = op;
                sort(nValue, ctx.query);
                // var body = ctx.body || (ctx.body = {});
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

    /* function put$advice(str, ctx, obj, advice, nValue) {
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
     }*/
    function put$advice(str, ctx, obj, advice, nValue) {
        //Can't save embedded documents, so we will do this.  There is a possibility that somewhere in the chain we get a model that is not the current var Model.
        // We should be OK.
        var saveTo, ref;
        if (nValue instanceof ModelType) {
            saveTo = ctx.model = nValue;
        } else {
            saveTo = ctx.model;
        }

        if (nValue && nValue._schema && nValue._schema.options && nValue._schema.options.type && nValue._schema.options.type[0] && typeof (ref = nValue._schema.options.type[0].ref) === 'string') {

            m(ref).findById(nValue[str.shift()], function (e, o) {
                if (e) return advice(e);
                nValue = saveTo = ctx.model = o;

                update();
            })


        } else {
            update();
        }
        function update() {
            if (str.length === 0 && typeof nValue.set === 'function') {
                nValue.set(ctx.body);
                return saveTo.save(function (e, o) {
                    return advice(e || nValue);
                });
            }
            advice(nValue);
        }

    }


    api.put(function (req, res, next) {
        var resolved = root(req);
        inject.invokeCB(run(resolved.ctx, res), resolved.find, resolved.params, resolved.ctx, put$advice);
    });


    function post$advice(str, ctx, obj, advice, nValue) {
        if (nValue && nValue.constructor.name === 'Query'){
            return advice(nValue);
        }
        //Can't save embedded documents, so we will do this.  There is a possibility that somewhere in the chain we get a model that is not the current var Model.
        // We should be OK.
        var saveTo, ref;
        if (nValue instanceof ModelType) {
            saveTo = ctx.model = nValue;
        } else {
            saveTo = ctx.model;
        }

        function saveVal(nValue, val, cont) {
            var idx = str.shift();
            if (Array.isArray(nValue)) {
                var ref;


                if (/^\d+?$/.test(idx)) {
                    nValue.splice(idx, val, 0);
                } else {
                    idx = nValue.push(val) - 1;
                }
            } else {
                if (idx) {
                    nValue.set(idx, val)
                } else {
                    try {
                        saveTo.set(val);
                    } catch (e) {
                        console.log('error ', e);
                    }
                }
            }
            return saveTo.save(function (e, o) {
                if (e)
                    return advice(e);
                return advice(idx !== void(0) ? cont || nValue[idx] : o);
            });
        }


        if (nValue && nValue._schema && nValue._schema.options && nValue._schema.options.type && nValue._schema.options.type[0] && typeof (ref = nValue._schema.options.type[0].ref) === 'string') {

            var RefObject = new (m(ref))(ctx.body);
            RefObject.save(function (e, o) {
                if (e) return advice(e);
                saveVal(nValue || o, o._id, o);
            });

        } else if (nValue && nValue.schema && typeof str[0] === 'string') {
            var sp = nValue.schema.path(str[0]);
            var ref = sp && sp.caster && sp.caster.options && sp.caster.options.ref || sp.options && sp.options.ref;
            if (ref) {

                var RefObject = new (m(ref))(ctx.body);
                return RefObject.save(function (e, o) {
                    if (e) return advice(e);
                    // advice(str, ctx, o, saveVal, nValue)
                    saveVal(nValue || o, o._id, o);
                });
            } else {
                //saveVal(sp, ctx.body);
                advice(nValue);
            }
        } else if (saveTo && str.length === 0) {
            saveVal(nValue, ctx.body);
        } else {
            advice(nValue);
        }
    }

    function delete$advice(str, ctx, obj, advice, nValue) {
        if (nValue && nValue.constructor.name === 'Query'){
            return advice(nValue);
        }
        //Can't save embedded documents, so we will do this.  There is a possibility that somewhere in the chain we get a model that is not the current var Model.
        // We should be OK.
        var saveTo, ref;
        if (nValue instanceof ModelType) {
            saveTo = ctx.model = nValue;
        } else {
            saveTo = ctx.model;
        }


        function saveVal(nValue,  send) {
            var idx = str.shift();
            if (Array.isArray(nValue)) {
                var ref;


                if (/^\d+?$/.test(idx)) {
                    nValue.splice(idx, 1);
                } else {
                    nValue.remove(idx);
                }
            } else {
                if (idx) {
                    nValue.set(idx, null)
                } else {
                    try {
                        saveTo.set(null);
                    } catch (e) {
                        console.log('error ', e);
                    }
                }
            }
            return saveTo.save(function (e, o) {
                if (e)
                    return advice(e);
                return advice(send || nValue[idx] || o);
            });
        }


        if (nValue && nValue._schema && nValue._schema.options && nValue._schema.options.type && nValue._schema.options.type[0] && typeof (ref = nValue._schema.options.type[0].ref) === 'string') {

            var RefObject = new (m(ref));

            RefObject.save(function (e, o) {
                if (e) return advice(e);
                saveVal(nValue || o, o._id, o);
            });

        } else if (nValue && nValue.schema && typeof str[0] === 'string') {
            var sp = nValue.schema.path(str[0]);
            var path = str.join('.')
            var options = sp && sp.caster && sp.caster.options;
            var ref = options && options.ref;
            if (ref) {
                return m(ref).findById(nValue.get(path), function (e, o) {

                    if (e) return advice(e);
                    if (o) {
                        if (options.deleteRef) {
                            o.remove(function (e, o) {
                              //  advice(o);
                                return saveVal(nValue.get(str.shift()), o);
                            });
                        } else {
                            return saveVal(nValue.get(str.shift()), o);
                        }
                    }
                });
            }
        }
        if (nValue && nValue.schema && str.length === 0) {
            return nValue.remove(function (e, o) {
                if (e) return advice(e);
                return advice(o);
            });
        } else if (saveTo && str.length === 1) {
            saveVal(nValue, ctx.body);
        } else {
            advice(nValue);
        }
    }

    api.delete(function (req, res, next) {
        var resolved = root(req);
        inject.invokeCB(run(resolved.ctx, res), resolved.find, resolved.params, resolved.ctx, delete$advice);

    });
    api.post(function (req, res, next) {
        var resolved = root(req, function defResolved() {
            return resolved.Model;
        });
        inject.invokeCB(run(resolved.ctx, res), resolved.find, resolved.params, resolved.ctx, post$advice);

    });

};
