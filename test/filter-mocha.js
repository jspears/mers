var express = require('express'),
    rest = require('../index'),
    request = require('./support/http'),
    should = require('should'),
    json = JSON.stringify,
    app = express(),
    compat = require('../lib/compat')
    ;
var mongoose = require('mongoose').createConnection(), Schema = require('mongoose').Schema;
var UserSchema = new Schema({
    username: {type: String, required: true, unique: true, index: true},
    count: {type: Number},
    meta: {
        created: {
            type: Date
        }
    }
});

var User = mongoose.model('User', UserSchema);
app.use(compat.bodyParser());
app.use('/rest', rest({ mongoose: mongoose }).rest());

d = new Date();
function date(offset) {
    return new Date(d.getTime() + offset);
}

var score = 0;

var usernames = ['abc', 'def', 'acc', 'dff'];

var connected = false;
before(function onBefore(done) {
    console.log('filter-mocha');

    mongoose.on('connected', function () {
        if (connected) return;
        connected = true;
        mongoose.db.dropDatabase(function(){
           insert(done);
        });
    });
    mongoose.open('mongodb://localhost/filter-mocha');
});


function insert(done) {
    console.log('insert');
    var us = [].concat(usernames);
    var save = function (username) {
        var u = new User({
            username: username,
            count: score++,
            meta: {
                created: date(-10000 * score)
            }
        });
        console.log('saving ', u.username);
        u.save(doneSave);
    };

    var doneSave = function (err) {
        if (err) {
            console.log('error', err);
        }
        if (us.length == 0) {
            console.log('done');
            done();
        } else {
            save(us.shift());
        }

    };
    save(us.shift());
}
describe('filtering conditions', function () {
    it('should filter by username string', function (done) {
        request(app)
            .get('/rest/User?filter[username]=>abc')
            .expect(200).end(function (err, res) {
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;

                done();

            })
    });
    it('should fiter greater than number', function (done) {
        request(app)
            .get('/rest/User?filter[count]=>1')
            .expect(200).end(function (err, res) {
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;

                done();

            })
    });
    it('should filter less than number', function (done) {
        request(app)
            .get('/rest/User?filter[count]=<1')
            .expect(200).end(function (err, res) {
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;

                done();

            })
    });

    it('should filter less than date', function (done) {
        request(app)
            .get("/rest/User?filter[meta][created]=<" + (date(-10000 * 3).toJSON()))
            .expect(200).end(function (err, res) {
                if (err) {
                    console.log('Error', res, err);
                    done(err);
                }
                console.log('response', res.body);
                res.body.should.have.property('status', 0);
                var payload = res.body.should.have.property('payload').obj;
                payload.should.have.length(2);

                done();

            })
    });

});