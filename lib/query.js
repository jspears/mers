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
    var type = ((req.params && req.params.type || req) + "").toLowerCase();

    var model = mongoose.model(_u.chain(mongoose.modelSchemas || mongoose.base.modelSchemas).keys().filter(function (v) {
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
var hasProp = function (o) {
    var has = [];
    for (var i = 1, l = arguments.length; i < l; i++) {
        var v = arguments[i];
        if (!_u.isUndefined(o[v]))
            has.push(v);
    }
    return has.length && has;

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

function AndOrNor(filter, q){


    var re = pmRe.exec(filter);
    this.key = re[2];
    switch(re[1]){
        case '+':this.type = 'and'; break;;
        case '-':this.type = 'nor'; break;;
        default: this.type = 'or';
    }
    this.push = function(v){
        q[this.type](v);
        return this;
    }

}
function filter(q, query, Model) {
    var filters;
    if (!(filters = hasProp(query, 'filter', '-filter', '+filter')) && isF(q, 'or', 'nor', 'and'))
    return q;
    var paths = util.getsafe(Model, 'options.display.list_fields');
    if (!paths) {
        paths = [];
        Model.schema.eachPath(function (p, v) {
            paths.push(p)
        });
    }
    _u.each(filters, function (f) {
        var qt = new AndOrNor(f,q);

        if (typeof query[f] == 'string') {

            Model.schema.eachPath(function (p, vv) {

                if (~paths.indexOf(p) && typeof vv.options && vv.options.type === 'string') {
                    var b = {};
                    b[p] = { $regex:new RegExp(query[f], 'i')};
                    qt.push(b);
                }
            });
        } else {
            _u.each(query[f], function (v, k) {

                var aon = new AndOrNor(k,q);
                var b = {};
                b[aon.key] = { $regex:new RegExp(v, 'i')}
                aon.push(b);

            });
        }
   })

    return q;
}
//mongoose throws an exception if you try and populate an non ObjectID
// this is suppose to guard against that.  See if we can fix it.
function _populate(schema, q, paths) {
    paths = Array.isArray(paths) ? paths : [paths];
    for (var i = paths.length; i--;) {
        var p = paths[i];
        if (schema  && schema.path) {
            var ref = schema.path(p);
            if (ref && (ref.instance && ref.instance === 'ObjectID' || ref.caster && ref.caster.instance === 'ObjectID'))
                q.populate(p);
        } else {
            q.populate(p)
        }
    }
}
function flatJoin(v){
    var splits = util.split(v), ret = [];
    for(var i=splits.length;i--;)
        ret.push(v+'.'+splits[i]);
   return ret;
}

function populate(q, query) {
    if (!(query && query.populate && isF(q, 'populate')))
        return q;
    var schema = q && q.model && q.model.schema;
    //handle array style populate.
    if (Array.isArray(query.populate) || typeof query.populate == 'string') {
        _populate(schema, q,  util.split(query.populate));
    } else {
        //handle object style populate.
        _u.each(query.populate, function (v, k) {
            _populate(schema, q, flatJoin(v));
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
