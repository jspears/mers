var stream = require('stream'), __ = require('underscore');
describe('how stream should work', function () {

    it('should pipe data', function (done) {

        var Transform = require("stream").Transform
        var inherits = require("util").inherits;
        var through = require('through2');

        function ToJson(options) {
            // init Transform
            if (!options) options = {}; // ensure object
            options.objectMode = true; // forcing object mode
            this.toJSON = options.toJSON || function ToJson$toJSON(obj) {
                if (obj && typeof obj.toJSON === 'function') {
                    return obj.toJSON();
                }
                return obj;
            }
            Transform.call(this, options);
        }

        inherits(ToJson, Transform);


        ToJson.prototype._transform = function (chunk, encoding, callback) {
            callback(null, this.toJSON(chunk));
        }

        function ObjTransformer(options) {
            if (!options) options = {}; // ensure object
            options.objectMode = true; // forcing object mode
            this.transformers = options.transformers || [];
            Transform.call(this, options);
        }

        inherits(ObjTransformer, Transform);


        ObjTransformer.prototype.asCallback = ToJson.prototype.asCallback = function () {
            var rs = new Readable({objectMode: true});
            rs.pipe(this);
            return function (e, o) {
                if (e) {
                    return rs.emit('error', e);
                }
                rs.push(o);
            }
        };

        ObjTransformer.prototype._transform = function ObjTransformer$_transform(chunk, enc, cb) {
            var trans = this.transformers, i = 0, l = trans.length;
            try {
                for (; i < l; i++) {
                    if (chunk == null)
                        break;
                    chunk = trans[i].call(this, chunk);
                }
            } catch (e) {
                console.log('caught an error in the transforms', chunk, e, 'index', i);
                return cb(e);
            }
            cb(null, chunk);
        }


        var PayloadOut = through.ctor({objectMode: true}, function (chunk, encoding, callback) {
            (this._payload || (this._payload = [])).push(chunk);
            callback();
        }, function (callback) {
            this.push(this._payload);
            callback();
        });

        // inherits(PayloadOut, through.ctor);


// a simple transform stream
        var tx = new ToJson, ot = new ObjTransformer({
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

// a simple source stream
        var Readable = require('stream').Readable;

        var _c = 0, toJSON = function () {
            return {
                a: _c++
            }
        };
        var rs = new Readable({objectMode: true}), b = 0, a = {
            toJSON: toJSON
        }, b = __.extend({}, a), c = __.extend({}, b), all = [];
        rs.push(a);
        rs.push(b);
        rs.push(c);
        rs.push(null);

        rs.pipe(ot).pipe(tx).pipe(new PayloadOut).pipe(through.obj(function (chunk, enc, cb) {
                console.log('chunk '+chunk);
                chunk.should.have.property('length', 3);
              //  cb(null, chunk)
                done();
            }));//.pipe(process.stdout);

    });


})
;