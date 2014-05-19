"use strict";
var _u = require('underscore'), invoker = require('./invoke'),
    util = require('./util'),
    _q = require('./query'),
    populate = _q.populate,
    sort = _q.sort,
    paginate = _q.paginate,
    clean = _q.clean,
    filter = _q.filter,
    idObj = _q.idObj,
    promise = require('mongoose/node_modules/mpromise'),
    ppush = Array.prototype.push
    ;
module.exports = function MongooseRestRouter(base, router, options) {
    var ResponseStream = options.responseStream;

    var conn = options.conn || options.mongoose && options.mongoose.connection || options.mongoose;

    function m(model) {
        return _q.m(conn, model);
    };

    function run(meta, tostream) {
        if (!tostream) {
            tostream = meta;
            meta = {};
        }

        return new ResponseStream(meta).asCallback(tostream);
    }

    var finder = function (Model, find, req, res, next) {
        res.contentType('json');
        var single = req.query.single;
        return function (err, count) {
            if (err) return next(err);
            populate(find, req.query);
            paginate(find, req.query);
            sort(find, req.query);
            var stream = transform(createstream(find, req, res, next), req.query, Model);
            if (req.query.filter && Model) {
                filter(find, req.query, Model);
                var fixed = _u.extend({}, find);
                delete fixed.options.sort;
                fixed.count(function (err, fcount) {
                    if (err) return next(err);
                    stream.pipe(new ResponseStream({total: count, filterTotal: fcount}, single)).pipe(res);
                });
            } else {
                stream.pipe(new ResponseStream({total: count}, single)).pipe(res);
            }
        }
    };

    var reFinder = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/finder/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$', 'i');
    //   var reFinder = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/finder/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$');
    router.get(reFinder, function (req, res, next) {
        res.contentType('json');

        var _f = req.params[1];

        req.params.type = req.params[0];
        var Model = m(req);
        var args = [req.query];
        if ((_u.isArray(req.params) ? req.params : Object.keys(req.params)).length > 2)
            args = args.concat(util.split(req.params[2]));

        var func = Model[_f] || Model.schema && Model.schema.statics && Model.schema.statics[_f];
        var find = func.apply(Model, args);
        //if there are selected fields than count doesn't work, so sorry.
        if (find._fields === void(0)) {
            find.count(finder(Model, find, req, res, next));
        } else {
            finder(Model, find, req, res, next)(null, {});
        }
    });


    router.get(base + '/:type', function (req, res, next) {
        res.contentType('json');
        var Model = m(req);
        if (!Model) {
            return next(new Error("could not find model for: " + req.params.type))
        }
        Model.count({}, finder(Model, Model.find({}), req, res, next));
    });

    /*
     /^\/rest\/(?:([^\/]+?))\/(?:([^\/]+?))\/?$/
     /^\/rest\/(?:([^\/]+?))\/(?:([^\/]+?))(?:\/([\w\/]+?))?\/?$/
     */

    var reGet = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$');
    var ppush = Array.prototype.push;

    function normalize(params) {
        var ret = [];
        if (!params) return ret;
        if (_u.isArray(params)) {
            for (var i = 0, l = params.length; i < l; i++) {
                var v = params[i];
                ppush.apply(ret, v && v.split ? v.split(/\//g) : v == null ? [] : [v]);
            }
        }else{
            Object.keys(params).sort().forEach(function(k, i){
                var v = params[k];
                ppush.apply(ret, v && v.split ? v.split(/\//g) : v == null ? [] : [v]);
            })
        }
        return _u.compact(ret);

    }

    router.get(reGet, function (req, res, next) {
        res.contentType('json');
        var params = normalize(req.params);
        var single = 'single' in req.query ? req.query.single : params.length % 2 == 0;
        var Model = m(params.shift());
        var find = Model.findOne(idObj(params.shift()));
        populate(find, req.query);

        if (params.length) {
            populate(find, {populate: [params.join('.')]});

            var cbs = new options.streams.CallbackStream();
            transform(createstream(cbs, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);
            find.exec(function (err, obj) {
                if (err) return cbs.emit('error', err);
                invoker.invoke(obj, params, cbs.asCallback());
            });
        } else {
            transform(createstream(find, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);
        }
    });
    function findPath(obj, p) {
        if (!p) return obj;
        var path = [].concat(p);
        var o = obj;
        while (o && path.length) {
            var idx = path.shift();
            if (o.id && Array.isArray(o) && !/^\d+?$/.test(idx)) {
                o = o.id(idx);
            } else {
                o = o[idx]
            }
        }
        return o;

    }

    router.put(reGet, function (req, res, next) {
        res.contentType('json');
        var params = normalize(req.params);
        var single = 'single' in req.query ? req.query.single : params.length % 2 == 0;
        var Model = m(params.shift());
        Model.findOne(idObj(params.shift()), function (err, obj) {

            if (err)return next(err);
            var body = clean(req.body);
            var pos = params.concat();
            var last = params.pop();
            if (pos.length) {
                var idx = parseInt(last);
                if (isNaN(idx))
                    obj.set(pos.join('.'), body);
                else {
                    var tobj = findPath(obj, params);
                    if (tobj == null) {
                        return res.send({
                            status: 1,
                            message: 'Could not find path [' + pos.join('/') + ']'
                        })
                    }
                    tobj.set(idx, body);

                }
            } else {
                obj.set(body);
            }

            obj.save(function (err, ret) {
                res.contentType('json');
                if (err) {
                    console.log("error saving ", err, err.stack);
                    res.send({
                        status: 1,
                        message: err.message
                    });
                } else {
                    res.send({
                        status: 0,
                        payload: findPath(ret, pos)
                    })
                }
            });
        });
    });
    router.post(reGet, function (req, res, next) {
        res.contentType('json');
        var params = normalize(req.params);
        var single = 'single' in req.query ? req.query.single : params.length % 2 == 0;
        var Model = m(params.shift());
        var qo = idObj(params.shift());
        var orig = params.concat();
        var find = Model.findOne(qo);
        find.exec(function (err, obj) {
            if (err)return next(err);
            var put = clean(req.body);

            if (params.length) {
                var last = params.pop();
                var o =
                    findPath(obj, params);
                if (o[last] instanceof Array)
                    o[last].push(put);
                else
                    o[last] = put;
            } else {
                _u.extend(obj, put);

            }

            obj.save(function (err, ret) {
                res.contentType('json');
                if (err) {
                    console.log("error saving ", err, err.stack);
                    res.send({
                        status: 1,
                        message: err.message
                    });
                } else {
                    var sto = ret.get(orig.join('.'));
                    res.send({
                        status: 0,
                        payload: Array.isArray(sto) ? sto.pop() : sto
                    })
                }
            });
        });
    });

    router.post(base + '/:type', function (req, res) {
        var Model = m(req);
        var body = clean(req.body);
        //   nestedSave(Model.schema, body);
        new Model(clean(req.body)).save(run(res));
    });

    function nestedSave(schema, obj) {
        var promises = [];
        var allDone = promise();
        _u.each(obj, function (val, path) {
            var p = schema.path(path);
            var caster = p && p.caster;
            if (caster && caster.instance === 'ObjectID' && caster.options && caster.options.ref) {
                var Model = m(caster.options.ref);
                if (val) {
                    if (Array.isArray(p.options.type)) {
                        val.forEach(function (v, i) {
                            if (v._id) return;
                            var pro = nestedSave(m.schema, v);
                            promises.push(pro);
                            pro.then(function (ret, err) {
                                val[i] = ret;
                            });
                            new Model(v).save(pro.resolve);
                        });
                    } else if (!val._id) {
                        var pro = nestedSave(m.schema, val);
                        pro.then(function (ret, err) {
                            obj[path] = ret;
                        });
                        promises.push(pro);
                        new Model(val).save(pro.resolve);
                    }
                }
            }


        });
    }


    router.put(base + '/:type/:id', function (req, res, next) {
        m(req).findOne(idObj(req), function (err, obj) {
            if (err)return next(err);
            _u.extend(obj, clean(req.body));
            obj.save(function (err, ret) {
                if (err) return next(err);
                res.contentType('json');
                var obj = ret.toJSON();
                res.send({
                    status: 0,
                    payload: obj
                })
            });
        });

    });
    router.del(base + '/:type/:id/*', function (req, res, next) {
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
    router.del(base + '/:type/:id?', function (req, res, next) {
        m(req).findOneAndRemove(idObj(req), function (err) {
            if (err)           return next(err);
            res.send({
                status: 0,
                payload: []
            })
        });
    });

    function createstream(query, req, res, next) {
        var stream = query.stream && query.stream() || new options.streams.CallbackStream(query.exec);
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

};
