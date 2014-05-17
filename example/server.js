/**
 * Module dependencies.
 */
module.exports = function (mongoose) {
    var express = require('express'), mongoose = mongoose || require('mongoose')

        , rest = require('../index.js')
        require('./models/blogpost')(mongoose);

    var app =  express();
// Configuration

    app.configure(function () {
        app.use(express.bodyParser());
        app.use(express.methodOverride());

        app.get('/space/test/', function (req, res, next) {
            console.log('here I am')
            req.query.transform = function (v) {
                console.log('HELLO', v);

                return  {vid: v._id, junk: true};
            }
            req.url = '/rest/blogpost/'
            next();
        });
        app.use('/rest', rest({ mongoose: mongoose}).rest())
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

    });
    return app;
}

