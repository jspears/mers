var stream = require('stream'),
    streams = require('../lib/streams')
__ = require('underscore'), through = require('through2'), util = require('util'), inherits = util.inherits, Transform = stream.Transform;
describe('streams', function () {
    var tx, ot;
    beforeEach(function () {
        tx = streams.ToJson();
        ot = streams.ObjTransformer({
            transformers: [function $0(data) {
                data.a = 1;
                return data;
            }, function $1(data) {
                data.b = 2;
                return data;
            }, function $2(data) {
                data.c = 3;
                return data;
            }]
        });
    })

    it('should pipe data', function (done) {


// a simple transform stream


// a simple source stream
        var Readable = require('stream').Readable;

        var _c = 0, toJSON = function () {
            return {
                a: _c++
            }
        };
        var rs = new Readable({objectMode: true}), b = 0, a = {
            toJSON: toJSON
        }, b = __.extend({}, a), c = __.extend({}, b);
        rs.push(a);
        rs.push(b);
        rs.push(c);
        rs.push(null);

        rs.pipe(ot).pipe(tx).pipe(new streams.BufferedJSONStream).pipe(through.obj(function (chunk, enc, cb) {
            console.log('chunk ' + JSON.stringify(chunk));
            chunk.should.have.property('total', 3);
            chunk.should.have.property('payload').have.property('length', 3);
            //  cb(null, chunk)
            done();
        }));//.pipe(process.stdout);

    });
    it('should be able to stream from callback', function (done) {
        ot.pipe(tx).pipe(new streams.BufferedJSONStream()).pipe(through.obj(function (d, e, c) {
            var payload = d.should.have.property('payload').obj;
            payload.should.have.property('length', 1);
            payload[0].should.have.property('t', 1);
            done();
        }));
        streams.asCallback(ot)(null, {t: 1});

    });
    it('should be able to stream from callback with error', function (done) {
        var d = require('domain').create();
        d.on('error', function (e) {
            console.log('stuff');
            done();
        });
        d.add(ot);
        d.add(tx);
        d.run(function (e) {
            ot.pipe(tx).pipe(new streams.BufferedJSONStream()).pipe(through.obj(function (d, e, c) {
                //          done('should not have fired');
            }));
            streams.asCallback(ot)(new Error('Err'));
        });
    });
})
;