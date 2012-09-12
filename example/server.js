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
    app.use('/rest', rest({ uri:'mongodb://localhost/rest_example_rest'}).rest())
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

module.exports = app;
