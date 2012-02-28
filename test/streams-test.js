var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , db = mongoose.connect('localhost', 'testing_streaming').connection
  , Stream = require('stream').Stream
  , express = require('express')
  , streams = require('../lib/streams')

/**
 * Dummy schema.
 */

var Person = new Schema({
    name: String
});

var P = db.model('Person', Person);

/**
 * Create some dummy people.
 */

db.on('open', function () {
  db.db.dropDatabase(function () {
    var people = [];
    for (var i = 0; i < 5000; ++i) {
      people.push({ name: i });
    }

    P.create(people, startup);
  });
});

/**
 * Start up an express app
 */

function startup () {
  var app = express.createServer()

  app.get('/', function stream (req, res, next) {
    if ('HEAD' == req.method) return res.end();

    // output json
    res.contentType('json');
    var trans = new streams.StreamTransformer([function(v,k){ return {name:'hello',_id:v._id}; }])
    trans.transformers.push(function(v){return {name:v.name+" world",id:v._id}});
    trans.transformers.push(function(v){ if (this._count) this._count = 0; v.name = v.name+'('+this._count+')'; return this._count++ % 2 == 0 ? null :v; });
    trans.transformers.push(function(v){return {name:v.name+" hidden",id:v.id}});
    // use our lame formatter
    var format = new streams.ArrayFormatter;

    // first pipe the querystream to the formatter
    P.find().stream().pipe(trans).pipe(format).pipe(res);

    // then pipe the formatter to the response
    // (node 0.4x style pipe non-chaining)
//    format.pipe(res);

    // In node 0.6 we can P.find().stream().pipe(format).pipe(res);
  })

  app.listen(8000);
  console.error('listening on http://localhost:8000');
}
