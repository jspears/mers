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
            var bodyParser = require('body-parser');
            var jsonParser =  bodyParser.json.apply(bodyParser, arguments);
            return function(){
                return function(req,res,next){

                    jsonParser(req,res,next);
                }
            }
        } catch (e) {
            console.log('body-parser not available attempting to use bodyParser')
            return  express.bodyParser;
        }
    }())
}
