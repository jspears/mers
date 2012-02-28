/**
 * A bunch of helpers extracted from routes to make it easier to deal with
 */
var util = require('./util');

function idObj(req) {
    var id = req.params && req.params.id || req.body && req.body._id || req;
    if (!id)
        throw new Error("id not in request or body");

    return {_id:id };
}

function m(mongoose, req) {
    var type = (req.params && req.params.type || req).toLowerCase();
    if (Object.keys(mongoose.modelSchemas).some(function (v, k) {
        if (v.toLowerCase() == type) {
            type = v;
            return true;
        }
    }))
        return mongoose.model(type);

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

function paginate(q, query) {
    var limit = Math.min(query && query.limit && 0 + query.limit || 100, 1000);
    var skip = query && query.skip || 0;
    if (query) delete query.limit;
    if (query)  delete query.skip;
    return q.skip(skip).limit(limit);
}

function filter(q, query, Model) {
    if (!query.filter)
        return q;
    var paths = util.getsafe(Model, 'options.display.fieldOrder');
    if (!paths) {
        paths = [];
        Model.schema.eachPath(function (p, v) {
            paths.push(p)
        });
    }
    var ors = [];
    if (typeof query.filter == 'string') {

        var regex = { $regex:new RegExp(query.filter, 'i')};

        Model.schema.eachPath(function (p, v) {
            if ((paths.indexOf(p) > -1 ) && util.isA(v.options && v.options.type, String)) {
                var b = {};
                b[p] = regex;
                ors.push(b);
            }
        });
    } else {
        _u.each(query.filter, function (v, k) {
            if (Model.schema.paths[k]) {
                var b = {};
                b[k] = { $regex:new RegExp(v, 'i')}
                ors.push(b);
            }
        });
    }

    q.$or(ors);
    return q;
}

function populate(q, query) {
    if (!(query && query.populate))
        return q;

    //handle array style populate.
    if (util.isA(query.populate, Array) || typeof query.populate == 'string') {
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
    if (!(query && query.sort))
        return q;
    util.split(query.sort).forEach(function (v, k) {
        var parts = v.split(':', 2);
        if (parts.length == 1) parts.push(1);
        q.sort(parts[0], 0 + parts[1] > 0 ? "ascending" : "descending");
    });

    delete query.sort;
    return q;
}
module.exports = {
    populate:populate,
    sort:    sort,
    paginate:paginate,
    clean:   clean,
    m:       m,
    model:   m,
    filter:  filter,
    idObj:   idObj
}