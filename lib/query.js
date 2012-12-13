/**
 * A bunch of helpers extracted from routes to make it easier to deal with
 */
var util = require('./util'), _u = require('underscore');

function idObj(req) {
    var id = req.params && req.params.id || req.body && req.body._id || req;
    if (!id)
        throw new Error("id not in request or body");

    var resp = {_id:id};
    return resp;
}

function m(mongoose, req) {
    var type = (req.params && req.params.type || req)+"".toLowerCase();

        var model =  mongoose.model(_u.chain(mongoose.modelSchemas).keys().filter(function (v) {
            return v.toLowerCase() == type
        }).first().value())
    if (model)
        return model;
    else
        console.error('could not locate schema for [' + type + ']');
}

function clean(query) {
    var update = _u.extend({}, query);
    /**read only properties */
    delete update._id;
    delete update.created_at;
    delete update.modified_at;
    delete update.modified_by;
    delete update.created_by;
    return update;
}

var isF = function (o) {
    for (var i = 1, l = arguments.length; i < l; i++) {
        var v = arguments[i];
        if (!(_u.isFunction(v) || _u.isFunction(o[v])))
            return false;
    }
    return true;
}

function paginate(q, query) {
    if (!isF(q, 'skip', 'limit'))
        return q;
    var limit = Math.min(query && query.limit && 0 + query.limit || 100, 1000);
    var skip = query && query.skip || 0;
    if (query) delete query.limit;
    if (query)  delete query.skip;
    return q.skip(skip).limit(limit);
}

var pmRe = /^([+,-])?(.*)/;
function filter(q, query, Model) {
    if (!(query.filter && isF(q, 'or', 'nor', 'and')))
        return q;
    var paths = util.getsafe(Model, 'options.display.list_fields');
    if (!paths) {
        paths = [];
        Model.schema.eachPath(function (p, v) {
            paths.push(p)
        });
    }
    var ors = [], ands = [], nors = [];

    if (typeof query.filter == 'string') {
        var re = pmRe.exec(query.filter);
        var filter = re[2];

        Model.schema.eachPath(function (p, v) {
            if (~paths.indexOf(p) && typeof v.options && v.options.type === 'string') {
                var b = {};
                b[p] = { $regex:new RegExp(filter, 'i')};
                if (!re[1])
                    ors.push(b);
                else if (re[1] == '+')
                    ands.push(b);
                else
                    nors.push(b);
            }
        });
    } else {
        _u.each(query.filter, function (v, k) {
            var re = pmRe.exec(k);
            var key = re[2];
            var b = {};
            b[key] = { $regex:new RegExp(v, 'i')}
            if (!re[1])
                ors.push(b);
            else if (re[1] == '+')
                ands.push(b);
            else
                nors.push(b);

        });
    }
    if (ands.length)
        q.and(ands)
    if (nors.length)
        q.nor(nors);
    if (ors.length)
        q.or(ors);
    return q;
}

function populate(q, query) {
    if (!(query && query.populate && isF(q, 'populate')))
        return q;

    //handle array style populate.
    if (Array.isArray(query.populate) || typeof query.populate == 'string') {
        var populate = util.split(query.populate);
        for (var i = 0, l = populate.length; i < l; i++)
            q.populate(populate[i]);
    } else {
        //handle object style populate.
        _u.each(query.populate, function (v, k) {
            q.populate(k, util.split(v));
        });
    }
    delete query.populate;
    return q;
}


function sort(q, query) {
    if (!(query && query.sort && isF(q, 'sort')))
        return q;
    util.split(query.sort).forEach(function (v, k) {
        var parts = v.split(':', 2);
        if (parts.length == 1) parts.push(1);
        var _s = {};
        _s[parts[0]] = parts[1];
        q.sort(_s);
    });

    delete query.sort;
    return q;
}
module.exports = {
    populate:populate,
    sort:sort,
    paginate:paginate,
    clean:clean,
    m:m,
    model:m,
    filter:filter,
    idObj:idObj
}
