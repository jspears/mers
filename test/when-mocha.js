var util = require('../lib/when'), Promise = require('mongoose/node_modules/mpromise'), should = require('should');

function resolve(promise, val, timeout) {
    setTimeout(function () {
        promise.resolve(null, val);
    }, timeout);
}
function resolveErr(promise, val, timeout) {
    setTimeout(function () {
        promise.resolve(val);
    }, timeout);
}
describe('when functions', function () {
    describe('when', function () {
        it('should resolve a promise when all children have been resolved', function (done) {

            var p1 = new Promise(), p2 = new Promise(), p3 = new Promise();
            util.when([p1, p2, p3]).then(function (ret) {
                console.log('ret', ret);
                ret.should.have.lengthOf(3);
                done();
            });
            resolve(p1, 1, 300);
            resolve(p2, 2, 100);
            resolve(p3, 3, 200);
        });
        it('should work with a resolved promise', function (done) {

            var p1 = new Promise(), p2 = new Promise(), p3 = new Promise();
            p2.resolve(null, 2);
            util.when([p1, p2, p3]).then(function (ret) {
                console.log('ret', ret);
                ret.should.have.lengthOf(3);
                done();
            });
            resolve(p1, 1, 300);
            resolve(p3, 3, 200);
        });
        it('should work with all resolved promises', function (done) {

            var p1 = new Promise(), p2 = new Promise(), p3 = new Promise();
            p2.resolve(null, 2);
            p3.resolve(null, 3);
            p1.resolve(null, 1);
            util.when([p1, p2, p3]).then(function (ret) {
                console.log('ret', ret);
                ret.should.have.lengthOf(3);
                done();
            });
        });
        it('should work with one resolved promise', function (done) {

            var p1 = new Promise();
            p1.resolve(null, 1);
            util.when([p1]).then(function (ret) {
                console.log('ret', ret);
                ret.should.have.lengthOf(1);
                done();
            });
        });
        it('should work with one resolved promise in error', function (done) {

            var p1 = new Promise();
            p1.resolve(1);
            util.when([p1]).then(null, function (ret) {
                ret.should.have.lengthOf(1);
                done();
            });
        });

        it('should short circuit on error', function (done) {

            var p1 = new Promise(), p2 = new Promise(), p3 = new Promise();
            util.when([p1, p2, p3]).then(function (ret) {
            }, function (e) {
                done();
            });
            resolveErr(p1, 1, 300);
            resolve(p2, 2, 100);
            resolve(p3, 3, 200);
        });
        it('should resolve the value when it is not a promise', function (done) {
            var p1 = new Promise(), p2 = new Promise(), p3 = 3;
            util.when(p1, p2, p3).then(function (values) {
                values.should.have.property(0, 1);
                values.should.have.property(1, 2);
                values.should.have.property(2, 3);
                done();
            });
            resolve(p1, 1, 300);
            resolve(p2, 2, 100);
        })
        it('should reject the value when the value is an error', function (done) {
            var p1 = new Promise(), p2 = new Promise(), p3 = new Error();
            util.when(p1, p2, p3).then(done, function (e) {
                done();
            });
            resolve(p1, 1, 300);
            resolve(p2, 2, 100);
        })
        it('should resolve when there are no promises', function (done) {
            util.when().then(function () {
                done()
            });
        });
        it('should resolve when there are no promises in multiple args', function (done) {
            util.when([], []).then(function () {
                done()
            });
        })
        it('should resolve when there are no promises and values', function (done) {
            util.when([1, 2, 3]).then(function (args) {
                args.should.have.property(0, 1);
                args.should.have.property(1, 2);
                args.should.have.property(2, 3);
                args.should.have.property('length', 3);
                return null;
            }).then(done);
        })
        it('should resolve when there are no promises and values are functions', function (done) {
            var f1 = function () {
                return 1;
            }, f2 = function () {
                return 2;
            };
            util.when(f1, f2).then(function (args) {
                args.should.have.property(0, f1);
                args.should.have.property(1, f2);
                args.should.have.property('length', 2);
                done()
            });
        })
    })
    describe('chain', function () {
        function add1(a) {
            return a + 1;
        }

        it('should resolve no args', function (done) {
            util.chain().then(function (v) {
                should.not.exist(v)
                done();
            });
        });
        it('should resolve a list of functions', function (done) {
            util.chain(1, add1, add1, add1).then(function (v) {
                ({v: v}).should.have.property('v', 4);
                done();
            });
        });

        it('should resolve a list of functions some return promise', function (done) {
            util.chain(1, add1, function (v) {
                var p = util.promise();
                v += 2;
                setTimeout(p.resolve.bind(p, null, v), 100);
                return p;

            }, add1).then(function (v) {
                ({v: v}).should.have.property('v', 5);
                done();
            });
        });
        it('should resolve a list of functions some and use a promise', function (done) {
            util.promise(function (e, v) {
                should.not.exist(e);
                ({v: v}).should.have.property('v', 5);
                done();
            }).chain(1, add1, function (v) {
                var p = util.promise();
                v += 2;
                setTimeout(p.resolve.bind(p, null, v), 100);
                return p;

            }, add1);
        });
        it('should an error resolve a list of functions some and use a promise', function (done) {
            util.promise(function (e, v) {
                e.should.be.eql('failed');

                done();
            }).chain(1, add1, function (v) {
                var p = util.promise();
                setTimeout(p.reject.bind(p, "failed"), 100);
                return p;

            }, add1);
        });
        it('should resolve a list of functions some and use a promise as last element', function (done) {
            util.promise(function (e, v) {
                should.not.exist(e);
                ({v: v}).should.have.property('v', 4);
                done();
            }).chain(1, add1, function (v) {
                var p = util.promise();
                v += 2;
                setTimeout(p.resolve.bind(p, null, v), 100);
                return p;

            });
        });


        it('should resolve a chain of promises', function (done) {

            var f = function (v) {
                v = v || 0;
                var p = util.promise();
                v += 2;
                setTimeout(p.resolve.bind(p, null, v), 100);
                return p;
            }
            util.promise(function (e, v) {
                should.not.exist(e);
                ({v: v}).should.have.property('v', 6);
                done();
            }).chain(f, f, f);
        });
    });
});