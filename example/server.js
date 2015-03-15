/**
 * Module dependencies.
 */
module.exports = function (mongoose) {
    var express = require('express'), mongoose = mongoose || require('mongoose'),
        rest = require('../index.js'), models = require('./models/blogpost')(mongoose), compat = require('../lib/compat');

    var app = express();
// Configuration

    app.use(compat.bodyParser());
    app.post('/rest/blogpost_t', function(req,res,next){

        req.query.transform = [function(o){
            return {id:o._id, label: 'stuff'};
        }];
        req.url = '/rest/blogpost';
        next();
    });

    app.put('/rest/blogpost_t/*', function(req,res,next){

        req.query.transform = [function(o){
            return {id:o._id, label: 'stuff', title: o.title};
        }];
        req.url = '/rest/blogpost/'+req.url.substring('/rest/blogpost_t/'.length);
        next();
    });

    app.get('/space/test/', function (req, res, next) {
        req.query.transform = function (v) {

            return  {vid: v._id, junk: true};
        }
        req.url = '/rest/blogpost/'
        next();
    });
    app.use('/rest', rest({ mongoose: mongoose}).rest())
    app.use(compat.errorHandler({ dumpExceptions: true, showStack: true }));
    return app;
}

