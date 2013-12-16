var _u = require('underscore'), invoker = require('./invoke'),
    util = require('./util'),
    _q = require('./query'),
    populate = _q.populate,
    sort = _q.sort,
    paginate = _q.paginate,
    clean = _q.clean,
    filter = _q.filter,
    idObj = _q.idObj
    ;
module.exports = function MongooseRestRouter(base, router, options) {
    var ResponseStream = options.responseStream;

    var conn = options.conn || options.mongoose && options.mongoose.connection;

    function m(model) {
        return _q.m(conn, model)
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
    }
    var reFinder = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/finder/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$', 'i');
    //   var reFinder = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/finder/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$');
    router.get(reFinder, function (req, res, next) {
        res.contentType('json')

        var _f = req.params[1];

        req.params.type = req.params[0];
        var Model = m(req)
        var args = [req.query];
        if (req.params.length > 2)
            args = args.concat(util.split(req.params[2]));
        var func = Model[_f] || Model.schema && Model.schema.statics && Model.schema.statics[_f]
        var find = func.apply(Model, args);
        //if there are selected fields than count doesn't work, so sorry.
        if (find._fields === void(0) && find.count) {
            find.count(finder(Model, find, req, res, next));
        } else {
            finder(Model, find, req, res, next)(null, {});
        }
    });

    router.get(base + '/:type', function (req, res, next) {
        res.contentType('json');
        var Model = m(req)
        if (!Model) {
            return next(new Error("could not find model for: " + req.params.type))
        }
        Model.count({}, finder(Model, Model.find({}), req, res, next));
    });

    /*
     /^\/rest\/(?:([^\/]+?))\/(?:([^\/]+?))\/?$/
     /^\/rest\/(?:([^\/]+?))\/(?:([^\/]+?))(?:\/([\w\/]+?))?\/?$/
     */
    var stripUndefined = function(v){
        return !(v === void(0));
    }
    var fixParts = function(v){
        return v.split('/');
    }
    var reGet = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$');
    router.get(reGet, function (req, res, next) {
        res.contentType('json');
        var params = _u.flatten(_u.map(_u.filter(req.params, stripUndefined), fixParts));
        var single = req.query.single || params.length % 2 == 0;
        var Model = m(params[0]);
        var find = Model.findOne(idObj(params[1]));
        populate(find, req.query);

        var stuff = params.length > 1 ? params[2] : null;
        if (stuff) {
            populate(find, {populate: [stuff]});

            var cbs = new options.streams.CallbackStream();
            transform(createstream(cbs, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);
            find.exec(function (err, obj) {
                if (err) return cbs.emit('error', err);
                invoker.invoke(obj, stuff, cbs.asCallback());
            });
        } else {
            transform(createstream(find, req, res, next), req.query, Model).pipe(new ResponseStream(null, single)).pipe(res);
        }
    });
    router.put(reGet, function (req, res, next) {
        res.contentType('json');
        var single = req.query.single;
        var stuff = [].concat(req.params);
        stuff.shift();

        var Model = m(req.params[0]);
        var qo = idObj(req.params[1]);
        var pos = req.params[2] && req.params[2].split('/');
        var find = Model.findOne(qo);
        find.exec(function (err, obj) {
            console.log('pos', pos);
            if (err)return next(err);
            var put = clean(req.body), orig = [].concat(pos);

            if (pos) {
                var o = obj
                while (o && pos.length) {
                    o = o[pos.shift()]
                }
                ;

                _u.each(put, function (v, k) {
                    o[k] = v;
                    obj.markModified(orig.concat(k).join('.'));
                });

//                obj.set(pos.join('.'), put);
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
                    var obj = ret.toJSON();
                    if (pos) {
                        while (obj && orig.length) {
                            obj = obj[orig.shift()];
                        }
                    }
                    res.send({
                        status: 0,
                        payload: obj
                    })
                }
            });
        });
    });
    router.post(reGet, function (req, res, next) {
        res.contentType('json');
        var single = req.query.single;
        var stuff = [].concat(req.params);
        stuff.shift();

        var Model = m(req.params[0]);
        var qo = idObj(req.params[1]);
        var pos = req.params[2] && req.params[2].split('/');
        var find = Model.findOne(qo);
        find.exec(function (err, obj) {
            console.log('pos', pos);
            if (err)return next(err);
            var put = clean(req.body), orig = [].concat(pos);

            if (pos) {
                var o = obj
                while (o && pos.length - 1) {
                    o = o[pos.shift()]
                }
                if (o[pos[0]] instanceof Array) {
                    o[pos[0]].push(put);
                } else {
                    o[pos[0]] = put;
                }
                obj.markModified(orig.join('.'));

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
                    var obj = ret.toJSON();
                    if (pos) {
                        while (obj && orig.length) {
                            obj = obj[orig.shift()];
                        }
                    }
                    res.send({
                        status: 0,
                        payload: obj
                    })
                }
            });
        });
    });

    router.post(base + '/:type', function (req, res, next) {
        var Model = m(req);
        new Model(clean(req.body)).save(run(res));
    });

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
    router.del(base + '/:type/:id?', function (req, res, next) {
        m(req).findOneAndRemove(idObj(req), function (err, doc) {
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
            console.log('mers:routes stream error [' + (err && err.message || 'unknown') + ']', err);
            this.destroy();
            return options.error(err, req, res, next);
        });
        return stream;
    }

    function transform(stream, query, Model) {
        return options.transformer.pump(stream, Model, query.transform);
    }

    function isTrue(val) {
        return /^true$/i.test(val)
    }
}
