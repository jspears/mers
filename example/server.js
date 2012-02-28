/**
 * Module dependencies.
 */

var express = require('express')
    , mongoose = require('mongoose')
    , rest = require('../index.js')
require('./models/blogpost');

var app = module.exports = express.createServer();
// Configuration

app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
});

app.configure('development', function () {
    app.use('/rest', rest({uri:'mongodb://localhost/rest_example_dev'}).rest())
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function () {
    app.use('/rest', rest({uri:'mongodb://localhost/rest_example_prod'}).rest())
    app.use(express.errorHandler());
});
app.configure('test', function () {
    app.use('/rest', rest({uri:'mongodb://localhost/rest_example_rest'}).rest())
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
    console.log('done configuring test');
});

