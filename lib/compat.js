var express = require('express');
module.exports = {
    errorHandler: (function () {
        try {
            return require('errorhandler');
        } catch (e) {
            console.log('errorhandler not available attempting to use express errorHandler');
            return express.errorHandler;
        }
    }()),
    bodyParser: (function () {
        try {
            return require('body-parser');
        } catch (e) {
            console.log('body-parser not available attempting to use bodyParser')
            return  express.bodyParser;
        }
    }())
}