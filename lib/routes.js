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

    var mongoose = options.mongoose;
    var errorFunc = options.error.bind(options);
    var m = function (model) {
        return _q.m(mongoose, model)
    };

    var finder = function (Model, find, req, res, next) {
        res.contentType('json');
        return function (err, count) {
            if (err) return next(err);
            populate(find, req.query);
            paginate(find, req.query);
            sort(find, req.query);
            var stream = transform(createstream(find, req, res, next), req.query, Model);
            if (req.query.filter && Model) {
                filter(find, req.query, Model);
                find.count(function (err, fcount) {
                    if (err) return next(err);
                    stream.pipe(new ResponseStream({total:count, filterTotal:fcount})).pipe(res);
                });
            } else {
                stream.pipe(new ResponseStream({total:count})).pipe(res);
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
        var find = Model[_f].apply(Model, args);

        find.count(finder(Model, find, req, res, next));
    });

    router.get(base + '/:type', function (req, res, next) {
        res.contentType('json');
        var Model = m(req)
        Model.count({}, finder(Model, Model.find({}), req, res, next));
    });

    /*
     /^\/rest\/(?:([^\/]+?))\/(?:([^\/]+?))\/?$/
     /^\/rest\/(?:([^\/]+?))\/(?:([^\/]+?))(?:\/([\w\/]+?))?\/?$/
     */

    var reGet = new RegExp('^\\' + base + '\\/(?:([^\\/]+?))\\/(?:([^\\/]+?))(?:\\/([\\w\\/]+?))?\\/?$');
    router.get(reGet, function (req, res, next) {
        res.contentType('json');
        var Model = m(req.params[0]);
        var find = Model.findOne(idObj(req.params[1]));
        populate(find, req.query);

        var stuff = req.params.length > 1 ? req.params[2] : null;
        if (stuff) {
            populate(find, {populate:stuff});

            var cbs = new options.streams.CallbackStream();
            transform(createstream(cbs, req, res, next), req.query, Model).pipe(new ResponseStream(null, isTrue(req.query.single))).pipe(res);
            find.run(function (err, obj) {
                if (err) return cbs.emit('error',err);
                invoker.invoke(obj, stuff, cbs.asCallback());
            });
        } else {
            transform(createstream(find, req, res, next), req.query, Model).pipe(new ResponseStream(null, true)).pipe(res);
        }
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
                res.send({
                    status: 0,
                    payload:ret.toObject()
                })
            });
        });

    });
    router.del(base + '/:type/:id?', function (req, res, next) {
        m(req).findOne(idObj(req), function (err, doc) {
            if (err)           return next(err);
            doc.remove(run(res));
        });
    });
    function createstream(query, req, res, next) {
        var stream = query.stream();
        stream.on('error', function (err) {
            console.warn('stream error [' + (err && err.message || 'unknown') + ']');
            this.destroy();
            errorFunc(err, req, res, next);
        });
        return stream;
    }


    function run(meta, tostream) {
        if (!tostream) {
            tostream = meta;
            meta = {};
        }

        return new ResponseStream(meta).asCallback(tostream);
    }

    function transform(stream, query, Model) {
        return options.transformer.pump(stream, Model, query.transform);
    }
    function isTrue(val){
        return /^true$/i.test(val)
    }
}