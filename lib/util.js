function split(val, delim, ret) {
    ret = ret || [];
    delim = delim || ',';
    if (!val)  return ret;
    if (Array.isArray(val)) {
        val.forEach(function (v) {
            split(v, delim, ret);
        });
    } else {
        val.split(delim).forEach(function (v) {
            ret.push(v);
        });
    }
    return ret;
}
function setunless(obj, str, val) {
    var orig = getsafe(obj, str);
    if (orig == null)
        return depth(obj, str, val);

    return orig;
}
function getsafe(obj, str) {
    if (!obj)
        return null;
    if (!Array.isArray(str))
        return getsafe(obj, str.split('.'));

    if (!str.length)
        return null;

    var p = str.shift();
    var n = (p in obj) ? obj[p] : null
    return str.length ? getsafe(n, str) : n;

}
function depth(obj, sp, val) {
    if (!Array.isArray(sp))
        return depth(obj, sp.split('.'), val);


    var c = sp.shift();
    if (typeof obj[c] == 'undefined')
        obj[c] = sp.length ? {} : typeof val == 'undefined' ? {} : val;
    if (sp.length)
        return depth(obj[c], sp, val);
    return obj[c];
}
function parse(str){

}
function gql(str){

}
var flatten =  function (target, opts) {
    var output = {}
        , opts = opts || {}
        , delimiter = opts.delimiter || '.'

    function getkey(key, prev) {
        return prev ? prev + delimiter + key : key
    };

    function step(object, prev) {
        Object.keys(object).forEach(function(key) {
            var isarray = opts.safe && Array.isArray(object[key])
                , type = Object.prototype.toString.call(object[key])
                , isobject = (type === "[object Object]" || type === "[object Array]")

            if (!isarray && isobject) {
                return step(object[key]
                    , getkey(key, prev)
                )
            }

            output[getkey(key, prev)] = object[key]
        });
    };

    step(target)

    return output
};

module.exports = {
    split:split,
    setunless:setunless,
    getsafe:getsafe,
    depth:depth,
    parse:parse,
    flatten:flatten
}
