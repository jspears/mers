var factory = require('./transformer-factory'), streams = require('./streams'), mongooseI = require('mongoose');
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
module.exports = function (mongoose, options) {
    if (!mongoose) {
        options = {};
    } else if (!options) {
        if (mongoose == mongooseI) {
            options = {mongoose:mongoose}
        } else {
            options = mongoose;
        }
    }
    if (!options.mongoose)
        options.mongoose = mongooseI;

    if (options.uri) {
        console.log('connecting to ', options.uri);
        options.mongoose.connect(options.uri);
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