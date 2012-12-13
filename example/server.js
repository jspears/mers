/**
 * Module dependencies.
 */

var express = require('express')
    , mongoose = require('mongoose')
    , rest = require('../index.js')
require('./models/blogpost');

var app = module.exports = express();

// Configuration

app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.methodOverride());

    app.get('/space/test/', function (req, res, next) {
        console.log('here I am')
        req.query.transform = function (v) {
            console.log('HELLO', v);

            return  {vid:v._id, junk:true};
        }
        req.url = '/rest/blogpost/'
        next();
    });
    app.use('/rest', rest({ uri:'mongodb://localhost/rest_example_rest'}).rest())
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));

});




module.exports = app;
