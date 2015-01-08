var stream = require('stream'),
    Readable = stream.Readable,
    streams = require('../lib/streams'),
    through = require('../lib/streams/through'),
    TransformerFactory = require('../lib/transformer-factory'),
    w = require('../lib/when'),
    __ = require('underscore');

describe('streams', function () {
    var tx, ot;
    beforeEach(function () {
        tx = streams.ToJson();
        ot = new TransformerFactory({
            transformers: {
                a: function $0(data) {
                    data.a = 1;
                    return data;
                }, b: function $1(data) {
                    var p = w.promise();
                    setTimeout(function () {
                        data.b = 2;
                        p.resolve(null, data);
                    }, 500);
                    return p;
                }
            }
        });
    });

    it('should pipe data', function (done) {


// a simple transform stream


// a simple source stream


        var _c = 0, toJSON = function () {
            return {
                a: _c++
            }
        };
        var rs = new Readable({objectMode: true}), a = {
            toJSON: toJSON,
            v: 'a'
        }, b = __.extend({}, a, {v: 'b'}), c = __.extend({}, a, {v: 'c'});
        rs.push(a);
        rs.push(b);
        rs.push(c);
        rs.push(null);
        ot.pump(rs, {
            query: {a: 'qa'},
            session: {},
            args: [1, 2, 3]
        }, [
            'a', 'b',

            function $2(data, query$a) {
            data.c = 3;
            data.qa = query$a;
            return data;
        }]).pipe(new streams.BufferedJSONStream).pipe(through.obj(function (chunk, enc, cb) {
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