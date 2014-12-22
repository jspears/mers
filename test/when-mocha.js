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
describe.only('when all resolved', function () {

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

});