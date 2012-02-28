var util = require('../lib/util'), should = require('should'), assert = require('assert');
describe('util', function () {
    describe('depth', function () {
        it('should return a set value', function (done) {
            var a = {};
            util.depth(a, 'b', false);
            a.should.have.property('b', false)
            done();
        });

        it('should return a set value', function (done) {
            var a = {};
            util.depth(a, 'b.c', 1);
            a.should.have.property('b')
            a.b.should.have.property('c', 1)
            done();
        });

        it('should return a object', function (done) {
            var a = {};
            util.depth(a, 'b.c');
            a.should.have.property('b')
            a.b.c.should.be.an.object;
            done();
        });
    });
    describe('getsafe', function () {
        it('should return a property', function (done) {
            var a = {a:{b:false}};
            var val = util.getsafe(a, 'a.b');
            false.should.equal(val);
            done();
        });
        it('should return null', function (done) {
            var a = {a:{b:false}};
            var val = util.getsafe(a, 'a.c.d');
            assert.equal(val, null, "should be null");
            val = util.getsafe(a, 'd');
            assert.equal(val, null, "should be null");
            done();
        });
    });
    describe('setunless', function () {
        it("should set the value", function (done) {
            var a = {b:{c:1}};
            util.setunless(a, 'b1.c2', 2);
            a.should.have.property('b1');
            a.b1.should.have.property('c2', 2)
            done()
        });
        it("should return the orignal value", function (done) {
            var a = {b:{c:1}};
            util.setunless(a, 'b.c', 2).should.equal(1);
            a.b.c.should.equal(1);
            done()
        });
    });
    describe('split', function () {
        it('should split strings', function (done) {
            var split = util.split('stuff,more,than,this');
            split.should.have.lengthOf(4);
            split.should.eql(['stuff','more','than','this'])
            done();
        });
        it('should split arrays', function (done) {
            var split = util.split(['a,b', ['c,d', ['e', 'f']], 'g']);
            split.join('').should.eql('abcdefg');
            done();
        });
        it('should return an empty array', function(done){
           util.split().should.have.lengthOf(0);
            done();
        });
        it('should split on a -', function(done){
            util.split('a-b-c','-').should.eql(['a','b','c']);
            done();
        })
        it('should split on a - and use ref', function(done){
            var a = [];
            util.split('a-b-c','-', a).should.eql(a);
            done();
        })
    })
});
