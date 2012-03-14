var factory = require('./transformer-factory'), streams = require('./streams');
function rest() {
    var options = this;
    // var router = require('express/router/route')
    // root required
    if (!options.mongoose) throw new Error('mongoose is required');
    return {
        __mounted:function (app) {
            require('./routes')(options.basepath, app, options)

        },
        handle:   function (req, res, next) {
            res.contentType('json');
            next();
            //   router.middleware(req, res, next);
        },
        set:      function (base, path) {
            options[base] = path;
        }
    }
}
;
module.exports = function (options) {
    if (options.uri) {
        console.log('connecting to ', options.uri);
        if (!options.mongoose){
            options.mongoose = require('mongoose');
            console.warn("using mers mongoose do not mix mongoose versions");
        }
        options.mongoose.connect(options.uri);
    }
    if (!options.mongoose){
        throw new Error("No mongoose or uri defined");
    }
    if (!options.transformer)
        options.transformer = new factory.TransformerFactory(options)

    if (!options.responseStream)
        options.responseStream = streams.BufferedJSONStream;
    if (!options.error){
        options.error = function(err, req, res, next){
            res.send({
                status:1,
                error:err && err.message
            });
        }
    }
    options.streams = streams;
    options.factory = factory;
    options.rest = rest;
    return options;
}