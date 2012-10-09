var factory = require('./transformer-factory'), streams = require('./streams'), _u = require('underscore');
function rest() {
    var options = this;
    // var router = require('express/router/route')
    // root required
    if (!options.mongoose) throw new Error('mongoose is required');
    return {
        __mounted:function (app) {
            require('./routes')(this.route, app, options)

        },
        handle:   function (req, res, next) {
            res.contentType('json');
            next();
            //   router.middleware(req, res, next);
        },
        set:      function (base, path) {
            options[base] = path;
        },
        emit:function(evt, app){
            if (evt == 'mount'){
                this.__mounted(app);
            }
        }
    }
}
;
module.exports = function (options) {
    var options = _u.extend({}, options);

    if(options.conn) {
      console.log('Using existing connection to mongodb://%s:%d/%s', options.conn.host, options.conn.port,
          options.conn.name);
      options.mongoose = options.conn.base;
    }
    else if(options.uri) {
      if (!options.mongoose){
        options.mongoose = require('mongoose');
        console.warn("using mers mongoose do not mix mongoose versions");
      }
      options.conn = options.mongoose.createConnection(options.uri);
      options.conn.on('error', console.error.bind(console, 'connection error:'));
      options.conn.once('open', function () {
        console.log("Successful connection to " + options.uri);
      });
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
